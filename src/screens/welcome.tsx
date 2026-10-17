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
      <Title>From zero to 30 minutes</Title>
      <Body>
        Build to 30 is a game of 9 stages. Each stage has 3 run/walk sessions.
        Put your phone in your pocket, play your own music or podcast, and the
        app tells you when to run and when to walk — even with the screen off.
        Prefer walking? A 16-stage race-walking program is one tap away on the
        stage map.
      </Body>
      <Body>
        After each session you rate how hard it felt. If it was near your limit
        or something hurt, we will suggest repeating the stage. It is always
        your call.
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
          breathlessness. Go slow enough to talk — speed does not matter.
        </Body>
      </Card>

      {error && <ErrorText>{error}</ErrorText>}
      <Button label="Let's go" onPress={() => void begin()} disabled={busy} />
    </Screen>
  );
}
