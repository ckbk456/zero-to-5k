import { useState } from 'react';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { updateSettings } from '@/storage/database';
import {
  Body,
  Button,
  Card,
  ErrorText,
  Heading,
  Screen,
  Title,
} from '@/ui/kit';

export function WelcomeScreen() {
  const db = useSQLiteContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function begin() {
    setBusy(true);
    setError(null);
    try {
      await updateSettings(db, { onboarded: true });
      router.replace('/');
    } catch {
      setError('That did not save. Please try again.');
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Your first race-walking 5K</Title>
      <Body>
        Start small and build a habit over 12 stages. Each stage has 3 sessions
        of race walking and easy walking, building to 40 minutes of race walking
        without stopping — about 5 km at 8 minutes per km. The app counts time,
        not distance or speed.
      </Body>
      <Body>
        Put your phone in your pocket, play your own music or podcast, and the
        app tells you when to race walk and when to walk — even with the screen
        off. Early stages are short practice bouts so you can focus on form. The
        app times your practice; it cannot judge your technique.
      </Body>
      <Body>
        Aim for three sessions a week with a rest day between. Repeat a stage
        whenever you need; twelve weeks is a guide, not a deadline. After each
        session you rate how hard it felt. If it was near your limit or
        something hurt, we will suggest repeating the stage. It is always your
        call.
      </Body>

      <Card>
        <Heading>Before you start</Heading>
        <Body>
          This program is for generally healthy adults. If you have a heart
          condition, chest pain, dizziness, or a health concern, check with a
          doctor first.
        </Body>
        <Body>
          Stop and rest if you feel chest pain, faintness, or severe
          breathlessness. Go slow enough to talk and keep your form — speed does
          not matter.
        </Body>
      </Card>

      {error && <ErrorText>{error}</ErrorText>}
      <Button label="Let's go" onPress={() => void begin()} disabled={busy} />
    </Screen>
  );
}
