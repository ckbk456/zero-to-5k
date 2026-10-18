import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { offeredActivity } from '@/domain/activity';
import { PLANS, type Plan } from '@/domain/plan';
import { deriveProgress, type Progress } from '@/domain/progression';
import {
  getPreferredActivity,
  getSettings,
  listAttempts,
  type AttemptHistoryItem,
  type Settings,
} from '@/storage/database';

export interface ProgramData {
  // The program of the selected offered activity; history and progress are
  // its own.
  plan: Plan;
  settings: Settings;
  attempts: AttemptHistoryItem[];
  progress: Progress;
}

// Loads the selected program with its settings, history, and derived progress
// whenever the screen gains focus.
export function useProgram() {
  const db = useSQLiteContext();
  const [data, setData] = useState<ProgramData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [settings, activity] = await Promise.all([
        getSettings(db),
        getPreferredActivity(db),
      ]);
      const plan = PLANS[offeredActivity(activity)];
      const attempts = await listAttempts(db, plan.version);
      setData({
        plan,
        settings,
        attempts,
        progress: deriveProgress(plan, attempts),
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
