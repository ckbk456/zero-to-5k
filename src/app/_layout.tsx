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
          <ActivityIndicator accessibilityLabel="Loading your preferences" />
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
          <Stack.Screen name="index" options={{ title: 'Your training' }} />
        </Stack>
        <StatusBar style="auto" />
      </SQLiteProvider>
    </Suspense>
  );
}
