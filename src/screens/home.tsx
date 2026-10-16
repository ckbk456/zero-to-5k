import { useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ACTIVITIES, type Activity } from '@/domain/activity';
import { getPreferredActivity, setPreferredActivity } from '@/storage/database';
import { colors } from '@/theme/colors';

const labels: Record<Activity, string> = {
  running: 'Running',
  'race-walking': 'Race walking',
};

export function HomeScreen() {
  useColorScheme();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      setActivity(await getPreferredActivity(db));
    } catch {
      setError('Your preference could not be loaded. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    void getPreferredActivity(db).then(
      (value) => {
        if (!active) return;
        setActivity(value);
        setBusy(false);
      },
      () => {
        if (!active) return;
        setError('Your preference could not be loaded. Please try again.');
        setBusy(false);
      },
    );
    return () => {
      active = false;
    };
  }, [db]);

  async function selectActivity(next: Activity) {
    setBusy(true);
    setError(null);
    try {
      await setPreferredActivity(db, next);
      setActivity(next);
    } catch {
      setError('Your change could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: 24,
        paddingBottom: Math.max(insets.bottom, 24),
        gap: 28,
      }}
    >
      <View style={{ gap: 12 }}>
        <Text
          selectable
          style={{
            color: colors.secondary,
            fontSize: 14,
            fontWeight: '600',
            letterSpacing: 1.5,
          }}
        >
          BUILD TO 30
        </Text>
        <Text
          accessibilityRole="header"
          style={{
            color: colors.text,
            fontSize: 34,
            fontWeight: '700',
            lineHeight: 40,
          }}
        >
          Time well spent.
        </Text>
        <Text
          selectable
          style={{ color: colors.secondary, fontSize: 18, lineHeight: 27 }}
        >
          Build toward 30 minutes of running or race walking, at your pace.
          Every completed session counts.
        </Text>
      </View>
      <View
        style={{
          backgroundColor: colors.card,
          padding: 24,
          borderRadius: 24,
          borderCurve: 'continuous',
          gap: 18,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}
        >
          Choose your activity
        </Text>
        <View accessibilityRole="radiogroup" style={{ gap: 12 }}>
          {ACTIVITIES.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{
                checked: activity === option,
                disabled: busy || activity === null,
              }}
              disabled={busy || activity === null}
              onPress={() => void selectActivity(option)}
              style={({ pressed }) => ({
                minHeight: 56,
                justifyContent: 'center',
                borderRadius: 14,
                borderCurve: 'continuous',
                borderWidth: activity === option ? 2 : 1,
                borderColor:
                  activity === option ? colors.accent : colors.secondary,
                paddingHorizontal: 18,
                opacity: pressed || busy ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: activity === option ? '600' : '400',
                }}
              >
                {labels[option]}
              </Text>
            </Pressable>
          ))}
        </View>
        {busy && (
          <ActivityIndicator accessibilityLabel="Saving or loading your activity" />
        )}
        {error && (
          <Text
            selectable
            accessibilityRole="alert"
            style={{ color: colors.text }}
          >
            {error}
          </Text>
        )}
        {!busy && activity === null && (
          <Pressable
            accessibilityRole="button"
            onPress={() => void load()}
            style={{ minHeight: 48, justifyContent: 'center' }}
          >
            <Text style={{ color: colors.text, fontWeight: '600' }}>
              Try again
            </Text>
          </Pressable>
        )}
        <Text
          selectable
          style={{ color: colors.secondary, fontSize: 14, lineHeight: 21 }}
        >
          Your choice is saved on this device.
        </Text>
      </View>
      <View style={{ gap: 12 }}>
        <Text
          accessibilityRole="header"
          style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}
        >
          A goal measured in minutes
        </Text>
        <Text
          selectable
          style={{ color: colors.secondary, fontSize: 17, lineHeight: 26 }}
        >
          Work toward three sessions a week. Progress is about time and
          consistency, with room to repeat a step.
        </Text>
        <Text
          selectable
          style={{ color: colors.secondary, fontSize: 15, lineHeight: 23 }}
        >
          Training sessions are coming next. This preview saves your activity
          choice; it does not yet guide a workout.
        </Text>
      </View>
    </ScrollView>
  );
}
