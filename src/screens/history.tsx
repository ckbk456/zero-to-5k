import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { ACTIVITY_COPY } from '@/domain/activity';
import { effortLevel } from '@/domain/effort';
import { PLAN_CATALOG, RACE_WALKING_PLAN } from '@/domain/plan';
import type { AttemptStatus } from '@/domain/progression';
import { useProgram } from '@/session/use-program';
import { useColors } from '@/theme/colors';
import {
  Body,
  Button,
  Card,
  ErrorText,
  Heading,
  Loading,
  Screen,
  formatClock,
} from '@/ui/kit';

const STATUS_LABELS: Record<AttemptStatus, string> = {
  in_progress: 'In progress',
  completed: 'Completed',
  ended_early: 'Ended early',
  interrupted: 'Interrupted',
};

export function HistoryScreen() {
  const colors = useColors();
  const [version, setVersion] = useState(RACE_WALKING_PLAN.version);
  const { data, error, reload } = useProgram(version);
  if (error)
    return (
      <Screen>
        <ErrorText>{error}</ErrorText>
        <Button label="Try again" onPress={() => void reload()} />
      </Screen>
    );
  if (!data) return <Loading label="Loading history" />;
  const attempts =
    data.plan.version === version ? [...data.attempts].reverse() : [];
  const copy = ACTIVITY_COPY[data.plan.activity];
  const completed = attempts.filter(
    (attempt) => attempt.status === 'completed',
  );
  const timedSeconds = attempts
    .filter((attempt) => attempt.source === 'timed')
    .reduce((sum, attempt) => sum + (attempt.activeSeconds ?? 0), 0);

  return (
    <Screen>
      <Heading>Your time adds up</Heading>
      <Body muted>
        Every session is part of your story, including the ones you cut short.
      </Body>
      <View style={{ gap: 8 }}>
        {PLAN_CATALOG.map(({ plan, label }) => (
          <Button
            key={plan.version}
            label={label}
            kind={version === plan.version ? 'primary' : 'secondary'}
            onPress={() => setVersion(plan.version)}
          />
        ))}
      </View>
      {version !== RACE_WALKING_PLAN.version && (
        <Body muted>
          This is an older plan. Its history is kept separately and does not
          complete stages in your new 12-stage plan.
        </Body>
      )}
      <Card>
        <Heading>{completed.length} sessions completed</Heading>
        <Body muted>
          {Math.floor(timedSeconds / 3600)} hr{' '}
          {Math.floor((timedSeconds % 3600) / 60)} min recorded time, including
          warm-ups and walking breaks. Sessions marked done add no recorded
          time.
        </Body>
      </Card>
      {attempts.length === 0 && (
        <Body muted>
          No sessions yet. Sessions you {copy.verb} or mark done will appear
          here.
        </Body>
      )}
      {attempts.map((attempt, index) => {
        const details = [
          attempt.source === 'manual'
            ? 'Marked done'
            : STATUS_LABELS[attempt.status],
          attempt.activeSeconds !== null
            ? formatClock(attempt.activeSeconds)
            : null,
          attempt.effort !== null
            ? `effort ${attempt.effort} (${effortLevel(attempt.effort).label.toLowerCase()})`
            : null,
          attempt.pain ? 'pain reported' : null,
          attempt.decision === 'restart' ? 'restarted stage' : null,
          attempt.decision === 'continue' ? 'kept going' : null,
        ].filter(Boolean);
        return (
          <View
            key={attempt.id}
            style={{
              gap: 4,
              paddingVertical: 14,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: colors.line,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}
              >
                Stage {attempt.stage}, session {attempt.sessionIndex + 1}
                {attempt.isReplay ? ' (replay)' : ''}
              </Text>
              <Text style={{ color: colors.secondary, fontSize: 15 }}>
                {new Date(attempt.startedAt).toLocaleDateString()}
              </Text>
            </View>
            <Body muted>{details.join(', ')}</Body>
            {attempt.status === 'completed' &&
              attempt.source === 'timed' &&
              (attempt.effort === null ||
                ((attempt.pain || (attempt.effort ?? 0) > 8) &&
                  attempt.decision === null)) && (
                <Button
                  label="Finish check-in"
                  kind="secondary"
                  onPress={() =>
                    router.push({
                      pathname: '/session/check',
                      params: { attempt: String(attempt.id) },
                    })
                  }
                />
              )}
          </View>
        );
      })}
    </Screen>
  );
}
