export const ACTIVITIES = ['running', 'race-walking'] as const;
export type Activity = (typeof ACTIVITIES)[number];

export function isActivity(value: unknown): value is Activity {
  return value === 'running' || value === 'race-walking';
}

// The programs the app shows. Race walking is the product (owner,
// 2026-10-18); running stays built and tested but is not offered.
export const OFFERED_ACTIVITIES: readonly Activity[] = ['race-walking'];

// The saved preference when it is offered, otherwise the first offered
// activity. Fresh installs store running (migration 1).
export function offeredActivity(preferred: Activity): Activity {
  return OFFERED_ACTIVITIES.includes(preferred)
    ? preferred
    : OFFERED_ACTIVITIES[0]!;
}

// Words that change with the activity. `active` names the target-activity
// interval on screen and is also its spoken cue; recovery is always "walk".
export interface ActivityCopy {
  name: string;
  active: string;
  activePlural: string;
  verb: string;
  past: string;
  intro: string;
}

export const ACTIVITY_COPY: Record<Activity, ActivityCopy> = {
  running: {
    name: 'Running',
    active: 'Run',
    activePlural: 'runs',
    verb: 'run',
    past: 'ran',
    intro:
      'Nine stages to a 5K: 30 minutes of running without stopping, about 5 km at 6 minutes per km.',
  },
  'race-walking': {
    name: 'Race walking',
    active: 'Race walk',
    activePlural: 'race walks',
    verb: 'race walk',
    past: 'race walked',
    intro:
      'Sixteen stages to a 5K: 40 minutes of race walking without stopping, about 5 km at 8 minutes per km. The app times your practice; it cannot judge your technique.',
  },
};
