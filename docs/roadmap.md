# Roadmap

Updated 2026-10-16. Core first: the MVP is running only, works without an account, and must deliver cues with the screen off. Details and exact scope: [MVP spec](design/mvp-spec.md). See also [product](logic/product.md).

## M0 — Scaffold (done)

Native home screen, SQLite activity preference and migration, host SQL tests, repository workflow, CI definitions, public research. Results live in [bootstrap](bootstrap.md). Device QA, final identity/icon, and license selection remain pending.

## Gate — MVP spec review (done)

Approved for implementation by the product owner on 2026-10-16.

## M1 — Locked-screen timer (built; device gate open)

Implemented in `modules/session-runtime` (#3, chimes #6). Android emulator evidence is in the [workout runtime guide](../testing/MANUAL%20TO-DO/workout-runtime.md); the physical-device exit gate below is still open.

Highest risk; everything else depends on it.

- Move from Expo Go to development builds with a local Expo module (Swift/Kotlin) that owns elapsed time, transitions, pause/resume, and cue playback. The UI only observes it.
- Android: foreground service started from Start, ongoing notification with pause/stop, transient audio focus per cue.
- iOS: background audio session held for the whole workout, ducking other audio per cue. Measure reliability and App Review risk; do not rely on an inaudible loop.
- Exit gate: a 40-minute session on a physical iPhone and Android phone, screen off, with music and with a podcast, meets the [workout runtime](../testing/MANUAL%20TO-DO/workout-runtime.md) checks agreed for MVP.

## M2 — Plan and stage progression (done, #2)

- Versioned plan format: stages → sessions → intervals (seconds), with interval kind `active` or `walk` so race walking can reuse it. Plan definitions are separate from history.
- Bundle the [running preset plan](design/running-preset-plan.md) as 9 stages.
- Append a migration for session-attempt history with effort ratings; derive the current stage per [MVP spec](design/mvp-spec.md).
- Unit tests cover clearing (all sessions rated 8 or lower, no pain), retry recommendations (any 9–10 or pain), continuing anyway, early stops, and that history is never rewritten.

## M3 — App screens (done, #4, #5)

Stage map, session preview, live session (driven by M1), effort rating after each session, stage cleared/retry screens, and history.

## M4 — MVP release gates

Signed builds, device QA, accessibility, privacy/backup review, curriculum review, store identifiers, and explicit release authority. Public repository publication is not an app release.

## After MVP

Ideas recorded 2026-10-16, roughly in priority order. Each needs its own scoping, privacy review, and product decision before work starts.

1. **Session picker** (done 2026-10-17): every session can be previewed, started, or marked done; runs count toward progress.
2. **Scoring:** one star per session finished at effort ≤ 8 with no pain (3 per stage, 27 total); replays can earn missing stars. Never reward higher effort or faster pace. Weekly targets instead of daily streaks, so rest days are not punished.
3. **Race-walking program** (40-minute goal); a draft preset is in the [generator research](research/program-generator-research.md) and needs coach review.
4. **Custom program length and activity days** via the deterministic generator; owner decisions are kept in the [generator proposal](design/program-generator-proposal.md).
5. **Health and Strava integration** (Apple Health, Health Connect, Strava; smartwatch data through them): use heart rate to cross-check effort ratings and reward time in an easy zone; optional personal-record achievements that never gate stages. Needs a health-data privacy review and Strava API terms check.
6. **Optional accounts and paid features;** free features keep working without sign-in. Required before any leaderboards or social features.
7. **Claude-assisted program generation** with a curated knowledge base, bounded by the deterministic limits.
8. Distance, GPS, and performance goals.
