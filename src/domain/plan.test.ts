import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ACTIVITY_COPY } from './activity';
import {
  PLAN_CATALOG,
  PLANS,
  RACE_WALKING_PLAN,
  RACE_WALKING_PLAN_V1,
  RUNNING_PLAN,
  SESSIONS_PER_STAGE,
  activeSeconds,
  getSession,
  goalMinutesPerKm,
  planByVersion,
  totalSeconds,
  type Session,
} from './plan';

// Expected main blocks from docs/design/running-preset-plan.md, in minutes,
// alternating run and walk, with the documented session totals.
const preset: [string, string, string, number, number, number][] = [
  ['1x7 1.5', '', '', 28.5, 28.5, 28.5],
  ['1.5x5 2', '', '', 29, 29, 29],
  ['1.5 1.5 3 3 1.5 1.5 3', '', '', 25, 25, 25],
  ['3 1.5 5 2.5 3 1.5 5', '', '', 31.5, 31.5, 31.5],
  ['5 3 5 3 5', '8 5 8', '20', 31, 31, 30],
  ['5 3 8 3 5', '10 3 10', '22', 34, 33, 32],
  ['25', '', '', 35, 35, 35],
  ['28', '', '', 38, 38, 38],
  ['30', '', '', 40, 40, 40],
];

function expand(spec: string): number[] {
  const repeated = /^([\d.]+)x(\d+) ([\d.]+)$/.exec(spec);
  if (!repeated) return spec.split(' ').map(Number);
  const [, run, times, walk] = repeated;
  const main: number[] = [];
  for (let i = 0; i < Number(times); i += 1)
    main.push(Number(run), Number(walk));
  main.push(Number(run));
  return main;
}

test('the bundled plan matches the approved running preset', () => {
  assert.equal(RUNNING_PLAN.version, 'running-v1');
  assert.equal(RUNNING_PLAN.stages.length, 9);
  for (const [stageIndex, row] of preset.entries()) {
    const stage = RUNNING_PLAN.stages[stageIndex]!;
    assert.equal(stage.number, stageIndex + 1);
    assert.equal(stage.sessions.length, SESSIONS_PER_STAGE);
    for (let day = 0; day < SESSIONS_PER_STAGE; day += 1) {
      const spec = row[day] || row[0];
      const session = getSession(RUNNING_PLAN, stageIndex + 1, day);
      const intervals = session.intervals;
      assert.deepEqual(intervals[0], { kind: 'warmup', seconds: 300 });
      assert.deepEqual(intervals.at(-1), { kind: 'cooldown', seconds: 300 });
      const main = intervals.slice(1, -1);
      assert.deepEqual(
        main.map((interval) => interval.seconds / 60),
        expand(spec as string),
      );
      main.forEach((interval, index) =>
        assert.equal(interval.kind, index % 2 === 0 ? 'active' : 'walk'),
      );
      assert.equal(totalSeconds(session), (row[3 + day] as number) * 60);
    }
  }
});

test('the final stage reaches the 30-minute goal', () => {
  const finalSession = getSession(RUNNING_PLAN, 9, 2);
  assert.equal(RUNNING_PLAN.goalSeconds, 1800);
  assert.deepEqual(finalSession.intervals[1], {
    kind: 'active',
    seconds: 1800,
  });
  assert.throws(() => getSession(RUNNING_PLAN, 10, 0), /Unknown/);
});

// P4 rows from docs/design/race-walking-preset-plan.md: main block in
// minutes (race walk and walk alternating), race-walk minutes, and the full
// session total. Every stage repeats one session.
function bouts(minutes: number, count: number): number[] {
  return Array.from({ length: count }, () => [minutes, 1.5])
    .flat()
    .slice(0, -1);
}

const raceWalkingPreset: [number[], number, number][] = [
  [bouts(0.5, 6), 3, 20.5],
  [bouts(1, 6), 6, 23.5],
  [bouts(1.5, 6), 9, 26.5],
  [bouts(2, 6), 12, 29.5],
  [bouts(3, 5), 15, 31],
  [bouts(4, 4), 16, 30.5],
  [bouts(5, 4), 20, 34.5],
  [bouts(7, 3), 21, 34],
  [[10, 1.5, 10, 1.5, 5], 25, 38],
  [[15, 1.5, 15], 30, 41.5],
  [[20, 1.5, 10], 30, 41.5],
  [[25, 1.5, 5], 30, 41.5],
  [[25], 25, 35],
  [[30], 30, 40],
  [[35], 35, 45],
  [[40], 40, 50],
];

function activeMinutes(session: Session): number {
  return (
    session.intervals
      .filter((interval) => interval.kind === 'active')
      .reduce((sum, interval) => sum + interval.seconds, 0) / 60
  );
}

function longestBout(session: Session): number {
  return Math.max(
    ...session.intervals
      .filter((interval) => interval.kind === 'active')
      .map((interval) => interval.seconds / 60),
  );
}

