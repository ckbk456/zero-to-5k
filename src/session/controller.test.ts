import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { RuntimeState, StartConfig } from '@modules/session-runtime';

import { RACE_WALKING_PLAN, RUNNING_PLAN } from '../domain/plan';
import {
  listAttempts,
  migrateDatabase,
  type SqlConnection,
} from '../storage/database';
import { connect } from '../storage/test-sqlite';
import { settle, startSession, type Runtime } from './controller';

class FakeRuntime implements Runtime {
  state: RuntimeState = {
    status: 'idle',
    sessionKey: null,
    elapsedMs: 0,
    totalMs: 0,
    pausedBy: null,
    backgroundCapable: true,
  };
  started: StartConfig[] = [];
  fail = false;

  async prepare() {
    return { backgroundCapable: true };
  }
  async start(config: StartConfig) {
    if (this.fail) throw new Error('native start failed');
    this.started.push(config);
    this.state = {
      ...this.state,
      status: 'running',
      sessionKey: config.sessionKey,
      totalMs: config.segments.reduce((sum, s) => sum + s.durationMs, 0),
    };
    return this.state;
  }
  async reset() {
    this.state = { ...this.state, status: 'idle', sessionKey: null };
    return this.state;
  }
  async getState() {
    return this.state;
  }
}

const request = { stage: 1, sessionIndex: 0, stageAttempt: 1, isReplay: false };
const settings = { speech: true, vibration: false };
const clock = () => new Date('2026-10-16T08:00:00.000Z');

async function setup() {
  const { db, sqlite } = connect();
  await migrateDatabase(db);
  return { db, sqlite, runtime: new FakeRuntime() };
}

test('starting records an attempt and hands the schedule to the runtime', async () => {
  const { db, sqlite, runtime } = await setup();
  try {
    const id = await startSession(
      db,
      runtime,
      RUNNING_PLAN,
      request,
      settings,
      clock,
    );
    const [config] = runtime.started;
    assert.equal(config?.sessionKey, String(id));
    assert.equal(config?.title, 'Stage 1 · Session 1');
    assert.equal(config?.vibration, false);
    assert.equal(
      config?.segments.reduce((sum, s) => sum + s.durationMs, 0),
      28.5 * 60 * 1000,
    );
    const [row] = await listAttempts(db, 'running-v1');
    assert.equal(row?.status, 'in_progress');
    assert.deepEqual(await settle(db, runtime, clock), {
      kind: 'live',
      attemptId: id,
    });
  } finally {
    sqlite.close();
  }
});

test('a race-walking session is recorded under its own plan', async () => {
  const { db, sqlite, runtime } = await setup();
  try {
    const id = await startSession(
      db,
      runtime,
      RACE_WALKING_PLAN,
      { ...request, stage: RACE_WALKING_PLAN.stages.length, sessionIndex: 2 },
      settings,
      clock,
    );
    const [config] = runtime.started;
    assert.equal(
      config?.title,
      `Stage ${RACE_WALKING_PLAN.stages.length} · Session 3`,
    );
    assert.deepEqual(
      config?.cues.map((cue) => cue.text),
      ['Walk', 'Race walk', 'Walk', 'Done'],
    );
    assert.deepEqual(await listAttempts(db, 'running-v1'), []);
    const [row] = await listAttempts(db, RACE_WALKING_PLAN.version);
    assert.equal(row?.id, id);
    assert.equal(row?.stage, RACE_WALKING_PLAN.stages.length);
  } finally {
    sqlite.close();
  }
});

test('a failed completion write preserves native result for a successful retry', async () => {
  const { db, sqlite, runtime } = await setup();
  try {
    const id = await startSession(
      db,
      runtime,
      RUNNING_PLAN,
      request,
      settings,
      clock,
    );
    runtime.state = {
      ...runtime.state,
      status: 'finished',
      elapsedMs: 1_710_000,
    };
    let failOnce = true;
    const flaky: SqlConnection = {
      ...db,
      runAsync: async (sql, ...params) => {
        if (failOnce && sql.includes('SET status = ?, ended_at')) {
          failOnce = false;
          throw new Error('Storage temporarily unavailable');
        }
        return db.runAsync(sql, ...params);
      },
    };
    await assert.rejects(
      settle(flaky, runtime, clock),
      /Storage temporarily unavailable/,
    );
    assert.equal(runtime.state.status, 'finished');
    assert.equal(
      (await listAttempts(db, RUNNING_PLAN.version))[0]?.status,
      'in_progress',
    );
    assert.deepEqual(await settle(flaky, runtime, clock), {
      kind: 'completed',
      attemptId: id,
    });
    assert.equal(runtime.state.status, 'idle');
    assert.equal(
      (await listAttempts(db, RUNNING_PLAN.version))[0]?.status,
      'completed',
    );
  } finally {
    sqlite.close();
  }
});

