import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ACTIVITY_COPY } from './activity';
import {
  PLANS,
  RACE_WALKING_PLAN,
  RUNNING_PLAN,
  SESSIONS_PER_STAGE,
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

test('the race-walking plan matches the P4 draft preset', () => {
  assert.equal(RACE_WALKING_PLAN.version, 'race-walking-v1');
  assert.equal(RACE_WALKING_PLAN.activity, 'race-walking');
  assert.equal(RACE_WALKING_PLAN.stages.length, 16);
  for (const [
    stageIndex,
    [main, active, total],
  ] of raceWalkingPreset.entries()) {
    const stage = RACE_WALKING_PLAN.stages[stageIndex]!;
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
  const sessions = RACE_WALKING_PLAN.stages.map((stage) => stage.sessions[0]!);
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
  assert.equal(RACE_WALKING_PLAN.goalSeconds, 2400);
  assert.deepEqual(getSession(RACE_WALKING_PLAN, 16, 2).intervals[1], {
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
