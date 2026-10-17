import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, PermissionsAndroid, Platform, Text, View } from 'react-native';

import { INTERVAL_LABELS, describeDuration } from '@/domain/cues';
import { RUNNING_PLAN, getSession } from '@/domain/plan';
import { SessionRuntime } from '@modules/session-runtime';
import { startSession } from '@/session/controller';
import { useProgram } from '@/session/use-program';
import { markSessionDone } from '@/storage/database';
import { useColors } from '@/theme/colors';
import {
  Body,
  Button,
  ErrorText,
  IntervalBar,
  Loading,
  Note,
  Screen,
  Title,
} from '@/ui/kit';

async function requestNotifications() {
  if (Platform.OS !== 'android' || Platform.Version < 33) return;
  // The session runs either way; the notification shows its controls.
  await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
}

export function PreviewScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ stage: string; index: string }>();
  const stageNumber = Number(params.stage);
  const sessionIndex = Number(params.index);
  const { db, data } = useProgram();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stage = RUNNING_PLAN.stages[stageNumber - 1];
  if (!stage || !stage.sessions[sessionIndex]) {
    return (
      <Screen>
        <ErrorText>This session does not exist.</ErrorText>
      </Screen>
    );
  }
  if (!data) return <Loading label="Loading session" />;

  const session = getSession(RUNNING_PLAN, stageNumber, sessionIndex);
  const progress = data.progress.stages[stageNumber - 1]!;
  const alreadyDone = progress.done[sessionIndex] === true;
  const suggestedStage = data.progress.next?.stage;
  const ahead = suggestedStage !== undefined && stageNumber > suggestedStage;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await requestNotifications();
      await SessionRuntime.prepare();
      const attemptId = await startSession(
        db,
        SessionRuntime,
        {
          stage: stageNumber,
          sessionIndex,
          stageAttempt: progress.attempt,
          isReplay: false,
        },
        data!.settings,
      );
      router.replace({
        pathname: '/session/live',
        params: { attempt: String(attemptId) },
      });
    } catch {
      setError('The session could not start. Please try again.');
      setBusy(false);
    }
  }

  async function markDone() {
    setBusy(true);
    setError(null);
    try {
      await markSessionDone(db, {
        planVersion: RUNNING_PLAN.version,
        stage: stageNumber,
        sessionIndex,
        stageAttempt: progress.attempt,
        markedAt: new Date().toISOString(),
      });
      router.back();
    } catch {
      setError('This session could not be marked done. Please try again.');
      setBusy(false);
    }
  }

  function confirmMarkDone() {
    Alert.alert(
      `Mark session ${sessionIndex + 1} as done?`,
      'Use this for a session you ran without the app. It counts toward the stage but has no effort rating, so the stage can be completed but not cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark as done', onPress: () => void markDone() },
      ],
    );
  }

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Title>
          Stage {stageNumber}, session {sessionIndex + 1}
        </Title>
        <Body muted>{stage.tip}</Body>
      </View>

      <IntervalBar intervals={session.intervals} />
      <Legend />

      {ahead && (
        <Note>
          This is ahead of your plan, which is at stage {suggestedStage}. Big
          jumps are harder on your body; going back a stage is always fine.
        </Note>
      )}
      {alreadyDone && (
        <Body muted>You have done this session. Running it again is fine.</Body>
      )}

      {error && <ErrorText>{error}</ErrorText>}
      <View style={{ gap: 10 }}>
        <Button label="Start" onPress={() => void start()} disabled={busy} />
        {!alreadyDone && (
          <Button
            kind="secondary"
            label="Mark as done"
            onPress={confirmMarkDone}
            disabled={busy}
          />
        )}
      </View>

      <Body muted>
        Start your music or podcast, then press Start. You will hear a chime and
        “run” or “walk” at every change; the screen can turn off.
        {Platform.OS === 'ios'
          ? ' The first time, iOS asks to let Build to 30 save workouts to Apple Health — this is what keeps cues playing with the screen locked.'
          : ''}
      </Body>

      <View>
        {session.intervals.map((interval, index) => {
          const active = interval.kind === 'active';
          return (
            <View
              key={index}
              style={{
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.line,
              }}
            >
              <View
                style={{
                  width: 4,
                  height: 20,
                  borderRadius: 2,
                  backgroundColor: active ? colors.accent : colors.walk,
                }}
              />
              <Text
                style={{
                  flex: 1,
                  color: active ? colors.text : colors.secondary,
                  fontSize: 16,
                  fontWeight: active ? '700' : '400',
                }}
              >
                {INTERVAL_LABELS[interval.kind]}
              </Text>
              <Text
                style={{
                  color: colors.secondary,
                  fontSize: 16,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {describeDuration(interval.seconds)}
              </Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function Legend() {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 18 }}>
      {(
        [
          ['Run', colors.accent],
          ['Walk', colors.walk],
        ] as const
      ).map(([label, color]) => (
        <View
          key={label}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              backgroundColor: color,
            }}
          />
          <Text style={{ color: colors.secondary, fontSize: 14 }}>{label}</Text>
        </View>
      ))}
      <Text style={{ color: colors.secondary, fontSize: 14 }}>
        Numbers are minutes
      </Text>
    </View>
  );
}
