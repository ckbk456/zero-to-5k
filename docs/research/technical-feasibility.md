# Mobile technical feasibility

Date: 2026-10-16. Status: background-workout research proposal. A shared Expo UI and SQLite preference scaffold now exists; workout execution and device validation have not been implemented. Current behavior is described in `docs/logic/architecture.md`.

## Proposed architecture

Use React Native with Expo development builds for common UI and local data, with Swift and Kotlin modules owning workout execution. The shared Expo stack is selected; native workout execution remains provisional until locked-screen cue delivery is demonstrated. Expo supports this native extension model. Flutter is also possible but faces the same platform restrictions; fully native applications duplicate more UI work. [Expo Modules](https://docs.expo.dev/modules/overview/)

The same runtime can execute running, race-walking, fitness, and distance programs. Keep the activity, goal, plan version, and progress distinct. A week contains individual sessions; starting a session must not start a whole week. A mode change must not reinterpret an ongoing workout.

Store versioned plan definitions, a snapshot of each started session, and actual session history locally. No server, account, music-service integration, or runtime language-model generation is required for the core product. Bundle short cue recordings for offline use.

## Timing and recovery

The native runtime owns elapsed time, transitions, pauses, cue state, and audio interruptions. The UI observes it. Derive remaining time from monotonic elapsed time and accumulated pauses rather than counting JavaScript ticks.

Persist enough state to detect interrupted sessions, reconcile elapsed time, and explain recovery. A monotonic clock cannot blindly be reused across device reboot; detect a new boot/time context and require an explicit recovery decision. Never invent completed exercise while the app was unavailable. Deduplicate cues and do not replay obsolete transitions in a burst.

Explicit interruption policy remains to be selected: which events pause the workout, which only suppress a cue, and how resumption is communicated. An actual phone call, headphone disconnect, audio-focus denial, app crash, and user force-quit are distinct events.

## iOS

Ordinary background apps are suspended. Neither a JavaScript timer nor an ordinary native timer guarantees execution at an arbitrary deadline while suspended. Live Activities display information; they are not general-purpose interval schedulers. [Apple timer guidance](https://developer.apple.com/forums/thread/132078)

AVAudioSession can temporarily lower competing audio during a cue. Activate briefly and restore the other player's audio afterward. Podcast behavior can differ from music. Audio configuration does not itself guarantee that the app wakes after a long silent interval. [Apple ducking options](https://developer.apple.com/documentation/avfaudio/avaudiosession/categoryoptions-swift.struct/duckothers)

iOS 26 introduced phone-only workout-session support with locked-screen interaction and recovery. The technical researcher inspected Apple's documentation and sample in memory: the sample targeted iOS 26, used HealthKit/Siri entitlements, and declared a processing background mode. It did not demonstrate arbitrary spoken interval scheduling. This is a candidate to test, not a verified execution guarantee. Do not transfer watchOS workout-processing guarantees to iPhone. [Apple sample](https://developer.apple.com/documentation/healthkit/building-a-workout-app-for-iphone-and-ipad), [WWDC25](https://developer.apple.com/videos/play/wwdc2025/322/)

Local notifications can be scheduled ahead and updated on pause/resume, but permissions, Focus, sound settings, and routing constrain the experience. Notification delivery is not interchangeable with finely controlled audio coaching. [Apple notifications](https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app)

Do not depend on an inaudible loop solely to prevent suspension or require GPS merely to keep a timer alive. A genuine ongoing audio guide or actual route tracking must be evaluated as its real product feature. Minimum supported iOS version remains unresolved.

## Android

Start a native foreground service from the visible Start action, with an ongoing notification and pause/resume/stop controls. The service type must match the actual audio, health, or location functionality and its permissions. Avoid unnecessary sensor permissions simply to qualify for a service type. [Android service types](https://developer.android.com/develop/background-work/services/fgs/service-types)

Request transient audio focus for a cue, handle denied/delayed focus and calls, then release it. Other apps can duck or pause. Android's requirements vary by target version; Android 15+ restricts focus requests to foreground applications or qualifying foreground services. [Android audio focus](https://developer.android.com/media/optimize/audio-focus)

Use elapsed-realtime deadlines. A foreground service does not by itself ensure CPU wakefulness; evaluate minimal active-workout wake-lock use and deterministic release. Exact alarms should not be the default for every short interval. [SystemClock](https://developer.android.com/reference/android/os/SystemClock), [wake locks](https://developer.android.com/develop/background-work/background-tasks/awake/wakelock)

## Expo limitations to verify against the selected version

The researched Expo audio documentation couples sustained Android background playback to lock-screen controls, whose exclusive audio configuration conflicts with other-player coexistence. Do not promise the required behavior from expo-audio configuration alone; verify the pinned release during implementation. [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/)

Deferred background tasks are unsuitable for second-level interval cues. [Expo BackgroundTask](https://docs.expo.dev/versions/latest/sdk/background-task/)

## Optional distance

Time-based sessions must work without location access and indoors. For distance milestones, support a measured route/manual entry or clearly labelled GPS estimates. Handle poor accuracy and missing coverage without manufacturing a 5 km completion. Distinguish active elapsed time, total elapsed time, and pauses for performance goals. Do not certify competition-legal technique using GPS.

## Proposed implementation gate

Before building the complete application, validate a small session containing a warm-up, short intervals, a long silent gap, and cool-down on real iPhone, Pixel, and Samsung hardware.

- Test 60–90-minute locked-screen sessions, launched normally without a debugger.
- Include music, podcasts, no competing audio, offline use, headphones, and Bluetooth disconnects.
- Include phone calls, voice assistants, focus denial, low-power modes, and manufacturer battery restrictions.
- Verify pause/resume/stop, no stale notifications, no duplicate cues, and external volume restoration.
- Measure cue lateness and battery use. A proposed approximately one-second cue target is a test criterion, not an OS guarantee.
- Separate normal background operation, system termination/crash recovery, and explicit user force-stop.
- Include the minimum and current supported OS versions, with and without HealthKit/location/notification permissions as applicable.

Do not represent this research as successful validation. Reliable iPhone background cue delivery remains the principal technical uncertainty. Notification-only degradation should be explained honestly if it is offered.
