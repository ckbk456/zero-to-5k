# Running preset plan

Date: 2026-10-16. Status: proposed MVP preset, pending product-owner approval. Not yet implemented.

## Sources

- 13 Just Run screenshots provided by the product owner on 2026-10-16 (not distributed). Expanded day cards show exact intervals; collapsed day cards show segment bars that match day 1 of the same week, except in weeks 5 and 6, where each day is expanded.
- [NHS Couch to 5K running plan](https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/), fetched 2026-10-16.

The two sources agree on every session except week 6 day 3 (see below). We reuse the interval structure only; coaching text is written by us.

## Plan

Every session starts with a 5-minute walking warm-up and ends with a 5-minute walking cool-down. `R` = run, `W` = walk, in minutes. Days 1–3 are identical unless listed separately.

| Week | Day | Main block                   | Total |
| ---- | --- | ---------------------------- | ----- |
| 1    | all | (R1 W1.5) × 7, R1            | 28:30 |
| 2    | all | (R1.5 W2) × 5, R1.5          | 29:00 |
| 3    | all | R1.5 W1.5 R3 W3 R1.5 W1.5 R3 | 25:00 |
| 4    | all | R3 W1.5 R5 W2.5 R3 W1.5 R5   | 31:30 |
| 5    | 1   | R5 W3 R5 W3 R5               | 31:00 |
| 5    | 2   | R8 W5 R8                     | 31:00 |
| 5    | 3   | R20                          | 30:00 |
| 6    | 1   | R5 W3 R8 W3 R5               | 34:00 |
| 6    | 2   | R10 W3 R10                   | 33:00 |
| 6    | 3   | R22 (NHS: R25)               | 32:00 |
| 7    | all | R25                          | 35:00 |
| 8    | all | R28                          | 38:00 |
| 9    | all | R30                          | 40:00 |

## Open decision

Week 6 day 3: Just Run uses a 22-minute run (20 → 22 → 25 across weeks 5–7); NHS uses 25 minutes. The proposal follows Just Run because the step from 20 minutes is smaller. The product owner should confirm.

## Review status

This is a widely used public structure, not a clinically validated prescription. Approval by the product owner makes it the MVP preset; curriculum review remains a separate release gate.