test('the preserved race-walking v1 plan matches the P4 draft preset', () => {
  assert.equal(RACE_WALKING_PLAN_V1.version, 'race-walking-v1');
  assert.equal(RACE_WALKING_PLAN_V1.activity, 'race-walking');
  assert.equal(RACE_WALKING_PLAN_V1.stages.length, 16);
  for (const [
    stageIndex,
    [main, active, total],
  ] of raceWalkingPreset.entries()) {
    const stage = RACE_WALKING_PLAN_V1.stages[stageIndex]!;
    assert.equal(stage.number, stageIndex + 1);
    assert.equal(stage.sessions.length, SESSIONS_PER_STAGE);
    for (const session of stage.sessions) {
      const intervals = session.intervals;
      assert.deepEqual(intervals[0], { kind: 'warmup', seconds: 300 });
      assert.deepEqual(intervals.at(-1), { kind: 'cooldown', seconds: 300 });
      const block = intervals.slice(1, -1);
      assert.deepEqual(
        block.map((interval) => interval.seconds / 60),
        main,
      );
      block.forEach((interval, index) =>
        assert.equal(interval.kind, index % 2 === 0 ? 'active' : 'walk'),
      );
      assert.equal(activeMinutes(session), active);
      assert.equal(totalSeconds(session), total * 60);
    }
  }
});

test('race-walking steps stay within the P4 envelopes', () => {
  const sessions = RACE_WALKING_PLAN_V1.stages.map(
    (stage) => stage.sessions[0]!,
  );
  for (let index = 1; index < sessions.length; index += 1) {
    const [before, after] = [sessions[index - 1]!, sessions[index]!];
    assert.ok(longestBout(after) - longestBout(before) <= 5);
    assert.ok(activeMinutes(after) - activeMinutes(before) <= 5);
    assert.ok(totalSeconds(after) - totalSeconds(before) <= 5 * 60);
  }
  for (const session of sessions) {
    for (const interval of session.intervals) {
      if (interval.kind === 'walk') assert.equal(interval.seconds, 90);
    }
  }
  assert.equal(RACE_WALKING_PLAN_V1.goalSeconds, 2400);
  assert.deepEqual(getSession(RACE_WALKING_PLAN_V1, 16, 2).intervals[1], {
    kind: 'active',
    seconds: 2400,
  });
});

test('each activity has its own plan, found by version', () => {
  for (const [activity, plan] of Object.entries(PLANS)) {
    assert.equal(plan.activity, activity);
    assert.equal(planByVersion(plan.version), plan);
  }
  assert.equal(planByVersion('running-v0'), null);
});

// Owner-selected schedule: active bouts, active minutes, and whole-session
// minutes, independently transcribed from the reviewed design table.
const twelveStagePreset: {
  bouts: number[][];
  active: number[];
  total: number[];
}[] = [
  {
    bouts: Array.from({ length: 3 }, () => [1, 1, 1, 1, 1, 1, 1, 1]),
    active: [8, 8, 8],
    total: [28.5, 28.5, 28.5],
  },
  {
    bouts: Array.from({ length: 3 }, () => [1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5]),
    active: [10.5, 10.5, 10.5],
    total: [29.5, 29.5, 29.5],
  },
  {
    bouts: Array.from({ length: 3 }, () => [2.5, 2.5, 2.5, 2.5, 2.5]),
    active: [12.5, 12.5, 12.5],
    total: [28.5, 28.5, 28.5],
  },
  {
    bouts: Array.from({ length: 3 }, () => [4, 4, 4, 4]),
    active: [16, 16, 16],
    total: [30.5, 30.5, 30.5],
  },
  {
    bouts: [
      [4, 4, 4, 4, 4],
      [6, 4.5, 4.5, 4.5],
      [8.5, 5, 5],
    ],
    active: [20, 19.5, 18.5],
    total: [36, 34, 31.5],
  },
  {
    bouts: [
      [7.5, 7.5, 7.5],
      [11, 11],
      [13, 9],
    ],
    active: [22.5, 22, 22],
    total: [35.5, 33.5, 33.5],
  },
  {
    bouts: [
      [12.5, 12.5],
      [15, 10],
      [17.5, 7.5],
    ],
    active: [25, 25, 25],
    total: [36.5, 36.5, 36.5],
  },
  {
    bouts: [
      [14, 14],
      [20, 8],
      [22, 6],
    ],
    active: [28, 28, 28],
    total: [39.5, 39.5, 39.5],
  },
  {
    bouts: [
      [15.5, 15.5],
      [24, 7],
      [26.5, 4.5],
    ],
    active: [31, 31, 31],
    total: [42.5, 42.5, 42.5],
  },
  {
    bouts: [
      [17, 17],
      [29, 5],
      [31, 3],
    ],
    active: [34, 34, 34],
    total: [45.5, 45.5, 45.5],
  },
  {
    bouts: [[18.5, 18.5], [33, 4], [35.5]],
    active: [37, 37, 35.5],
    total: [48.5, 48.5, 45.5],
  },
  {
    bouts: [[20, 20], [38], [40]],
    active: [40, 38, 40],
    total: [51.5, 48, 50],
  },
];

