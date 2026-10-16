import { Suspense } from 'react';
import { Stack } from 'expo-router/stack';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { migrateDatabase } from '@/storage/database';
import { colors } from '@/theme/colors';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
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
          <ActivityIndicator accessibilityLabel="Loading" />
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
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Stages' }} />
          <Stack.Screen
            name="welcome"
            options={{ title: 'Welcome', headerBackVisible: false }}
          />
          <Stack.Screen name="session/preview" options={{ title: 'Session' }} />
          <Stack.Screen
            name="session/live"
            options={{
              title: 'Running',
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
        </Stack>
        <StatusBar style="auto" />
      </SQLiteProvider>
    </Suspense>
  );
}
