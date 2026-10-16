# Workout runtime — pending

MVP gate (spec §7). Record device, OS, build, date, tester, and result for each item.

1. Stage 9 session (40 minutes), phone locked in a pocket, music playing: every cue arrives within 2 seconds of its time, none missing or repeated, and music volume recovers after each cue.
2. Repeat with a podcast: the podcast pauses for each cue and resumes afterwards (iOS); ducks or pauses on Android.
3. Pause, resume, and End from the app (both platforms) and from the notification (Android). Ending records "Ended early"; the session can be started again.
4. Incoming call during a session auto-pauses it ("Paused for a call"); resuming continues where it stopped.
5. iOS with Apple Health permission declined: the live screen shows "Keep the screen on" and the screen does not auto-lock during the session.
6. Force-quit the app mid-session: relaunch records the attempt as "Interrupted" and never credits the unseen time. Android: swiping the app away while the notification is still running reattaches to the live session on relaunch.
7. Wired and Bluetooth headphones, disconnection mid-session, Silent/Focus modes, low-power/battery-saver modes.
8. Battery drain over a 40-minute session.

Agree measurable supported conditions before claiming reliability. Curriculum review is a separate gate.
