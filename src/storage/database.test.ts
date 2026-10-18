/// <reference types="node" />

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import type { Activity } from '../domain/activity';
import {
  RACE_WALKING_PLAN,
  RACE_WALKING_PLAN_V1,
  getSession,
  planByVersion,
} from '../domain/plan';
import { deriveProgress } from '../domain/progression';
import {
  DATABASE_VERSION,
  finishAttempt,
  getAttempt,
  getPreferredActivity,
  interruptStaleAttempts,
  listAttempts,
  markSessionDone,
  recordCheck,
  recordDecision,
  getSettings,
  resetProgress,
  startAttempt,
  updateSettings,
  migrateDatabase,
  setPreferredActivity,
  type Database,
} from './database';
import { connect } from './test-sqlite';

test('fresh migration installs defaults; reopening preserves the selection', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'zero-to-5k-sqlite-'));
  const path = join(directory, 'preferences.db');
  try {
    const first = connect(path);
    try {
      await migrateDatabase(first.db);
      assert.equal(await getPreferredActivity(first.db), 'running');
      await setPreferredActivity(first.db, 'race-walking');
    } finally {
      first.sqlite.close();
    }
    const reopened = connect(path);
    try {
      await migrateDatabase(reopened.db);
      assert.equal(await getPreferredActivity(reopened.db), 'race-walking');
      assert.equal(
        (
          await reopened.db.getFirstAsync<{ user_version: number }>(
            'PRAGMA user_version',
          )
        )?.user_version,
        DATABASE_VERSION,
      );
    } finally {
      reopened.sqlite.close();
    }
  } finally {
    // Only the unique test-owned temporary directory is removed.
    rmSync(directory, { recursive: true, force: true });
  }
});

test('future schema versions are rejected without changing data', async () => {
  const { db, sqlite } = connect();
  try {
    await migrateDatabase(db);
    await setPreferredActivity(db, 'race-walking');
    sqlite.exec('PRAGMA user_version = 999');
    await assert.rejects(migrateDatabase(db), /newer version/);
    assert.equal(await getPreferredActivity(db), 'race-walking');
    assert.equal(
      (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))
        ?.user_version,
      999,
    );
  } finally {
    sqlite.close();
  }
});

test('failed migrations roll back schema and version', async () => {
  const { db, sqlite } = connect();
  try {
    const failing: Database = {
      ...db,
      withExclusiveTransactionAsync: (task) =>
        db.withExclusiveTransactionAsync(async (transaction) => {
          await task(transaction);
          throw new Error('simulated interruption');
        }),
    };
    await assert.rejects(migrateDatabase(failing), /simulated interruption/);
    assert.equal(
      await db.getFirstAsync(
        "SELECT name FROM sqlite_master WHERE name = 'app_preferences'",
      ),
      null,
    );
    assert.equal(
      (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))
        ?.user_version,
      0,
    );
    await migrateDatabase(db);
    assert.equal(await getPreferredActivity(db), 'running');
  } finally {
    sqlite.close();
  }
});

test('invalid activity and singleton rows cannot overwrite valid data', async () => {
  const { db, sqlite } = connect();
  try {
    await migrateDatabase(db);
    await assert.rejects(
      setPreferredActivity(db, 'cycling' as Activity),
      /Unsupported/,
    );
    assert.throws(() =>
      sqlite.prepare('UPDATE app_preferences SET activity = ?').run('cycling'),
    );
    assert.throws(() =>
      sqlite.exec("INSERT INTO app_preferences VALUES (2, 'running')"),
    );
    assert.equal(await getPreferredActivity(db), 'running');
    sqlite.exec('DELETE FROM app_preferences');
    await assert.rejects(getPreferredActivity(db), /could not be read/);
  } finally {
    sqlite.close();
  }
});

const attempt = {
  planVersion: 'running-v1',
  stage: 1,
  sessionIndex: 0,
  stageAttempt: 1,
  isReplay: false,
  startedAt: '2026-10-16T08:00:00.000Z',
};

test('version 1 databases upgrade to session history without losing data', async () => {
  const { db, sqlite } = connect();
  try {
    sqlite.exec(`
      CREATE TABLE app_preferences (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        activity TEXT NOT NULL CHECK (activity IN ('running', 'race-walking'))
      );
      INSERT INTO app_preferences (id, activity) VALUES (1, 'race-walking');
      PRAGMA user_version = 1;
    `);
    await migrateDatabase(db);
    assert.equal(await getPreferredActivity(db), 'race-walking');
    assert.deepEqual(await listAttempts(db, 'running-v1'), []);
    assert.equal(
      (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))
        ?.user_version,
      DATABASE_VERSION,
    );
    assert.deepEqual(await getSettings(db), {
      onboarded: false,
      speech: true,
      vibration: true,
    });
  } finally {
    sqlite.close();
  }
});

