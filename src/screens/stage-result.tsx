import { router, useLocalSearchParams } from 'expo-router';

import { ACTIVITY_COPY } from '@/domain/activity';
import { useProgram } from '@/session/use-program';
import { Body, Button, ErrorText, Loading, Screen, Title } from '@/ui/kit';

export function StageResultScreen() {
  const { stage, plan: version } = useLocalSearchParams<{
    stage: string;
    plan?: string;
  }>();
  const stageNumber = Number(stage);
  const { data, error } = useProgram(version);
  if (error)
    return (
      <Screen>
        <ErrorText>{error}</ErrorText>
        <Button label="Back to stages" onPress={() => router.dismissAll()} />
      </Screen>
    );
  if (!data) return <Loading label="Loading result" />;

  const { plan } = data;
  const copy = ACTIVITY_COPY[plan.activity];
  const goalMinutes = plan.goalSeconds / 60;
  const state = data.progress.stages[stageNumber - 1]?.state;
  const finalStage = stageNumber === plan.stages.length;
  const nextTip = plan.stages[stageNumber]?.tip;
  if (state !== 'completed' && state !== 'cleared')
    return (
      <Screen>
        <Body>This stage is still in progress.</Body>
        <Button label="Back to stages" onPress={() => router.dismissAll()} />
      </Screen>
    );

  return (
    <Screen>
      <Title>
        {finalStage
          ? `${goalMinutes}-minute milestone 🎉`
          : state === 'cleared'
            ? `Stage ${stageNumber} cleared ★`
            : `Stage ${stageNumber} completed ✓`}
      </Title>
      {state === 'cleared' ? (
        <Body>
          Three sessions done, with check-ins saved and no pain reported. Give
          yourself time to recover.
        </Body>
      ) : (
        <Body>
          You recorded all three sessions. Some may have been marked done
          without a check-in. Repeat a session whenever you need; there is no
          deadline.
        </Body>
      )}
      {finalStage ? (
        <Body>
          The final session builds to {goalMinutes} minutes of continuous{' '}
          {copy.name.toLowerCase()}. A 5K takes {goalMinutes} minutes at{' '}
          {goalMinutes / 5} minutes per km; your distance may differ. Celebrate
          the time you put in.
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