test('all 36 race-walking v2 sessions match the 12-stage curriculum', () => {
  assert.equal(RACE_WALKING_PLAN.version, 'race-walking-v2');
  assert.equal(RACE_WALKING_PLAN.activity, 'race-walking');
  assert.equal(RACE_WALKING_PLAN.stages.length, 12);
  for (const [index, expected] of twelveStagePreset.entries()) {
    const stage = RACE_WALKING_PLAN.stages[index]!;
    assert.equal(stage.number, index + 1);
    assert.equal(stage.sessions.length, 3);
    for (const [day, session] of stage.sessions.entries()) {
      assert.deepEqual(session.intervals[0], { kind: 'warmup', seconds: 300 });
      assert.deepEqual(session.intervals.at(-1), {
        kind: 'cooldown',
        seconds: 300,
      });
      const main = session.intervals.slice(1, -1);
      assert.equal(main.length, expected.bouts[day]!.length * 2 - 1);
      main.forEach((interval, intervalIndex) => {
        assert.equal(interval.kind, intervalIndex % 2 ? 'walk' : 'active');
        if (interval.kind === 'walk') assert.equal(interval.seconds, 90);
      });
      assert.deepEqual(
        main
          .filter(({ kind }) => kind === 'active')
          .map(({ seconds }) => seconds / 60),
        expected.bouts[day],
      );
      assert.equal(activeSeconds(session), expected.active[day]! * 60);
      assert.equal(totalSeconds(session), expected.total[day]! * 60);
    }
  }
  assert.equal(RACE_WALKING_PLAN.goalSeconds, 2400);
  assert.deepEqual(getSession(RACE_WALKING_PLAN, 12, 2).intervals, [
    { kind: 'warmup', seconds: 300 },
    { kind: 'active', seconds: 2400 },
    { kind: 'cooldown', seconds: 300 },
  ]);
  assert.throws(() => getSession(RACE_WALKING_PLAN, 13, 0), /Unknown/);
});

test('v2 arithmetic is bounded without claiming every step changes only one measure', () => {
  const sessions = RACE_WALKING_PLAN.stages.flatMap(({ sessions }) => sessions);
  let previousBest = 0;
  for (const [index, session] of sessions.entries()) {
    const longest = longestBout(session);
    assert.ok(longest - previousBest <= 2.5);
    previousBest = Math.max(previousBest, longest);
    if (index > 0) {
      assert.ok(
        activeSeconds(session) - activeSeconds(sessions[index - 1]!) <= 270,
      );
    }
  }
  assert.equal(Math.max(...sessions.map(totalSeconds)), 3090);
  // The final step increases both values. The copy must not promise otherwise.
  const beforeGoal = getSession(RACE_WALKING_PLAN, 12, 1);
  const goal = getSession(RACE_WALKING_PLAN, 12, 2);
  assert.equal(activeSeconds(goal) - activeSeconds(beforeGoal), 120);
  assert.equal(longestBout(goal) - longestBout(beforeGoal), 2);
});

test('the catalog retains old versions while new practice uses v2', () => {
  assert.equal(PLANS['race-walking'], RACE_WALKING_PLAN);
  assert.equal(planByVersion('race-walking-v1'), RACE_WALKING_PLAN_V1);
  assert.equal(planByVersion('race-walking-v2'), RACE_WALKING_PLAN);
  assert.equal(planByVersion('running-v1'), RUNNING_PLAN);
  assert.equal(planByVersion(''), null);
  assert.equal(planByVersion('race-walking-v3'), null);
  assert.equal(
    new Set(PLAN_CATALOG.map(({ plan }) => plan.version)).size,
    PLAN_CATALOG.length,
  );
  for (const { plan, label } of PLAN_CATALOG) {
    assert.ok(label.includes(`${plan.stages.length} stages`));
    for (const stage of plan.stages) {
      for (const session of stage.sessions) {
        for (const { seconds } of session.intervals) {
          assert.ok(Number.isInteger(seconds) && seconds > 0);
        }
        assert.ok(activeSeconds(session) < totalSeconds(session));
      }
    }
  }
});

test('each goal time stands for 5 km, and the copy says so', () => {
  assert.equal(goalMinutesPerKm(RUNNING_PLAN), 6);
  assert.equal(goalMinutesPerKm(RACE_WALKING_PLAN), 8);
  for (const plan of Object.values(PLANS)) {
    const equivalent = `${plan.goalSeconds / 60} minutes`;
    const pace = `about 5 km at ${goalMinutesPerKm(plan)} minutes per km`;
    for (const text of [
      ACTIVITY_COPY[plan.activity].intro,
      plan.stages.at(-1)!.tip,
    ]) {
      assert.ok(text.includes(equivalent), text);
      assert.ok(text.includes(pace), text);
    }
  }
});
