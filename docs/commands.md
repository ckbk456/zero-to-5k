# Command registry

Run at the repository root using Node 24.17.0 and npm 11.13.0. Exact scripts are in `package.json`; the lockfile fixes dependencies. Durations are estimates, not guarantees.

| Purpose           | Exact command              | Source                         | Estimate     | CPU-intensive   | Target / ownership                                  |
| ----------------- | -------------------------- | ------------------------------ | ------------ | --------------- | --------------------------------------------------- |
| Install           | `npm ci`                   | Lockfile                       | 20 sec–3 min | Yes             | Local/CI, network, no credentials                   |
| Formatting check  | `npm run format:check`     | Prettier config/script         | <30 sec      | Low             | Deterministic local/CI                              |
| Apply formatting  | `npm run format`           | Prettier config/script         | <30 sec      | Low             | Mutating, authorized files only                     |
| Lint              | `npm run lint`             | ESLint config/script           | <1 min       | Yes             | One-shot local/CI                                   |
| Types             | `npm run typecheck`        | tsconfig/script                | <1 min       | Yes             | One-shot local/CI                                   |
| SQL contracts     | `npm test`                 | `src/storage/database.test.ts` | <1 min       | Low             | Node SQLite, unique test-owned temp DB              |
| Main quality gate | `npm run check`            | package script                 | 1–3 min      | Yes, sequential | Deterministic local/CI                              |
| Mobile JS export  | `npm run export:mobile`    | package script / app.json      | 1–5 min      | Yes             | iOS/Android, ignored dist output, not native builds |
| Compatibility     | `npx expo install --check` | Installed Expo CLI             | <1 min       | Low             | Dependency/config gate, may need network            |
| Diagnostics       | `npm run doctor`           | Pinned expo-doctor             | 1–3 min      | Low             | Conditional, network/provider-dependent             |
| Dependency audit  | `npm audit`                | npm registry advisories        | <1 min       | Low             | Network-dependent; findings require assessment      |
| Expo Go server    | `npm start`                | package script                 | Long-running | Yes             | Human-owned development; stop afterward             |
| iOS session       | `npm run ios`              | package script                 | Long-running | Yes             | Configured simulator/Expo Go                        |
| Android session   | `npm run android`          | package script                 | Long-running | Yes             | Configured emulator/device                          |

No server/database service, production migration command, signed native build, EAS project, or deployment command exists. SQLite migration runs automatically during provider initialization. Add native commands only once native configuration is established.

CI installs and runs the quality gate, dependency compatibility, and mobile export sequentially. Device QA, signing, audio reliability, and curriculum review remain separate. Inspect equivalent processes/cwd before intensive commands and preserve the original session; see `AGENTS.md` for investigation and cleanup rules.
