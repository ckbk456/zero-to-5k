import { isActivity, type Activity } from '../domain/activity';

// A narrow SQL port lets tests execute the same migration against real SQLite.
// Expo's SQLiteDatabase and Transaction satisfy these interfaces.
export interface SqlConnection {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(
    sql: string,
    ...params: (string | number)[]
  ): Promise<T | null>;
  runAsync(sql: string, ...params: (string | number)[]): Promise<unknown>;
}

export interface Database extends SqlConnection {
  withExclusiveTransactionAsync(
    task: (transaction: SqlConnection) => Promise<void>,
  ): Promise<void>;
}

export const DATABASE_VERSION = 1;

export async function migrateDatabase(db: Database): Promise<void> {
  const version = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  if (!version || version.user_version > DATABASE_VERSION) {
    throw new Error('This database requires a newer version of the app.');
  }

  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  if (version.user_version === DATABASE_VERSION) return;

  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync(`
      CREATE TABLE app_preferences (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        activity TEXT NOT NULL CHECK (activity IN ('running', 'race-walking'))
      );
      INSERT INTO app_preferences (id, activity) VALUES (1, 'running');
      PRAGMA user_version = 1;
    `);
  });
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
