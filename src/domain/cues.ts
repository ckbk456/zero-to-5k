// Spoken cue schedule for a session. Contract: docs/design/mvp-spec.md §4.

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

// Halfway and one-minute cues are added to runs at least this long.
const LONG_RUN_SECONDS = 5 * 60;

export function describeDuration(seconds: number): string {
  if (seconds < 60 || seconds === 90) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (rest === 30) return `${minutes} and a half minutes`;
  if (rest !== 0) return `${minutes} minutes ${rest} seconds`;
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

export function buildSchedule(
  session: Session,
  stageNumber: number,
  sessionIndex: number,
): { segments: ScheduledSegment[]; cues: ScheduledCue[] } {
  const segments: ScheduledSegment[] = [];
  const cues: ScheduledCue[] = [];
  let startSeconds = 0;

  for (const [index, interval] of session.intervals.entries()) {
    const duration = describeDuration(interval.seconds);
    const at = startSeconds * 1000;
    segments.push({
      label: INTERVAL_LABELS[interval.kind],
      durationMs: interval.seconds * 1000,
    });
    switch (interval.kind) {
      case 'warmup':
        cues.push({
          atMs: at,
          text: `Stage ${stageNumber}, session ${sessionIndex + 1}. Warm up: walk for ${duration}.`,
        });
        break;
      case 'active':
        cues.push({ atMs: at, text: `Run for ${duration}.` });
        if (interval.seconds >= LONG_RUN_SECONDS) {
          cues.push(
            { atMs: at + (interval.seconds / 2) * 1000, text: 'Halfway.' },
            {
              atMs: at + (interval.seconds - 60) * 1000,
              text: 'One minute left.',
            },
          );
        }
        break;
      case 'walk':
        cues.push({ atMs: at, text: `Walk for ${duration}.` });
        break;
      case 'cooldown':
        cues.push({
          atMs: at,
          text:
            index === session.intervals.length - 1
              ? `Cool down: walk for ${duration}.`
              : `Walk for ${duration}.`,
        });
        break;
    }
    startSeconds += interval.seconds;
  }

  cues.push({
    atMs: totalSeconds(session) * 1000,
    text: 'Session complete. Well done.',
  });
  return { segments, cues: cues.sort((a, b) => a.atMs - b.atMs) };
}