test('an attempt ends once and is rated once', async () => {
  const { db, sqlite } = connect();
  try {
    await migrateDatabase(db);
    const id = await startAttempt(db, attempt);
    await assert.rejects(recordCheck(db, id, 5, false), /already rated/);
    await finishAttempt(db, id, {
      status: 'completed',
      endedAt: '2026-10-16T08:30:00.000Z',
      activeSeconds: 1710,
    });
    await assert.rejects(
      finishAttempt(db, id, {
        status: 'ended_early',
        endedAt: null,
        activeSeconds: null,
      }),
      /already ended/,
    );
    await assert.rejects(recordDecision(db, id, 'restart'), /already made/);
    await assert.rejects(recordCheck(db, id, 11, false), /0 to 10/);
    await recordCheck(db, id, 9, true);
    await assert.rejects(recordCheck(db, id, 3, false), /already rated/);
    await recordDecision(db, id, 'continue');
    await assert.rejects(recordDecision(db, id, 'restart'), /already made/);
    const [row] = await listAttempts(db, 'running-v1');
    assert.deepEqual(row, {
      id,
      stage: 1,
      sessionIndex: 0,
      isReplay: false,
      source: 'timed',
      status: 'completed',
      effort: 9,
      pain: true,
      decision: 'continue',
      startedAt: attempt.startedAt,
      endedAt: '2026-10-16T08:30:00.000Z',
      activeSeconds: 1710,
    });
  } finally {
    sqlite.close();
  }
});

test('version 3 rows become timed; marked sessions are never rated', async () => {
  const { db, sqlite } = connect();
  try {
    await migrateDatabase(db);
    const played = await startAttempt(db, attempt);
    sqlite.exec(`
      ALTER TABLE session_attempts DROP COLUMN source;
      PRAGMA user_version = 3;
    `);
    await migrateDatabase(db);
    const marked = await markSessionDone(db, {
      planVersion: 'running-v1',
      stage: 4,
      sessionIndex: 2,
      stageAttempt: 1,
      markedAt: '2026-10-17T09:00:00.000Z',
    });
    const [playedRow, markedRow] = await listAttempts(db, 'running-v1');
    assert.equal(playedRow?.id, played);
    assert.equal(playedRow?.source, 'timed');
    assert.equal(markedRow?.id, marked);
    assert.equal(markedRow?.source, 'manual');
    assert.equal(markedRow?.status, 'completed');
    assert.equal(markedRow?.activeSeconds, null);
    await assert.rejects(recordCheck(db, marked, 5, false), /already rated/);
    assert.throws(() =>
      sqlite.exec(`UPDATE session_attempts SET source = 'guess'`),
    );
  } finally {
    sqlite.close();
  }
});

test('stale sessions become interrupted, never completed', async () => {
  const { db, sqlite } = connect();
  try {
    await migrateDatabase(db);
    const id = await startAttempt(db, attempt);
    const live = await startAttempt(db, attempt);
    await interruptStaleAttempts(db, live);
    const [row, liveRow] = await listAttempts(db, 'running-v1');
    assert.equal(row?.id, id);
    assert.equal(row?.status, 'interrupted');
    assert.equal(liveRow?.status, 'in_progress');
    assert.equal(row?.effort, null);
    assert.throws(() =>
      sqlite.exec(`UPDATE session_attempts SET effort = 3, pain = 0`),
    );
  } finally {
    sqlite.close();
  }
});

test('schema rejects invalid attempts; reset clears one program', async () => {
  const { db, sqlite } = connect();
  try {
    await migrateDatabase(db);
    await assert.rejects(startAttempt(db, { ...attempt, stage: 0 }));
    await assert.rejects(startAttempt(db, { ...attempt, sessionIndex: 3 }));
    await startAttempt(db, attempt);
    const walked = await startAttempt(db, {
      ...attempt,
      planVersion: 'race-walking-v1',
      stage: 16,
    });
    assert.equal((await listAttempts(db, 'running-v1')).length, 1);
    assert.deepEqual(await getAttempt(db, walked), {
      planVersion: 'race-walking-v1',
      stage: 16,
      sessionIndex: 0,
      isReplay: false,
    });
    assert.equal(await getAttempt(db, walked + 1), null);
    await resetProgress(db, 'running-v1');
    assert.deepEqual(await listAttempts(db, 'running-v1'), []);
    assert.equal((await listAttempts(db, 'race-walking-v1')).length, 1);
  } finally {
    sqlite.close();
  }
});

