import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RUNNING_PLAN } from './plan';
import {
  deriveProgress,
  recommend,
  type AttemptRecord,
  type Decision,
} from './progression';

let nextId = 1;
function done(
  stage: number,
  sessionIndex: number,
  effort: number | null = 5,
  pain: boolean | null = false,
  decision: Decision | null = null,
): AttemptRecord {
  return {
    id: nextId++,
    stage,
    sessionIndex,
    isReplay: false,
    status: 'completed',
    effort,
    pain,
    decision,
  };
}

function easyStage(stage: number): AttemptRecord[] {
  return [done(stage, 0), done(stage, 1), done(stage, 2)];
}

test('recommendations follow effort and pain', () => {
  assert.equal(recommend(8, false), 'none');
  assert.equal(recommend(9, false), 'effort');
  assert.equal(recommend(10, false), 'effort');
  assert.equal(recommend(2, true), 'pain');
});

test('a new player starts at stage 1, session 1', () => {
  const progress = deriveProgress(RUNNING_PLAN, []);
  assert.deepEqual(progress.next, {
    stage: 1,
    sessionIndex: 0,
    stageAttempt: 1,
  });
  assert.equal(progress.stages[0], 'current');
  assert.ok(progress.stages.slice(1).every((state) => state === 'locked'));
  assert.equal(progress.goalReached, false);
});

test('three sessions at effort 8 or lower with no pain clear a stage', () => {
  const progress = deriveProgress(RUNNING_PLAN, [
    done(1, 0, 8),
    done(1, 1, 0),
    done(1, 2, 7),
  ]);
  assert.equal(progress.stages[0], 'cleared');
  assert.equal(progress.stages[1], 'current');
  assert.deepEqual(progress.next, {
    stage: 2,
    sessionIndex: 0,
    stageAttempt: 1,
  });
});

test('a completed session waits for its check, then for a decision', () => {
  const unrated = done(1, 0, null, null);
  assert.deepEqual(deriveProgress(RUNNING_PLAN, [unrated]).pending, {
    attemptId: unrated.id,
    needs: 'check',
  });
  assert.equal(deriveProgress(RUNNING_PLAN, [unrated]).next, null);

  const hard = done(1, 0, 9);
  assert.deepEqual(deriveProgress(RUNNING_PLAN, [hard]).pending, {
    attemptId: hard.id,
    needs: 'decision',
  });
  const sore = done(1, 0, 3, true);
  assert.equal(deriveProgress(RUNNING_PLAN, [sore]).pending?.needs, 'decision');
});

test('restart begins a new attempt at session 1 of the same stage', () => {
  const progress = deriveProgress(RUNNING_PLAN, [
    done(1, 0),
    done(1, 1, 10, false, 'restart'),
  ]);
  assert.deepEqual(progress.next, {
    stage: 1,
    sessionIndex: 0,
    stageAttempt: 2,
  });

  const retried = deriveProgress(RUNNING_PLAN, [
    done(1, 0),
    done(1, 1, 10, false, 'restart'),
    ...easyStage(1),
  ]);
  assert.equal(retried.stages[0], 'cleared');
});

test('keep going never blocks, but the stage is only completed', () => {
  const progress = deriveProgress(RUNNING_PLAN, [
    done(1, 0),
    done(1, 1, 3, true, 'continue'),
    done(1, 2, 10, false, 'continue'),
  ]);
  assert.equal(progress.stages[0], 'completed');
  assert.deepEqual(progress.next, {
    stage: 2,
    sessionIndex: 0,
    stageAttempt: 1,
  });
});

test('ended-early, interrupted, in-progress, replay, and stray rows change nothing', () => {
  const base = { ...done(1, 0) };
  const ignored: AttemptRecord[] = [
    { ...base, id: nextId++, status: 'ended_early', effort: null, pain: null },
    { ...base, id: nextId++, status: 'interrupted', effort: null, pain: null },
    { ...base, id: nextId++, status: 'in_progress', effort: null, pain: null },
    { ...base, id: nextId++, isReplay: true, effort: 10 },
    { ...base, id: nextId++, stage: 4, effort: 10 },
  ];
  const progress = deriveProgress(RUNNING_PLAN, ignored);
  assert.deepEqual(progress.next, {
    stage: 1,
    sessionIndex: 0,
    stageAttempt: 1,
  });
  assert.equal(progress.pending, null);
});

test('attempts are applied in id order', () => {
  const first = done(1, 0);
  const second = done(1, 1);
  const progress = deriveProgress(RUNNING_PLAN, [second, first]);
  assert.deepEqual(progress.next, {
    stage: 1,
    sessionIndex: 2,
    stageAttempt: 1,
  });
});

test('finishing stage 9 reaches the goal; later replays change nothing', () => {
  const history = Array.from({ length: 9 }, (_, index) =>
    easyStage(index + 1),
  ).flat();
  const progress = deriveProgress(RUNNING_PLAN, [
    ...history,
    { ...done(9, 2, 10, true), isReplay: true },
  ]);
  assert.equal(progress.goalReached, true);
  assert.equal(progress.next, null);
  assert.equal(progress.pending, null);
  assert.ok(progress.stages.every((state) => state === 'cleared'));
});
