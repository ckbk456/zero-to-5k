# Program generator proposal

Date: 2026-10-16. Status: design for discussion; no generator or clinical algorithm implemented. The accepted core outcome is time-based completion, as recorded in `docs/logic/product.md`. Distance and performance goals in this proposal remain optional future scope.

## Product recommendation

Separate **activity** from **goal**. The primary direction is generally healthy adults building toward three vigorous aerobic sessions weekly. An optional sporting outcome can sit on top of that foundation without creating a separate application.

| Choice      | Examples                                                                         | Meaning                                |
| ----------- | -------------------------------------------------------------------------------- | -------------------------------------- |
| Activity    | Run; race walk                                                                   | Technique, interval labels, curriculum |
| Goal        | Regular vigorous fitness; continuous endurance; complete 5 km; improve 5 km time | What completion means                  |
| Schedule    | Preferred weeks, available days, session time limits                             | User constraints and preferences       |
| Entry level | Recent tolerated training and skill                                              | Where progression starts               |

“Fitness” and “5K goal” are clearer potential labels than implying that sport has no health benefit or that a health goal is disease rehabilitation. Names remain undecided.

The public-health reference is 75 vigorous minutes weekly or its moderate-intensity equivalent; three 25-minute vigorous blocks reach that reference. Three 30-minute blocks provide 90. Earlier stages may provide less, and warm-up/recovery minutes must not automatically count as vigorous. [AHA guidance](https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/aha-recs-for-physical-activity-in-adults)

This is a weekly aerobic goal, not a complete health prescription or an obligation to train maximally. Strengthening and activity outside the app are separate considerations. Do not infer intensity solely from the word “racewalking.”

## Can the user select the number of weeks?

Yes, as a preference evaluated against baseline, goal, availability, and reviewed progression policies. Weeks alone are insufficient. Do not stretch or compress a nine-week sequence linearly, multiply load by a fixed percentage, or invent a personalized physiology model.

Ask “When would you like to reach your goal?” after establishing the goal and baseline. Offer a recommended range, then a custom preference. Explain that the plan can change with actual completion and recovery. In fitness mode, the selected duration describes the build-up block; sustainable maintenance follows rather than endless increases.

## Required inputs

- Recent frequency, total activity, longest tolerated session, and longest uninterrupted activity-specific bout; retain the dates and confidence of self-reports.
- Current technique experience. Forty minutes of ordinary walking is not evidence of forty minutes of race walking.
- Desired goal; for a time goal, recent measured distance/time and whether recovery breaks were included.
- Available training days and realistic maximum session durations.
- Preferred program length or date, including whether the date is an external event.
- Relevant restrictions, symptoms, and recent interruptions; no diagnosis inferred from these inputs.
- Optional effort ratings and technique-confidence feedback; track missing information explicitly.

Do not ask every user for detailed disease-management data. Clinical pathways are outside the default scope. Existing restrictions can trigger an appropriate review rather than pretending a generic plan resolves them.

## Proposed deterministic planning process

Use professionally reviewed templates and an explicit stage graph. A language model may help explain a plan, but should not invent workout doses at runtime.

1. Validate inputs and assess whether evidence is sufficient for an entry stage. If not, propose a tolerable familiarization/baseline stage rather than an all-out assessment.
2. Select the activity and goal curriculum. Keep technique readiness separate from aerobic readiness.
3. Build eligible stage transitions under the current reviewed policy. Stages can advance, repeat, consolidate, or regress; a calendar change is not an advancement trigger.
4. Allocate sessions to available dates while preserving session limits and recovery rules. Treat weeks as containers, not biological readiness units.
5. Use extra weeks for repetition, technique practice, consolidation, or maintenance. Do not fill them with unlimited load growth.
6. For a shorter request, check whether existing demonstrated ability justifies a later entry point. Do not eliminate necessary adaptation merely to meet a date.
7. If constraints cannot be satisfied, return alternatives: a later target, a smaller milestone by that date, or maintenance. State that the desired result cannot be responsibly promised under the current policy.
8. Show the proposed plan, assumptions, and plain-language reasons for progression. Store the user's selected plan and policy version.
9. After actual sessions, update only future sessions using completion, effort, recovery, and technique feedback. Retain history and explain changed dates.

An implementation could search a small directed graph of reviewed session templates, minimizing deviation from the requested date and unnecessary changes. Date preference must never override eligibility constraints. A constraint-satisfying plan is not proof that it is medically safe or effective.

