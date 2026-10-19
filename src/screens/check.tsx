import { useEffect, useRef, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { EFFORT_LEVELS, effortLevel } from '@/domain/effort';
import {
  deriveProgress,
  recommend,
  type Recommendation,
} from '@/domain/progression';
import { useProgram } from '@/session/use-program';
import {
  getAttempt,
  listAttempts,
  recordCheck,
  recordDecision,
  type AttemptHistoryItem,
} from '@/storage/database';
import { useColors } from '@/theme/colors';
import {
  Body,
  Button,
  Card,
  ErrorText,
  Heading,
  Loading,
  Screen,
  Title,
} from '@/ui/kit';

const ADVICE: Record<Exclude<Recommendation, 'none'>, [string, string]> = {
  effort: [
    'That was near your limit',
    'We recommend restarting this stage so the next one stays sustainable. It is your call.',
  ],
  pain: [
    'Rest before your next session',
    'If pain persists or is sharp, get it checked. We recommend restarting this stage when you feel ready.',
  ],
};

export function CheckScreen() {
  const { attempt } = useLocalSearchParams<{ attempt: string }>();
  return <CheckIn key={attempt} attemptId={Number(attempt)} />;
}

function CheckIn({ attemptId }: { attemptId: number }) {
  const colors = useColors();
  const db = useSQLiteContext();
  const [planVersion, setPlanVersion] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const { data, error: loadError } = useProgram(planVersion ?? undefined);
  const [effort, setEffort] = useState<number | null>(null);
  const [pain, setPain] = useState<boolean | null>(null);
  const [savedRow, setSavedRow] = useState<AttemptHistoryItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);

  useEffect(() => {
    let active = true;
    void getAttempt(db, attemptId)
      .then((row) => {
        if (!active) return;
        if (row) setPlanVersion(row.planVersion);
        else setLookupError('This session could not be found.');
      })
      .catch(
        () =>
          active &&
          setLookupError(
            'This session could not be loaded. Return to History and try again.',
          ),
      );
    return () => {
      active = false;
    };
  }, [db, attemptId]);

  if (lookupError || loadError)
    return (
      <Screen>
        <ErrorText>{lookupError ?? loadError}</ErrorText>
        <Button label="Back to stages" onPress={() => router.dismissAll()} />
      </Screen>
    );
  if (!data || !planVersion || data.plan.version !== planVersion)
    return <Loading label="Loading check-in" />;
  const { plan } = data;
  const row =
    savedRow?.id === attemptId
      ? savedRow
      : data.attempts.find((item) => item.id === attemptId);
  if (!row || row.status !== 'completed' || row.source !== 'timed') {
    return (
      <Screen>
        <ErrorText>This session cannot be checked in.</ErrorText>
        <Button label="Back to stages" onPress={() => router.dismissAll()} />
      </Screen>
    );
  }
  const stageIndex = row.stage - 1;

  // A rating already saved (for example before the app closed) skips straight
  // to the decision.
  const savedAdvice =
    row.effort !== null && row.pain !== null
      ? recommend(row.effort, row.pain)
      : null;
  const shownAdvice = row.decision === null ? savedAdvice : null;

  // Reads are repeated before writes because a prior Save may have succeeded
  // even if the subsequent read or navigation failed. Never replace saved answers.
  async function readSavedAttempt() {
    const latest = (await listAttempts(db, plan.version)).find(
      (item) => item.id === attemptId,
    );
    if (!latest || latest.status !== 'completed' || latest.source !== 'timed') {
      throw new Error('This session cannot be checked in.');
    }
    setSavedRow(latest);
    return latest;
  }

  // Shows the stage result only when this session finished the stage.
  async function finish() {
    const attempts = await listAttempts(db, plan.version);
    const before = deriveProgress(
      plan,
      attempts.filter((item) => item.id !== attemptId),
    ).stages[stageIndex]?.state;
    const after = deriveProgress(plan, attempts).stages[stageIndex]?.state;
    if ((after === 'cleared' || after === 'completed') && before !== after) {
      router.replace({
        pathname: '/stage-result',
        params: { stage: String(row!.stage), plan: plan.version },
      });
    } else {
      router.dismissAll();
    }
  }

  async function submit() {
    if (effort === null || pain === null || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      let latest = await readSavedAttempt();
      if (latest.effort === null) {
        await recordCheck(db, attemptId, effort, pain);
        latest = await readSavedAttempt();
      }
      if (latest.effort === null || latest.pain === null) {
        throw new Error('Your answers were not saved.');
      }
      if (latest.decision === 'restart') router.dismissAll();
      else if (
        recommend(latest.effort, latest.pain) === 'none' ||
        latest.decision === 'continue'
      ) {
        await finish();
      }
    } catch {
      setError(
        'Your check-in could not finish. Please try again; any saved answers are kept.',
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function decide(decision: 'continue' | 'restart') {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      let latest = await readSavedAttempt();
      if (latest.decision === null) {
        await recordDecision(db, attemptId, decision);
        latest = await readSavedAttempt();
      }
      if (latest.decision === 'restart') router.dismissAll();
      else await finish();
    } catch {
      setError(
        'Your choice could not finish. Please try again; any saved choice is kept.',
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function continueSaved() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      const latest = await readSavedAttempt();
      if (latest.decision === 'restart') router.dismissAll();
      else await finish();
    } catch {
      setError(
        'Your check-in is saved, but the next screen could not load. Please try again.',
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  if (
    savedAdvice !== null &&
    (savedAdvice === 'none' || row.decision !== null)
  ) {
    return (
      <Screen>
        <Title>Check-in saved</Title>
        <Body>
          Your effort rating and pain answer are already recorded. You do not
          need to enter them again.
        </Body>
        {error && <ErrorText>{error}</ErrorText>}
        <Button
          label="Continue"
          disabled={busy}
          onPress={() => void continueSaved()}
        />
      </Screen>
    );
  }

  if (shownAdvice && shownAdvice !== 'none') {
    const [title, text] = ADVICE[shownAdvice];
    return (
      <Screen>
        <Title>{title}</Title>
        <Body>{text}</Body>
        {error && <ErrorText>{error}</ErrorText>}
        <Button
          label={`Restart stage ${row.stage}`}
          onPress={() => void decide('restart')}
          disabled={busy}
        />
        <Button
          label="Keep going"
          kind="secondary"
          onPress={() => void decide('continue')}
          disabled={busy}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Session complete 👏</Title>
      <Card>
        <Heading>How hard was it?</Heading>
        <Body muted>0 is resting, 10 is your absolute maximum.</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {EFFORT_LEVELS.map((level) => {
            const selected = effort === level.value;
            return (
              <Pressable
                key={level.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${level.value}, ${level.label}, ${level.talk}`}
                onPress={() => setEffort(level.value)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? colors.accent : colors.track,
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '600',
                    color: selected ? colors.onAccent : colors.text,
                  }}
                >
                  {level.value}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {effort !== null && (
          <Body>
            <Text style={{ fontWeight: '600' }}>
              {effortLevel(effort).label}
            </Text>
            {' — '}
            {effortLevel(effort).talk.toLowerCase()}
          </Body>
        )}
      </Card>

      <Card>
        <Heading>Any pain during or after this session?</Heading>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[
            ['No', false],
            ['Yes', true],
          ].map(([label, value]) => (
            <View key={String(label)} style={{ flex: 1 }}>
              <Button
                label={label as string}
                kind={pain === value ? 'primary' : 'secondary'}
                onPress={() => setPain(value as boolean)}
              />
            </View>
          ))}
        </View>
      </Card>

      {error && <ErrorText>{error}</ErrorText>}
      <Button
        label="Save"
        onPress={() => void submit()}
        disabled={busy || effort === null || pain === null}
      />
    </Screen>
  );
}
