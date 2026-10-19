import { isActivity, type Activity } from '../domain/activity';
import type {
  AttemptRecord,
  AttemptSource,
  AttemptStatus,
  Decision,
} from '../domain/progression';

// A narrow SQL port lets tests execute the same migration against real SQLite.
// Expo's SQLiteDatabase and Transaction satisfy these interfaces.
export type SqlParam = string | number | null;

export interface SqlConnection {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string, ...params: SqlParam[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: SqlParam[]): Promise<T[]>;
  runAsync(
    sql: string,
    ...params: SqlParam[]
  ): Promise<{ lastInsertRowId: number; changes: number }>;
}

export interface Database extends SqlConnection {
  withExclusiveTransactionAsync(
    task: (transaction: SqlConnection) => Promise<void>,
  ): Promise<void>;
}

export const DATABASE_VERSION = 5;

export async function migrateDatabase(db: Database): Promise<void> {
  const version = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  if (!version || version.user_version > DATABASE_VERSION) {
    throw new Error('This database requires a newer version of the app.');
  }

  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  if (version.user_version === DATABASE_VERSION) return;

  // Append new migrations; never edit a released one.
  const migrations = [
    migration1,
    migration2,
    migration3,
    migration4,
    migration5,
  ];
  for (const [index, migrate] of migrations.entries()) {
    if (version.user_version > index) continue;
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await migrate(transaction);
      await transaction.execAsync(`PRAGMA user_version = ${index + 1}`);
    });
  }
}

async function migration1(db: SqlConnection): Promise<void> {
  await db.execAsync(`
    CREATE TABLE app_preferences (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      activity TEXT NOT NULL CHECK (activity IN ('running', 'race-walking'))
    );
    INSERT INTO app_preferences (id, activity) VALUES (1, 'running');
  `);
}

async function migration2(db: SqlConnection): Promise<void> {
  await db.execAsync(`
    CREATE TABLE session_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_version TEXT NOT NULL,
      stage INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 9),
      session_index INTEGER NOT NULL CHECK (session_index BETWEEN 0 AND 2),
      stage_attempt INTEGER NOT NULL CHECK (stage_attempt >= 1),
      is_replay INTEGER NOT NULL CHECK (is_replay IN (0, 1)),
      started_at TEXT NOT NULL,
      ended_at TEXT,
      active_seconds INTEGER CHECK (active_seconds >= 0),
      status TEXT NOT NULL CHECK (
        status IN ('in_progress', 'completed', 'ended_early', 'interrupted')
      ),
      effort INTEGER CHECK (effort BETWEEN 0 AND 10),
      pain INTEGER CHECK (pain IN (0, 1)),
      decision TEXT CHECK (decision IN ('continue', 'restart')),
      CHECK (status = 'completed' OR (effort IS NULL AND pain IS NULL)),
      CHECK ((effort IS NULL) = (pain IS NULL)),
      CHECK (decision IS NULL OR effort IS NOT NULL)
    );
  `);
}

export async function getPreferredActivity(
  db: SqlConnection,
): Promise<Activity> {
  const row = await db.getFirstAsync<{ activity: unknown }>(
    'SELECT activity FROM app_preferences WHERE id = 1',
  );
  if (!row || !isActivity(row.activity)) {
    throw new Error('Your activity preference could not be read.');
  }
  return row.activity;
}

export async function setPreferredActivity(
  db: SqlConnection,
  activity: Activity,
): Promise<void> {
  if (!isActivity(activity)) throw new Error('Unsupported activity.');
  await db.runAsync(
    `INSERT INTO app_preferences (id, activity) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET activity = excluded.activity`,
    activity,
  );
}

async function migration3(db: SqlConnection): Promise<void> {
  await db.execAsync(`
    ALTER TABLE app_preferences ADD COLUMN onboarded INTEGER NOT NULL
      DEFAULT 0 CHECK (onboarded IN (0, 1));
    ALTER TABLE app_preferences ADD COLUMN speech INTEGER NOT NULL
      DEFAULT 1 CHECK (speech IN (0, 1));
    ALTER TABLE app_preferences ADD COLUMN vibration INTEGER NOT NULL
      DEFAULT 1 CHECK (vibration IN (0, 1));
  `);
}

// Version 4: sessions can be marked done without playing them.
async function migration4(db: SqlConnection): Promise<void> {
  await db.execAsync(`
    ALTER TABLE session_attempts ADD COLUMN source TEXT NOT NULL
      DEFAULT 'timed' CHECK (source IN ('timed', 'manual'));
  `);
}

