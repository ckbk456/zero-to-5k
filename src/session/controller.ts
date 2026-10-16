// Connects the native session runtime to attempt history. The runtime owns
// time; history records only what the runtime reports.

import type { RuntimeState, StartConfig } from '@modules/session-runtime';

import { buildSchedule } from '../domain/cues';
import { RUNNING_PLAN, getSession } from '../domain/plan';
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

export async function startSession(
  db: SqlConnection,
  runtime: Runtime,
  request: SessionRequest,
  settings: Pick<Settings, 'speech' | 'vibration'>,
  now: () => Date = () => new Date(),
): Promise<number> {
  const session = getSession(RUNNING_PLAN, request.stage, request.sessionIndex);
  const { segments, cues } = buildSchedule(session);
  const attemptId = await startAttempt(db, {
    planVersion: RUNNING_PLAN.version,
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
  const state = await runtime.getState();
  const key = state.sessionKey === null ? NaN : Number(state.sessionKey);
  const attemptId = Number.isInteger(key) ? key : null;

  if (
    attemptId !== null &&
    (state.status === 'running' || state.status === 'paused')
  ) {
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
    } catch {
      // Already recorded by an earlier call.
    }
  }
  if (state.status !== 'idle') await runtime.reset();
  await interruptStaleAttempts(db);
  return result;
}