test('a native reset failure can retry an already persisted completion', async () => {
  const { db, sqlite, runtime } = await setup();
  try {
    const id = await startSession(
      db,
      runtime,
      RUNNING_PLAN,
      request,
      settings,
      clock,
    );
    runtime.state = {
      ...runtime.state,
      status: 'finished',
      elapsedMs: 1_710_000,
    };
    const reset = runtime.reset.bind(runtime);
    runtime.reset = async () => {
      throw new Error('Native reset failed');
    };
    await assert.rejects(settle(db, runtime, clock), /Native reset failed/);
    assert.equal(
      (await listAttempts(db, RUNNING_PLAN.version))[0]?.status,
      'completed',
    );
    runtime.reset = reset;
    assert.deepEqual(await settle(db, runtime, clock), {
      kind: 'completed',
      attemptId: id,
    });
    assert.equal(runtime.state.status, 'idle');
  } finally {
    sqlite.close();
  }
});

test('concurrent start requests create only one attempt', async () => {
  const { db, sqlite, runtime } = await setup();
  try {
    const results = await Promise.allSettled([
      startSession(db, runtime, RUNNING_PLAN, request, settings, clock),
      startSession(db, runtime, RUNNING_PLAN, request, settings, clock),
    ]);
    assert.equal(results[0]?.status, 'fulfilled');
    assert.equal(results[1]?.status, 'rejected');
    assert.equal(runtime.started.length, 1);
    assert.equal((await listAttempts(db, RUNNING_PLAN.version)).length, 1);
  } finally {
    sqlite.close();
  }
});

test('reconciliation waits for a native start before interrupting stale attempts', async () => {
  const { db, sqlite, runtime } = await setup();
  try {
    let enter!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const nativeStart = runtime.start.bind(runtime);
    runtime.start = async (config) => {
      enter();
      await gate;
      return nativeStart(config);
    };
    const start = startSession(
      db,
      runtime,
      RUNNING_PLAN,
      request,
      settings,
      clock,
    );
    await entered;
    const reconciliation = settle(db, runtime, clock);
    release();
    const id = await start;
    assert.deepEqual(await reconciliation, { kind: 'live', attemptId: id });
    assert.equal(
      (await listAttempts(db, RUNNING_PLAN.version))[0]?.status,
      'in_progress',
    );
  } finally {
    sqlite.close();
  }
});

test('reconciliation leaves a running cue rehearsal to its owning screen', async () => {
  const { db, sqlite, runtime } = await setup();
  try {
    runtime.state = {
      ...runtime.state,
      status: 'running',
      sessionKey: 'cue-check',
    };
    assert.deepEqual(await settle(db, runtime, clock), { kind: 'none' });
    assert.equal(runtime.state.status, 'running');
    await assert.rejects(
      startSession(db, runtime, RUNNING_PLAN, request, settings, clock),
      /already running/,
    );
    assert.equal((await listAttempts(db, RUNNING_PLAN.version)).length, 0);
  } finally {
    sqlite.close();
  }
});

test('a failed native start leaves an interrupted attempt', async () => {
  const { db, sqlite, runtime } = await setup();
  try {
    runtime.fail = true;
    await assert.rejects(
      startSession(db, runtime, RUNNING_PLAN, request, settings, clock),
      /native start failed/,
    );
    const [row] = await listAttempts(db, 'running-v1');
    assert.equal(row?.status, 'interrupted');
  } finally {
    sqlite.close();
  }
});

test('finished and ended sessions are recorded once with runtime time', async () => {
  const { db, sqlite, runtime } = await setup();
  try {
    const first = await startSession(
      db,
      runtime,
      RUNNING_PLAN,
      request,
      settings,
      clock,
    );
    runtime.state = {
      ...runtime.state,
      status: 'finished',
      elapsedMs: 1_710_400,
    };
    assert.deepEqual(await settle(db, runtime, clock), {
      kind: 'completed',
      attemptId: first,
    });
    assert.equal(runtime.state.status, 'idle');
    assert.deepEqual(await settle(db, runtime, clock), { kind: 'none' });

    const second = await startSession(
      db,
      runtime,
      RUNNING_PLAN,
      request,
      settings,
      clock,
    );
    runtime.state = { ...runtime.state, status: 'ended', elapsedMs: 61_000 };
    assert.deepEqual(await settle(db, runtime, clock), {
      kind: 'ended_early',
      attemptId: second,
    });

    const rows = await listAttempts(db, 'running-v1');
    assert.deepEqual(
      rows.map((row) => [row.status, row.activeSeconds]),
      [
        ['completed', 1710],
        ['ended_early', 61],
      ],
    );
  } finally {
    sqlite.close();
  }
});

test('an attempt without a live native session becomes interrupted', async () => {
  const { db, sqlite, runtime } = await setup();
  try {
    await startSession(db, runtime, RUNNING_PLAN, request, settings, clock);
    await runtime.reset(); // the app process died and the runtime with it
    assert.deepEqual(await settle(db, runtime, clock), { kind: 'none' });
    const [row] = await listAttempts(db, 'running-v1');
    assert.equal(row?.status, 'interrupted');
    assert.equal(row?.activeSeconds, null);
  } finally {
    sqlite.close();
  }
});
