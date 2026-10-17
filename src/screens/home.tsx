import { useEffect, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { RUNNING_PLAN, SESSIONS_PER_STAGE, totalSeconds } from '@/domain/plan';
import type { StageProgress, StageState } from '@/domain/progression';
import { SessionRuntime } from '@modules/session-runtime';
import { settle } from '@/session/controller';
import { useProgram } from '@/session/use-program';
import { useColors } from '@/theme/colors';
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
  formatMinutes,
} from '@/ui/kit';

const STATE_LABELS: Record<StageState, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  cleared: 'Cleared',
};

function openSession(stage: number, index: number) {
  router.push({
    pathname: '/session/preview',
    params: { stage: String(stage), index: String(index) },
  });
}

export function HomeScreen() {
  const { db, data, error, reload } = useProgram();
  const [settled, setSettled] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

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
      <Screen edgeToEdge>
        <ErrorText>{error}</ErrorText>
        <Button label="Try again" onPress={() => void reload()} />
      </Screen>
    );
  }
  if (!data || !settled) return <Loading label="Loading your progress" />;
  if (!data.settings.onboarded) return <Redirect href="/welcome" />;

  const { progress } = data;
  const selected = picked ?? progress.next?.stage ?? RUNNING_PLAN.stages.length;

  return (
    <Screen edgeToEdge>
      <View style={{ gap: 6 }}>
        <Title>Build to 30</Title>
        <Body muted>
          Nine stages to 30 minutes of running without stopping. Start with
          stage 1 or pick any stage.
        </Body>
      </View>

      <StagePicker
        stages={progress.stages}
        selected={selected}
        onSelect={setPicked}
      />

      {progress.pending && (
        <Card>
          <Heading>How did your last session go?</Heading>
          <Body muted>
            Rate it so the app can tell whether this stage is in control.
          </Body>
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
          <Heading>You can run for 30 minutes</Heading>
          <Body muted>
            Keep it up with any session, three times a week. Every run is saved
            in your history.
          </Body>
        </Card>
      )}

      <StagePanel
        number={selected}
        stage={progress.stages[selected - 1]!}
        suggested={progress.next?.stage === selected}
      />

      <View>
        <Row label="History" onPress={() => router.push('/history')} />
        <Row label="Settings" onPress={() => router.push('/settings')} last />
      </View>

      <Body muted>
        Cleared means every session felt manageable (effort 8 or lower) with no
        pain. Completed means every session is done.
      </Body>
    </Screen>
  );
}

// Nine numbered lanes. Done stages are filled; a stage in progress shows a
// dot per session.
function StagePicker({
  stages,
  selected,
  onSelect,
}: {
  stages: readonly StageProgress[];
  selected: number;
  onSelect: (stage: number) => void;
}) {
  const colors = useColors();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 5 }}>
      {stages.map((stage, index) => {
        const number = index + 1;
        const isSelected = number === selected;
        const finished =
          stage.state === 'completed' || stage.state === 'cleared';
        return (
          <Pressable
            key={number}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Stage ${number}, ${STATE_LABELS[stage.state]}`}
            hitSlop={{ top: 6, bottom: 6 }}
            onPress={() => onSelect(number)}
            style={({ pressed }) => ({
              flex: 1,
              height: 52,
              borderRadius: 12,
              borderCurve: 'continuous',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: finished ? colors.accent : colors.card,
              borderWidth: isSelected ? 2.5 : 1,
              borderColor: isSelected ? colors.text : colors.line,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                color: finished ? colors.onAccent : colors.text,
                fontSize: 18,
                fontWeight: isSelected ? '800' : '600',
                fontVariant: ['tabular-nums'],
              }}
            >
              {number}
            </Text>
            {stage.state === 'in_progress' && (
              <View style={{ flexDirection: 'row', gap: 3, marginTop: 3 }}>
                {stage.done.map((done, session) => (
                  <View
                    key={session}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      backgroundColor: done ? colors.accent : colors.line,
                    }}
                  />
                ))}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function StagePanel({
  number,
  stage,
  suggested,
}: {
  number: number;
  stage: StageProgress;
  suggested: boolean;
}) {
  const colors = useColors();
  const plan = RUNNING_PLAN.stages[number - 1]!;
  const focus = Math.max(0, stage.done.indexOf(false));
  const doneCount = stage.done.filter(Boolean).length;
  const status =
    stage.state === 'cleared'
      ? 'Cleared'
      : stage.state === 'completed'
        ? 'Completed'
        : `${doneCount} of ${SESSIONS_PER_STAGE} done`;

  return (
    <View
      style={{
        backgroundColor: colors.lane,
        borderRadius: 28,
        borderCurve: 'continuous',
        padding: 22,
        gap: 18,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <View accessible accessibilityRole="header">
          <Text style={{ color: colors.onLaneMuted, fontSize: 17 }}>Stage</Text>
          <Text
            style={{
              color: colors.onLane,
              fontSize: 76,
              lineHeight: 80,
              fontWeight: '900',
              letterSpacing: -3,
              fontVariant: ['tabular-nums'],
            }}
          >
            {number}
          </Text>
        </View>
        <Text
          style={{
            color: colors.onLane,
            fontSize: 15,
            fontWeight: '600',
            paddingBottom: 12,
          }}
        >
          {status}
        </Text>
      </View>

      <Text style={{ color: colors.onLaneMuted, fontSize: 16, lineHeight: 23 }}>
        {plan.tip}
      </Text>

      <IntervalBar tone="lane" intervals={plan.sessions[focus]!.intervals} />

      <View>
        {plan.sessions.map((session, index) => {
          const done = stage.done[index];
          return (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={`Session ${index + 1}, ${formatMinutes(totalSeconds(session))}, ${done ? 'done' : 'not done'}`}
              accessibilityHint="Opens the session to start it or mark it done"
              onPress={() => openSession(number, index)}
              style={({ pressed }) => ({
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                borderTopWidth: 1,
                borderTopColor: colors.laneLine,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done ? colors.onLane : 'transparent',
                  borderWidth: 2,
                  borderColor: done ? colors.onLane : colors.onLaneMuted,
                }}
              >
                {done && (
                  <Text
                    style={{
                      color: colors.lane,
                      fontSize: 14,
                      fontWeight: '900',
                    }}
                  >
                    ✓
                  </Text>
                )}
              </View>
              <Text
                style={{
                  flex: 1,
                  color: colors.onLane,
                  fontSize: 17,
                  fontWeight: index === focus && !done ? '700' : '500',
                }}
              >
                Session {index + 1}
              </Text>
              <Text
                style={{
                  color: colors.onLaneMuted,
                  fontSize: 15,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatMinutes(totalSeconds(session))}
              </Text>
              <Text style={{ color: colors.onLaneMuted, fontSize: 20 }}>›</Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        kind="lane"
        label={`Preview session ${focus + 1}`}
        accessibilityHint={
          suggested ? 'This is the next session in your plan' : undefined
        }
        onPress={() => openSession(number, focus)}
      />
    </View>
  );
}
