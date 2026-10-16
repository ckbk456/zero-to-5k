# Build to 30

A time-based running and race-walking app for iOS and Android. The repository is named `zero-to-5k`; the working display name reflects the goal: build toward 30 minutes of exercise, without requiring a distance or pace.

## Current status

An early scaffold, not a workout coach yet:

- Expo SDK 57, React Native, Expo Router, and strict TypeScript.
- A native home screen with running/race-walking selection.
- Local SQLite preferences and a transactional, versioned migration.
- SQL migration/persistence tests, lint, formatting, type checking, and mobile JavaScript export checks.

Workouts, background cues, training history, and program generation are not implemented. The icon is an Expo template placeholder. Native device QA remains pending.

## Start locally

Use Node **24.17.0** and npm **11.13.0**.

```sh
nvm use
npm ci
npm start
```

Scan the QR code using compatible Expo Go. `npm run ios` and `npm run android` open a development session on an already configured simulator/emulator. No backend, credentials, or Expo cloud project is needed.

SDK 57 was selected because Expo's setup guidance on 2026-10-16 recommends it for physical-device Expo Go during the SDK 58 transition. Future native background coaching will require development builds and device validation.

```sh
npm run check          # One-shot formatting, lint, types, real SQLite tests
npm run export:mobile  # iOS/Android JavaScript bundles, not signed apps
npm run doctor        # Network-dependent Expo diagnostics
```

See the [command registry](docs/commands.md) for environments and ownership.

## Data and documentation

Only the activity preference is stored locally. There is no authentication, telemetry, location recording, or sync. SQLite is not application-level encrypted; review storage before adding sensitive data. Device databases and private notes are ignored by Git.

- [Documentation](docs/README.md), [product](docs/logic/product.md), and [architecture](docs/logic/architecture.md)
- [Roadmap](docs/roadmap.md) and [manual testing](testing/MANUAL%20TO-DO/README.md)
- [Contributing](CONTRIBUTING.md) and [agent instructions](AGENTS.md)

The integration branch is `main`; future implementation uses isolated `codex/<task>` branches/worktrees. Research cannot override the current product contract.

## License

No project-wide open-source license has been selected. Public visibility does not grant a project-wide reuse license. Third-party components retain their own licenses; see [third-party notices](THIRD_PARTY_NOTICES.md).
