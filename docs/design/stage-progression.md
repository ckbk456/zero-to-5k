# Stage progression

Date: 2026-10-16. Status: MVP design decided by the product owner; not yet implemented. Items marked _default_ were chosen by the agent and can be changed by the owner.

The program is presented as a game, not a workout schedule. The user clears stages one at a time; the calendar never advances them.

## Stages

- There are 9 fixed stages. Stage _n_ is week _n_ of the [running preset plan](running-preset-plan.md), with its 3 sessions in order. Stages 5 and 6 contain three different sessions; the others repeat one session three times.
- A stage takes about a week; retries make the program longer. There is no program-length input in the MVP.
- The current stage is played in order. Sessions from earlier stages can be replayed; replays never change progress.

## Completing a stage

- A session is complete when its planned time finishes. Distance and pace are never asked for.
- After each completed session, the user rates effort on the 0–10 scale (Borg CR10), with plain-word labels and a talk-test hint at each level, and answers "Any pain?" (yes/no).
- A stage is **cleared** when every session in the current attempt is completed with a rating of **8 or lower** and no pain.
- A rating of 9 or 10, or reported pain, makes the app **recommend** retrying the stage (and rest, for pain). Rationale (owner): a near-maximal effort now predicts an unsustainable next stage and raises injury risk.
- The recommendation never blocks: the user can continue to the next stage anyway. The stage then shows as completed but not cleared, and history keeps the ratings.
- _Default:_ a session ended early is not complete and has no rating; the same session is offered again.
- _Default:_ rest days between sessions are advised in copy (as NHS does), not enforced.
- Completing stage 9's sessions means the goal is reached: 30 minutes of continuous running.

## Data

Append a migration with a session-attempt history: plan version, stage, session index, attempt number, start and end times, completed flag, rating, pain answer, and whether the user continued against a retry recommendation. The current stage and attempt are derived from history, not stored separately. Never fabricate a completion or rating.

The effort rating and pain answer are required to log a completed session because they drive the recommendation; following the recommendation is optional.

## Out of scope for MVP

Program-length choice and the plan generator (see [generator research](../research/program-generator-research.md)), activity-days scheduling, points/streaks/badges (scoring is under discussion), and automatic regression to an earlier stage.
