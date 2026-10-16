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

## M2 — Plan and stage progression

- Versioned plan format: stages → sessions → intervals (seconds), with interval kind `active` or `walk` so race walking can reuse it. Plan definitions are separate from history.
- Bundle the [running preset plan](design/running-preset-plan.md) as 9 stages.
- Append a migration for session-attempt history with effort ratings; derive the current stage per [stage progression](design/stage-progression.md).
- Unit tests cover clearing (all sessions rated 8 or lower, no pain), retry recommendations (any 9–10 or pain), continuing anyway, early stops, and that history is never rewritten.

## M3 — App screens

Stage map, session preview, live session (driven by M1), effort rating after each session, stage cleared/retry screens, and history.

## M4 — MVP release gates

Signed builds, device QA, accessibility, privacy/backup review, curriculum review, store identifiers, and explicit release authority. Public repository publication is not an app release.

## After MVP

Race-walking program (40-minute goal); custom program length and activity days via the deterministic generator ([research](research/program-generator-research.md)); optional accounts for paid features; Claude-assisted program generation with a knowledge base, bounded by the deterministic limits; Strava, Apple Health, and Health Connect. Each needs its own scoping, privacy review, and product decision.
