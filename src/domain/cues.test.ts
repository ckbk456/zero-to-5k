import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildSchedule, describeDuration } from './cues';
import { RUNNING_PLAN, getSession, totalSeconds } from './plan';

test('durations are spoken naturally', () => {
  assert.equal(describeDuration(30), '30 seconds');
  assert.equal(describeDuration(60), '1 minute');
  assert.equal(describeDuration(90), '90 seconds');
  assert.equal(describeDuration(150), '2 and a half minutes');
  assert.equal(describeDuration(300), '5 minutes');
  assert.equal(describeDuration(1800), '30 minutes');
});

test('every interval change gets one word, and the end says done', () => {
  const session = getSession(RUNNING_PLAN, 1, 0);
  const { segments, cues } = buildSchedule(session);
  assert.equal(segments.length, session.intervals.length);
  assert.equal(
    segments.reduce((sum, segment) => sum + segment.durationMs, 0),
    totalSeconds(session) * 1000,
  );
  assert.equal(cues.length, session.intervals.length + 1);
  assert.deepEqual(cues.slice(0, 4), [
    { atMs: 0, text: 'Walk' },
    { atMs: 300_000, text: 'Run' },
    { atMs: 360_000, text: 'Walk' },
    { atMs: 450_000, text: 'Run' },
  ]);
  assert.deepEqual(cues.at(-1), {
    atMs: totalSeconds(session) * 1000,
    text: 'Done',
  });
});

test('a continuous run has only its changes and no extra announcements', () => {
  const { cues } = buildSchedule(getSession(RUNNING_PLAN, 9, 2));
  assert.deepEqual(
    cues.map((cue) => [cue.atMs / 1000, cue.text]),
    [
      [0, 'Walk'],
      [300, 'Run'],
      [2100, 'Walk'],
      [2400, 'Done'],
    ],
  );
});

test('every plan session produces a valid, ordered schedule', () => {
  for (const stage of RUNNING_PLAN.stages) {
    for (const session of stage.sessions) {
      const { cues } = buildSchedule(session);
      for (let i = 1; i < cues.length; i += 1) {
        assert.ok(cues[i]!.atMs > cues[i - 1]!.atMs);
      }
      assert.ok(
        cues.every((cue) => ['Walk', 'Run', 'Done'].includes(cue.text)),
      );
    }
  }
});
