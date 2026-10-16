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

test('every interval change gets one cue, and the end is announced', () => {
  const session = getSession(RUNNING_PLAN, 1, 0);
  const { segments, cues } = buildSchedule(session, 1, 0);
  assert.equal(segments.length, session.intervals.length);
  assert.equal(
    segments.reduce((sum, segment) => sum + segment.durationMs, 0),
    totalSeconds(session) * 1000,
  );
  assert.equal(cues.length, session.intervals.length + 1);
  assert.equal(cues[0]?.atMs, 0);
  assert.match(cues[0]?.text ?? '', /^Stage 1, session 1\. Warm up/);
  assert.deepEqual(cues[1], { atMs: 300_000, text: 'Run for 1 minute.' });
  assert.deepEqual(cues[2], { atMs: 360_000, text: 'Walk for 90 seconds.' });
  assert.match(cues.at(-2)?.text ?? '', /^Cool down/);
  assert.deepEqual(cues.at(-1), {
    atMs: totalSeconds(session) * 1000,
    text: 'Session complete. Well done.',
  });
});

test('long runs add halfway and one-minute cues in order', () => {
  const { cues } = buildSchedule(getSession(RUNNING_PLAN, 9, 2), 9, 2);
  assert.deepEqual(
    cues.map((cue) => [cue.atMs / 1000, cue.text]),
    [
      [0, 'Stage 9, session 3. Warm up: walk for 5 minutes.'],
      [300, 'Run for 30 minutes.'],
      [1200, 'Halfway.'],
      [2040, 'One minute left.'],
      [2100, 'Cool down: walk for 5 minutes.'],
      [2400, 'Session complete. Well done.'],
    ],
  );
});

test('every plan session produces a valid, ordered schedule', () => {
  for (const stage of RUNNING_PLAN.stages) {
    stage.sessions.forEach((session, index) => {
      const { cues } = buildSchedule(session, stage.number, index);
      for (let i = 1; i < cues.length; i += 1) {
        assert.ok(cues[i]!.atMs >= cues[i - 1]!.atMs);
      }
      assert.ok(cues.every((cue) => cue.text.length > 0));
    });
  }
});
