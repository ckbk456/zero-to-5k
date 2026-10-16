import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EFFORT_LEVELS, effortLevel } from './effort';
import { MAX_CLEAR_EFFORT } from './progression';

test('the effort scale covers 0 to 10 with labels and talk-test hints', () => {
  assert.deepEqual(
    EFFORT_LEVELS.map((level) => level.value),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.ok(EFFORT_LEVELS.every((level) => level.label && level.talk));
  assert.equal(effortLevel(MAX_CLEAR_EFFORT).label, 'Very hard');
  assert.equal(effortLevel(MAX_CLEAR_EFFORT + 1).label, 'Extremely hard');
  assert.throws(() => effortLevel(11));
});
