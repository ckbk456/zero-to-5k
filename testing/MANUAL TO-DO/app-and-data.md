# App and data — pending

Use a physical iPhone (iOS 26+) and Android phone with a release or development build (Expo Go is not supported).

1. Fresh install shows the welcome and safety screen once; "Let's go" opens the stage map at stage 1, session 1.
2. Stage map: 9 stages with states, current session card with interval bar, History and Settings links. Locked stages cannot be started.
3. Preview shows the interval list and total; Start asks for Apple Health workout permission (iOS) or notification permission (Android, 13+) the first time only.
4. Complete a session (use a short test only in a disposable build, never by editing a user's database). The check-in requires effort 0–10 and a pain answer before saving.
5. Effort ≤ 8 and no pain returns to the stage map with the next session. Effort 9–10 or pain shows the recommendation; **Restart stage** returns to session 1 of the same stage (attempt 2); **Keep going** advances, and the finished stage shows "completed ✓", not "cleared ★".
6. After the third session, the stage result screen shows cleared or completed and the next stage unlocks either way. After stage 9, the goal screen appears and stage 9 replays are offered; replays do not change progress.
7. Close the app during a check-in; relaunch shows "Finish your check-in".
8. History lists every attempt with status, time, effort, pain, and decision. Settings toggles persist; Reset progress requires typing RESET and returns to stage 1.
9. Upgrade an install from the previous build without clearing data; preferences and history survive.
10. Light/dark mode, large text, small screens, VoiceOver/TalkBack labels, touch targets.
11. Works offline; no location or account prompts.

No device QA has been performed yet.
