import { useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';

import { useProgram } from '@/session/use-program';
import {
  resetProgress,
  updateSettings,
  type Settings,
} from '@/storage/database';
import { useColors } from '@/theme/colors';
import {
  Body,
  Button,
  Card,
  ErrorText,
  Heading,
  Loading,
  Screen,
} from '@/ui/kit';

const CONFIRM_WORD = 'RESET';

export function SettingsScreen() {
  const colors = useColors();
  const { db, data, reload } = useProgram();
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!data) return <Loading label="Loading settings" />;

  async function toggle(key: 'speech' | 'vibration', value: boolean) {
    setError(null);
    try {
      await updateSettings(db, { [key]: value } as Partial<Settings>);
      await reload();
    } catch {
      setError('That setting could not be saved. Please try again.');
    }
  }

  async function reset() {
    setError(null);
    try {
      await resetProgress(db);
      setConfirm('');
      setMessage('Progress reset. You are back at stage 1.');
      await reload();
    } catch {
      setError('Progress could not be reset. Please try again.');
    }
  }

  return (
    <Screen>
      <Card>
        <Heading>Cues</Heading>
        {(
          [
            ['speech', 'Sound (chime + "run" / "walk")'],
            ['vibration', 'Vibration'],
          ] as const
        ).map(([key, label]) => (
          <View
            key={key}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              minHeight: 44,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 17 }}>{label}</Text>
            <Switch
              accessibilityLabel={label}
              value={data.settings[key]}
              onValueChange={(value) => void toggle(key, value)}
            />
          </View>
        ))}
        <Body muted>Changes apply from your next session.</Body>
      </Card>

      <Card>
        <Heading>Reset progress</Heading>
        <Body muted>
          Deletes all session history and returns you to stage 1. Type{' '}
          {CONFIRM_WORD} to confirm.
        </Body>
        <TextInput
          accessibilityLabel={`Type ${CONFIRM_WORD} to confirm`}
          autoCapitalize="characters"
          autoCorrect={false}
          value={confirm}
          onChangeText={setConfirm}
          placeholder={CONFIRM_WORD}
          placeholderTextColor={colors.secondary}
          style={{
            minHeight: 48,
            borderRadius: 12,
            paddingHorizontal: 12,
            fontSize: 17,
            color: colors.text,
            backgroundColor: colors.track,
          }}
        />
        <Button
          label="Reset progress"
          kind="danger"
          disabled={confirm.trim() !== CONFIRM_WORD}
          onPress={() => void reset()}
        />
        {message && <Body>{message}</Body>}
      </Card>

      {error && <ErrorText>{error}</ErrorText>}

      <Card>
        <Heading>About and safety</Heading>
        <Body>
          Build to 30 takes generally healthy adults from walking to 30 minutes
          of continuous running in 9 stages, based on the widely used NHS Couch
          to 5K structure. It is not medical advice or a rehabilitation program.
        </Body>
        <Body>
          Stop and rest if you feel chest pain, faintness, or severe
          breathlessness, and check with a doctor if you have a health concern.
          Your data stays on this phone.
        </Body>
      </Card>
    </Screen>
  );
}
