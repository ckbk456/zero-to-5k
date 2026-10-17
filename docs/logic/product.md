# Product contract

Accepted direction: 2026-10-16; MVP scope and activity targets updated by the product owner the same day. Consult the product owner before changing these outcomes.

Help generally healthy adults build toward three weekly exercise sessions and a continuous time goal. Completing the planned time is a success regardless of distance or pace. `Build to 30` is a working display name; `zero-to-5k` remains the repository identifier.

| Activity     | Continuous goal | Rationale (illustrative only) | Scope                              |
| ------------ | --------------- | ----------------------------- | ---------------------------------- |
| Running      | 30 minutes      | About 5 km at 6:00/km         | MVP                                |
| Race walking | 40 minutes      | About 5 km at 8:00/km         | Built after MVP (draft curriculum) |

The pace column explains why the targets are beginner-friendly. It is not a requirement: the app never asks for distance or pace to complete a session, and the goal minutes are not a claim that the user covered 5 km.

The eventual health-oriented target is vigorous aerobic activity. Beginners can start easier; duration and intensity are distinct. Do not count all recovery/warm-up minutes as vigorous, force maximal effort, or position this as diabetes/cardiac rehabilitation.

## Current app

The MVP experience below is implemented: welcome and safety screen, stage map, session preview, live session driven by the native runtime, post-session check-in with advisory restart, stage results, history, and settings. Device validation of screen-off cues is pending (see the [workout runtime guide](../../testing/MANUAL%20TO-DO/workout-runtime.md)).

On 2026-10-18 the product owner called the running section a pass (owner review, not the device QA gate). Race walking was added the same day: the stage map switches between **Running** and **Race walking**, and the stored activity preference picks the program shown. Race walking has 16 stages from the [draft race-walking preset](../design/race-walking-preset-plan.md), which still needs coach review. Each program has its own stages, progress, history, and reset; the check-in and stage rules are shared.

## MVP experience

- A session plays timed run/walk cues with the screen off (phone in a pocket or running pouch), alongside the user's music or podcasts. A screen-on-only timer does not meet the MVP.
- The program is a game of 9 stages built from the [preset running plan](../design/running-preset-plan.md). Nothing is locked: the user can preview, start, or mark done any session; the app suggests the next one. After each session the user rates effort (0–10) and reports pain. A rating of 9–10 or pain makes the app recommend retrying the stage; it never blocks advancing. See [MVP spec](../design/mvp-spec.md).
- Individual sessions preview their intervals. Retrying a stage is not failure.
- The app works without an account.

Running and race walking share infrastructure but require separate technique/progression content and progress records. The app times race-walking practice; it cannot judge whether technique meets competition rules, and it says so.

## After MVP

Not planned in detail; listed so MVP decisions do not block them. Priorities and gamification ideas live in the [roadmap](../roadmap.md#after-mvp).

- Scoring (stars for sessions in control; never for higher effort or pace).
- Race-walking program (40-minute goal): built on 2026-10-18 from a draft preset; coach review and technique content remain.
- Custom program length and "activity days" (2–7 per week) from a deterministic generator; see [generator research](../research/program-generator-research.md).
- Optional sign-in for paid features. Free features keep working without an account.
- AI-assisted (Claude) program generation backed by a curated knowledge base. Generated doses must still pass the deterministic limits.
- Strava, Apple Health, and Android Health Connect integration.
- Distance, GPS, and performance goals. GPS cannot certify legal race-walking technique. Never require a pace to earn completion of a time-based session.
