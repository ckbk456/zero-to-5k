# Command registry

Run at the repository root using Node 24.17.0 and npm 11.13.0. Exact scripts are in `package.json`; the lockfile fixes dependencies. Durations are estimates, not guarantees.

| Purpose           | Exact command              | Source                    | Estimate     | CPU-intensive   | Target / ownership                                  |
| ----------------- | -------------------------- | ------------------------- | ------------ | --------------- | --------------------------------------------------- |
| Install           | `npm ci`                   | Lockfile                  | 20 sec–3 min | Yes             | Local/CI, network, no credentials                   |
| Formatting check  | `npm run format:check`     | Prettier config/script    | <30 sec      | Low             | Deterministic local/CI                              |
| Apply formatting  | `npm run format`           | Prettier config/script    | <30 sec      | Low             | Mutating, authorized files only                     |
| Lint              | `npm run lint`             | ESLint config/script      | <1 min       | Yes             | One-shot local/CI                                   |
| Types             | `npm run typecheck`        | tsconfig/script           | <1 min       | Yes             | One-shot local/CI                                   |
| Unit and SQL      | `npm test`                 | `src/**/*.test.ts`        | <1 min       | Low             | Node SQLite, unique test-owned temp DB              |
| Main quality gate | `npm run check`            | package script            | 1–3 min      | Yes, sequential | Deterministic local/CI                              |
| Mobile JS export  | `npm run export:mobile`    | package script / app.json | 1–5 min      | Yes             | iOS/Android, ignored dist output, not native builds |
| Compatibility     | `npx expo install --check` | Installed Expo CLI        | <1 min       | Low             | Dependency/config gate, may need network            |
| Diagnostics       | `npm run doctor`           | Pinned expo-doctor        | 1–3 min      | Low             | Conditional, network/provider-dependent             |
| Dependency audit  | `npm audit`                | npm registry advisories   | <1 min       | Low             | Network-dependent; findings require assessment      |
| Metro server      | `npm start`                | package script            | Long-running | Yes             | Human-owned development; stop afterward             |
| Native projects   | `npx expo prebuild`        | app.json, local modules   | 1–3 min      | Low             | Regenerates ignored `ios/` and `android/`           |
| iOS dev build     | `npm run ios -- --device`  | package script            | 5–15 min     | Yes             | Connected iPhone, Xcode signing; serves via Metro   |
| Android dev build | `npm run android`          | package script            | 5–15 min     | Yes             | Connected device or emulator; serves via Metro      |

No server/database service, production migration command, store-signed build, EAS project, or deployment command exists. A self-contained iOS build for pocket testing: `xcodebuild -workspace ios/Buildto30.xcworkspace -scheme Buildto30 -configuration Release -destination id=<device> -allowProvisioningUpdates build`, then install with `xcrun devicectl device install app`. Android: `cd android && ./gradlew assembleRelease` (debug-signed), then `adb install`. SQLite migration runs automatically during provider initialization.

CI installs and runs the quality gate, dependency compatibility, and mobile export sequentially. Device QA, signing, audio reliability, and curriculum review remain separate. Inspect equivalent processes/cwd before intensive commands and preserve the original session; see `AGENTS.md` for investigation and cleanup rules.
