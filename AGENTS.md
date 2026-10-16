# Repository operating contract

## Communication and authority

- Communicate in English and challenge unsupported product, medical, and technical assumptions constructively.
- Questions, reviews, research, diagnosis, and plans are read-only unless explicitly paired with a change request. Do not run project code, tests, generators, or servers in read-only mode.
- Implementation authorizes scoped local edits, checks, documentation, and coherent local commits. Remote creation, publication, PRs, merges, deployments, and production migrations require target-specific authority. Never message others without authorization.
- Preserve the chat title unless explicitly asked to rename it.

## Inspect and isolate

- Read [product](docs/logic/product.md), [architecture](docs/logic/architecture.md), [commands](docs/commands.md), and the owning manual guide before changes. Inspect Git/remotes/worktrees, relevant processes/listeners, and dependency versions; never print credentials.
- Integration branch: `main`. After initial bootstrap, never implement directly on it. Reuse a suitable task-owned managed worktree or create an isolated `codex/<short-task>` branch/worktree from freshly verified `origin/main`.
- Preserve unrelated work. No blind reset/stash/clean, force-push, broad deletion, or staging of `.local/`, secrets, device databases, recordings, or generated outputs.

## Process ownership and checks

- [docs/commands.md](docs/commands.md) is the command registry; `package.json`, the lockfile, and CI are executable sources of truth.
- Inspect equivalent running commands and their cwd before CPU-intensive work. Run at most one intensive validation per worktree, retain its original session, and poll. Avoid test watch mode.
- Investigate targeted tests after 3 minutes, full suites/builds/typechecks after 15, and device/E2E suites after 20. Inspect PID/PPID, cwd, output, CPU, and memory; thresholds do not automatically authorize termination.
- Stop only the exact process trees started by the current task. Clean up owned watchers/servers when interrupted; never kill unrelated processes.
- Code gate: `npm run check` and `npm run export:mobile`. Dependency/native config changes also require `npm run doctor` and `npx expo install --check`. Exports are not native builds; host SQLite tests do not verify the device bridge.

## Source and documentation

- Code is under `src/`; `src/app/` contains routes only. Use installed SDK documentation: [Expo 57](https://docs.expo.dev/versions/v57.0.0/), [SQLite 57](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/), [Router 57](https://docs.expo.dev/versions/v57.0.0/sdk/router/). Check installed types before copying latest-version APIs.
- Update owning logic and consolidated [manual guides](testing/MANUAL%20TO-DO/README.md) with behavior. Proposals go in `docs/design/` or roadmap; evidence in `docs/research/`; create `docs/archive/` only when archiving real material.
- Protected product decisions: time-based completion without mandatory distance/pace, generally healthy adults, distinct duration/intensity accounting, and no unreviewed training-dose rules. Consult the user before changing these. Never rewrite a released database migration to erase data.
- Research does not establish a clinical protocol or universal knee safety. Curriculum review and device validation are separate release gates.

## Collaboration and delivery

- Delegate only when task shape and active runtime policy permit it. Primary agent owns scope, shared contracts, dependencies, combined validation, and the integration recommendation.
- Each implementation task owns a bounded domain, branch/worktree, checks, docs, and handoff. State objective, exclusions, dependencies, interfaces, publication authority, and human gates. Never race on core files; verify agent reports.
- Batch work uses independently reviewable concerns, per-change and combined-tree validation, explicit eligible-PR merge authority, and a post-merge checkpoint. A checkpoint does not authorize every open PR.
- Use the PR template; draft publication and merging require separate authorization. No cloud/EAS project, store identity, or production environment is configured.
- Agent-operated UI testing requires explicit request. Prefer API/CLI inspection; screenshots alone are not test evidence.
- Report local checks, CI, device QA, native builds, deployment, and release separately. Never mark an unrun gate passed.
