// Bundled training plans, one per activity. Sources: docs/design/running-preset-plan.md
// and docs/design/race-walking-preset-plan.md.

import type { Activity } from './activity';

export type IntervalKind = 'warmup' | 'active' | 'walk' | 'cooldown';

export interface Interval {
  kind: IntervalKind;
  seconds: number;
}

export interface Session {
  intervals: readonly Interval[];
}

export interface Stage {
  number: number;
  tip: string;
  sessions: readonly Session[];
}

export interface Plan {
  activity: Activity;
  version: string;
  goalSeconds: number;
  stages: readonly Stage[];
}

export const SESSIONS_PER_STAGE = 3;
const BOOKEND_SECONDS = 5 * 60;

// Main blocks in minutes, alternating active and walk, starting with active.
function session(...main: number[]): Session {
  return {
    intervals: [
      { kind: 'warmup', seconds: BOOKEND_SECONDS },
      ...main.map((minutes, index): Interval => ({
        kind: index % 2 === 0 ? 'active' : 'walk',
        seconds: Math.round(minutes * 60),
      })),
      { kind: 'cooldown', seconds: BOOKEND_SECONDS },
    ],
  };
}

function repeat(pattern: number[], times: number, last: number): number[] {
  return [...Array.from({ length: times }, () => pattern).flat(), last];
}

function sameThrice(main: number[]): Session[] {
  return [session(...main), session(...main), session(...main)];
}

export const RUNNING_PLAN: Plan = {
  activity: 'running',
  version: 'running-v1',
  goalSeconds: 30 * 60,
  stages: [
    {
      number: 1,
      tip: 'Short 1-minute runs with walking breaks. Go slow enough to talk.',
      sessions: sameThrice(repeat([1, 1.5], 7, 1)),
    },
    {
      number: 2,
      tip: 'Runs grow to 90 seconds, with 2-minute walks between them.',
      sessions: sameThrice(repeat([1.5, 2], 5, 1.5)),
    },
    {
      number: 3,
      tip: 'Your first 3-minute runs. Speed does not matter.',
      sessions: sameThrice([1.5, 1.5, 3, 3, 1.5, 1.5, 3]),
    },
    {
      number: 4,
      tip: 'A step up: 3- and 5-minute runs. Keep it easy.',
      sessions: sameThrice([3, 1.5, 5, 2.5, 3, 1.5, 5]),
    },
    {
      number: 5,
      tip: 'Every session is different this stage, ending with a 20-minute run.',
      sessions: [session(5, 3, 5, 3, 5), session(8, 5, 8), session(20)],
    },
    {
      number: 6,
      tip: 'Walking breaks return briefly, then a 22-minute run.',
      sessions: [session(5, 3, 8, 3, 5), session(10, 3, 10), session(22)],
    },
    {
      number: 7,
      tip: '25 minutes of continuous running.',
      sessions: sameThrice([25]),
    },
    {
      number: 8,
      tip: '28 minutes. Nearly there.',
      sessions: sameThrice([28]),
    },
    {
      number: 9,
      tip: 'The goal: 30 minutes of continuous running.',
      sessions: sameThrice([30]),
    },
  ],
};

// Draft curriculum pending coach review: every race walk is relaxed technique
// practice, with 90-second ordinary walks between bouts until stage 13.
export const RACE_WALKING_PLAN: Plan = {
  activity: 'race-walking',
  version: 'race-walking-v1',
  goalSeconds: 40 * 60,
  stages: [
    {
      number: 1,
      tip: 'Six 30-second race walks with easy walks between them. Stay relaxed and upright; technique matters more than speed.',
      sessions: sameThrice(repeat([0.5, 1.5], 5, 0.5)),
    },
    {
      number: 2,
      tip: 'Race walks grow to 1 minute. Keep your shoulders loose and your steps short, without overstriding.',
      sessions: sameThrice(repeat([1, 1.5], 5, 1)),
    },
    {
      number: 3,
      tip: '90-second race walks. Roll smoothly from heel to toe.',
      sessions: sameThrice(repeat([1.5, 1.5], 5, 1.5)),
    },
    {
      number: 4,
      tip: '2-minute race walks. Let your arms swing naturally with your legs.',
      sessions: sameThrice(repeat([2, 1.5], 5, 2)),
    },
    {
      number: 5,
      tip: 'Five 3-minute race walks. If your form slips, slow down or walk.',
      sessions: sameThrice(repeat([3, 1.5], 4, 3)),
    },
    {
      number: 6,
      tip: 'Four 4-minute race walks, still with 90-second walks between them.',
      sessions: sameThrice(repeat([4, 1.5], 3, 4)),
    },
    {
      number: 7,
      tip: 'Four 5-minute race walks. Keep the effort easy enough to think about form.',
      sessions: sameThrice(repeat([5, 1.5], 3, 5)),
    },
    {
      number: 8,
      tip: 'Three 7-minute race walks.',
      sessions: sameThrice(repeat([7, 1.5], 2, 7)),
    },
    {
      number: 9,
      tip: 'Two 10-minute race walks, then a 5-minute one.',
      sessions: sameThrice([10, 1.5, 10, 1.5, 5]),
    },
    {
      number: 10,
      tip: 'Two 15-minute race walks with one short break.',
      sessions: sameThrice([15, 1.5, 15]),
    },
    {
      number: 11,
      tip: 'A 20-minute race walk, a short break, then 10 more minutes.',
      sessions: sameThrice([20, 1.5, 10]),
    },
    {
      number: 12,
      tip: 'A 25-minute race walk, a short break, then 5 more minutes.',
      sessions: sameThrice([25, 1.5, 5]),
    },
    {
      number: 13,
      tip: 'Your first race walk without a break: 25 minutes.',
      sessions: sameThrice([25]),
    },
    {
      number: 14,
      tip: '30 minutes of continuous race walking.',
      sessions: sameThrice([30]),
    },
    {
      number: 15,
      tip: '35 minutes. Nearly there.',
      sessions: sameThrice([35]),
    },
    {
      number: 16,
      tip: 'The goal: 40 minutes of continuous race walking.',
      sessions: sameThrice([40]),
    },
  ],
};

export const PLANS: Record<Activity, Plan> = {
  running: RUNNING_PLAN,
  'race-walking': RACE_WALKING_PLAN,
};

export function planByVersion(version: string): Plan | null {
  return Object.values(PLANS).find((plan) => plan.version === version) ?? null;
}

export function totalSeconds(session: Session): number {
  return session.intervals.reduce((sum, interval) => sum + interval.seconds, 0);
}

export function getSession(
  plan: Plan,
  stageNumber: number,
  sessionIndex: number,
): Session {
  const found = plan.stages[stageNumber - 1]?.sessions[sessionIndex];
  if (!found) throw new Error('Unknown session.');
  return found;
}
