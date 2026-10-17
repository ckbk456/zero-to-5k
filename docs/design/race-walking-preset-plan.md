# Race-walking preset plan

Date: 2026-10-18. Status: **draft curriculum, implemented as `race-walking-v1`** at the product owner's request on 2026-10-18. It has not been reviewed by a coach or clinician. Each week is one stage; the stage and check-in rules are the same as running ([MVP spec](mvp-spec.md) §3).

## Source

The P4 catalogue in the [program generator research](../research/program-generator-research.md#p4-race-walking-preset), used unchanged. It is an original proposal written for this app, not a published or validated program; no validated beginner protocol for a continuous 40-minute race walk was found.

## Plan

Every session starts with a 5-minute walking warm-up and ends with a 5-minute walking cool-down. `Q` = race walk, `W` = ordinary walk, in minutes. Repeated bouts have W1.5 between them only. The three sessions of a stage are identical.

| Stage | Main block             | Race-walk min | Total |
| ----- | ---------------------- | ------------: | ----- |
| 1     | Q0.5 × 6, W1.5 between |             3 | 20:30 |
| 2     | Q1 × 6, W1.5 between   |             6 | 23:30 |
| 3     | Q1.5 × 6, W1.5 between |             9 | 26:30 |
| 4     | Q2 × 6, W1.5 between   |            12 | 29:30 |
| 5     | Q3 × 5, W1.5 between   |            15 | 31:00 |
| 6     | Q4 × 4, W1.5 between   |            16 | 30:30 |
| 7     | Q5 × 4, W1.5 between   |            20 | 34:30 |
| 8     | Q7 × 3, W1.5 between   |            21 | 34:00 |
| 9     | Q10 W1.5 Q10 W1.5 Q5   |            25 | 38:00 |
| 10    | Q15 W1.5 Q15           |            30 | 41:30 |
| 11    | Q20 W1.5 Q10           |            30 | 41:30 |
| 12    | Q25 W1.5 Q5            |            30 | 41:30 |
| 13    | Q25                    |            25 | 35:00 |
| 14    | Q30                    |            30 | 40:00 |
| 15    | Q35                    |            35 | 45:00 |
| 16    | Q40                    |            40 | 50:00 |

`plan.test.ts` checks the bundled plan against this table and the P4 envelopes: no adjacent stage adds more than 5 minutes to the longest bout, the race-walk minutes, or the session total.

## What the app does and does not do

- Cues say "Race walk" for Q and "Walk" for everything else. There are no extra technique announcements; P4's opening-30-second focus cues are not implemented.
- Stage tips name the block and one comfort-level focus from P4 (relaxed and upright, no overstriding, smooth heel-to-toe roll, natural arm swing, slow down when form slips). They never cue knee locking or straightening.
- Completion means the planned time was played. The app cannot judge whether technique meets race-walking rules, and says so on the home screen and in Settings.

## Review status

Gates before public use: coach review of the whole catalogue, the stage tips, and the technique wording; a check of the latest World Athletics rules; and the owner's answer on how to explain that timed completion does not certify technique (open question 8 in the research). Curriculum review remains a separate release gate.
