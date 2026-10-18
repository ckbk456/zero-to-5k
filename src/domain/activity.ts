export const ACTIVITIES = ['running', 'race-walking'] as const;
export type Activity = (typeof ACTIVITIES)[number];

export function isActivity(value: unknown): value is Activity {
  return value === 'running' || value === 'race-walking';
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
