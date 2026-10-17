# App and data — pending

Use a physical iPhone (iOS 26+) and Android phone with a release or development build (Expo Go is not supported).

1. Fresh install shows the welcome and safety screen once; "Let's go" opens the stage map at stage 1, session 1.
2. Stage map: a 9-stage picker with states (done stages filled, stages in progress underlined), the picked stage panel with tip, minute-labelled interval bar, and 3 sessions, History and Settings links. Any stage and session can be opened.
3. Preview shows the minute-labelled bar, total, and interval list. A stage ahead of the suggestion shows a caution. Mark as done asks for confirmation, records the session without a rating, and shows it as done; History shows "Marked done". Start Start asks for Apple Health workout permission (iOS) or notification permission (Android, 13+) the first time only.
4. Complete a session (use a short test only in a disposable build, never by editing a user's database). The check-in requires effort 0–10 and a pain answer before saving.
5. Effort ≤ 8 and no pain returns to the stage map. Effort 9–10 or pain shows the recommendation; **Restart stage** clears that stage's done sessions (attempt 2); **Keep going** keeps the session done, and the finished stage shows "Completed", not "Cleared".
6. The session that finishes a stage shows the stage result (cleared or completed); running a done session again does not, unless it turns the stage from completed to cleared. After stage 9 the goal screen appears.
7. Close the app during a check-in; relaunch shows "How did your last session go?".
8. History lists every attempt with status, time, effort, pain, and decision. Settings toggles persist; Reset progress requires typing RESET and returns to stage 1.
9. Upgrade an install from the previous build without clearing data; preferences and history survive.
10. Blue theme in light and dark mode (text and interval labels readable on the blue stage panel), large text, small screens, VoiceOver/TalkBack labels, touch targets.
11. Works offline; no location or account prompts.

No device QA has been performed yet.
