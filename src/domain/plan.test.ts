import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  RUNNING_PLAN,
  SESSIONS_PER_STAGE,
  getSession,
  totalSeconds,
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
