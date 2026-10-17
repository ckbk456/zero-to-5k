// Stage progression rules. Contract: docs/design/mvp-spec.md section 3.
// Progress is derived from attempt history; nothing else is stored.

import { SESSIONS_PER_STAGE, type Plan } from './plan';

export type AttemptStatus =
  'in_progress' | 'completed' | 'ended_early' | 'interrupted';
// A timed attempt was played by the session runtime; a manual one was marked
// done by the user without playing it.
export type AttemptSource = 'timed' | 'manual';
export type Decision = 'continue' | 'restart';
export type StageState =
  'not_started' | 'in_progress' | 'completed' | 'cleared';
export type Recommendation = 'none' | 'effort' | 'pain';

export interface AttemptRecord {
  id: number;
  stage: number;
  sessionIndex: number;
  isReplay: boolean;
  source: AttemptSource;
  status: AttemptStatus;
  effort: number | null;
  pain: boolean | null;
  decision: Decision | null;
}

export interface StageProgress {
  state: StageState;
  // Which sessions are done in the current attempt at this stage.
  done: boolean[];
  // 1 + the number of restarts chosen for this stage.
  attempt: number;
}

export interface NextSession {
  stage: number;
  sessionIndex: number;
  stageAttempt: number;
}

export interface Progress {
  stages: StageProgress[];
  // The suggested session: the first one not yet done. Null when every stage
  // is done. Any session can still be started.
  next: NextSession | null;
  // The latest played session, if it still waits for its check or decision.
  pending: { attemptId: number; needs: 'check' | 'decision' } | null;
  // The final stage is done.
  goalReached: boolean;
}

export const MAX_CLEAR_EFFORT = 8;

export function recommend(effort: number, pain: boolean): Recommendation {
  if (pain) return 'pain';
  return effort > MAX_CLEAR_EFFORT ? 'effort' : 'none';
}

function counts(attempt: AttemptRecord): boolean {
  return !attempt.isReplay && attempt.status === 'completed';
}

// A session is "in control" when it was played and rated at effort 8 or lower
// without pain. Manual and unrated sessions are done but not in control.
function inControl(attempt: AttemptRecord): boolean {
  return (
    attempt.source === 'timed' &&
    attempt.effort !== null &&
    attempt.pain !== null &&
    recommend(attempt.effort, attempt.pain) === 'none'
  );
}

function needs(attempt: AttemptRecord): 'check' | 'decision' | null {
  if (attempt.source !== 'timed') return null;
  if (attempt.effort === null || attempt.pain === null) return 'check';
  if (recommend(attempt.effort, attempt.pain) === 'none') return null;
  return attempt.decision === null ? 'decision' : null;
}

export function deriveProgress(
  plan: Plan,
  attempts: readonly AttemptRecord[],
): Progress {
  const sorted = [...attempts]
    .filter(counts)
    .filter((attempt) => plan.stages[attempt.stage - 1])
    .sort((a, b) => a.id - b.id);

  const stages = plan.stages.map((_, index): StageProgress => {
    let attempt = 1;
    let done = Array<boolean>(SESSIONS_PER_STAGE).fill(false);
    let clean = Array<boolean>(SESSIONS_PER_STAGE).fill(false);
    for (const row of sorted) {
      if (row.stage !== index + 1) continue;
      if (row.sessionIndex < 0 || row.sessionIndex >= SESSIONS_PER_STAGE) {
        continue;
      }
      // Restarting wipes this stage's sessions, including the one rated.
      if (row.decision === 'restart') {
        attempt += 1;
        done = done.map(() => false);
        clean = clean.map(() => false);
        continue;
      }
      done[row.sessionIndex] = true;
      if (inControl(row)) clean[row.sessionIndex] = true;
    }
    const state: StageState = done.every(Boolean)
      ? clean.every(Boolean)
        ? 'cleared'
        : 'completed'
      : done.some(Boolean)
        ? 'in_progress'
        : 'not_started';
    return { state, done, attempt };
  });

  const isDone = (stage: StageProgress) =>
    stage.state === 'completed' || stage.state === 'cleared';
  const nextIndex = stages.findIndex((stage) => !isDone(stage));
  const next =
    nextIndex === -1
      ? null
      : {
          stage: nextIndex + 1,
          sessionIndex: stages[nextIndex]!.done.indexOf(false),
          stageAttempt: stages[nextIndex]!.attempt,
        };

  const lastPlayed = sorted.filter((row) => row.source === 'timed').at(-1);
  const pendingNeeds = lastPlayed ? needs(lastPlayed) : null;

  return {
    stages,
    next,
    pending:
      lastPlayed && pendingNeeds
        ? { attemptId: lastPlayed.id, needs: pendingNeeds }
        : null,
    goalReached: isDone(stages.at(-1)!),
  };
}
