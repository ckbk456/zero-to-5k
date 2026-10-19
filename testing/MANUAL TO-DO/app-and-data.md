# App and data

Record device/build/date/steps/actual result for every performed check. Emulator evidence is separate from physical device acceptance. Never clear existing user data to simplify a test.

1. Fresh install: compact welcome describes twelve stages and 40 minutes, with conditional 5K pace reference and iOS screen-off support. Start is visible at normal phone/text size; large text scrolls without clipping. Optional Learn opens the basics and returns without completing onboarding. Complete onboarding once; relaunch bypasses it.
2. Home: twelve stage stops in two rows of six. All can be selected; suggested stage opens by default. Each has three expandable sessions, race-walking minutes and overall duration. Stage1 is 8 × 1 minute with 90-second breaks (28:30 overall); stage12 session1 is 51:30 overall, session3 is 50:00 overall with 40 continuous minutes.
3. Preview: Start is above the full interval list. Choosing ahead within stage5 or later warns about order. Mark as done confirms, persists, contributes to progress, and records no measured time. No reward infers distance or continuous ability from manual completion.
4. Native session: Start, pause, resume, end with confirmation; early endings appear in History and do not complete a session. Full sessions lead to an effort0–10/pain check-in.
5. Check-in: effort≤8/no pain continues;9–10 or pain offers rest/repeat. Retry preserves already-saved answers after persistence/navigation failure. Reopening a fully rated session offers Continue, not a new rating. Restart resets that stage's progress, not history.
6. Stage results: completed and cleared wording remains truthful for manual entries, pain reports and recorded ratings. Invalid result routes show an in-progress message.
7. History: switch among current12-stage, earlier16-stage and running records; counts/times belong to each exact version. Old completions never credit new doses. An old timed session can finish its own check-in and result route.
8. Upgrade over previous build: migration5 preserves rows, preferences and id sequence. The12-stage content needs no further schema change.
9. Settings: sound/vibration persist; long labels fit. Typed RESET deletes current-v2 history only; previous versions remain. Avoid exercising deletion against existing user records—use a disposable QA simulator for destructive reset checks.
10. Cue rehearsal: Settings/preview/guide launch30 seconds, words Walk/Race walk/Walk/Done. No training row is written. Leaving or immediately starting a workout never lets rehearsal cleanup reset it. Sound-off/vibration settings are respected.
11. Guide: text available offline; official-rules link is explicit. No claim that the timer judges legal gait or protects knees.
12. Small screens, large text, light/dark, VoiceOver/TalkBack focus, comfortable touch targets, offline use, and error/retry paths. Loading failures should show a retry/error rather than an endless spinner.

## Evidence

To be filled with dated delivery evidence after native builds and app interaction. Host tests alone do not mark these passed.
