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
  getPreferredActivity,
  migrateDatabase,
  setPreferredActivity,
  type Database,
} from './database';

function connect(path = ':memory:') {
  const sqlite = new DatabaseSync(path);
  const db: Database = {
    async execAsync(sql) {
      sqlite.exec(sql);
    },
    async getFirstAsync<T>(sql: string, ...params: (string | number)[]) {
      return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async runAsync(sql, ...params) {
      return sqlite.prepare(sql).run(...params);
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
