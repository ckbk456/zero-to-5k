// Cue schedule for a session: a chime plus one spoken word per change. Contract: docs/design/mvp-spec.md §4.

import { ACTIVITY_COPY, type Activity } from './activity';
import { totalSeconds, type IntervalKind, type Session } from './plan';

export interface ScheduledCue {
  atMs: number;
  text: string;
}

export interface ScheduledSegment {
  label: string;
  durationMs: number;
}

const WALK_LABELS: Record<Exclude<IntervalKind, 'active'>, string> = {
  warmup: 'Warm-up walk',
  walk: 'Walk',
  cooldown: 'Cool-down walk',
};

export function intervalLabel(kind: IntervalKind, activity: Activity): string {
  return kind === 'active' ? ACTIVITY_COPY[activity].active : WALK_LABELS[kind];
}

export function describeDuration(seconds: number): string {
  if (seconds < 60 || seconds === 90) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (rest === 30) return `${minutes} and a half minutes`;
  if (rest !== 0) return `${minutes} minutes ${rest} seconds`;
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

// Spoken after the chime: the activity's name for active intervals, "Walk"
// for the rest.
function cueWord(kind: IntervalKind, activity: Activity): string {
  return kind === 'active' ? ACTIVITY_COPY[activity].active : 'Walk';
}

export function buildSchedule(
  session: Session,
  activity: Activity,
): {
  segments: ScheduledSegment[];
  cues: ScheduledCue[];
} {
  const segments: ScheduledSegment[] = [];
  const cues: ScheduledCue[] = [];
  let startSeconds = 0;

  for (const interval of session.intervals) {
    segments.push({
      label: intervalLabel(interval.kind, activity),
      durationMs: interval.seconds * 1000,
    });
    cues.push({
      atMs: startSeconds * 1000,
      text: cueWord(interval.kind, activity),
    });
    startSeconds += interval.seconds;
  }

  cues.push({
    atMs: totalSeconds(session) * 1000,
    text: 'Done',
  });
  return { segments, cues: cues.sort((a, b) => a.atMs - b.atMs) };
}
