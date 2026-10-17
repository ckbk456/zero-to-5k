import { router, useLocalSearchParams } from 'expo-router';

import { ACTIVITY_COPY } from '@/domain/activity';
import { useProgram } from '@/session/use-program';
import { Body, Button, Loading, Screen, Title } from '@/ui/kit';

export function StageResultScreen() {
  const { stage } = useLocalSearchParams<{ stage: string }>();
  const stageNumber = Number(stage);
  const { data } = useProgram();
  if (!data) return <Loading label="Loading result" />;

  const { plan } = data;
  const copy = ACTIVITY_COPY[plan.activity];
  const goalMinutes = plan.goalSeconds / 60;
  const state = data.progress.stages[stageNumber - 1]?.state;
  const finalStage = stageNumber === plan.stages.length;
  const nextTip = plan.stages[stageNumber]?.tip;

  return (
    <Screen>
      <Title>
        {finalStage
          ? `You did it: ${goalMinutes} minutes! 🎉`
          : state === 'cleared'
            ? `Stage ${stageNumber} cleared ★`
            : `Stage ${stageNumber} completed ✓`}
      </Title>
      {state === 'cleared' ? (
        <Body>Every session felt manageable and pain-free. Nicely done.</Body>
      ) : (
        <Body>
          You finished every session, though at least one was near your limit or
          painful. {copy.name} its sessions again is always fine.
        </Body>
      )}
      {finalStage ? (
        <Body>
          You can now {copy.verb} for {goalMinutes} minutes without stopping.
          Keep it up with any session — three times a week is a great habit.
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
