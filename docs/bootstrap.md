# Bootstrap record

Date: 2026-10-16.

## Baseline and authority

The folder contained four research/design Markdown files and no Git repository, manifest, CI, native project, or development server. The request explicitly authorized setup-repo, Expo React Native/SQL scaffolding, and public GitHub repository creation. Initial publication is in scope; no PR, merge into an existing branch, deployment, or release was requested.

Original research is preserved in ignored local storage. Public copies remove personal health context while preserving evidence. The current product contract records time-based success.

## Implementation

Expo 57 native home screen, SQLite preference migration, host SQLite tests, strict TypeScript, ESLint/Prettier, CI, command registry, contributor/agent guidance, and app/data plus workout-runtime manual domains. No backend, EAS/cloud project, signing ID, or workout engine was created.

## Validation

- Passed locally on Node 24.17.0 / npm 11.13.0: `npm run check` (formatting, lint, TypeScript, four SQLite tests).
- Passed: `npx expo install --check` and `npm run doctor` (21/21 checks).
- Passed: `CI=1 EXPO_NO_TELEMETRY=1 npm run export:mobile`, producing iOS and Android bundles. This is not native compilation or device verification.
- Dependency audit: 29 affected dependency entries (18 high, 11 moderate; zero critical), originating in four advisory families. These counts include transitive parent entries, not 29 distinct vulnerabilities. See [dependency findings](research/dependency-audit.md).
- Device QA, accessibility/theme checks on devices, signed native builds, background workout behavior, and release remain pending. No dev server or emulator was started; one-shot validation processes exited.

## Git and publication

New repository bootstrap on `codex/scaffold-expo`, with initial `main` pointing at the same bootstrap commit. Public destination: `ckbk456/zero-to-5k`. CI runs the quality gate, compatibility check, and mobile exports on pushes to `main` and pull requests. GitHub's run status is the source of truth for hosted CI; local success alone does not establish it.

No pull request, existing-branch merge, deployment, or cloud resource is part of this bootstrap. Future work follows the isolated-worktree policy. License selection and final branding remain owner decisions.
