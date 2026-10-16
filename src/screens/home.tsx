import { useEffect, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { Text, View } from 'react-native';

import { RUNNING_PLAN, SESSIONS_PER_STAGE, totalSeconds } from '@/domain/plan';
import type { StageState } from '@/domain/progression';
import { SessionRuntime } from '@modules/session-runtime';
import { settle } from '@/session/controller';
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
  Row,
  Screen,
  Title,
} from '@/ui/kit';

const STATE_LABELS: Record<StageState, string> = {
  locked: 'Locked',
  current: 'Current',
  completed: 'Completed',
  cleared: 'Cleared',
};

const STATE_ICONS: Record<StageState, string> = {
  locked: '○',
  current: '▶',
  completed: '✓',
  cleared: '★',
};

export function HomeScreen() {
  const { db, data, error, reload } = useProgram();
  const [settled, setSettled] = useState(false);

  // Reattach to a live session or record one that ended while away.
  useEffect(() => {
    let active = true;
    void settle(db, SessionRuntime)
      .then((result) => {
        if (!active) return;
        if (result.kind === 'live') {
          router.push({
            pathname: '/session/live',
            params: { attempt: String(result.attemptId) },
          });
        }
        // A session that finished while away surfaces as a pending check-in.
        return reload();
      })
      .catch(() => {})
      .finally(() => active && setSettled(true));
    return () => {
      active = false;
    };
  }, [db, reload]);

  if (error) {
    return (
      <Screen>
        <ErrorText>{error}</ErrorText>
        <Button label="Try again" onPress={() => void reload()} />
      </Screen>
    );
  }
  if (!data || !settled) return <Loading label="Loading your progress" />;
  if (!data.settings.onboarded) return <Redirect href="/welcome" />;

  const { progress } = data;
  const next = progress.next;

  return (
    <Screen>
      <Title>Build to 30</Title>
      <Body muted>
        Clear 9 stages to run for 30 minutes without stopping. Finishing the
        planned time is what counts — not distance or speed.
      </Body>

      {progress.pending && (
        <Card>
          <Heading>Finish your check-in</Heading>
          <Body>Tell us how your last session felt before the next one.</Body>
          <Button
            label="Check in"
            onPress={() =>
              router.push({
                pathname: '/session/check',
                params: { attempt: String(progress.pending!.attemptId) },
              })
            }
          />
        </Card>
      )}

      {progress.goalReached && (
        <Card>
          <Heading>Goal reached 🎉</Heading>
          <Body>
            You can run for 30 minutes. Replay any stage 9 session to keep it
            up; replays are saved in your history.
          </Body>
          {[0, 1, 2].map((index) => (
            <Button
              key={index}
              kind="secondary"
              label={`Replay stage 9, session ${index + 1}`}
              onPress={() =>
                router.push({
                  pathname: '/session/preview',
                  params: { stage: '9', index: String(index), replay: '1' },
                })
              }
            />
          ))}
        </Card>
      )}

      {next && (
        <Card>
          <Text style={{ color: colors.accent, fontWeight: '600' }}>
            STAGE {next.stage}
            {next.stageAttempt > 1 ? ` · ATTEMPT ${next.stageAttempt}` : ''}
          </Text>
          <Heading>
            Session {next.sessionIndex + 1} of {SESSIONS_PER_STAGE}
          </Heading>
          <Body muted>{RUNNING_PLAN.stages[next.stage - 1]?.tip}</Body>
          <SessionDots done={next.sessionIndex} />
          <IntervalBar
            intervals={
              RUNNING_PLAN.stages[next.stage - 1]!.sessions[next.sessionIndex]!
                .intervals
            }
          />
          <Button
            label="Preview session"
            onPress={() =>
              router.push({
                pathname: '/session/preview',
                params: {
                  stage: String(next.stage),
                  index: String(next.sessionIndex),
                },
              })
            }
          />
        </Card>
      )}

      <Card>
        <Heading>Stages</Heading>
        {RUNNING_PLAN.stages.map((stage, index) => {
          const state = progress.stages[index] ?? 'locked';
          const minutes = Math.round(
            Math.max(...stage.sessions.map(totalSeconds)) / 60,
          );
          return (
            <View
              key={stage.number}
              accessible
              accessibilityLabel={`Stage ${stage.number}, ${STATE_LABELS[state]}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                minHeight: 40,
                opacity: state === 'locked' ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  width: 24,
                  textAlign: 'center',
                  fontSize: 18,
                  color: state === 'locked' ? colors.secondary : colors.accent,
                }}
              >
                {STATE_ICONS[state]}
              </Text>
              <Text style={{ flex: 1, color: colors.text, fontSize: 17 }}>
                Stage {stage.number}
              </Text>
              <Text style={{ color: colors.secondary, fontSize: 15 }}>
                {STATE_LABELS[state]} · up to {minutes} min
              </Text>
            </View>
          );
        })}
        <Body muted>
          ★ cleared: every session at effort 8 or lower with no pain. ✓
          completed: you kept going after a recommendation to restart.
        </Body>
      </Card>

      <Card>
        <Row label="History" onPress={() => router.push('/history')} />
        <Row label="Settings" onPress={() => router.push('/settings')} />
      </Card>
    </Screen>
  );
}

function SessionDots({ done }: { done: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {Array.from({ length: SESSIONS_PER_STAGE }, (_, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            backgroundColor: index < done ? colors.accent : colors.track,
          }}
        />
      ))}
    </View>
  );
}
