import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { offeredActivity } from '@/domain/activity';
import { PLANS, planByVersion, type Plan } from '@/domain/plan';
import { deriveProgress, type Progress } from '@/domain/progression';
import {
  getPreferredActivity,
  getSettings,
  listAttempts,
  type AttemptHistoryItem,
  type Settings,
} from '@/storage/database';

export interface ProgramData {
  // The current offered plan, or an explicitly requested historical version.
  // History and progress always belong to this exact version.
  plan: Plan;
  settings: Settings;
  attempts: AttemptHistoryItem[];
  progress: Progress;
}

// Loads the selected program with its settings, history, and derived progress
// whenever the screen gains focus.
export function useProgram(planVersion?: string) {
  const db = useSQLiteContext();
  const [data, setData] = useState<ProgramData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const request = ++requestId.current;
    try {
      const [settings, activity] = await Promise.all([
        getSettings(db),
        getPreferredActivity(db),
      ]);
      if (request !== requestId.current) return;
      const plan =
        planVersion === undefined
          ? PLANS[offeredActivity(activity)]
          : planByVersion(planVersion);
      if (!plan) {
        setData(null);
        setError('This plan version is not available in this app.');
        return;
      }
      const attempts = await listAttempts(db, plan.version);
      if (request !== requestId.current) return;
      setData({
        plan,
        settings,
        attempts,
        progress: deriveProgress(plan, attempts),
      });
      setError(null);
    } catch {
      if (request !== requestId.current) return;
      setError('Your progress could not be loaded. Please try again.');
    }
  }, [db, planVersion]);

  useFocusEffect(
    useCallback(() => {
      void reload();
      return () => {
        // Switching historical versions or leaving the screen invalidates an
        // earlier read, so it cannot replace the next selection's progress.
        requestId.current += 1;
      };
    }, [reload]),
  );

  const selectedData =
    planVersion === undefined || data?.plan.version === planVersion
      ? data
      : null;
  return { db, data: selectedData, error, reload };
}
