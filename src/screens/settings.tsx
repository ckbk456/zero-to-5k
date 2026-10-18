import { useState } from 'react';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Switch, Text, TextInput, View } from 'react-native';

import { ACTIVITY_COPY, OFFERED_ACTIVITIES } from '@/domain/activity';
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
  Row,
  Screen,
} from '@/ui/kit';

const CONFIRM_WORD = 'RESET';

export function SettingsScreen() {
  const colors = useColors();
  const { db, data, reload, error: loadError } = useProgram();
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (loadError)
    return (
      <Screen>
        <ErrorText>{loadError}</ErrorText>
        <Button label="Try again" onPress={() => void reload()} />
      </Screen>
    );
  if (!data) return <Loading label="Loading settings" />;
  const { plan } = data;
  const copy = ACTIVITY_COPY[plan.activity];
  const program = copy.name.toLowerCase();

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
      await resetProgress(db, plan.version);
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
            [
              'speech',
              `Sound (chime + "${copy.active.toLowerCase()}" / "walk")`,
            ],
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
            <Text
              style={{
                color: colors.text,
                fontSize: 17,
                flex: 1,
                paddingRight: 12,
              }}
            >
              {label}
            </Text>
            <Switch
              accessibilityLabel={label}
              value={data.settings[key]}
              onValueChange={(value) => void toggle(key, value)}
            />
          </View>
        ))}
        <Body muted>Changes apply from your next session.</Body>
        <Row
          label="Try the cues · 30 seconds"
          onPress={() => router.push('/cue-check')}
          last
        />
      </Card>

      <Card>
        <Heading>Reset {program} progress</Heading>
        <Body muted>
          Deletes this 12-stage plan’s history and returns you to stage 1. Older
          plan history is kept.
          {OFFERED_ACTIVITIES.length > 1 &&
            ' The other program keeps its progress.'}{' '}
          Type {CONFIRM_WORD} to confirm.
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
          label={`Reset ${program} progress`}
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
          Zero to 5K takes generally healthy adults from walking to a 5K race
          walk in 12 stages: 40 minutes of continuous race walking, about 5 km
          at 8 minutes per km. The app counts time, not distance or speed; at a
          slower pace, 5 km takes a little longer. It is not medical advice or a
          rehabilitation program.
        </Body>
        <Body>
          The program is a draft written for this app and has not been reviewed
          by a coach yet. The app times your practice; it cannot judge whether
          your technique meets race-walking rules.
        </Body>
        <Body>
          Stop and rest if you feel chest pain, faintness, or severe
          breathlessness, and check with a doctor if you have a health concern.
          Your session history is stored on this device. There is no account,
          advertising, location tracking or cloud sync. System backups may
          include app data.
        </Body>
      </Card>
      <Body muted>
        Version {Constants.expoConfig?.version ?? '0.1.0'} · Offline first
      </Body>
    </Screen>
  );
}
