import { Text, View } from 'react-native';

import { ACTIVITY_COPY } from '@/domain/activity';
import { effortLevel } from '@/domain/effort';
import type { AttemptStatus } from '@/domain/progression';
import { useProgram } from '@/session/use-program';
import { useColors } from '@/theme/colors';
import { Body, Loading, Screen, formatClock } from '@/ui/kit';

const STATUS_LABELS: Record<AttemptStatus, string> = {
  in_progress: 'In progress',
  completed: 'Completed',
  ended_early: 'Ended early',
  interrupted: 'Interrupted',
};

export function HistoryScreen() {
  const colors = useColors();
  const { data } = useProgram();
  if (!data) return <Loading label="Loading history" />;
  const attempts = [...data.attempts].reverse();
  const copy = ACTIVITY_COPY[data.plan.activity];

  return (
    <Screen>
      <Body muted>{copy.name} program</Body>
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
              style={{ flexDirection: 'row', justifyContent: 'space-between' }}
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
          </View>
        );
      })}
    </Screen>
  );
}
