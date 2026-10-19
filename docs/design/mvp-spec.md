# Application specification and scope

Updated 2026-10-19. Implementation, scoped publication and integration authorized by the product owner. This replaces the running-first MVP description; the running preset remains versioned for historical records.

## Outcome

Help generally healthy adults practise race walking three times a week and build to 40 continuous minutes. At 8:00/km this is 5 km, but time completion does not establish distance or competition-legal technique. No account, pace, distance or location is required.

## Included

- iOS and Android, English, portrait, system light/dark appearance.
- The [12-stage race-walking plan](race-walking-12-week-plan.md), three sessions per stage, usually twelve weeks with rest days between sessions. Repeats and slower progress are normal.
- Five-minute ordinary-walking warm-up and cool-down. Every between-bout recovery is 90 seconds. Session duration ranges from 28:30 to 51:30; the final continuous goal occupies 40 minutes of a 50-minute session.
- A stage picker, expandable session summaries, preview, native timed session, effort/pain check-in, stage milestone, versioned history, settings, beginner guide, and a 30-second cue rehearsal.
- Spoken transition words with a chime, optional vibration, native pause/resume/end, and Android notification controls.
- Local SQLite persistence and recoverable completed-session writes. Earlier plan rows remain intact and readable.

## Progress and rewards

Every stage is available. The suggested next session is the first unfinished session; picking ahead within a stage or beyond it shows a sequencing note. Sessions in stages 5–12 differ, so order matters. No calendar deadline, daily streak or speed score penalizes recovery.

A session completes only when the native timer reaches its planned duration, or when the user explicitly marks an outside session done. Manual completion contributes to stage progress but records no time or effort rating. Ending early or an interrupted process remains visible in History without completing a session.

The existing advisory effort rule remains: effort 9–10 or pain offers rest/repeat advice, with a user choice to restart the stage or continue. A stage is completed when its three sessions are recorded, and cleared when each has a timed check-in at effort ≤8 without reported pain. This is an app convention, not a training intensity prescription or a medically validated readiness threshold. Beginner practice should be conversational; a higher effort score earns nothing extra.

Stage-result copy describes recorded completion, including manual entries; it does not infer uninterrupted ability from a badge. History shows completed-session count and total recorded time including warm-ups/recoveries, separately from race-walking target minutes in previews.

## Native runtime

The Swift/Kotlin module owns monotonic elapsed time, transitions and cues; React observes it. Pause excludes paused time. No location or silent looping audio is used for background execution.

- iOS 26+ uses an authorized HealthKit workout session; no workout samples are saved or read. A failed/unavailable workout session falls back to a screen-on timer. Leaving that fallback screen pauses the workout and requires manual resume.
- Android uses a foreground service and wake lock with notification controls. The service persists beyond the visible screen.
- Cues briefly duck music. iOS additionally requests interruption of spoken audio, subject to the other audio app's behavior. Android speech/focus failures release focus with a bounded timeout.
- Calls pause; users resume manually. Force-quit/process death cannot recreate unseen progress.
- Finished native state is retained until its database result is saved. Actual storage failures must remain retryable; no catch-all may treat them as successful writes.
- A cue rehearsal never creates training-history rows, and leaving it stops only its own native session.

## Data

The current plan is `race-walking-v2`. The unchanged 16-stage `race-walking-v1` and `running-v1` definitions remain addressable. Old completions do not map automatically to changed doses. History can display each version, and a legacy completed session can finish its own check-in. Reset affects the current version only and requires typed confirmation.

Schema migrations are append-only. Migration 5 widens the stage range and preserves every row and the autoincrement counter. The v2 curriculum needs no schema migration. `active_seconds` is the historical column name for total unpaused session time, including bookends and recoveries; it is not vigorous activity time.

## Deliberate boundaries

The [5K–10K extension](race-walking-5k-to-10k.md) is a sourced proposal, not an enabled curriculum. Accounts, payments, AI-generated prescriptions, GPS, health-data exports, Strava, reminders and social features are outside this delivery. The core requires no service credentials. No knee-protection, rehabilitation or guaranteed injury-prevention claims are made.

## Acceptance and release gates

The code gate is `npm run check` and `npm run export:mobile`; native/config changes also require `npm run doctor` and `npx expo install --check`. Native release-mode builds must be installed and exercised on both emulators. This proves app flows and simulator runtime behavior, not physical headphone/audio/battery reliability.

Physical iOS/Android screen-off sessions with music and podcasts, real calls/headphones/power modes, accessibility checks and independent curriculum/technique review remain separately recorded in the consolidated manual guides. Store signing, account agreements, privacy publication and store declarations remain release gates; merging source does not publish an app.
