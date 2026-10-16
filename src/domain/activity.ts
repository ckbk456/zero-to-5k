export const ACTIVITIES = ['running', 'race-walking'] as const;
export type Activity = (typeof ACTIVITIES)[number];

export function isActivity(value: unknown): value is Activity {
  return value === 'running' || value === 'race-walking';
}