// Version 5: race walking has 16 stages, so the stage count is left to the
// plan. SQLite cannot change a CHECK in place, so the table is rebuilt with
// every row and its id counter kept.
async function migration5(db: SqlConnection): Promise<void> {
  await db.execAsync(`
    CREATE TABLE session_attempts_v5 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_version TEXT NOT NULL,
      stage INTEGER NOT NULL CHECK (stage >= 1),
      session_index INTEGER NOT NULL CHECK (session_index BETWEEN 0 AND 2),
      stage_attempt INTEGER NOT NULL CHECK (stage_attempt >= 1),
      is_replay INTEGER NOT NULL CHECK (is_replay IN (0, 1)),
      started_at TEXT NOT NULL,
      ended_at TEXT,
      active_seconds INTEGER CHECK (active_seconds >= 0),
      status TEXT NOT NULL CHECK (
        status IN ('in_progress', 'completed', 'ended_early', 'interrupted')
      ),
      effort INTEGER CHECK (effort BETWEEN 0 AND 10),
      pain INTEGER CHECK (pain IN (0, 1)),
      decision TEXT CHECK (decision IN ('continue', 'restart')),
      source TEXT NOT NULL DEFAULT 'timed' CHECK (source IN ('timed', 'manual')),
      CHECK (status = 'completed' OR (effort IS NULL AND pain IS NULL)),
      CHECK ((effort IS NULL) = (pain IS NULL)),
      CHECK (decision IS NULL OR effort IS NOT NULL)
    );
    INSERT INTO session_attempts_v5 (
      id, plan_version, stage, session_index, stage_attempt, is_replay,
      started_at, ended_at, active_seconds, status, effort, pain, decision,
      source
    )
    SELECT id, plan_version, stage, session_index, stage_attempt, is_replay,
           started_at, ended_at, active_seconds, status, effort, pain,
           decision, source
    FROM session_attempts;
    DELETE FROM sqlite_sequence WHERE name = 'session_attempts_v5';
    INSERT INTO sqlite_sequence (name, seq)
      SELECT 'session_attempts_v5', seq FROM sqlite_sequence
      WHERE name = 'session_attempts';
    DROP TABLE session_attempts;
    ALTER TABLE session_attempts_v5 RENAME TO session_attempts;
  `);
}

export interface Settings {
  onboarded: boolean;
  speech: boolean;
  vibration: boolean;
}

export async function getSettings(db: SqlConnection): Promise<Settings> {
  const row = await db.getFirstAsync<{
    onboarded: number;
    speech: number;
    vibration: number;
  }>('SELECT onboarded, speech, vibration FROM app_preferences WHERE id = 1');
  if (!row) throw new Error('Your settings could not be read.');
  return {
    onboarded: row.onboarded === 1,
    speech: row.speech === 1,
    vibration: row.vibration === 1,
  };
}

export async function updateSettings(
  db: SqlConnection,
  changes: Partial<Settings>,
): Promise<void> {
  const columns = (['onboarded', 'speech', 'vibration'] as const).filter(
    (key) => typeof changes[key] === 'boolean',
  );
  if (columns.length === 0) return;
  await db.runAsync(
    `UPDATE app_preferences SET ${columns.map((key) => `${key} = ?`).join(', ')}
     WHERE id = 1`,
    ...columns.map((key) => (changes[key] ? 1 : 0)),
  );
}

interface AttemptRow {
  id: number;
  stage: number;
  session_index: number;
  is_replay: number;
  source: AttemptSource;
  status: AttemptStatus;
  effort: number | null;
  pain: number | null;
  decision: Decision | null;
  started_at: string;
  ended_at: string | null;
  active_seconds: number | null;
}

export interface AttemptHistoryItem extends AttemptRecord {
  startedAt: string;
  endedAt: string | null;
  activeSeconds: number | null;
}

export async function listAttempts(
  db: SqlConnection,
  planVersion: string,
): Promise<AttemptHistoryItem[]> {
  const rows = await db.getAllAsync<AttemptRow>(
    `SELECT id, stage, session_index, is_replay, source, status, effort, pain,
            decision, started_at, ended_at, active_seconds
     FROM session_attempts WHERE plan_version = ? ORDER BY id`,
    planVersion,
  );
  return rows.map((row) => ({
    id: row.id,
    stage: row.stage,
    sessionIndex: row.session_index,
    isReplay: row.is_replay === 1,
    source: row.source,
    status: row.status,
    effort: row.effort,
    pain: row.pain === null ? null : row.pain === 1,
    decision: row.decision,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    activeSeconds: row.active_seconds,
  }));
}

