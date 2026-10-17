import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { EFFORT_LEVELS, effortLevel } from '@/domain/effort';
import {
  deriveProgress,
  recommend,
  type Recommendation,
} from '@/domain/progression';
import { useProgram } from '@/session/use-program';
import { listAttempts, recordCheck, recordDecision } from '@/storage/database';
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
  const colors = useColors();
  const { attempt } = useLocalSearchParams<{ attempt: string }>();
  const attemptId = Number(attempt);
  const { db, data } = useProgram();
  const [effort, setEffort] = useState<number | null>(null);
  const [pain, setPain] = useState<boolean | null>(null);
  const [advice, setAdvice] = useState<Recommendation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!data) return <Loading label="Loading check-in" />;
  const { plan } = data;
  const row = data.attempts.find((item) => item.id === attemptId);
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
    row.effort !== null && row.pain !== null && row.decision === null
      ? recommend(row.effort, row.pain)
      : null;
  const shownAdvice = advice ?? (savedAdvice !== 'none' ? savedAdvice : null);

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
        params: { stage: String(row!.stage) },
      });
    } else {
      router.dismissAll();
    }
  }

  async function submit() {
    if (effort === null || pain === null) return;
    setBusy(true);
    setError(null);
    try {
      if (row!.effort === null) await recordCheck(db, attemptId, effort, pain);
      const next = recommend(effort, pain);
      if (next === 'none') await finish();
      else {
        setAdvice(next);
        setBusy(false);
      }
    } catch {
      setError('Your answers could not be saved. Please try again.');
      setBusy(false);
    }
  }

  async function decide(decision: 'continue' | 'restart') {
    setBusy(true);
    setError(null);
    try {
      await recordDecision(db, attemptId, decision);
      if (decision === 'restart') router.dismissAll();
      else await finish();
    } catch {
      setError('Your choice could not be saved. Please try again.');
      setBusy(false);
    }
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
