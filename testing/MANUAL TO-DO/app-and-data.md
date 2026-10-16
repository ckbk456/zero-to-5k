# App and data — pending

Use physical iPhone and Android devices with compatible Expo Go:

1. Fresh launch shows Running selected, with no fake workout/completion action.
2. Select Race walking and relaunch; confirm persistence. Repeat for Running.
3. Rapid selection and background/foreground changes do not crash or confirm unsaved data.
4. In a disposable test build, induce a database error and check loading/error/retry behavior. Never manipulate a user's real database.
5. Upgrade a test install without clearing data and confirm preservation.
6. Check light/dark mode, large text, small screens, scrolling, safe areas, VoiceOver/TalkBack selected/disabled states, and touch targets.
7. Verify offline use after installation and absence of location/health/notification/account permission prompts.

The icon is a placeholder; visual and native persistence QA have not been performed.
