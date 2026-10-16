// Bundled training plan. Source and approval: docs/design/running-preset-plan.md.

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
