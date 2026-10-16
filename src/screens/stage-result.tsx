import { router, useLocalSearchParams } from 'expo-router';

import { RUNNING_PLAN } from '@/domain/plan';
import { useProgram } from '@/session/use-program';
import { Body, Button, Loading, Screen, Title } from '@/ui/kit';

export function StageResultScreen() {
  const { stage } = useLocalSearchParams<{ stage: string }>();
  const stageNumber = Number(stage);
  const { data } = useProgram();
  if (!data) return <Loading label="Loading result" />;

  const state = data.progress.stages[stageNumber - 1];
  const finalStage = stageNumber === RUNNING_PLAN.stages.length;
  const nextTip = RUNNING_PLAN.stages[stageNumber]?.tip;

  return (
    <Screen>
      <Title>
        {finalStage
          ? 'You did it: 30 minutes! 🎉'
          : state === 'cleared'
            ? `Stage ${stageNumber} cleared ★`
            : `Stage ${stageNumber} completed ✓`}
      </Title>
      {state === 'cleared' ? (
        <Body>Every session felt manageable and pain-free. Nicely done.</Body>
      ) : (
        <Body>
          You finished every session, though at least one was near your limit or
          painful. Replaying the stage is always fine.
        </Body>
      )}
      {finalStage ? (
        <Body>
          You can now run for 30 minutes without stopping. Keep it up with stage
          9 replays — three times a week is a great habit.
        </Body>
      ) : (
        nextTip && (
          <Body muted>
            Next up, stage {stageNumber + 1}: {nextTip}
          </Body>
        )
      )}
      <Button label="Back to stages" onPress={() => router.dismissAll()} />
    </Screen>
  );
}