// One attempt with the plan it belongs to, for screens that start from an
// attempt id rather than the selected activity.
export async function getAttempt(
  db: SqlConnection,
  id: number,
): Promise<
  | (Pick<AttemptRecord, 'stage' | 'sessionIndex' | 'isReplay'> & {
      planVersion: string;
    })
  | null
> {
  const row = await db.getFirstAsync<{
    plan_version: string;
    stage: number;
    session_index: number;
    is_replay: number;
  }>(
    `SELECT plan_version, stage, session_index, is_replay
     FROM session_attempts WHERE id = ?`,
    id,
  );
  return row
    ? {
        planVersion: row.plan_version,
        stage: row.stage,
        sessionIndex: row.session_index,
        isReplay: row.is_replay === 1,
      }
    : null;
}

export async function startAttempt(
  db: SqlConnection,
  attempt: {
    planVersion: string;
    stage: number;
    sessionIndex: number;
    stageAttempt: number;
    isReplay: boolean;
    startedAt: string;
  },
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO session_attempts
       (plan_version, stage, session_index, stage_attempt, is_replay,
        started_at, status)
     VALUES (?, ?, ?, ?, ?, ?, 'in_progress')`,
    attempt.planVersion,
    attempt.stage,
    attempt.sessionIndex,
    attempt.stageAttempt,
    attempt.isReplay ? 1 : 0,
    attempt.startedAt,
  );
  return result.lastInsertRowId;
}

// Records a session the user marks done without playing it. It counts as
// done but is never rated, so its stage can be completed but not cleared.
export async function markSessionDone(
  db: SqlConnection,
  attempt: {
    planVersion: string;
    stage: number;
    sessionIndex: number;
    stageAttempt: number;
    markedAt: string;
  },
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO session_attempts
       (plan_version, stage, session_index, stage_attempt, is_replay,
        started_at, ended_at, status, source)
     VALUES (?, ?, ?, ?, 0, ?, ?, 'completed', 'manual')`,
    attempt.planVersion,
    attempt.stage,
    attempt.sessionIndex,
    attempt.stageAttempt,
    attempt.markedAt,
    attempt.markedAt,
  );
  return result.lastInsertRowId;
}

// Ends an in-progress attempt exactly once.
export async function finishAttempt(
  db: SqlConnection,
  id: number,
  outcome: {
    status: Exclude<AttemptStatus, 'in_progress'>;
    endedAt: string | null;
    activeSeconds: number | null;
  },
): Promise<void> {
  const result = await db.runAsync(
    `UPDATE session_attempts
     SET status = ?, ended_at = ?, active_seconds = ?
     WHERE id = ? AND status = 'in_progress'`,
    outcome.status,
    outcome.endedAt,
    outcome.activeSeconds,
    id,
  );
  if (result.changes !== 1) throw new Error('This session already ended.');
}

// Marks sessions left running by a previous app process. Unseen time is
// never credited.
export async function interruptStaleAttempts(
  db: SqlConnection,
  exceptId: number | null = null,
): Promise<void> {
  await db.runAsync(
    `UPDATE session_attempts SET status = 'interrupted'
     WHERE status = 'in_progress' AND id IS NOT ?`,
    exceptId,
  );
}

export async function recordCheck(
  db: SqlConnection,
  id: number,
  effort: number,
  pain: boolean,
): Promise<void> {
  if (!Number.isInteger(effort) || effort < 0 || effort > 10) {
    throw new Error('Effort must be a whole number from 0 to 10.');
  }
  const result = await db.runAsync(
    `UPDATE session_attempts SET effort = ?, pain = ?
     WHERE id = ? AND status = 'completed' AND source = 'timed'
       AND effort IS NULL`,
    effort,
    pain ? 1 : 0,
    id,
  );
  if (result.changes !== 1) throw new Error('This session was already rated.');
}

export async function recordDecision(
  db: SqlConnection,
  id: number,
  decision: Decision,
): Promise<void> {
  if (decision !== 'continue' && decision !== 'restart') {
    throw new Error('Unsupported decision.');
  }
  const result = await db.runAsync(
    `UPDATE session_attempts SET decision = ?
     WHERE id = ? AND effort IS NOT NULL AND decision IS NULL`,
    decision,
    id,
  );
  if (result.changes !== 1) throw new Error('This decision was already made.');
}

// Deletes one program's history; other programs keep theirs.
export async function resetProgress(
  db: SqlConnection,
  planVersion: string,
): Promise<void> {
  await db.runAsync(
    'DELETE FROM session_attempts WHERE plan_version = ?',
    planVersion,
  );
}
