import { Suspense } from 'react';
import { Stack } from 'expo-router/stack';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { migrateDatabase } from '@/storage/database';
import { useColors } from '@/theme/colors';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const colors = useColors();
  return (
    <Suspense
      fallback={
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            backgroundColor: colors.background,
          }}
        >
          <ActivityIndicator
            color={colors.accent}
            accessibilityLabel="Loading"
          />
        </View>
      }
    >
      <SQLiteProvider
        databaseName="zero-to-5k.db"
        onInit={migrateDatabase}
        useSuspense
      >
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.background },
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTintColor: colors.accent,
            headerTitleStyle: { color: colors.text, fontWeight: '700' },
          }}
        >
          <Stack.Screen
            name="index"
            options={{ title: 'Stages', headerShown: false }}
          />
          <Stack.Screen
            name="welcome"
            options={{ title: 'Welcome', headerBackVisible: false }}
          />
          <Stack.Screen name="session/preview" options={{ title: 'Session' }} />
          <Stack.Screen
            name="session/live"
            options={{
              // The screen names the session's activity.
              title: '',
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="session/check"
            options={{
              title: 'Check-in',
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="stage-result"
            options={{ title: 'Stage result', headerBackVisible: false }}
          />
          <Stack.Screen name="history" options={{ title: 'History' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen
            name="learn"
            options={{ title: 'Race-walking basics' }}
          />
          <Stack.Screen name="cue-check" options={{ title: 'Try the cues' }} />
        </Stack>
        <StatusBar style="auto" />
      </SQLiteProvider>
    </Suspense>
  );
}
