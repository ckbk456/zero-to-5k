import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, AppState, BackHandler, Text, View } from 'react-native';

import { ACTIVITY_COPY } from '@/domain/activity';
import { intervalLabel } from '@/domain/cues';
import {
  getSession,
  planByVersion,
  type Interval,
  type Plan,
} from '@/domain/plan';
import { SessionRuntime, type RuntimeState } from '@modules/session-runtime';
import { settle } from '@/session/controller';
import { getAttempt } from '@/storage/database';
import { useColors } from '@/theme/colors';
import {
  Body,
  Button,
  Card,
  ErrorText,
  IntervalBar,
  Loading,
  Screen,
  formatClock,
} from '@/ui/kit';

function locate(intervals: readonly Interval[], elapsedSeconds: number) {
  let end = 0;
  for (const [index, interval] of intervals.entries()) {
    end += interval.seconds;
    if (elapsedSeconds < end) {
      return { index, interval, remaining: end - elapsedSeconds };
    }
  }
  const last = intervals.length - 1;
  return { index: last, interval: intervals[last]!, remaining: 0 };
}

export function LiveScreen() {
  const colors = useColors();
  const { attempt } = useLocalSearchParams<{ attempt: string }>();
  const attemptId = Number(attempt);
  const db = useSQLiteContext();
  const [state, setState] = useState<RuntimeState | null>(null);
  const [target, setTarget] = useState<{
    plan: Plan;
    stage: number;
    sessionIndex: number;
    isReplay: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const leaving = useRef(false);

  // The attempt names its own plan, whichever activity is selected.
  useEffect(() => {
    void getAttempt(db, attemptId).then((row) => {
      const plan = row && planByVersion(row.planVersion);
      if (row && plan) setTarget({ ...row, plan });
      else setError('This session could not be found.');
    });
  }, [db, attemptId]);

  // The runtime is the source of truth; poll it while visible and listen for
  // status changes.
  useEffect(() => {
    let active = true;
    const refresh = () =>
      void SessionRuntime.getState().then((next) => active && setState(next));
    refresh();
    const timer = setInterval(refresh, 500);
    const subscription = SessionRuntime.addListener('onStateChange', (next) => {
      if (active) setState(next);
    });
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
      appState.remove();
      back.remove();
    };
  }, []);

  // Record the result once the runtime finishes or the user ends early.
  useEffect(() => {
    if (!state || !target || leaving.current) return;
    const done = state.status === 'finished' || state.status === 'ended';
    const lost = state.status === 'idle';
    if (!done && !lost) return;
    leaving.current = true;
    void settle(db, SessionRuntime)
      .then((result) => {
        if (result.kind === 'completed' && !target.isReplay) {
          router.replace({
            pathname: '/session/check',
            params: { attempt: String(attemptId) },
          });
        } else {
          router.dismissAll();
        }
      })
      .catch(() => {
        leaving.current = false;
        setError('Your session could not be saved. Please try again.');
      });
  }, [state, target, db, attemptId]);

  const header = (
    <Stack.Screen
      options={{
        title: target ? ACTIVITY_COPY[target.plan.activity].name : '',
      }}
    />
  );
  if (error) {
    return (
      <Screen>
        {header}
        <ErrorText>{error}</ErrorText>
        <Button label="Back to stages" onPress={() => router.dismissAll()} />
      </Screen>
    );
  }
  if (!state || !target) {
    return (
      <>
        {header}
        <Loading label="Loading session" />
      </>
    );
  }

  const { activity } = target.plan;
  const session = getSession(target.plan, target.stage, target.sessionIndex);
  const elapsed = state.elapsedMs / 1000;
  const total = state.totalMs / 1000;
  const { index, interval, remaining } = locate(session.intervals, elapsed);
  const next = session.intervals[index + 1];
  const paused = state.status === 'paused';
  const active = interval.kind === 'active';
  const label = intervalLabel(interval.kind, activity);

  function confirmEnd() {
    Alert.alert(
      'End this session?',
      'It will not count as completed. You can start it again any time.',
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'End session',
          style: 'destructive',
          onPress: () => void SessionRuntime.end(),
        },
      ],
    );
  }

  return (
    <Screen>
      {header}
      <Text style={{ color: colors.secondary, fontSize: 16 }}>
        Stage {target.stage}, session {target.sessionIndex + 1}
        {target.isReplay ? ' (replay)' : ''}
      </Text>

      <View
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${label}, ${formatClock(remaining)} left`}
        style={{
          alignItems: 'center',
          paddingVertical: 32,
          gap: 2,
          borderRadius: 28,
          borderCurve: 'continuous',
          backgroundColor: active ? colors.lane : colors.card,
          borderWidth: active ? 0 : 1,
          borderColor: colors.line,
        }}
      >
        <Text
          style={{
            color: active ? colors.onLane : colors.text,
            fontSize: 40,
            fontWeight: '800',
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: active ? colors.onLane : colors.text,
            fontSize: 88,
            lineHeight: 96,
            fontWeight: '200',
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatClock(remaining)}
        </Text>
        {paused && (
          <Text
            style={{
              color: active ? colors.onLane : colors.warning,
              fontSize: 20,
              fontWeight: '700',
            }}
          >
            {state.pausedBy === 'call' ? 'Paused for a call' : 'Paused'}
          </Text>
        )}
      </View>

      <Card>
        <IntervalBar
          intervals={session.intervals}
          activity={activity}
          progress={total > 0 ? elapsed / total : 0}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Body muted>{formatClock(elapsed)} done</Body>
          <Body muted>{formatClock(total - elapsed)} left</Body>
        </View>
        {next && (
          <Body muted>
            Next: {intervalLabel(next.kind, activity)} for{' '}
            {formatClock(next.seconds)}
          </Body>
        )}
      </Card>

      {!state.backgroundCapable && (
        <Card>
          <Text
            style={{ color: colors.warning, fontSize: 16, fontWeight: '600' }}
          >
            Keep the screen on
          </Text>
          <Body>
            Cues stop if the phone locks. To {ACTIVITY_COPY[activity].verb} with
            the screen off, allow Build to 30 to save workouts in the Health app
            (Sharing → Apps), on iOS 26 or later.
          </Body>
        </Card>
      )}

      <Button
        label={paused ? 'Resume' : 'Pause'}
        onPress={() =>
          void (paused ? SessionRuntime.resume() : SessionRuntime.pause()).then(
            setState,
          )
        }
      />
      <Button label="End session" kind="danger" onPress={confirmEnd} />
    </Screen>
  );
}
