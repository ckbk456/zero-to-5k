/// <reference types="node" />

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';

import type { Activity } from '../domain/activity';
import {
  DATABASE_VERSION,
  finishAttempt,
  getPreferredActivity,
  interruptStaleAttempts,
  listAttempts,
  recordCheck,
  recordDecision,
  resetProgress,
  startAttempt,
  migrateDatabase,
  setPreferredActivity,
  type Database,
  type SqlParam,
} from './database';

function connect(path = ':memory:') {
  const sqlite = new DatabaseSync(path);
  const db: Database = {
    async execAsync(sql) {
      sqlite.exec(sql);
    },
    async getFirstAsync<T>(sql: string, ...params: SqlParam[]) {
      return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(sql: string, ...params: SqlParam[]) {
      return sqlite.prepare(sql).all(...params) as T[];
    },
    async runAsync(sql, ...params) {
      const result = sqlite.prepare(sql).run(...params);
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: Number(result.changes),
      };
    },
    async withExclusiveTransactionAsync(task) {
      sqlite.exec('BEGIN EXCLUSIVE');
      try {
        await task(db);
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return { db, sqlite };
}

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
      2,
    );
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

test('stale sessions become interrupted, never completed', async () => {
  const { db, sqlite } = connect();
  try {
    await migrateDatabase(db);
    const id = await startAttempt(db, attempt);
    await interruptStaleAttempts(db);
    const [row] = await listAttempts(db, 'running-v1');
    assert.equal(row?.id, id);
    assert.equal(row?.status, 'interrupted');
    assert.equal(row?.effort, null);
    assert.throws(() =>
      sqlite.exec(`UPDATE session_attempts SET effort = 3, pain = 0`),
    );
  } finally {
    sqlite.close();
  }
});

test('schema rejects invalid attempts; reset clears history', async () => {
  const { db, sqlite } = connect();
  try {
    await migrateDatabase(db);
    await assert.rejects(startAttempt(db, { ...attempt, stage: 10 }));
    await assert.rejects(startAttempt(db, { ...attempt, sessionIndex: 3 }));
    await startAttempt(db, attempt);
    await startAttempt(db, { ...attempt, planVersion: 'other' });
    assert.equal((await listAttempts(db, 'running-v1')).length, 1);
    await resetProgress(db);
    assert.deepEqual(await listAttempts(db, 'running-v1'), []);
    assert.deepEqual(await listAttempts(db, 'other'), []);
  } finally {
    sqlite.close();
  }
});
