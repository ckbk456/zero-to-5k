// Effort scale shown after each session (Borg CR10), with plain-word labels
// and a talk-test hint. Contract: docs/design/mvp-spec.md §3.

export interface EffortLevel {
  value: number;
  label: string;
  talk: string;
}

const bands: [number[], string, string][] = [
  [[0, 1, 2], 'Very easy', 'Could sing'],
  [[3, 4], 'Easy to moderate', 'Talk in full sentences'],
  [[5, 6], 'Hard', 'Talk in sentences, with some effort'],
  [[7, 8], 'Very hard', 'Only short phrases'],
  [[9], 'Extremely hard', 'A word or two'],
  [[10], 'Maximal', 'Cannot talk'],
];

export const EFFORT_LEVELS: EffortLevel[] = bands.flatMap(
  ([values, label, talk]) => values.map((value) => ({ value, label, talk })),
);

export function effortLevel(value: number): EffortLevel {
  const level = EFFORT_LEVELS[value];
  if (!level) throw new Error('Effort must be from 0 to 10.');
  return level;
}
