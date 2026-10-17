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
          stage 1 or tap any stage below.
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

// A stepper: nine numbered stops on one line, so it reads as a sequence.
// Finished stages are filled and the line between them fills in; the picked
// stage gets a ring. Session-level detail lives in the panel below.
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
  const finished = stages.map(
    (stage) => stage.state === 'completed' || stage.state === 'cleared',
  );
  const finishedCount = finished.filter(Boolean).length;
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
          Stages
        </Text>
        <Text style={{ color: colors.secondary, fontSize: 15 }}>
          {finishedCount} of {stages.length} done
        </Text>
      </View>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row' }}>
        {stages.map((stage, index) => {
          const number = index + 1;
          const isSelected = number === selected;
          const done = finished[index]!;
          return (
            <Pressable
              key={number}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Stage ${number}, ${STATE_LABELS[stage.state]}`}
              hitSlop={{ top: 8, bottom: 8 }}
              onPress={() => onSelect(number)}
              style={({ pressed }) => ({
                flex: 1,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              {index > 0 && <Connector left filled={finished[index - 1]!} />}
              {index < stages.length - 1 && <Connector filled={done} />}
              <View
                style={{
                  width: isSelected ? 34 : 28,
                  height: isSelected ? 34 : 28,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done ? colors.accent : colors.background,
                  borderWidth: isSelected ? 2.5 : 1.5,
                  borderColor: isSelected
                    ? colors.text
                    : done || stage.state === 'in_progress'
                      ? colors.accent
                      : colors.line,
                }}
              >
                <Text
                  style={{
                    color: done
                      ? colors.onAccent
                      : isSelected
                        ? colors.text
                        : colors.secondary,
                    fontSize: isSelected ? 15 : 13,
                    fontWeight: isSelected ? '800' : '600',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {number}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Half of the line joining two stops, drawn behind the circle.
function Connector({ left, filled }: { left?: boolean; filled: boolean }) {
  const colors = useColors();
  return (
    <View
      style={{
        position: 'absolute',
        top: 19,
        height: 2,
        left: left ? 0 : '50%',
        right: left ? '50%' : 0,
        backgroundColor: filled ? colors.accent : colors.line,
      }}
    />
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
