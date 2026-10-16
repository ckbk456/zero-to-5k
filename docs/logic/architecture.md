# Architecture and data contract

One Expo SDK 57 / React Native application targets iOS and Android. Routes live in `src/app/`; screen bodies in `src/screens/`; supported activity values in `src/domain/activity.ts`. The UI uses semantic platform colors and safe-area-aware scrolling.

## SQLite

`SQLiteProvider` opens `zero-to-5k.db` in the app sandbox and initializes migrations before rendering consumers. Migrations are append-only, each in its own transaction; failure rolls back that migration and its version.

- Version 1: `app_preferences`, singleton `id = 1` with checked `activity` values `running` or `race-walking`. Fresh installs default to running.
- Version 2: `session_attempts`, one row per started session: plan version, stage (1–9), session index (0–2), stage attempt, replay flag, start/end times, active seconds, status (`in_progress`, `completed`, `ended_early`, `interrupted`), and the post-session effort (0–10), pain, and decision (`continue`/`restart`). Schema checks allow answers only on completed rows. Repository functions end a row exactly once and record the check and decision exactly once; stale `in_progress` rows from a previous process become `interrupted`, never completed.

`PRAGMA user_version` tracks migrations. Existing data survives repeat initialization, and unknown newer versions are rejected without downgrading. WAL and foreign keys are enabled. Keep a single provider/migration owner and append future migrations instead of resetting data.

## Plan and progression

`src/domain/plan.ts` bundles the approved running plan (`running-v1`): 9 stages × 3 sessions of intervals (`warmup`, `active`, `walk`, `cooldown`) in whole seconds. `src/domain/progression.ts` derives stage states (`locked`, `current`, `completed`, `cleared`), the next session, and any pending check or decision from attempt history, following the [MVP spec](../design/mvp-spec.md). Effort 9–10 or pain only recommends a restart; it never blocks.

The UI confirms a selection only after persistence succeeds, exposes failures, and allows retry. Initialization errors propagate to the Router error boundary. No cloud database, credentials, accounts, analytics, or location recording exists. SQLite is not application-level encrypted; review privacy and backup handling before sensitive records are added.

## Validation boundary

`database.test.ts` executes the same SQL using Node SQLite through a narrow adapter. It covers fresh initialization, the version 1 → 2 upgrade, reopen persistence, future-version rejection, rollback, invalid values, and attempt write-once rules. `plan.test.ts` checks the bundled plan against the approved preset; `progression.test.ts` covers clearing, recommendations, restart, keep going, ignored rows, and the goal. This does not verify Expo's native bridge, device filesystem, or screen rendering; those remain in the manual guide.

## Future native runtime

There is no timer, audio service, background entitlement, GPS, or HealthKit integration. Future session truth must belong to a validated native runtime. A JavaScript interval does not guarantee locked-screen delivery. Do not add GPS or silent audio solely to evade platform restrictions.

Native directories are generated and ignored. Try the current scaffold in Expo Go first. Custom modules, development builds, signing IDs, and store configuration require separately scoped work and device gates.

## Version authority

The lockfile pins installed dependencies; `app.json` declares only iOS/Android. Web is not supported. SDK 57 was selected for physical-device Expo Go during the SDK 58 transition, following [Expo guidance](https://docs.expo.dev/get-started/create-a-project/) inspected 2026-10-16. Use version-specific docs and installed types.
