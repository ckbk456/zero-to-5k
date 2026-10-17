# Architecture and data contract

One Expo SDK 57 / React Native application targets iOS and Android. Routes live in `src/app/`; screen bodies in `src/screens/`; supported activity values in `src/domain/activity.ts`. The UI uses the "blue track" palette in `src/theme/colors.ts` (light and dark, chosen by `useColors()` from the system scheme) and safe-area-aware scrolling.

## SQLite

`SQLiteProvider` opens `zero-to-5k.db` in the app sandbox and initializes migrations before rendering consumers. Migrations are append-only, each in its own transaction; failure rolls back that migration and its version.

- Version 1: `app_preferences`, singleton `id = 1` with checked `activity` values `running` or `race-walking`. Fresh installs default to running.
- Version 2: `session_attempts`, one row per started session: plan version, stage (1–9), session index (0–2), stage attempt, replay flag, start/end times, active seconds, status (`in_progress`, `completed`, `ended_early`, `interrupted`), and the post-session effort (0–10), pain, and decision (`continue`/`restart`). Schema checks allow answers only on completed rows. Repository functions end a row exactly once and record the check and decision exactly once; stale `in_progress` rows from a previous process become `interrupted`, never completed.

- Version 3: `onboarded`, `speech`, and `vibration` preferences.
- Version 4: `session_attempts.source`, `timed` (played by the runtime; existing rows) or `manual` (marked done without playing; completed, no time, never rated).

`PRAGMA user_version` tracks migrations. Existing data survives repeat initialization, and unknown newer versions are rejected without downgrading. WAL and foreign keys are enabled. Keep a single provider/migration owner and append future migrations instead of resetting data.

## Plan and progression

`src/domain/plan.ts` bundles the approved running plan (`running-v1`): 9 stages × 3 sessions of intervals (`warmup`, `active`, `walk`, `cooldown`) in whole seconds. `src/domain/progression.ts` derives per-stage done sessions and states (`not_started`, `in_progress`, `completed`, `cleared`), the suggested next session, and the latest played session's pending check or decision from attempt history. Nothing is locked; a restart decision clears only its own stage, following the [MVP spec](../design/mvp-spec.md). Effort 9–10 or pain only recommends a restart; it never blocks.

The UI confirms a selection only after persistence succeeds, exposes failures, and allows retry. Initialization errors propagate to the Router error boundary. No cloud database, credentials, accounts, analytics, or location recording exists. SQLite is not application-level encrypted; review privacy and backup handling before sensitive records are added.

## Validation boundary

`database.test.ts` executes the same SQL using Node SQLite through a narrow adapter. It covers fresh initialization, the version 1 → 2 upgrade, reopen persistence, future-version rejection, rollback, invalid values, and attempt write-once rules. `plan.test.ts` checks the bundled plan against the approved preset; `progression.test.ts` covers clearing, recommendations, restart, keep going, ignored rows, and the goal. This does not verify Expo's native bridge, device filesystem, or screen rendering; those remain in the manual guide.

## Native session runtime

`modules/session-runtime` is a local Expo module (Swift and Kotlin) that owns session truth: elapsed time, pause/resume, cues, and background execution. The UI only observes it. Expo Go cannot run it; use development or release builds.

- **API** (`@modules/session-runtime`): `prepare`, `start(config)`, `pause`, `resume`, `end`, `reset`, `getState`, and an `onStateChange` event. Statuses: `idle`, `running`, `paused`, `finished` (planned time reached), `ended` (user ended early). `finished` and `ended` persist until JavaScript records the result and calls `reset`.
- **Timing:** elapsed = monotonic clock that counts through sleep (`CLOCK_MONOTONIC` on iOS, `elapsedRealtime` on Android) − paused time. A 250 ms tick only decides when to check it. When several cues are overdue, only the latest plays.
- **Cues:** `src/domain/cues.ts` builds the segments and one cue word per interval change ("Run", "Walk", and "Done" at the end). Native code plays a bundled chime (`scripts/generate-chime.py` regenerates `chime.wav` for both platforms), then speaks the word with the system voice, and vibrates. Other audio is ducked only while a cue plays (about 1.5 seconds). The app plays no continuous audio of its own.
- **iOS background:** an Apple Health workout session (`HKWorkoutSession`, iOS 26+) keeps the app running with the screen locked. `prepare` asks for permission to save workouts; no health data is read or written. If the session cannot start, the screen is kept awake instead and `backgroundCapable` is false. Entitlement: HealthKit; background modes: `audio`, `workout-processing`.
- **Android background:** a `specialUse` foreground service with a partial wake lock and an ongoing notification (interval countdown, Pause/Resume, End). Notification permission is requested from JavaScript.
- **Calls:** an incoming or active call pauses the session (`pausedBy: 'call'`); the user resumes manually.
- **Process death:** if the app process dies, the session dies with it. On next launch an `in_progress` attempt without a live native session becomes `interrupted`. If the native session is still alive (Android service), the UI reattaches.

Do not add GPS or silent audio solely to evade platform restrictions. Device validation of screen-off cue delivery lives in the [workout runtime guide](../../testing/MANUAL%20TO-DO/workout-runtime.md).

Native directories are generated by `npx expo prebuild` and ignored. Provisional identifiers: bundle ID and Android package `com.khangcao.buildto30`, Apple team `5U4584QFCQ`; store identity is a release gate.

## Version authority

The lockfile pins installed dependencies; `app.json` declares only iOS/Android. Web is not supported. SDK 57 was originally selected for physical-device Expo Go during the SDK 58 transition; the native runtime now requires development builds, following [Expo guidance](https://docs.expo.dev/get-started/create-a-project/) inspected 2026-10-16. Use version-specific docs and installed types.
