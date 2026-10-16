// Cue schedule for a session: a chime plus one spoken word per change. Contract: docs/design/mvp-spec.md §4.

import { totalSeconds, type IntervalKind, type Session } from './plan';

export interface ScheduledCue {
  atMs: number;
  text: string;
}

export interface ScheduledSegment {
  label: string;
  durationMs: number;
}

export const INTERVAL_LABELS: Record<IntervalKind, string> = {
  warmup: 'Warm-up walk',
  active: 'Run',
  walk: 'Walk',
  cooldown: 'Cool-down walk',
};

export function describeDuration(seconds: number): string {
  if (seconds < 60 || seconds === 90) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (rest === 30) return `${minutes} and a half minutes`;
  if (rest !== 0) return `${minutes} minutes ${rest} seconds`;
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

// Spoken after the chime: one word per change.
const CUE_WORDS: Record<IntervalKind, string> = {
  warmup: 'Walk',
  active: 'Run',
  walk: 'Walk',
  cooldown: 'Walk',
};

export function buildSchedule(session: Session): {
  segments: ScheduledSegment[];
  cues: ScheduledCue[];
} {
  const segments: ScheduledSegment[] = [];
  const cues: ScheduledCue[] = [];
  let startSeconds = 0;

  for (const interval of session.intervals) {
    segments.push({
      label: INTERVAL_LABELS[interval.kind],
      durationMs: interval.seconds * 1000,
    });
    cues.push({ atMs: startSeconds * 1000, text: CUE_WORDS[interval.kind] });
    startSeconds += interval.seconds;
  }

  cues.push({
    atMs: totalSeconds(session) * 1000,
    text: 'Done',
  });
  return { segments, cues: cues.sort((a, b) => a.atMs - b.atMs) };
}
