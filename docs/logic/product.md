# Product contract

Accepted direction: 2026-10-16; MVP scope and activity targets updated by the product owner the same day. Consult the product owner before changing these outcomes.

Help generally healthy adults build toward three weekly exercise sessions and a continuous time goal. Completing the planned time is a success regardless of distance or pace. `Build to 30` is a working display name; `zero-to-5k` remains the repository identifier.

| Activity     | Continuous goal | Rationale (illustrative only) | Scope     |
| ------------ | --------------- | ----------------------------- | --------- |
| Running      | 30 minutes      | About 5 km at 6:00/km         | MVP       |
| Race walking | 40 minutes      | About 5 km at 8:00/km         | After MVP |

The pace column explains why the targets are beginner-friendly. It is not a requirement: the app never asks for distance or pace to complete a session, and the goal minutes are not a claim that the user covered 5 km.

The eventual health-oriented target is vigorous aerobic activity. Beginners can start easier; duration and intensity are distinct. Do not count all recovery/warm-up minutes as vigorous, force maximal effort, or position this as diabetes/cardiac rehabilitation.

## Current scaffold

The home screen explains the goal and persists the selected activity. It explicitly states workouts are unavailable. There is no fake Start action, fabricated completion, invented training curriculum, or background reliability claim.

## MVP experience

- A session plays timed run/walk cues with the screen off (phone in a pocket or running pouch), alongside the user's music or podcasts. A screen-on-only timer does not meet the MVP.
- The program is a game of 9 stages built from the [preset running plan](../design/running-preset-plan.md). A stage is cleared only when all of its sessions are completed with an effort rating of 8 or lower (0–10 scale); otherwise the user retries the stage. See [stage progression](../design/stage-progression.md).
- Individual sessions preview their intervals. Retrying a stage is not failure.
- The app works without an account.

Running and race walking share infrastructure but require separate technique/progression content and progress records.

## After MVP

Not planned in detail; listed so MVP decisions do not block them.

- Race-walking program (40-minute goal).
- Custom program length and "activity days" (2–7 per week) from a deterministic generator; see [generator research](../research/program-generator-research.md).
- Optional sign-in for paid features. Free features keep working without an account.
- AI-assisted (Claude) program generation backed by a curated knowledge base. Generated doses must still pass the deterministic limits.
- Strava, Apple Health, and Android Health Connect integration.
- Distance, GPS, and performance goals. GPS cannot certify legal race-walking technique. Never require a pace to earn completion of a time-based session.
