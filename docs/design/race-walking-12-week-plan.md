# Race walking: 12 stages to 40 minutes

Date: 2026-10-19. Status: **owner-selected curriculum implemented as `race-walking-v2`; coach review pending**. Source: the product owner's attached schedule and authorization on 2026-10-19, following the race-walking discussion. This is an original progression, not a published or validated beginner race-walking protocol.

## Intended use

Three sessions make a stage. At three sessions a week the program takes about 12 weeks; stages have no deadline, and users may repeat, pause, or choose another session. Nothing is locked. From stage 5, the suggested session order progresses from more separated practice to longer uninterrupted stretches. The audience remains generally healthy adults; this is not rehabilitation or a promise of safety for a joint condition.

The timed goal is 40 minutes of continuous race-walking practice. At 8:00/km that would cover 5 km; the app measures neither distance nor pace and does not certify race-walking technique. Completing the planned time counts at any pace. Active time below means race-walking intervals, not verified vigorous exercise.

## Exact curriculum

All values below are minutes. Every session starts with a 5-minute ordinary walking warm-up and ends with a 5-minute ordinary walking cool-down. Put a 90-second ordinary walking recovery **between** consecutive race-walking bouts; none follows the final bout before the cool-down. A slash separates the three sessions of a stage in the totals columns.

| Stage | Session 1: build time | Session 2: build continuity | Session 3: longer stretch | Race-walking minutes | Whole-session minutes |
| ----- | --------------------- | --------------------------- | ------------------------- | -------------------- | --------------------- |
| 1     | 8 × 1                 | 8 × 1                       | 8 × 1                     | 8 / 8 / 8            | 28½ / 28½ / 28½       |
| 2     | 7 × 1½                | 7 × 1½                      | 7 × 1½                    | 10½ / 10½ / 10½      | 29½ / 29½ / 29½       |
| 3     | 5 × 2½                | 5 × 2½                      | 5 × 2½                    | 12½ / 12½ / 12½      | 28½ / 28½ / 28½       |
| 4     | 4 × 4                 | 4 × 4                       | 4 × 4                     | 16 / 16 / 16         | 30½ / 30½ / 30½       |
| 5     | 5 × 4                 | 6, then 3 × 4½              | 8½, then 2 × 5            | 20 / 19½ / 18½       | 36 / 34 / 31½         |
| 6     | 3 × 7½                | 2 × 11                      | 13, then 9                | 22½ / 22 / 22        | 35½ / 33½ / 33½       |
| 7     | 2 × 12½               | 15, then 10                 | 17½, then 7½              | 25 / 25 / 25         | 36½ / 36½ / 36½       |
| 8     | 2 × 14                | 20, then 8                  | 22, then 6                | 28 / 28 / 28         | 39½ / 39½ / 39½       |
| 9     | 2 × 15½               | 24, then 7                  | 26½, then 4½              | 31 / 31 / 31         | 42½ / 42½ / 42½       |
| 10    | 2 × 17                | 29, then 5                  | 31, then 3                | 34 / 34 / 34         | 45½ / 45½ / 45½       |
| 11    | 2 × 18½               | 33, then 4                  | 35½                       | 37 / 37 / 35½        | 48½ / 48½ / 45½       |
| 12    | 2 × 20                | 38                          | 40                        | 40 / 38 / 40         | 51½ / 48 / 50         |

Stages 1–4 repeat the same session. Stages 5–12 use individual session titles and intervals. The final three sessions are deliberately different, ending with a single 40-minute race-walking interval.

## Arithmetic and claims

- Whole-session duration is the race-walking total plus all ordinary walking recoveries and the 10 minutes of warm-up/cool-down. Stages 5–7 last **31½–36½ minutes**; the longest session is stage 12 session 1 at **51½ minutes**. The final session lasts 50 minutes.
- In the suggested sequence, a newly established longest bout exceeds the previous longest bout by at most 2½ minutes. Adjacent sessions add at most 4½ race-walking minutes. These are descriptions of this table, not evidence of clinical safety or universal progression limits.
- The schedule does **not** change only one measure in every session: early stages increase both volume and longest bout, and the final 38 → 40-minute step increases both by 2 minutes. The final session returns to the 40-minute race-walking total already practiced in two bouts in session 1.
- Session 1 of later stages returns to shorter bouts but can add more total time. It is not necessarily an easier day for every user. No claim is made that its race-walking percentage is higher than the other sessions.
- Stage tips prioritize comfortable effort, permission to walk or pause, repetition, and following the suggested order. They avoid promises about knees, speed, injury prevention, or competition-legal technique.

## Version and history contract

`PLANS['race-walking']` and `RACE_WALKING_PLAN` select `race-walking-v2` for new practice. `PLAN_CATALOG` includes the current 12-stage plan, the unchanged [16-stage v1 plan](race-walking-preset-plan.md), and `running-v1`; `planByVersion` resolves all three. History may select a historical version without changing the current training plan.

An attempt belongs to the exact `plan_version` stored in SQLite. Existing v1 rows are neither deleted nor relabelled as v2, and v1 completions do not mark v2 sessions done. Existing live attempts continue resolving their original intervals, including legacy stage 16. Resetting v2 removes only v2 rows. No database migration is needed for this curriculum update.

`activeSeconds(session)` returns planned race-walking/running seconds; `totalSeconds(session)` includes warm-up, recovery, and cool-down. Neither function infers exercise intensity. The existing database field `active_seconds` stores elapsed session time from the runtime, including ordinary walking, and must not be relabelled as race-walking-only time.

## Validation and remaining review

Automated tests independently check all 36 sessions against the bout, active-time, and total-time table; warm-up/cool-down and recovery placement; the final goal; whole-second positive intervals; version lookup; the unchanged v1 schedule; and SQLite history/progress isolation. These tests validate implementation and arithmetic, not the suitability of the training dose.

Coach review of dose and technique wording remains a curriculum release gate. Native background behavior, music/podcast coexistence, accessibility, and device acceptance have separate checks. The requested 5K-to-10K second stage is research/design work only and is not included in the offered curriculum.