## What to track instead of a single workload score

| Dimension                                         | Why it matters                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| Total weekly time on feet                         | Accumulated exposure                                              |
| Activity-specific minutes                         | Running/race-walking exposure differs from easy recovery          |
| Longest session                                   | Detect large individual-session increases                         |
| Longest continuous bout                           | Two eight-minute bouts differ from twenty uninterrupted minutes   |
| Recovery duration and spacing                     | Less recovery can increase difficulty without more active minutes |
| Effort and vigorous minutes                       | Same duration can impose different demand                         |
| Technique difficulty                              | Aerobic fitness does not establish gait proficiency               |
| Surface, elevation, interruptions, other activity | Context can change session demands                                |

An optional duration-times-effort summary can describe training, but must not be presented as a validated injury-risk score. Do not add an acute:chronic workload ratio “safe zone” or a universal 20% progression ceiling from the current evidence. Numerical policies need their own evidence notes and review.

## Adaptation rules to review before implementation

- Successful completion is necessary context, not automatic permission for a harder next session.
- A difficult session can be repeated or shortened; preserve rest and do not punish repetition.
- Symptoms or deteriorating technique can trigger reduction, pausing, or appropriate assessment. Lack of symptoms is not a guarantee against injury.
- Missing feedback must not be interpreted as symptom-free recovery.
- Missed sessions do not create catch-up debt. Reassess after longer gaps rather than stacking sessions.
- Do not simultaneously force increases in speed, duration, and technical difficulty to recover a target date.
- Once a sustainable fitness goal is achieved, maintain it unless the user chooses a new objective.
- Switching activity retains history but does not automatically transfer skill/readiness. An active session retains its original definition.

## Example decisions, not generated prescriptions

| Situation                                                   | Intended response                                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| New walker asks for vigorous 5 km sessions in four weeks    | Assess baseline; offer an introductory milestone or later date if the reviewed progression cannot fit         |
| Consistent 40-minute racewalker requests an eight-week plan | Verify recent distance, effort, recovery, and technique; consider later entry, not automatic beginner restart |
| User extends an eight-week preference to twelve             | Add consolidation/repetition and preserve attainable session demands                                          |
| User repeatedly misses sessions                             | Replan dates without compressing the remaining workload                                                       |
| User reaches three sustainable vigorous sessions weekly     | Offer maintenance, with optional distance/time goals                                                          |
| User wants 5 km in 40–45 minutes                            | Treat 8:00–9:00 min/km as an optional performance objective, not the default health criterion                 |

## Plan output and auditability

Save plan ID/version, curriculum version, policy version, creation date, baseline observations, activity, goal, preferred and proposed dates, session templates, progression explanations, assumptions, and unresolved inputs. Session records distinguish planned from actual activity and estimated from measured distance.

Keep three statuses separate: proposed schedule, completed sessions, and achieved outcome. An elapsed date is not a completed workout. A 30-minute activity is not proof of 5 km. A GPS record is not proof of legal race-walking technique.

## Verification proposed for future implementation

These are acceptance criteria, not tests already run:

- Deterministic results for identical inputs and policy versions.
- Interval totals and recovery/warm-up/cool-down accounting remain internally consistent.
- No unsupported entry-stage promotion, silent date compression, or automatic catch-up sessions.
- Feasible and infeasible schedule cases return explainable outcomes.
- Zero/unknown baselines avoid percentage division and false precision.
- Date/time-zone changes and rest scheduling preserve intended local training dates.
- Replanning preserves completed history and active-session snapshots.
- Health-minute accounting distinguishes effort categories and unknown intensity.
- Distance milestones retain measurement provenance; pace goals specify how pauses are counted.
- Coach/clinical review covers the actual policy versions and templates before public use.

## Open decisions

1. Launch with vigorous fitness only, or also measured 5 km and performance goals?
2. Is a race-walking technique curriculum essential at launch, and who reviews it?
3. What entry observations and progression policies are acceptable?
4. Which program lengths can be supported without false precision?
5. How should the app handle an external event date that current progression cannot accommodate?
6. Which iOS background mechanism and minimum OS pass actual device validation?

Research sources and limitations are in [the evidence review](../research/evidence-and-training.md); platform constraints are in [technical feasibility](../research/technical-feasibility.md).
