import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ACTIVITIES, OFFERED_ACTIVITIES, offeredActivity } from './activity';

test('race walking is the only offered program', () => {
  assert.deepEqual(OFFERED_ACTIVITIES, ['race-walking']);
  for (const activity of OFFERED_ACTIVITIES)
    assert.ok(ACTIVITIES.includes(activity));
});

test('a saved preference that is not offered shows race walking', () => {
  // Fresh installs and earlier builds store running.
  assert.equal(offeredActivity('running'), 'race-walking');
  assert.equal(offeredActivity('race-walking'), 'race-walking');
});
