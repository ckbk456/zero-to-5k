import { Text, View } from 'react-native';

import { effortLevel } from '@/domain/effort';
import type { AttemptStatus } from '@/domain/progression';
import { useProgram } from '@/session/use-program';
import { colors } from '@/theme/colors';
import { Body, Card, Loading, Screen, formatClock } from '@/ui/kit';

const STATUS_LABELS: Record<AttemptStatus, string> = {
  in_progress: 'In progress',
  completed: 'Completed',
  ended_early: 'Ended early',
  interrupted: 'Interrupted',
};

export function HistoryScreen() {
  const { data } = useProgram();
  if (!data) return <Loading label="Loading history" />;
  const attempts = [...data.attempts].reverse();

  return (
    <Screen>
      {attempts.length === 0 && (
        <Body muted>Your sessions will appear here.</Body>
      )}
      {attempts.map((attempt) => {
        const details = [
          STATUS_LABELS[attempt.status],
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
          <Card key={attempt.id} style={{ gap: 4 }}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <Text
                style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}
              >
                Stage {attempt.stage} · Session {attempt.sessionIndex + 1}
                {attempt.isReplay ? ' · Replay' : ''}
              </Text>
              <Text style={{ color: colors.secondary, fontSize: 15 }}>
                {new Date(attempt.startedAt).toLocaleDateString()}
              </Text>
            </View>
            <Body muted>{details.join(' · ')}</Body>
          </Card>
        );
      })}
    </Screen>
  );
}
