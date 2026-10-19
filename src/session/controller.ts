// Connects the native session runtime to attempt history. The runtime owns
// time; history records only what the runtime reports.

import type { RuntimeState, StartConfig } from '@modules/session-runtime';

import { buildSchedule } from '../domain/cues';
import { getSession, type Plan } from '../domain/plan';
import {
  finishAttempt,
  interruptStaleAttempts,
  startAttempt,
  type Settings,
  type SqlConnection,
} from '../storage/database';

export interface Runtime {
  prepare(): Promise<{ backgroundCapable: boolean }>;
  start(config: StartConfig): Promise<RuntimeState>;
  reset(): Promise<RuntimeState>;
  getState(): Promise<RuntimeState>;
}

export interface SessionRequest {
  stage: number;
  sessionIndex: number;
  stageAttempt: number;
  isReplay: boolean;
}

// Starting and reconciling both cross the native/SQLite boundary. Serialize
// them so a concurrent reconciliation cannot interrupt a newly inserted row
// before native start has attached its session key.
const pending = new WeakMap<Runtime, Promise<unknown>>();

export function withRuntimeLock<T>(
  runtime: Runtime,
  task: () => Promise<T>,
): Promise<T> {
  const previous = pending.get(runtime) ?? Promise.resolve();
  const operation = previous.catch(() => {}).then(task);
  pending.set(runtime, operation);
  return operation.finally(() => {
    if (pending.get(runtime) === operation) pending.delete(runtime);
  });
}

export async function startSession(
  db: SqlConnection,
  runtime: Runtime,
  plan: Plan,
  request: SessionRequest,
  settings: Pick<Settings, 'speech' | 'vibration'>,
  now: () => Date = () => new Date(),
): Promise<number> {
  return withRuntimeLock(runtime, async () => {
    const state = await runtime.getState();
    if (state.status === 'running' || state.status === 'paused') {
      throw new Error('A session is already running.');
    }
    if (state.status !== 'idle') await settleUnlocked(db, runtime, now);

    const session = getSession(plan, request.stage, request.sessionIndex);
    const { segments, cues } = buildSchedule(session, plan.activity);
    const attemptId = await startAttempt(db, {
      planVersion: plan.version,
      ...request,
      startedAt: now().toISOString(),
    });
    try {
      await runtime.start({
        sessionKey: String(attemptId),
        title: `Stage ${request.stage} · Session ${request.sessionIndex + 1}`,
        segments,
        cues,
        speech: settings.speech,
        vibration: settings.vibration,
      });
    } catch (error) {
      await finishAttempt(db, attemptId, {
        status: 'interrupted',
        endedAt: now().toISOString(),
        activeSeconds: null,
      });
      throw error;
    }
    return attemptId;
  });
}

export type Settled =
  | { kind: 'live'; attemptId: number }
  | { kind: 'completed' | 'ended_early'; attemptId: number }
  | { kind: 'none' };

// Reconciles history with the runtime: reattaches to a live session, records
// a finished or ended one, and marks any other in-progress attempt
// interrupted. Safe to call repeatedly.
export async function settle(
  db: SqlConnection,
  runtime: Runtime,
  now: () => Date = () => new Date(),
): Promise<Settled> {
  return withRuntimeLock(runtime, () => settleUnlocked(db, runtime, now));
}

async function settleUnlocked(
  db: SqlConnection,
  runtime: Runtime,
  now: () => Date,
): Promise<Settled> {
  const state = await runtime.getState();
  const key = state.sessionKey === null ? NaN : Number(state.sessionKey);
  const attemptId = Number.isSafeInteger(key) && key > 0 ? key : null;

  if (state.status === 'running' || state.status === 'paused') {
    // An audio rehearsal has no database row and is owned by its own screen.
    if (attemptId === null) return { kind: 'none' };
    await interruptStaleAttempts(db, attemptId);
    return { kind: 'live', attemptId };
  }

  let result: Settled = { kind: 'none' };
  if (
    attemptId !== null &&
    (state.status === 'finished' || state.status === 'ended')
  ) {
    const status = state.status === 'finished' ? 'completed' : 'ended_early';
    try {
      await finishAttempt(db, attemptId, {
        status,
        endedAt: now().toISOString(),
        activeSeconds: Math.round(state.elapsedMs / 1000),
      });
      result = { kind: status, attemptId };
    } catch (error) {
      const recorded = await db.getFirstAsync<{ status: string }>(
        'SELECT status FROM session_attempts WHERE id = ?',
        attemptId,
      );
      // A retry after native reset failed may find an already saved result.
      // A storage failure must keep the terminal native state for retry.
      if (recorded?.status !== status) throw error;
      result = { kind: status, attemptId };
    }
  }
  if (state.status !== 'idle') await runtime.reset();
  await interruptStaleAttempts(db);
  return result;
}
