import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, PermissionsAndroid, Platform, Text, View } from 'react-native';

import { ACTIVITY_COPY, type Activity } from '@/domain/activity';
import { describeDuration, intervalLabel } from '@/domain/cues';
import { activeSeconds, getSession, totalSeconds } from '@/domain/plan';
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
  formatMinutes,
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
  const { db, data, error: loadError, reload } = useProgram();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loadError)
    return (
      <Screen>
        <ErrorText>{loadError}</ErrorText>
        <Button label="Try again" onPress={() => void reload()} />
      </Screen>
    );
  if (!data) return <Loading label="Loading session" />;
  const { plan } = data;
  const stage = plan.stages[stageNumber - 1];
  if (!stage || !stage.sessions[sessionIndex]) {
    return (
      <Screen>
        <ErrorText>This session does not exist.</ErrorText>
      </Screen>
    );
  }

  const copy = ACTIVITY_COPY[plan.activity];
  const session = getSession(plan, stageNumber, sessionIndex);
  const progress = data.progress.stages[stageNumber - 1]!;
  const alreadyDone = progress.done[sessionIndex] === true;
  const suggestedStage = data.progress.next?.stage;
  const ahead =
    data.progress.next !== null &&
    data.progress.next !== undefined &&
    (stageNumber > data.progress.next.stage ||
      (stageNumber === data.progress.next.stage &&
        sessionIndex > data.progress.next.sessionIndex));

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await requestNotifications();
      await SessionRuntime.prepare();
      const attemptId = await startSession(
        db,
        SessionRuntime,
        plan,
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
        planVersion: plan.version,
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
      `Use this for a session you ${copy.past} without the app. It counts toward the stage but has no effort rating, so the stage can be completed but not cleared.`,
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
        {session.title && <Body>{session.title}</Body>}
        <Body muted>
          {formatMinutes(activeSeconds(session))} race walking ·{' '}
          {formatMinutes(totalSeconds(session))} including warm-up, breaks and
          cool-down
        </Body>
      </View>

      <IntervalBar intervals={session.intervals} activity={plan.activity} />
      <Legend activity={plan.activity} />

      {ahead && (
        <Note>
          Your next suggested session is stage {suggestedStage}, session{' '}
          {(data.progress.next?.sessionIndex ?? 0) + 1}. The sessions build on
          each other, especially from stage 5. You can still choose any session.
        </Note>
      )}
      {alreadyDone && (
        <Body muted>
          You have done this session. Repeating it is always fine.
        </Body>
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
        “{copy.active.toLowerCase()}” or “walk” at every change; the screen can
        turn off when background support is available.
        {Platform.OS === 'ios'
          ? ' iOS asks for workout permission to support screen-off cues. If unavailable, the session screen will tell you to keep it on.'
          : ''}
      </Body>
      <Button
        kind="secondary"
        label="Try the cues · 30 seconds"
        disabled={busy}
        onPress={() => router.push('/cue-check')}
      />

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
                {intervalLabel(interval.kind, plan.activity)}
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

function Legend({ activity }: { activity: Activity }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
      {(
        [
          [ACTIVITY_COPY[activity].active, colors.accent],
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
