import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { PermissionsAndroid, Platform, Text, View } from 'react-native';

import { INTERVAL_LABELS, describeDuration } from '@/domain/cues';
import { RUNNING_PLAN, getSession, totalSeconds } from '@/domain/plan';
import { SessionRuntime } from '@modules/session-runtime';
import { startSession } from '@/session/controller';
import { useProgram } from '@/session/use-program';
import { colors } from '@/theme/colors';
import {
  Body,
  Button,
  Card,
  ErrorText,
  Heading,
  IntervalBar,
  Loading,
  Screen,
  Title,
  formatClock,
} from '@/ui/kit';

async function requestNotifications() {
  if (Platform.OS !== 'android' || Platform.Version < 33) return;
  // The session runs either way; the notification shows its controls.
  await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
}

export function PreviewScreen() {
  const params = useLocalSearchParams<{
    stage: string;
    index: string;
    replay?: string;
  }>();
  const stageNumber = Number(params.stage);
  const sessionIndex = Number(params.index);
  const isReplay = params.replay === '1';
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
  const next = data.progress.next;
  const playable = isReplay
    ? data.progress.goalReached && stageNumber === RUNNING_PLAN.stages.length
    : next?.stage === stageNumber && next.sessionIndex === sessionIndex;

  async function start() {
    if (!playable) return;
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
          stageAttempt: isReplay ? 1 : next!.stageAttempt,
          isReplay,
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

  return (
    <Screen>
      <Title>
        Stage {stageNumber} · Session {sessionIndex + 1}
      </Title>
      <Body muted>{stage.tip}</Body>
      <Body muted>
        Start your music or podcast, then press Start. You will hear a chime and
        “run” or “walk” at every change; the screen can turn off.
        {Platform.OS === 'ios'
          ? ' The first time, iOS asks to let Build to 30 save workouts to Apple Health — this is what keeps cues playing with the screen locked.'
          : ''}
      </Body>
      {isReplay && (
        <Body muted>
          Replays are saved in history and never change progress.
        </Body>
      )}
      {error && <ErrorText>{error}</ErrorText>}
      <Button
        label="Start"
        onPress={() => void start()}
        disabled={busy || !playable}
      />
      <Card>
        <Heading>{formatClock(totalSeconds(session))} total</Heading>
        <IntervalBar intervals={session.intervals} />
        {session.intervals.map((interval, index) => (
          <View
            key={index}
            style={{ flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <Text
              style={{
                color:
                  interval.kind === 'active' ? colors.text : colors.secondary,
                fontSize: 16,
                fontWeight: interval.kind === 'active' ? '600' : '400',
              }}
            >
              {INTERVAL_LABELS[interval.kind]}
            </Text>
            <Text style={{ color: colors.secondary, fontSize: 16 }}>
              {describeDuration(interval.seconds)}
            </Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
