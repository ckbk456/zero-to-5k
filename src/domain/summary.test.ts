import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  PLAN_CATALOG,
  RACE_WALKING_PLAN,
  RACE_WALKING_PLAN_V1,
  RUNNING_PLAN,
  getSession,
  totalSeconds,
} from './plan';
import { summarizeSession } from './summary';

test('repeated active and walk pairs collapse into one step', () => {
  assert.deepEqual(summarizeSession(getSession(RUNNING_PLAN, 1, 0)), [
    { kind: 'single', interval: { kind: 'warmup', seconds: 300 } },
    { kind: 'cycle', active: 60, walk: 90, times: 7 },
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

test('race-walking bouts collapse the same way', () => {
  assert.deepEqual(summarizeSession(getSession(RACE_WALKING_PLAN, 1, 0)), [
    { kind: 'single', interval: { kind: 'warmup', seconds: 300 } },
    { kind: 'cycle', active: 60, walk: 90, times: 7 },
    { kind: 'single', interval: { kind: 'active', seconds: 60 } },
    { kind: 'single', interval: { kind: 'cooldown', seconds: 300 } },
  ]);
  assert.deepEqual(summarizeSession(getSession(RACE_WALKING_PLAN_V1, 1, 0)), [
    { kind: 'single', interval: { kind: 'warmup', seconds: 300 } },
    { kind: 'cycle', active: 30, walk: 90, times: 5 },
    { kind: 'single', interval: { kind: 'active', seconds: 30 } },
    { kind: 'single', interval: { kind: 'cooldown', seconds: 300 } },
  ]);
});

test('every summary accounts for the whole session', () => {
  for (const { plan } of PLAN_CATALOG) {
    for (const stage of plan.stages) {
      for (const session of stage.sessions) {
        const seconds = summarizeSession(session).reduce(
          (sum, step) =>
            sum +
            (step.kind === 'cycle'
              ? (step.active + step.walk) * step.times
              : step.interval.seconds),
          0,
        );
        assert.equal(seconds, totalSeconds(session));
      }
    }
  }
});
