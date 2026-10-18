# Roadmap

Updated 2026-10-19. Core first: the MVP was specified for running; on 2026-10-18 the product owner made race walking the product (see [race-walking pivot](#race-walking-pivot-2026-10-18)). It works without an account and must deliver cues with the screen off. Details and exact scope: [MVP spec](design/mvp-spec.md). See also [product](logic/product.md).

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

## Race-walking pivot (2026-10-18)

Done: race walking is the only program the app shows (`OFFERED_ACTIVITIES`), with the welcome, stage map, and Settings written for it. The running program and any running history stay in the code and database, so running can return as a secondary program.

Next, in order:

1. **Coach review of the curriculum:** the new 12-stage curriculum, stage tips, and progression, starting with 8 minutes of race-walking practice. Any change ships as a new plan version.
2. **Technique content:** demonstrations, drills, and form cues written or approved by a race-walking coach, checked against the latest World Athletics rules. The app still cannot judge technique and must keep saying so.
3. **Audience and claims:** owner decision on positioning for people with joint problems, and a regulatory check before any health or knee claim. Until then the audience stays generally healthy adults ([product](logic/product.md#race-walking-focus)).

## M4 — MVP release gates

Signed builds, device QA, accessibility, privacy/backup review, race-walking curriculum and technique review, store identifiers, and explicit release authority. Public repository publication is not an app release.

## After MVP

Ideas recorded 2026-10-16, roughly in priority order. Each needs its own scoping, privacy review, and product decision before work starts.

1. **Session picker** (done 2026-10-17): every session can be previewed, started, or marked done; runs count toward progress.
2. **Scoring:** one star per session finished at effort ≤ 8 with no pain (3 per stage, 36 total for 12 stages); replays can earn missing stars. Never reward higher effort or faster pace. Weekly targets instead of daily streaks, so rest days are not punished.
3. **Race-walking program** (built 2026-10-18, after the owner called the running section a pass): 16 stages to a 40-minute goal from the [draft preset](design/race-walking-preset-plan.md). It became the product the same day; see [race-walking pivot](#race-walking-pivot-2026-10-18).
4. **Custom program length and activity days** via the deterministic generator; owner decisions are kept in the [generator proposal](design/program-generator-proposal.md).
5. **Health and Strava integration** (Apple Health, Health Connect, Strava; smartwatch data through them): use heart rate to cross-check effort ratings and reward time in an easy zone; optional personal-record achievements that never gate stages. Needs a health-data privacy review and Strava API terms check.
6. **Optional accounts and paid features;** free features keep working without sign-in. Required before any leaderboards or social features.
7. **Claude-assisted program generation** with a curated knowledge base, bounded by the deterministic limits.
8. Distance, GPS, and performance goals.

## 2026-10-19 delivery

The owner-selected 12-stage v2 curriculum replaces the offered 16-stage draft while preserving its records. Beginner basics, native cue rehearsal, accessible stage touch targets, versioned history and recovery hardening are included. The [5K–10K proposal](design/race-walking-5k-to-10k.md) extends toward 80 minutes over twelve further stages, pending coach review and separate implementation.
