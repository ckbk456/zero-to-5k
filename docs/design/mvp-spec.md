# MVP spec and scope

Date: 2026-10-16. Status: **draft for product-owner review — do not build until approved.** Items marked _default_ were chosen by the agent and are open to change; everything else records owner decisions from 2026-10-16.

## 1. Goal

A beginner runner goes from zero to 30 minutes of continuous running by playing 9 stages of timed run/walk sessions. Sessions work with the phone in a pocket and the screen off, alongside the user's own music or podcasts. Completion is time-based; distance and pace are never required.

## 2. Scope

### In the MVP

| Area            | Included                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Platforms       | iPhone and Android phones, portrait, English, light/dark following the system                               |
| Activity        | Running only                                                                                                |
| Program         | 9 fixed stages from the [running preset plan](running-preset-plan.md)                                       |
| Session runtime | Native timer and cues that keep working with the screen off and alongside other audio                       |
| Progression     | Effort (0–10) and pain check after each session; advisory retry recommendation; never blocks                |
| Screens         | First launch, stage map, session preview, live session, post-session check, stage result, history, settings |
| Data            | Local SQLite only; no account, no network, no analytics                                                     |

### Not in the MVP

Recorded in the [roadmap](../roadmap.md#after-mvp): race walking; custom program length, activity days, and the generator; picking any session to replay; scoring/stars; streaks and badges; accounts and payments; AI plan generation; Strava/Apple Health/Health Connect; heart rate, GPS, distance, and pace; watch apps; reminders/notifications outside a session; leaderboards; localization; tablets and web.

## 3. Program and progression

### Stages

- Stage _n_ is week _n_ of the [running preset plan](running-preset-plan.md): 3 sessions played in order. Stages 5 and 6 have three different sessions; the others repeat one session three times.
- Every session: 5-minute walking warm-up, the stage's run/walk intervals, 5-minute walking cool-down.
- Stage states: **locked**, **current**, **completed** (all 3 sessions done, but at least one recommendation was declined), **cleared** (all 3 sessions done with effort ≤ 8 and no pain).
- Only the current stage's next session can be started. There is no calendar; rest days are advised in copy (NHS-style), not enforced.

### After each completed session

1. **Effort (required):** 0–10 picker (Borg CR10) with a word and talk-test hint per level:

   | Rating | Label           | Talk test                      |
   | ------ | --------------- | ------------------------------ |
   | 0–2    | Very easy       | Could sing                     |
   | 3–4    | Easy / moderate | Talk in full sentences         |
   | 5–6    | Hard            | Talk in sentences, some effort |
   | 7–8    | Very hard       | Only short phrases             |
   | 9      | Extremely hard  | A word or two                  |
   | 10     | Maximal         | Cannot talk                    |

2. **Pain (required):** "Any pain during or after this session?" Yes / No.
3. **Recommendation (advisory):**
   - Rating ≤ 8 and no pain: continue normally.
   - Rating 9–10: "That was near your limit. We recommend restarting this stage." Buttons: **Restart stage** (primary) / **Keep going**.
   - Pain: "Rest before your next session. If pain persists or is sharp, get it checked." Same two buttons.
   - **Restart stage** begins a new attempt at session 1 of the current stage. **Keep going** continues to the next session; the stage can then end as completed, not cleared.
4. After the third session: stage result screen (cleared or completed), then the next stage unlocks either way.
5. Completing stage 9 shows a goal-reached screen. The user can then replay stage 9 sessions; replays are recorded but change nothing.

### Session ended early

- _Default:_ an ended-early session is not complete, gets no rating, and does not fail the attempt; the same session is offered next.

## 4. Session runtime

Owned by a native module (Swift/Kotlin); the JavaScript UI only displays its state. Validated in roadmap M1.

- **Timing:** elapsed time from a monotonic clock minus paused time; never by counting UI ticks.
- **Cues:** at every interval change, a spoken cue ("Run for 3 minutes", "Walk for 90 seconds", "Warm-up: walk for 5 minutes", "Cool-down", "Session complete") plus a vibration. Also "Halfway" and "One minute left" during runs of 5 minutes or longer. _Default:_ system text-to-speech, so no recorded audio is needed.
- **Other audio:** other apps' audio is lowered briefly for each cue, then restored. The app never plays continuous sound of its own.
- **Controls:** Pause/Resume and End (with confirmation). Android: an ongoing notification shows the current interval and remaining time, with Pause/Resume and End. iOS: in-app controls only (_default_; lock-screen controls deferred).
- **Interruptions** (_defaults_):
  - Phone call: auto-pause silently; the user resumes manually ("Resuming" is spoken). Other apps' audio does not pause the session.
  - Headphones disconnected: keep running; cues continue on the current output.
  - App killed or phone restarted mid-session: on next launch, show "Your last session was interrupted", record it as ended early, and offer to start it again. Unseen time is never credited.
- **Live screen:** current interval (Run/Walk) and its countdown, total remaining, a bar of all intervals, Pause/End. The screen may sleep at any time without affecting the session.

## 5. Screens

1. **First launch:** what the app does; who it is for (generally healthy adults); a safety note (stop for chest pain, dizziness, or severe breathlessness; check with a doctor if unsure); Start.
2. **Stage map (home):** the 9 stages with state, the current stage's 3 sessions, and a button to start the next one.
3. **Session preview:** interval bar and list, total duration, short stage tip, Start. Asks for notification permission on Android, and for Apple Health workout permission on iOS, the first time.
4. **Live session:** see §4.
5. **Post-session check:** effort, pain, recommendation (§3).
6. **Stage result:** cleared or completed, next stage unlocked; goal-reached screen after stage 9.
7. **History:** list of sessions with date, stage/session, status, effort, and pain.
8. **Settings:** vibration on/off, spoken cues on/off, reset progress (typed confirmation; deletes history), about/safety text.

The existing activity picker is removed from the UI; the stored preference stays as running.

## 6. Data

- **Plan:** bundled TypeScript data, version `running-v1`: stages → sessions → intervals `{ kind: 'warmup' | 'active' | 'walk' | 'cooldown', seconds }`.
- **Migration 2 (append-only):** `session_attempts` table: id, plan version, stage, session index, stage attempt number, started at, ended at, active seconds, status (`completed` | `ended_early` | `interrupted`), effort (0–10, completed only), pain (completed only), decision (`continue` | `restart`, only when recommended).
- Current stage, attempt, and stage states are derived from history. History rows are never edited after the session ends, except to add the post-session answers once. Reset deletes all rows.

## 7. Acceptance criteria

- A full stage 9 session (40 minutes) on a physical iPhone and Android phone with the screen off and music playing delivers every cue within 2 seconds of its time, with no missed or duplicate cues, and the music recovers its volume after each cue.
- Pause, resume, and end work from the app (both platforms) and from the notification (Android).
- Progression logic has unit tests for clearing, both recommendation triggers, Keep going, Restart stage, ended-early sessions, interrupted sessions, and stage 9 replays.
- The plan data equals the [running preset plan](running-preset-plan.md) (tested).
- The app works in airplane mode and never asks for location or account permissions. On iOS it asks only for permission to save workouts to Apple Health, because an Apple Health workout session (iOS 26+) is the supported way to keep running with the screen locked; it reads and writes no health data. If declined, or below iOS 26, the screen stays on during sessions and the app says so.
- `npm run check` and `npm run export:mobile` pass; native development builds install on both test phones.

## 8. Open questions for review

1. Is restarting a stage from session 1 correct, or should a restart repeat only the hard session?
2. Spoken cue wording and voice: system text-to-speech acceptable for the MVP?
3. Interruption defaults in §4: acceptable?
4. Minimum OS versions: the app installs on iOS 16.4+ and Android 7+ (Expo SDK 57 defaults); screen-off sessions need iOS 26+.
5. App name: keep "Build to 30"?
