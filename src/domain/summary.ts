import type { Interval, Session } from './plan';

// A session condensed for a glance: each active interval is paired with the
// walk after it, and identical back-to-back pairs collapse into one step with
// a count.
export type SummaryStep =
  | { kind: 'single'; interval: Interval }
  | { kind: 'cycle'; active: number; walk: number; times: number };

export function summarizeSession(session: Session): SummaryStep[] {
  const steps: SummaryStep[] = [];
  const { intervals } = session;
  let index = 0;
  while (index < intervals.length) {
    const interval = intervals[index]!;
    const next = intervals[index + 1];
    if (interval.kind !== 'active' || next?.kind !== 'walk') {
      steps.push({ kind: 'single', interval });
      index += 1;
      continue;
    }
    let times = 1;
    while (
      intervals[index + times * 2]?.kind === 'active' &&
      intervals[index + times * 2]!.seconds === interval.seconds &&
      intervals[index + times * 2 + 1]?.kind === 'walk' &&
      intervals[index + times * 2 + 1]!.seconds === next.seconds
    ) {
      times += 1;
    }
    steps.push({
      kind: 'cycle',
      active: interval.seconds,
      walk: next.seconds,
      times,
    });
    index += times * 2;
  }
  return steps;
}
