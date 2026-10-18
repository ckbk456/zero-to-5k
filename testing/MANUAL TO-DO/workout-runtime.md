# Workout runtime — pending

MVP gate (spec §7). Record device, OS, build, date, tester, and result for each item.

1. Race-walking stage 14 session (40 minutes), phone locked in a pocket, music playing: every cue arrives within 2 seconds of its time, none missing or repeated, and music volume recovers after each cue.
2. Repeat with a podcast: the podcast pauses for each cue and resumes afterwards (iOS); ducks or pauses on Android.
3. Pause, resume, and End from the app (both platforms) and from the notification (Android). Ending records "Ended early"; the session can be started again.
4. Incoming call during a session auto-pauses it ("Paused for a call"); resuming continues where it stopped.
5. iOS with Apple Health permission declined: the live screen shows "Keep the screen on" and the screen does not auto-lock during the session.
6. Force-quit the app mid-session: relaunch records the attempt as "Interrupted" and never credits the unseen time. Android: swiping the app away while the notification is still running reattaches to the live session on relaunch.
7. Wired and Bluetooth headphones, disconnection mid-session, Silent/Focus modes, low-power/battery-saver modes.
8. Battery drain over a 40-minute session.
9. A stage 1 session speaks "Race walk" and "Walk" after each chime; a stage 16 session (50 minutes) meets item 1's timing and item 8's battery check.

Agree measurable supported conditions before claiming reliability. Curriculum review is a separate gate.

## Evidence log

Emulator runs are development evidence, not physical-device QA; they cannot show real audio output, ducking of other apps, or battery behavior.

| Date       | Build                               | Target                           | Check                                                                    | Result                                                                                                                                                                     |
| ---------- | ----------------------------------- | -------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-16 | `758e23f` release APK (spoken cues) | Pixel 9 emulator, Android API 36 | Item 1 timing: stage 1 session (28:30) with the screen asleep throughout | All 18 cues requested audio focus within 0.4 s of their planned times (from `dumpsys audio`); foreground service and wake lock released at the end; check-in shown on wake |
| 2026-10-16 | same                                | same                             | Item 4: emulated incoming call                                           | Session auto-paused ("Paused for a call")                                                                                                                                  |
| 2026-10-16 | same                                | same                             | Item 3: End from the app                                                 | Recorded "Ended early · 6:19"; service stopped                                                                                                                             |
| 2026-10-17 | `1c18307` release APK (chime cues)  | same                             | Cue playback                                                             | Chime (MediaPlayer, ~0.86 s) then word; audio focus held 1.5 s and released                                                                                                |
| 2026-10-17 | `1c18307`                           | iPhone 17 simulator, iOS 27.1    | Build                                                                    | Debug build succeeded; chime resource bundle present. Not run on a device: signing blocked until the Apple Developer Program License Agreement is accepted                 |
