// Stage progression rules. Contract: docs/design/mvp-spec.md section 3.
// Progress is derived from attempt history; nothing else is stored.

import { SESSIONS_PER_STAGE, type Plan } from './plan';

export type AttemptStatus =
  'in_progress' | 'completed' | 'ended_early' | 'interrupted';
export type Decision = 'continue' | 'restart';
export type StageState = 'locked' | 'current' | 'completed' | 'cleared';
export type Recommendation = 'none' | 'effort' | 'pain';

export interface AttemptRecord {
  id: number;
  stage: number;
  sessionIndex: number;
  isReplay: boolean;
  status: AttemptStatus;
  effort: number | null;
  pain: boolean | null;
  decision: Decision | null;
}

export interface NextSession {
  stage: number;
  sessionIndex: number;
  stageAttempt: number;
}

export interface Progress {
  stages: StageState[];
  // Null once the goal is reached or while a check is pending.
  next: NextSession | null;
  // A completed session still waiting for its check or decision.
  pending: { attemptId: number; needs: 'check' | 'decision' } | null;
  goalReached: boolean;
}

export const MAX_CLEAR_EFFORT = 8;

export function recommend(effort: number, pain: boolean): Recommendation {
  if (pain) return 'pain';
  return effort > MAX_CLEAR_EFFORT ? 'effort' : 'none';
}

export function deriveProgress(
  plan: Plan,
  attempts: readonly AttemptRecord[],
): Progress {
  const stageCount = plan.stages.length;
  const outcomes: ('completed' | 'cleared')[] = [];
  let stage = 1;
  let stageAttempt = 1;
  let sessionIndex = 0;
  let clean = true;
  let pending: Progress['pending'] = null;

  for (const attempt of [...attempts].sort((a, b) => a.id - b.id)) {
    if (stage > stageCount || pending) break;
    if (attempt.isReplay || attempt.status !== 'completed') continue;
    if (attempt.stage !== stage || attempt.sessionIndex !== sessionIndex) {
      continue;
    }
    if (attempt.effort === null || attempt.pain === null) {
      pending = { attemptId: attempt.id, needs: 'check' };
      break;
    }
    if (recommend(attempt.effort, attempt.pain) !== 'none') {
      if (attempt.decision === null) {
        pending = { attemptId: attempt.id, needs: 'decision' };
        break;
      }
      if (attempt.decision === 'restart') {
        stageAttempt += 1;
        sessionIndex = 0;
        clean = true;
        continue;
      }
      clean = false;
    }
    sessionIndex += 1;
    if (sessionIndex === SESSIONS_PER_STAGE) {
      outcomes.push(clean ? 'cleared' : 'completed');
      stage += 1;
      stageAttempt = 1;
      sessionIndex = 0;
      clean = true;
    }
  }

  const goalReached = stage > stageCount;
  return {
    stages: plan.stages.map((_, index) => {
      const outcome = outcomes[index];
      if (outcome) return outcome;
      return index + 1 === stage ? 'current' : 'locked';
    }),
    next: goalReached || pending ? null : { stage, sessionIndex, stageAttempt },
    pending,
    goalReached,
  };
}
