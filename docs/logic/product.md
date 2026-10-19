# Product contract

Accepted direction: 2026-10-16; MVP scope and activity targets updated by the product owner the same day. On 2026-10-18 the product owner made race walking the product. Consult the product owner before changing these outcomes.

Help generally healthy adults build up to a 5 km race walk, three sessions a week. The app counts time, not distance or speed: the continuous time goal is what 5 km takes at a beginner pace. Completing the planned time is a success regardless of distance or pace. The display name is `Zero to 5K` (product owner, 2026-10-18; it replaced the working name `Build to 30`), matching the `zero-to-5k` repository identifier.

| Activity     | Continuous goal | Stands for            | Status                                                      |
| ------------ | --------------- | --------------------- | ----------------------------------------------------------- |
| Race walking | 40 minutes      | About 5 km at 8:00/km | The product (draft curriculum, coach review pending)        |
| Running      | 30 minutes      | About 5 km at 6:00/km | Built and owner-passed, not offered since 2026-10-18 (kept) |

The pace is what the goal time implies, not a requirement: the app never asks for distance or pace, and it does not check that the user covered 5 km. A slower user covers less ground in the goal time, so the app says the plan makes a 5K "within reach" and shows the pace, rather than saying the user race walked 5 km.

The eventual health-oriented target is vigorous aerobic activity. Beginners can start easier; duration and intensity are distinct. Do not count all recovery/warm-up minutes as vigorous, force maximal effort, or position this as diabetes/cardiac rehabilitation.

## Race-walking focus

Race walking is a niche with few beginner apps, so the product is built around it rather than offered next to a crowded running market. Because race walking is a technique, a timer alone is not the product: coach-reviewed technique content (demonstrations, drills, form cues) and a coach-reviewed curriculum are the main work before release.

The running program stays in the code, tested, so it can return as a secondary program; `OFFERED_ACTIVITIES` in `src/domain/activity.ts` controls what the app shows. Its existing history rows are kept.

Open owner decisions: whether to position the app for people with joint problems (this would change the "generally healthy adults" audience, need screening and safety wording, and could make health claims that turn the app into a regulated medical device), and where the knee-claim line sits. Until decided, the audience stays generally healthy adults and the app makes no claim about knees or joint conditions.

## Current app

The MVP experience below is implemented: welcome and safety screen, stage map, session preview, live session driven by the native runtime, post-session check-in with advisory restart, stage results, history, and settings. Device validation of screen-off cues is pending (see the [workout runtime guide](../../testing/MANUAL%20TO-DO/workout-runtime.md)).

On 2026-10-18 the product owner called the running section a pass (owner review, not the device QA gate). Race walking was added the same day, briefly behind a Running / Race walking switch, and then became the only program shown. It now has 12 stages from the [owner-selected progression](../design/race-walking-12-week-plan.md) (2026-10-19), which still needs coach review. Each program has its own stages, progress, history, and reset; the check-in and stage rules are shared.

## MVP experience

The MVP was specified and built for running; since 2026-10-18 the same experience runs the race-walking program.

- A session plays timed cues ("Race walk" / "Walk") with the screen off (phone in a pocket or pouch), alongside the user's music or podcasts. A screen-on-only timer does not meet the MVP.
- The program is a sequence of 12 stages built from the [race-walking progression](../design/race-walking-12-week-plan.md) (originally 9 stages from the [running preset](../design/running-preset-plan.md)). Nothing is locked: the user can preview, start, or mark done any session; the app suggests the next one. After each session the user rates effort (0–10) and reports pain. A rating of 9–10 or pain makes the app recommend retrying the stage; it never blocks advancing. See [MVP spec](../design/mvp-spec.md).
- Individual sessions preview their intervals. Retrying a stage is not failure.
- The app works without an account.

Running and race walking share infrastructure but have separate progression content and progress records. The app times race-walking practice; it cannot judge whether technique meets competition rules, and it says so.

## After MVP

Not planned in detail; listed so MVP decisions do not block them. Priorities and gamification ideas live in the [roadmap](../roadmap.md#after-mvp).

- Scoring (stars for sessions in control; never for higher effort or pace).
- Race-walking technique content (demonstrations, drills, form cues) after coach review.
- Custom program length and "activity days" (2–7 per week) from a deterministic generator; see [generator research](../research/program-generator-research.md).
- Optional sign-in for paid features. Free features keep working without an account.
- AI-assisted (Claude) program generation backed by a curated knowledge base. Generated doses must still pass the deterministic limits.
- Strava, Apple Health, and Android Health Connect integration.
- Distance, GPS, and performance goals. GPS cannot certify legal race-walking technique. Never require a pace to earn completion of a time-based session.

## Delivery direction accepted 2026-10-19

The owner authorized the attached 12-stage curriculum, beginner guidance, scoped implementation/publication/merges and emulator testing. Preserve the generally healthy adult audience and time-only completion. The older 16-stage draft and running plan remain available in historical records without transferring their completions to the new doses.

Keep the experience small: a suggested session, expandable plan, cues over personal audio, quick check-in, milestones and history. A 30-second cue rehearsal creates no training credit. Beginner guidance and a rest-day rhythm are included; coach review is still a release gate, not something arithmetic or emulator tests can replace.

The [12-stage 5K–10K extension](../design/race-walking-5k-to-10k.md) is researched as a proposal only. Its goal would be 80 continuous minutes, with distance dependent on pace. The core app stays offline without an API key; release credentials concern builds/signing/stores, not a training backend.
