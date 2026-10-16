# Roadmap

Updated 2026-10-16. The MVP is running only, works without an account, and must deliver cues with the screen off. See [product](logic/product.md).

## M0 — Scaffold (done)

Native home screen, SQLite activity preference and migration, host SQL tests, repository workflow, CI definitions, public research. Results live in [bootstrap](bootstrap.md). Device QA, final identity/icon, and license selection remain pending.

## M1 — Locked-screen timer spike

Highest risk; everything else depends on it.

- Move from Expo Go to development builds with a local Expo module (Swift/Kotlin) that owns elapsed time, transitions, pause/resume, and cue playback. The UI only observes it.
- Android: foreground service started from Start, ongoing notification with pause/stop, transient audio focus per cue.
- iOS: background audio session held for the whole workout, ducking other audio per cue. Measure reliability and App Review risk; do not rely on an inaudible loop.
- Exit gate: a 40-minute session on a physical iPhone and Android phone, screen off, with music and with a podcast, meets the [workout runtime](../testing/MANUAL%20TO-DO/workout-runtime.md) checks agreed for MVP.

## M2 — Plans as data

- Versioned plan format: activity → weeks → sessions → intervals (seconds). Plan definitions are separate from session history.
- Bundle the [running preset plan](design/running-preset-plan.md).
- Append migrations for the selected plan and session history.

## M3 — Deterministic generator

- `generate({ activity, weeks: 8–24, sessionsPerWeek: 1–7 }) → plan`, pure TypeScript, no AI, no network.
- Parameters and limits come from the generator research task and owner review; see the [generator proposal](design/program-generator-proposal.md).
- Unit tests assert bounds: input caps, weekly increase limits, longest continuous block, hard-session spacing, and that every plan ends at the activity goal.

## M4 — App screens

Setup (preset or custom: weeks, sessions/week), plan overview, session preview, live session (driven by M1), time-based completion, repeat/skip, and history.

## M5 — MVP release gates

Signed builds, device QA, accessibility, privacy/backup review, curriculum review, store identifiers, and explicit release authority. Public repository publication is not an app release.

## After MVP

Race-walking program (40-minute goal); optional accounts for paid features; Claude-assisted program generation with a knowledge base, bounded by the deterministic limits; Strava, Apple Health, and Health Connect. Each needs its own scoping, privacy review, and product decision.