test('new curriculum keeps legacy attempts intact and starts independent progress', async () => {
  const { db, sqlite } = connect();
  try {
    await migrateDatabase(db);
    const legacyCompleted = await startAttempt(db, {
      ...attempt,
      planVersion: 'race-walking-v1',
      stage: 16,
    });
    await finishAttempt(db, legacyCompleted, {
      status: 'completed',
      endedAt: '2026-10-18T09:00:00.000Z',
      activeSeconds: 3000,
    });
    await recordCheck(db, legacyCompleted, 6, false);
    const legacyLive = await startAttempt(db, {
      ...attempt,
      planVersion: 'race-walking-v1',
      stage: 16,
      sessionIndex: 1,
    });
    await markSessionDone(db, {
      planVersion: 'race-walking-v1',
      stage: 1,
      sessionIndex: 2,
      stageAttempt: 1,
      markedAt: '2026-10-18T08:00:00.000Z',
    });
    await startAttempt(db, attempt);
    const rowsBefore = sqlite
      .prepare('SELECT * FROM session_attempts ORDER BY id')
      .all();

    // A catalog change does not require or trigger a data migration.
    await migrateDatabase(db);
    assert.deepEqual(
      sqlite.prepare('SELECT * FROM session_attempts ORDER BY id').all(),
      rowsBefore,
    );
    const legacyHistory = await listAttempts(db, 'race-walking-v1');
    assert.equal(
      deriveProgress(RACE_WALKING_PLAN_V1, legacyHistory).stages[15]?.done[0],
      true,
    );
    const currentHistory = await listAttempts(db, RACE_WALKING_PLAN.version);
    assert.deepEqual(currentHistory, []);
    assert.deepEqual(deriveProgress(RACE_WALKING_PLAN, currentHistory).next, {
      stage: 1,
      sessionIndex: 0,
      stageAttempt: 1,
    });

    // An attempt saved by the previous binary still resolves its exact intervals.
    const liveAttempt = await getAttempt(db, legacyLive);
    assert.ok(liveAttempt);
    const livePlan = planByVersion(liveAttempt.planVersion);
    assert.equal(livePlan, RACE_WALKING_PLAN_V1);
    assert.equal(
      getSession(livePlan!, liveAttempt.stage, liveAttempt.sessionIndex)
        .intervals[1]?.seconds,
      2400,
    );

    await markSessionDone(db, {
      planVersion: RACE_WALKING_PLAN.version,
      stage: 1,
      sessionIndex: 0,
      stageAttempt: 1,
      markedAt: '2026-10-19T08:00:00.000Z',
    });
    assert.equal((await listAttempts(db, RACE_WALKING_PLAN.version)).length, 1);
    assert.deepEqual(await listAttempts(db, 'race-walking-v1'), legacyHistory);
    await resetProgress(db, RACE_WALKING_PLAN.version);
    assert.deepEqual(
      sqlite.prepare('SELECT * FROM session_attempts ORDER BY id').all(),
      rowsBefore,
    );
  } finally {
    sqlite.close();
  }
});

// Runs the real migrations up to `version`, then stops.
async function migrateTo(db: Database, version: number): Promise<void> {
  let applied = 0;
  const partial: Database = {
    ...db,
    withExclusiveTransactionAsync: (task) =>
      applied++ < version
        ? db.withExclusiveTransactionAsync(task)
        : Promise.reject(new Error('stopped')),
  };
  await assert.rejects(migrateDatabase(partial), /stopped/);
}

test('version 4 databases lift the stage limit, keeping every row and id', async () => {
  const { db, sqlite } = connect();
  try {
    await migrateTo(db, 4);
    await assert.rejects(startAttempt(db, { ...attempt, stage: 10 }));
    const kept = await startAttempt(db, attempt);
    await finishAttempt(db, kept, {
      status: 'completed',
      endedAt: '2026-10-16T08:30:00.000Z',
      activeSeconds: 1710,
    });
    await recordCheck(db, kept, 4, false);
    const removed = await startAttempt(db, attempt);
    sqlite.exec(`DELETE FROM session_attempts WHERE id = ${removed}`);

    await migrateDatabase(db);
    assert.equal(
      (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))
        ?.user_version,
      DATABASE_VERSION,
    );
    const [row] = await listAttempts(db, 'running-v1');
    assert.equal(row?.id, kept);
    assert.equal(row?.status, 'completed');
    assert.equal(row?.source, 'timed');
    assert.equal(row?.effort, 4);
    assert.equal(row?.activeSeconds, 1710);

    // Deleted ids are never reused.
    const next = await startAttempt(db, {
      ...attempt,
      planVersion: 'race-walking-v1',
      stage: 16,
    });
    assert.ok(next > removed);
    for (const change of [
      'stage = 0',
      'session_index = 3',
      "source = 'guess'",
      "status = 'done'",
    ]) {
      assert.throws(() => sqlite.exec(`UPDATE session_attempts SET ${change}`));
    }
    await assert.rejects(recordCheck(db, next, 3, false), /already rated/);
  } finally {
    sqlite.close();
  }
});

test('settings default on and persist partial updates', async () => {
  const { db, sqlite } = connect();
  try {
    await migrateDatabase(db);
    await updateSettings(db, { onboarded: true, speech: false });
    assert.deepEqual(await getSettings(db), {
      onboarded: true,
      speech: false,
      vibration: true,
    });
    await updateSettings(db, {});
    assert.throws(() => sqlite.exec('UPDATE app_preferences SET speech = 2'));
  } finally {
    sqlite.close();
  }
});
