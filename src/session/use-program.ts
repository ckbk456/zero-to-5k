import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { RUNNING_PLAN } from '@/domain/plan';
import { deriveProgress, type Progress } from '@/domain/progression';
import {
  getSettings,
  listAttempts,
  type AttemptHistoryItem,
  type Settings,
} from '@/storage/database';

export interface ProgramData {
  settings: Settings;
  attempts: AttemptHistoryItem[];
  progress: Progress;
}

// Loads settings, history, and derived progress whenever the screen gains
// focus.
export function useProgram() {
  const db = useSQLiteContext();
  const [data, setData] = useState<ProgramData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [settings, attempts] = await Promise.all([
        getSettings(db),
        listAttempts(db, RUNNING_PLAN.version),
      ]);
      setData({
        settings,
        attempts,
        progress: deriveProgress(RUNNING_PLAN, attempts),
      });
      setError(null);
    } catch {
      setError('Your progress could not be loaded. Please try again.');
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { db, data, error, reload };
}
