import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RUNNING_PLAN, getSession, totalSeconds } from './plan';
import { summarizeSession } from './summary';

test('repeated run and walk pairs collapse into one step', () => {
  assert.deepEqual(summarizeSession(getSession(RUNNING_PLAN, 1, 0)), [
    { kind: 'single', interval: { kind: 'warmup', seconds: 300 } },
    { kind: 'cycle', run: 60, walk: 90, times: 7 },
    { kind: 'single', interval: { kind: 'active', seconds: 60 } },
    { kind: 'single', interval: { kind: 'cooldown', seconds: 300 } },
  ]);
});

test('different pairs stay separate and a lone run stays single', () => {
  assert.deepEqual(summarizeSession(getSession(RUNNING_PLAN, 5, 2)), [
    { kind: 'single', interval: { kind: 'warmup', seconds: 300 } },
    { kind: 'single', interval: { kind: 'active', seconds: 1200 } },
    { kind: 'single', interval: { kind: 'cooldown', seconds: 300 } },
  ]);
  const stage3 = summarizeSession(getSession(RUNNING_PLAN, 3, 0));
  assert.equal(stage3.filter((step) => step.kind === 'cycle').length, 3);
});

test('every summary accounts for the whole session', () => {
  for (const stage of RUNNING_PLAN.stages) {
    for (const session of stage.sessions) {
      const seconds = summarizeSession(session).reduce(
        (sum, step) =>
          sum +
          (step.kind === 'cycle'
            ? (step.run + step.walk) * step.times
            : step.interval.seconds),
        0,
      );
      assert.equal(seconds, totalSeconds(session));
    }
  }
});
