/// <reference types="node" />

// Test-only adapter: runs the app's SQL against Node's SQLite.
import { DatabaseSync } from 'node:sqlite';

import type { Database, SqlParam } from './database';

export function connect(path = ':memory:') {
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
