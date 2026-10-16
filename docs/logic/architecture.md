# Architecture and data contract

One Expo SDK 57 / React Native application targets iOS and Android. Routes live in `src/app/`; screen bodies in `src/screens/`; supported activity values in `src/domain/activity.ts`. The UI uses semantic platform colors and safe-area-aware scrolling.

## SQLite

`SQLiteProvider` opens `zero-to-5k.db` in the app sandbox and initializes migrations before rendering consumers. Version 1 contains only `app_preferences`: singleton `id = 1` and checked `activity` values `running` or `race-walking`. Fresh installs default to running. Parameterized upserts and SQL/API validation protect writes.

`PRAGMA user_version` tracks migrations. Version 1 is transactional; failure rolls back. Existing data survives repeat initialization, and unknown newer versions are rejected without downgrading. WAL and foreign keys are enabled. Keep a single provider/migration owner and append future migrations instead of resetting data.

The UI confirms a selection only after persistence succeeds, exposes failures, and allows retry. Initialization errors propagate to the Router error boundary. No cloud database, credentials, accounts, analytics, or location recording exists. SQLite is not application-level encrypted; review privacy and backup handling before sensitive records are added.

## Validation boundary

`database.test.ts` executes the same SQL using Node SQLite through a narrow adapter. It covers fresh initialization, reopen persistence, future-version rejection, rollback, and invalid values. This does not verify Expo's native bridge, device filesystem, or screen rendering; those remain in the manual guide.

## Future native runtime

There is no timer, audio service, background entitlement, GPS, or HealthKit integration. Future session truth must belong to a validated native runtime. A JavaScript interval does not guarantee locked-screen delivery. Do not add GPS or silent audio solely to evade platform restrictions.

Native directories are generated and ignored. Try the current scaffold in Expo Go first. Custom modules, development builds, signing IDs, and store configuration require separately scoped work and device gates.

## Version authority

The lockfile pins installed dependencies; `app.json` declares only iOS/Android. Web is not supported. SDK 57 was selected for physical-device Expo Go during the SDK 58 transition, following [Expo guidance](https://docs.expo.dev/get-started/create-a-project/) inspected 2026-10-16. Use version-specific docs and installed types.
