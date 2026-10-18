// Current plans and immutable prior versions. Sources: docs/design/*-plan.md.

import type { Activity } from './activity';

export type IntervalKind = 'warmup' | 'active' | 'walk' | 'cooldown';

export interface Interval {
  kind: IntervalKind;
  seconds: number;
}

export interface Session {
  intervals: readonly Interval[];
  title?: string;
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

// Every goal stands for a 5 km run or race walk (docs/logic/product.md). The
// app counts time only; the pace is what the goal time implies, not a target.
export const GOAL_KM = 5;

export function goalMinutesPerKm(plan: Plan): number {
  return plan.goalSeconds / 60 / GOAL_KM;
}

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
      tip: 'The goal: 30 minutes of continuous running, about 5 km at 6 minutes per km.',
      sessions: sameThrice([30]),
    },
  ],
};

// Draft curriculum pending coach review: every race walk is relaxed technique
// practice, with 90-second ordinary walks between bouts until stage 13.
export const RACE_WALKING_PLAN_V1: Plan = {
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
      tip: 'The goal: 40 minutes of continuous race walking, about 5 km at 8 minutes per km.',
      sessions: sameThrice([40]),
    },
  ],
};

// The owner-selected 12-stage curriculum. The dose is an original proposal,
// pending coach review; the stage count is not a deadline or safety guarantee.
function raceWalkingSession(bouts: readonly number[], title?: string): Session {
  const main = bouts.flatMap((minutes, index) =>
    index === 0 ? [minutes] : [1.5, minutes],
  );
  return { ...session(...main), ...(title ? { title } : {}) };
}

function raceWalkingPractice(minutes: number, count: number): Session[] {
  return Array.from({ length: SESSIONS_PER_STAGE }, () =>
    raceWalkingSession(Array<number>(count).fill(minutes)),
  );
}

function raceWalkingBridge(
  build: readonly number[],
  bridge: readonly number[],
  long: readonly number[],
): Session[] {
  return [
    raceWalkingSession(build, 'Build time'),
    raceWalkingSession(bridge, 'Build continuity'),
    raceWalkingSession(long, 'Longer stretch'),
  ];
}

export const RACE_WALKING_PLAN: Plan = {
  activity: 'race-walking',
  version: 'race-walking-v2',
  goalSeconds: 40 * 60,
  stages: [
    {
      number: 1,
      tip: 'Eight 1-minute race walks with easy walks between them. Keep the effort comfortable; repeat this stage whenever you want.',
      sessions: raceWalkingPractice(1, 8),
    },
    {
      number: 2,
      tip: 'Seven 90-second race walks. Keep your shoulders relaxed and leave time to recover between sessions.',
      sessions: raceWalkingPractice(1.5, 7),
    },
    {
      number: 3,
      tip: 'Five 2½-minute race walks. Slow down or take an extra walking break when you need one.',
      sessions: raceWalkingPractice(2.5, 5),
    },
    {
      number: 4,
      tip: 'Four 4-minute race walks. Comfortable practice matters more than speed.',
      sessions: raceWalkingPractice(4, 4),
    },
    {
      number: 5,
      tip: 'The three sessions now differ. Follow their order to build time first, then try a longer stretch; nothing is locked.',
      sessions: raceWalkingBridge(
        [4, 4, 4, 4, 4],
        [6, 4.5, 4.5, 4.5],
        [8.5, 5, 5],
      ),
    },
    {
      number: 6,
      tip: 'Fewer, longer race walks. There is no pace target; keep the effort manageable.',
      sessions: raceWalkingBridge([7.5, 7.5, 7.5], [11, 11], [13, 9]),
    },
    {
      number: 7,
      tip: 'Each session has 25 minutes of race walking. The first stretch grows while the second gets shorter.',
      sessions: raceWalkingBridge([12.5, 12.5], [15, 10], [17.5, 7.5]),
    },
    {
      number: 8,
      tip: '28 minutes of race walking with a short break. Repeating a session is part of practice, not a setback.',
      sessions: raceWalkingBridge([14, 14], [20, 8], [22, 6]),
    },
    {
      number: 9,
      tip: '31 minutes of race walking. Keep the opening minutes comfortable so you have room for the longer stretch.',
      sessions: raceWalkingBridge([15.5, 15.5], [24, 7], [26.5, 4.5]),
    },
    {
      number: 10,
      tip: '34 minutes of race walking. Take the walking break; a break does not undo your progress.',
      sessions: raceWalkingBridge([17, 17], [29, 5], [31, 3]),
    },
    {
      number: 11,
      tip: 'The last session tries 35½ minutes without a planned break. You can still pause or walk whenever you need to.',
      sessions: raceWalkingBridge([18.5, 18.5], [33, 4], [35.5]),
    },
    {
      number: 12,
      tip: 'The goal: 40 minutes of continuous race walking, about 5 km at 8 minutes per km. Completing the time counts at your own pace.',
      sessions: raceWalkingBridge([20, 20], [38], [40]),
    },
  ],
};

export const PLANS: Record<Activity, Plan> = {
  running: RUNNING_PLAN,
  'race-walking': RACE_WALKING_PLAN,
};

// Keep every released version resolvable for history and a live attempt.
// A new version never reuses or converts completion rows from another version.
export const PLAN_CATALOG: readonly { plan: Plan; label: string }[] = [
  { plan: RACE_WALKING_PLAN, label: 'Race walking · 12 stages' },
  { plan: RACE_WALKING_PLAN_V1, label: 'Race walking · previous 16 stages' },
  { plan: RUNNING_PLAN, label: 'Running · 9 stages' },
];

export function planByVersion(version: string): Plan | null {
  return (
    PLAN_CATALOG.find(({ plan }) => plan.version === version)?.plan ?? null
  );
}

// Target-activity time only; warm-up, recovery, and cool-down are excluded.
// This does not measure effort or establish vigorous-activity minutes.
export function activeSeconds(session: Session): number {
  return session.intervals.reduce(
    (sum, interval) =>
      sum + (interval.kind === 'active' ? interval.seconds : 0),
    0,
  );
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
