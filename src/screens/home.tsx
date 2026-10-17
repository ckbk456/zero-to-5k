import { useEffect, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { ACTIVITIES, ACTIVITY_COPY, type Activity } from '@/domain/activity';
import { intervalLabel } from '@/domain/cues';
import {
  SESSIONS_PER_STAGE,
  totalSeconds,
  type Plan,
  type Session,
} from '@/domain/plan';
import type { StageProgress, StageState } from '@/domain/progression';
import { summarizeSession } from '@/domain/summary';
import { SessionRuntime } from '@modules/session-runtime';
import { settle } from '@/session/controller';
import { useProgram } from '@/session/use-program';
import { setPreferredActivity } from '@/storage/database';
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
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

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

  const { plan, progress } = data;
  const copy = ACTIVITY_COPY[plan.activity];
  const goalMinutes = plan.goalSeconds / 60;
  const selected = picked ?? progress.next?.stage ?? plan.stages.length;

  // The selection changes only once it is saved.
  async function switchTo(activity: Activity) {
    if (activity === plan.activity) return;
    setSwitching(true);
    setSwitchError(null);
    try {
      await setPreferredActivity(db, activity);
      setPicked(null);
      await reload();
    } catch {
      setSwitchError('That did not save. Please try again.');
    } finally {
      setSwitching(false);
    }
  }

  return (
    <Screen edgeToEdge>
      <View style={{ gap: 6 }}>
        <Title>Build to 30</Title>
        <Body muted>
          {copy.intro} Start with stage 1 or tap any stage below.
        </Body>
      </View>

      <View style={{ gap: 8 }}>
        <ActivitySwitch
          selected={plan.activity}
          disabled={switching}
          onSelect={(activity) => void switchTo(activity)}
        />
        {switchError && <ErrorText>{switchError}</ErrorText>}
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
          <Heading>
            You can {copy.verb} for {goalMinutes} minutes
          </Heading>
          <Body muted>
            Keep it up with any session, three times a week. Every{' '}
            {copy.active.toLowerCase()} is saved in your history.
          </Body>
        </Card>
      )}

      <StagePanel
        key={`${plan.version}-${selected}`}
        plan={plan}
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

// Running and race walking, each with its own stages and history.
function ActivitySwitch({
  selected,
  disabled,
  onSelect,
}: {
  selected: Activity;
  disabled: boolean;
  onSelect: (activity: Activity) => void;
}) {
  const colors = useColors();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        padding: 3,
        borderRadius: 14,
        borderCurve: 'continuous',
        backgroundColor: colors.track,
      }}
    >
      {ACTIVITIES.map((activity) => {
        const isSelected = activity === selected;
        return (
          <Pressable
            key={activity}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected, disabled }}
            disabled={disabled}
            onPress={() => onSelect(activity)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 44,
              borderRadius: 11,
              borderCurve: 'continuous',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isSelected ? colors.accent : 'transparent',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                color: isSelected ? colors.onAccent : colors.secondary,
                fontSize: 16,
                fontWeight: isSelected ? '700' : '500',
              }}
            >
              {ACTIVITY_COPY[activity].name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Up to nine stops per line; 16 race-walking stages make two lines of 8.
const MAX_STOPS_PER_LINE = 9;

// A stepper: numbered stops joined by a line, so it reads as a sequence.
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
  const lineCount = Math.ceil(stages.length / MAX_STOPS_PER_LINE);
  const perLine = Math.ceil(stages.length / lineCount);
  const stops = stages.map((stage, index) => ({ stage, index }));
  const lines = Array.from({ length: lineCount }, (_, line) =>
    stops.slice(line * perLine, (line + 1) * perLine),
  );
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
      <View accessibilityRole="tablist" style={{ gap: 6 }}>
        {lines.map((line, lineIndex) => (
          <View key={lineIndex} style={{ flexDirection: 'row' }}>
            {line.map(({ stage, index }, position) => {
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
                    width: `${100 / perLine}%`,
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  {position > 0 && (
                    <Connector left filled={finished[index - 1]!} />
                  )}
                  {position < line.length - 1 && <Connector filled={done} />}
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
        ))}
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
  plan,
  number,
  stage,
  suggested,
}: {
  plan: Plan;
  number: number;
  stage: StageProgress;
  suggested: boolean;
}) {
  const colors = useColors();
  const definition = plan.stages[number - 1]!;
  const focus = Math.max(0, stage.done.indexOf(false));
  const [open, setOpen] = useState<number | null>(focus);
  const target = open ?? focus;
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
        {definition.tip}
      </Text>

      <View>
        {definition.sessions.map((session, index) => {
          const done = stage.done[index];
          const expanded = open === index;
          return (
            <View
              key={index}
              style={{ borderTopWidth: 1, borderTopColor: colors.laneLine }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`Session ${index + 1}, ${formatMinutes(totalSeconds(session))}, ${done ? 'done' : 'not done'}`}
                accessibilityHint={
                  expanded ? 'Hides its intervals' : 'Shows its intervals'
                }
                onPress={() => setOpen(expanded ? null : index)}
                style={({ pressed }) => ({
                  minHeight: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
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
                    fontWeight: expanded ? '700' : '500',
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
                <Text
                  style={{
                    color: colors.onLaneMuted,
                    fontSize: 20,
                    transform: [{ rotate: expanded ? '90deg' : '0deg' }],
                  }}
                >
                  ›
                </Text>
              </Pressable>
              {expanded && (
                <View style={{ gap: 12, paddingBottom: 16 }}>
                  <IntervalBar
                    tone="lane"
                    showTotal={false}
                    intervals={session.intervals}
                    activity={plan.activity}
                  />
                  <SessionSteps session={session} activity={plan.activity} />
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Button
        kind="lane"
        label={`Preview session ${target + 1}`}
        accessibilityHint={
          suggested && target === focus
            ? 'This is the next session in your plan'
            : undefined
        }
        onPress={() => openSession(number, target)}
      />
    </View>
  );
}

// The session's intervals in a few lines: repeated active/walk pairs read as
// one step with a count.
function SessionSteps({
  session,
  activity,
}: {
  session: Session;
  activity: Activity;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      {summarizeSession(session).map((step, index) => {
        const active = step.kind === 'cycle' || step.interval.kind === 'active';
        return (
          <View
            key={index}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <View
              style={{
                width: 3,
                height: 16,
                borderRadius: 1.5,
                backgroundColor: active ? colors.onLane : colors.laneWalk,
              }}
            />
            <Text
              style={{
                flex: 1,
                color: active ? colors.onLane : colors.onLaneMuted,
                fontSize: 15,
                fontVariant: ['tabular-nums'],
              }}
            >
              {step.kind === 'cycle'
                ? `${ACTIVITY_COPY[activity].active} ${formatMinutes(step.active)}, walk ${formatMinutes(step.walk)}`
                : `${intervalLabel(step.interval.kind, activity)} ${formatMinutes(step.interval.seconds)}`}
            </Text>
            {step.kind === 'cycle' && step.times > 1 && (
              <Text
                style={{
                  color: colors.onLane,
                  fontSize: 15,
                  fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                }}
              >
                × {step.times}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
