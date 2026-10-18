import { useState } from 'react';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { updateSettings } from '@/storage/database';
import { Body, Button, Card, ErrorText, Screen, Title } from '@/ui/kit';

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
      <Title>Build your race walk</Title>
      <Body>
        12 stages to 40 continuous minutes — 5 km at 8:00/km. Your time counts
        at any pace.
      </Body>

      <Card>
        <Body>3 sessions a week, with a rest day between.</Body>
        <Body>
          Cues over your music or podcasts. On iOS, screen-off cues need
          supported workout access.
        </Body>
        <Body>Repeat any session. There is no deadline.</Body>
      </Card>

      <Body muted>
        For generally healthy adults. Stop for pain, chest discomfort, faintness
        or unusual breathlessness. Seek help for severe or persistent symptoms.
      </Body>
      {error && <ErrorText>{error}</ErrorText>}
      <Button label="Start" onPress={() => void begin()} disabled={busy} />
      <Button
        label="Learn the basics (optional)"
        kind="secondary"
        onPress={() => router.push('/learn')}
        disabled={busy}
      />
    </Screen>
  );
}
