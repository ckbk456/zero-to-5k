# Zero to 5K

A simple, offline race-walking companion for iOS and Android. Twelve stages, three sessions per stage, and cues over your music or podcasts build toward 40 continuous minutes. That covers 5 km at 8:00/km; completing your planned time counts regardless of pace or distance.

## What works

- Native Swift/Kotlin workout timer, chime/spoken cues, pause/resume/end and Android notification controls.
- Session previews with race-walking and overall duration, suggested order and freely selectable stages.
- Effort/pain check-ins, stage milestones, local history and preserved older plan records.
- Beginner basics, a 30-second cue rehearsal, sound/vibration settings and light/dark appearance.
- Local SQLite with append-only migrations. No account, backend, GPS, analytics or API key is needed.

The curriculum is an original draft awaiting independent coach review. Emulator checks do not replace physical-device screen-off audio, headphones and battery validation. Store signing/review is a separate delivery step.

## Run locally

Use Node **24.17.0** and npm **11.13.0**.

```sh
nvm use
npm ci
npm run ios       # select an iOS simulator
npm run android   # Android emulator
```

A local native module means Expo Go is unsupported. See the [command registry](docs/commands.md) for self-contained release-mode simulator builds and process ownership.

```sh
npm run check
npm run export:mobile
npm run doctor
```

## Documentation and data

[Product](docs/logic/product.md), [architecture](docs/logic/architecture.md), [specification](docs/design/mvp-spec.md), [current curriculum](docs/design/race-walking-12-week-plan.md), [5K–10K proposal](docs/design/race-walking-5k-to-10k.md), and [manual checks](testing/MANUAL%20TO-DO/README.md).

Session history, effort/pain answers and settings are stored on the device. System backups may include app data; there is no app-level cloud sync or encryption. Device databases and credentials are ignored by Git. Historical running and 16-stage race-walking definitions remain in code for data compatibility.

## License

No project-wide open-source license has been selected. Public visibility does not grant a project-wide reuse license. Third-party components retain their own licenses; see [third-party notices](THIRD_PARTY_NOTICES.md).
