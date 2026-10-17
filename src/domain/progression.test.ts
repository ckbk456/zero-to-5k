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
    source: 'timed',
    status: 'completed',
    effort,
    pain,
    decision,
  };
}

function marked(stage: number, sessionIndex: number): AttemptRecord {
  return {
    ...done(stage, sessionIndex, null, null),
    source: 'manual',
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

test('a new player is pointed at stage 1, session 1; nothing is locked', () => {
  const progress = deriveProgress(RUNNING_PLAN, []);
  assert.deepEqual(progress.next, {
    stage: 1,
    sessionIndex: 0,
    stageAttempt: 1,
  });
  assert.ok(progress.stages.every((stage) => stage.state === 'not_started'));
  assert.equal(progress.goalReached, false);
});

test('three sessions at effort 8 or lower with no pain clear a stage', () => {
  const progress = deriveProgress(RUNNING_PLAN, [
    done(1, 0, 8),
    done(1, 1, 0),
    done(1, 2, 7),
  ]);
  assert.equal(progress.stages[0]?.state, 'cleared');
  assert.equal(progress.stages[1]?.state, 'not_started');
  assert.deepEqual(progress.next, {
    stage: 2,
    sessionIndex: 0,
    stageAttempt: 1,
  });
});

test('sessions can be done in any stage and any order', () => {
  const progress = deriveProgress(RUNNING_PLAN, [done(5, 2), done(5, 0)]);
  assert.equal(progress.stages[4]?.state, 'in_progress');
  assert.deepEqual(progress.stages[4]?.done, [true, false, true]);
  assert.deepEqual(progress.next, {
    stage: 1,
    sessionIndex: 0,
    stageAttempt: 1,
  });
});

test('the latest played session waits for its check, then for a decision', () => {
  const unrated = done(1, 0, null, null);
  const progress = deriveProgress(RUNNING_PLAN, [unrated]);
  assert.deepEqual(progress.pending, { attemptId: unrated.id, needs: 'check' });
  // A pending check never blocks other sessions.
  assert.deepEqual(progress.next, {
    stage: 1,
    sessionIndex: 1,
    stageAttempt: 1,
  });

  const hard = done(1, 0, 9);
  assert.deepEqual(deriveProgress(RUNNING_PLAN, [hard]).pending, {
    attemptId: hard.id,
    needs: 'decision',
  });
  const sore = done(1, 0, 3, true);
  assert.equal(deriveProgress(RUNNING_PLAN, [sore]).pending?.needs, 'decision');

  // Only the most recent played session is surfaced.
  assert.equal(
    deriveProgress(RUNNING_PLAN, [unrated, done(2, 0)]).pending,
    null,
  );
});

test('restart wipes the stage and begins a new attempt', () => {
  const progress = deriveProgress(RUNNING_PLAN, [
    done(1, 0),
    done(1, 1, 10, false, 'restart'),
  ]);
  assert.deepEqual(progress.stages[0]?.done, [false, false, false]);
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
  assert.equal(retried.stages[0]?.state, 'cleared');
});

test('keep going never blocks, but the stage is only completed', () => {
  const progress = deriveProgress(RUNNING_PLAN, [
    done(1, 0),
    done(1, 1, 3, true, 'continue'),
    done(1, 2, 10, false, 'continue'),
  ]);
  assert.equal(progress.stages[0]?.state, 'completed');
  assert.deepEqual(progress.next, {
    stage: 2,
    sessionIndex: 0,
    stageAttempt: 1,
  });

  // Running a session again in control earns the clear.
  const replayed = deriveProgress(RUNNING_PLAN, [
    done(1, 0),
    done(1, 1, 3, true, 'continue'),
    done(1, 2, 10, false, 'continue'),
    done(1, 1),
    done(1, 2),
  ]);
  assert.equal(replayed.stages[0]?.state, 'cleared');
});

test('marked sessions count as done but never clear a stage', () => {
  const progress = deriveProgress(RUNNING_PLAN, [
    marked(3, 0),
    marked(3, 1),
    done(3, 2),
  ]);
  assert.equal(progress.stages[2]?.state, 'completed');
  assert.equal(progress.pending, null);
});

test('ended-early, interrupted, in-progress, replay, and stray rows change nothing', () => {
  const base = { ...done(1, 0) };
  const ignored: AttemptRecord[] = [
    { ...base, id: nextId++, status: 'ended_early', effort: null, pain: null },
    { ...base, id: nextId++, status: 'interrupted', effort: null, pain: null },
    { ...base, id: nextId++, status: 'in_progress', effort: null, pain: null },
    { ...base, id: nextId++, isReplay: true, effort: 10 },
    { ...base, id: nextId++, stage: 12 },
    { ...base, id: nextId++, sessionIndex: 5 },
  ];
  const progress = deriveProgress(RUNNING_PLAN, ignored);
  assert.ok(progress.stages.every((stage) => stage.state === 'not_started'));
  assert.equal(progress.pending, null);
});

test('attempts are applied in id order', () => {
  const restart = done(1, 0, 10, false, 'restart');
  const after = done(1, 1);
  const progress = deriveProgress(RUNNING_PLAN, [after, restart]);
  assert.deepEqual(progress.stages[0]?.done, [false, true, false]);
});

test('finishing stage 9 reaches the goal, even with earlier gaps', () => {
  assert.equal(deriveProgress(RUNNING_PLAN, easyStage(9)).goalReached, true);

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
  assert.ok(progress.stages.every((stage) => stage.state === 'cleared'));
});
