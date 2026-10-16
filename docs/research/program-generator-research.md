# Deterministic program generator and race-walking preset

Date: 2026-10-16

Status: **research for owner review — not an implemented or clinically validated protocol**

## Recommendation and scope

Use a versioned catalogue of complete sessions, preserve their order, and distribute additional repetitions across the requested calendar. Do not derive training doses from a universal percentage formula. Return an explicit unsupported result when the calendar cannot contain the proposed curriculum. This is a research specification; no application code, tests, builds, dependencies, commits, or external messages were produced.

The fixed audience, time-only completion, running goal of **30 minutes**, race-walking goal of **40 minutes**, and input ranges of **8–24 weeks** and **1–7 sessions per week** are owner decisions, not findings to reopen. [Product contract](../logic/product.md)

Only activity, weeks, and sessions per week are public generator inputs. They cannot establish individual readiness, recovery, technique, or injury risk. A generated plan is a conditional schedule, never evidence that the person can tolerate it. Runtime feedback, repeats, pauses, and curriculum review remain necessary; missing feedback must not mean recovered.

**Evidence labels:** E = empirical research or organizational guidance; C = established published-program convention; P = our proposed software policy; A = arithmetic from linked inputs. Numeric research claims carry external links. Original constants and derived tables link to their policy or catalogue rationale, rather than falsely attributing them to a medical source.

## Evidence that constrains the design

| Finding                                                   | Evidence and limitation                                                                                                                                                                                                                                                                                                                                                                  | Design consequence                                                                                                                                                                                                                            |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C: Published beginner structure                           | NHS specifies **9 weeks**, **3 runs weekly**, intervening rest days, and allows repetition. Its current final run in week **6** is **25 minutes**. [NHS plan](https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/)                                                                                                                        | Preserve the owner's reference, including its explicitly documented **22-minute** variant; do not silently replace it with the NHS version. [Local reference](../design/running-preset-plan.md)                                               |
| E: Warm-up/cool-down guidance                             | AHA recommends **5–10 minutes** for each. [AHA](https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/warm-up-cool-down)                                                                                                                                                                                                                                 | Retain the fixed **5-minute** walking bookends. This is guideline consistency, not proof of injury prevention at that exact dose.                                                                                                             |
| E: Percentage rules are not established injury prevention | In **532** novice runners, a **13-week** program applying a **10%** progression rule did not reduce injuries compared with an **8-week** program: **20.8% versus 20.3%, P=.90**. [Buist et al., abstract](https://pubmed.ncbi.nlm.nih.gov/17940147/)                                                                                                                                     | Do not claim a percentage cap makes a program safe. This result also does not establish that abrupt progression is safe.                                                                                                                      |
| E: Individual-session exposure matters                    | An observational study of **5,205** runners associated distances exceeding the longest run in the previous **30 days** by **more than 10%** with higher overuse-injury rates. Median running experience was **9.5 years**. [Frandsen et al., published paper](https://www.klokeavskade.no/globalassets/publications/brandt-frandsen_2025_how-much-running-is-too-much.....pdf)           | Track individual sessions as well as weekly totals. Distance, elapsed time, activity-only time, and continuous-bout time are different exposures; the study does not validate transferring its cutoff to minutes, beginners, or race walking. |
| E: Health targets are not beginner starting doses         | AHA recommends **150 moderate or 75 vigorous minutes weekly**, with gradual increases. [AHA recommendations](https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/aha-recs-for-physical-activity-in-adults) WHO emphasizes that activity counts even below guideline targets. [WHO](https://www.who.int/news-room/fact-sheets/detail/physical-activity) | Do not force the initial plan to meet public-health totals. Walking recoveries and warm-ups are not automatically vigorous.                                                                                                                   |
| E: Intensity depends on the person                        | CDC distinguishes relative intensity and uses the talk test: moderate effort permits conversation; vigorous effort limits speech to short phrases. [CDC](https://www.cdc.gov/physical-activity-basics/measuring/index.html)                                                                                                                                                              | “Core session” means activity-specific exposure, not a prescription for hard effort. No maximal sessions, speed targets, or mandatory vigorous classification.                                                                                |

The reference exposes why a small universal percentage ceiling is incompatible with exact reproduction: running minutes rise from **27 to 48 per week (+77.8%)**, total session time from **75 to 94.5 (+26%)**, and the longest bout from **8 to 20 minutes (+150%)** at the relevant transitions. These are calculations from the [reference](../design/running-preset-plan.md), not recommended increases for arbitrary sessions.

The existing [generator proposal](../design/program-generator-proposal.md) rejects linear stretching/compression and calls for reviewed stage transitions. The method below preserves complete sessions and only inserts repetitions; it still proposes an unvalidated calendar allocation rule. It requires owner and curriculum review before superseding any part of that proposal.

## P1: Policy basis and recommended parameters

“Hard limit” below means a rejection condition in this proposed software version, **not a biological safety boundary**. The controlling restriction is exact catalogue membership plus allowed transitions. Scalar ceilings catch corrupt or unintended outputs; they do not authorize inventing sessions underneath those ceilings.

Default public selection: the [reference running preset](../design/running-preset-plan.md). Race-walking defaults and all race-specific numbers below come from the original [P4 catalogue](#p4-race-walking-preset). Ordinary walking extras and calendar limits are original proposals justified here.

| Parameter                               | Recommended default                                                           | Hard software limit                                                                                                         | Basis                                                                                                                                                                                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public inputs                           | Running, **9 weeks, 3 slots/week**                                            | Activity enum; finite integers; **8–24 weeks, 1–7 slots/week**                                                              | Owner inputs and [reference](../logic/product.md).                                                                                                                                                                                                 |
| Starting run:walk pattern               | **60 s run / 90 s recovery**, reference repetitions                           | Start at first catalogue node; no starting-stage promotion from calendar preference                                         | C: [reference](../design/running-preset-plan.md). No baseline ability is inferred.                                                                                                                                                                 |
| Starting race-walk:walk pattern         | **30 s technique practice / 90 s recovery**                                   | Exact first race-walking template                                                                                           | P: deliberately brief practice, [P4](#p4-race-walking-preset).                                                                                                                                                                                     |
| Warm-up / cool-down                     | **300 s walking each**                                                        | Exactly one at either end, including easy-walk sessions                                                                     | Owner requirement; consistent with [AHA](https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/warm-up-cool-down).                                                                                                 |
| Interval resolution                     | **30 s** quantum                                                              | Every interval positive, integral, and divisible by **30**                                                                  | P: all source templates fit; avoids fractional cues and rounding drift. [P2](#p2-generation-and-feasibility)                                                                                                                                       |
| Activity-specific frequency             | **min(requested slots, 3)** weekly                                            | At most **3** core sessions in any rolling **7 local dates**                                                                | C/P: NHS frequency convention; applying it as an app cap is our choice. [NHS](https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/)                                                                  |
| Physiologically hard sessions           | **0 deliberately prescribed**                                                 | No speed, hill, sprint, or hard-intensity templates                                                                         | P: this is a duration/skill curriculum. Actual effort may nevertheless feel vigorous. [CDC](https://www.cdc.gov/physical-activity-basics/measuring/index.html)                                                                                     |
| Minimum core recovery                   | At least **1 whole intervening local date** without core training             | Core day indices differ by at least **2**, including week boundaries                                                        | C/P: operationalizes NHS rest-day convention. Not a guarantee of **48 elapsed hours** of recovery. [NHS](https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/), [P2](#p2-generation-and-feasibility) |
| Extra selected slots                    | Optional easy ordinary walk: **5 min main**, plus bookends = **15 min total** | At most **4 extras/week**; no target-activity blocks; no progressive extension                                              | P: small, bounded additions; rest can replace any extra without catch-up. [P2](#p2-generation-and-feasibility)                                                                                                                                     |
| Core session total time                 | Exact template                                                                | Running **40 min**; race walking **50 min** maximum                                                                         | A: fixed goal plus bookends; [running catalogue](#p3-running-catalogue-and-worked-examples), [P4](#p4-race-walking-preset).                                                                                                                        |
| Target-activity time per session        | Exact template                                                                | Running **30 min**; race walking **40 min**, including drills                                                               | A/P: catalogue ceiling; no added “bonus” activity. [P3](#p3-running-catalogue-and-worked-examples), [P4](#p4-race-walking-preset)                                                                                                                  |
| Weekly target-activity increase         | Use the next catalogue nodes; report change                                   | Running at most **+21 min**; race walking at most **+15 min**, versus previous full planned week                            | A/P: catalogue-derived envelopes, not percentage recommendations. See rationale below.                                                                                                                                                             |
| Weekly total time-on-feet increase      | Same catalogue allocation; extras stay constant                               | Running at most **+20 min**; race walking at most **+15 min**, versus previous full planned week                            | A/P: rounded running envelope; includes all bookends/recoveries/extras. See rationale below.                                                                                                                                                       |
| Weekly absolute target exposure         | Exact planned sum                                                             | Running **90 min**; race walking **120 min**                                                                                | A: core cap times activity ceiling. [P3](#p3-running-catalogue-and-worked-examples), [P4](#p4-race-walking-preset)                                                                                                                                 |
| Weekly absolute time on feet            | Exact planned sum                                                             | Running **180 min**; race walking **210 min**, when all extras are taken                                                    | A: core ceilings plus optional extras. These are maxima, not targets. [P3](#p3-running-catalogue-and-worked-examples), [P4](#p4-race-walking-preset)                                                                                               |
| Single-session total increase           | Exact next template; compare with longest recent **core** session             | Running at most **+6.5 min**; race walking **+5 min**                                                                       | P/A: conservative error envelopes from adjacent templates, not clinical cutoffs. Exclude optional short walks from comparator selection.                                                                                                           |
| Single-session target-activity increase | Track separately from total time                                              | Running at most **+7 min**; race walking **+5 min**, versus recent maximum target exposure                                  | A/P: largest adjacent exposure increases in [P3](#p3-running-catalogue-and-worked-examples) and [P4](#p4-race-walking-preset).                                                                                                                     |
| Longest continuous-bout increase        | Running at most **+3 min** normally; race walking **+5 min**                  | Running's exact **F→G** edge permits **+12 min**; all other edges retain normal cap; absolute bout ceiling is activity goal | A/P: explicit exception inherited from the reference, not a generic allowance for large jumps. [P3](#p3-running-catalogue-and-worked-examples)                                                                                                     |
| Recent comparison window                | Previous **30 planned calendar days**, excluding current session              | Missing comparator = unknown; no percentage division by zero                                                                | P: descriptive window inspired by, but not validated by, [Frandsen](https://www.klokeavskade.no/globalassets/publications/brandt-frandsen_2025_how-much-running-is-too-much.....pdf).                                                              |
| Recovery interval taper                 | Preserve complete template                                                    | No independent percentage shortening or deletion                                                                            | C/P: running recovery is deliberately nonmonotonic; race-walking recovery remains **90 s** until its catalogue removes it. [P3](#p3-running-catalogue-and-worked-examples), [P4](#p4-race-walking-preset)                                          |
| Consolidation                           | Repeat current template using allocated extra slots                           | Never skip a reference node or insert unlisted harder content                                                               | P: [P2](#p2-generation-and-feasibility). No evidence-derived mandatory deload frequency was located.                                                                                                                                               |
| Minimum curriculum capacity             | Running **27 core slots**; race walking **48**                                | Also require their reference calendar floors: **9 / 16 weeks**                                                              | P/A: retain every reference exposure; not a proven minimum effective dose. [P2](#p2-generation-and-feasibility)                                                                                                                                    |

Envelope rationale: the running reference's largest adjacent increase in full session duration is **25→31.5 minutes**; target minutes increase **9→16**. Its largest reference-week time increase is **19.5 minutes**, rounded upward to the proposed **20-minute** guard, and target exposure increases **21 minutes**. These values intentionally accommodate the [fixed reference](../design/running-preset-plan.md). They would be poor standalone prescriptions. Race-walking envelopes are arithmetic from [P4](#p4-race-walking-preset).

Compare a session independently against recent maxima of total duration, target duration, and continuous target bout; these maxima may come from different prior sessions. This retains separate dimensions instead of inventing a combined injury-risk score. For the first core session, validate the starting template and absolute ceilings, mark relative change unavailable, and do not interpret the absent history as a tolerated baseline.

The same limits apply to every generated plan; there is no hidden “preset bypass.” The unusual reference **F→G** transition is a named policy edge requiring particular curriculum scrutiny. A reviewer rejecting that edge must revise/version the reference or declare it unsupported; a validator must not quietly ignore the conflict. [Reference transition](../design/running-preset-plan.md)

## P2: Generation and feasibility

### Slots, dates, and the difficult corners

Selected frequency means **scheduled movement opportunities**, comprising core training and explicitly optional easy walks. It must not be presented as the same number of running/race-walking workouts. This is a proposed interpretation of the fixed input, requiring owner approval.

For the calendar rules and tables below, all integers are original scheduling constants or arithmetic from [P1](#p1-policy-basis-and-recommended-parameters). A week has day indices **0–6**. Core slots use **[2,4,6]**, **[2,6]**, or **[6]**, according to core count. Extras use the first required entries of **[0,1,3,5]**. Sort sessions by day. This keeps the final calendar session a core session, and preserves a full intervening date across boundaries. A later date-binding layer may rotate the pattern, but must revalidate spacing; it must not infer elapsed recovery hours from local dates.

| Input corner                         | Result under this proposal                                                | Honest alternative                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **8 weeks × 1/week**                 | Infeasible: **8 core slots < 27** running reference slots                 | An explicitly partial introductory block, or change frequency/duration. No claim that the person's goal is biologically impossible. |
| **8 weeks × 2/week**                 | Infeasible: **16 < 27**                                                   | Prefix example below; a full running schedule needs at least **14 weeks** at this frequency.                                        |
| **8 weeks × 3–7/week**               | Infeasible: core cap gives **24 < 27**                                    | At least **9 weeks** with the running reference. Extra walks do not purchase progression.                                           |
| Any **1/week** within **8–24 weeks** | Unsupported for the goal by either full catalogue                         | Do not silently start later or label a partial block complete.                                                                      |
| Running **2/week**                   | Capacity first becomes sufficient at **14 weeks**                         | This is a proposed sparse schedule, not evidence that the frequency is sufficient for everyone.                                     |
| Race walking **2/week**              | Capacity first becomes sufficient at **24 weeks**                         | Separate technique-readiness review remains necessary.                                                                              |
| **24 weeks × 7/week**                | **3 core + 4 optional ordinary walks**, not daily sport-specific exposure | Recommend core schedule as default; extras may be replaced by rest without penalty.                                                 |

All capacity figures above are arithmetic from the catalogues and [interpolation rule below](#template-index-interpolation), not study results.

Do not adopt **4 hard/core days** as the default. At nominal equal-time starts, a repeating **7-day** cycle cannot provide **48-hour** start separation around **4** core sessions: **4×48 = 192 > 168 hours**. The calendar-date rule likewise cannot accommodate that repeating frequency. This is scheduling arithmetic from [P1](#p1-policy-basis-and-recommended-parameters), not evidence establishing a physiological recovery minimum.

High-frequency extras still add load. The running **7-slot** example begins at **145.5 minutes on feet** if every optional walk is taken and ends at **180**, compared with **85.5** and **120** for its core sessions alone. [Worked arithmetic](#running-24-weeks-with-5-or-7-slots) Calling those extra minutes “easy” does not prove tolerability. Show their optional status and total exposure before selection. A user who cannot tolerate the introductory sessions needs a different entry pathway, not a falsely personalized result from the current inputs.

### Template-index interpolation

This interpolates **positions in a session catalogue**, not physiological capacity or interval lengths. All constants in this algorithm derive from [P1](#p1-policy-basis-and-recommended-parameters), [P3](#p3-running-catalogue-and-worked-examples), or [P4](#p4-race-walking-preset).

Let T be the ordered reference-session list, N its length, c the core frequency, and M = weeks × c. When M ≥ N:

```text
referenceIndex(i, M, N) = floor(i × (N − 1) / (M − 1))
for i = 0 ... M − 1
```

Use integer multiplication/division. The first and last reference nodes are included, and successive indices either repeat or advance to the next node. Identical-looking source sessions retain distinct node identities; they represent prescribed repetitions. When M = N, the catalogue is reproduced exactly.

Additional weeks therefore distribute repetitions through the build-up, followed by maintenance once the goal template is reached. They do not raise the goal or add speed. This simple allocation can repeat a difficult session consecutively on successive core days; readiness feedback must be able to hold or regress it. No claim is made that uniformly spaced repetitions are optimal.

Do not add arbitrary easier weeks to this version: that would require additional reviewed templates and a new allocation policy. Existing decreases in the reference remain intact. User-requested repetitions or missed sessions must extend/replan the remaining calendar rather than compress it. Completed history and an active session snapshot remain immutable.

### Language-agnostic pseudocode

```text
GENERATE_PLAN(input):
  if activity is invalid, numbers are nonfinite/fractional, or input is out of range:
    return INFEASIBLE(reason = "INVALID_INPUT", violations = input errors)
  policy, T := load exact versioned policy and catalogue for input.activity
  c := min(input.sessionsPerWeek, policy.maxCorePerWeek)
  N := length(T); M := input.weeks * c
  if input.weeks < policy.minimumWeeks OR M < N:
    return INFEASIBLE(
      reason = "INSUFFICIENT_CURRICULUM_CAPACITY",
      requiredCoreSlots = N, availableCoreSlots = M,
      minimumWeeksAtRequestedFrequency = max(policy.minimumWeeks, ceil(N / c)),
      alternatives = in-range longer/more-frequent inputs and explicit partial option)

  coreDays, extraDays := choose fixed day pattern for requested frequency
  weeks := empty list
  for w from 0 through input.weeks - 1:
    sessions := empty list
    for coreOrdinal from 0 through c - 1:
      i := w*c + coreOrdinal
      node := floor(i*(N-1)/(M-1))
      main, cues := deep copy T[node]
      sessions.add(templateSession(
        main, coreDays[coreOrdinal], node, cues, context = {input, weekIndex: w}))
    for day in extraDays:
      sessions.add(easyWalkSession(day, optional = true, context = {input, weekIndex: w}))
    weeks.add(sort sessions by day)

  plan := deterministic proposed plan with input, versions, assumptions, weeks
  recompute metrics from intervals; never trust catalogue summary columns
  violations := VALIDATE_PLAN(plan)
  if violations not empty:
    return INFEASIBLE(reason = "POLICY_CONFLICT", violations)
  return plan

TEMPLATE_SESSION(main, day, node, cues, context):
  require nonempty main; all seconds already on policy quantum
  intervals := [walking warmup] + main + [walking cooldown]
  shift each cue's interval index to account for the prepended warmup
  derive stable ID from input, versions, week index, and day index
  return core session with stable reference node, day, shifted cues, intervals

VALIDATE_PLAN(plan):
  collect errors in stable order; unknown version => error, never fallback
  validate input domain, exact week/slot counts, sorted unique days, versions
  validate every interval and bookend; compare core payload/cues to exact catalogue node
  validate easy sessions contain only prescribed ordinary walking and are optional
  recompute metrics, combining adjacent target intervals for continuous-bout totals
  verify core node sequence equals interpolation map; all catalogue nodes are represented
  verify consecutive core dates and rolling calendar-date frequency, including boundaries
  verify per-session absolute limits and recent-window increases
  verify normal longest-bout limit or exact allowed exceptional edge
  verify complete-week absolute totals and changes, counting all optional extras as taken
  verify last calendar session is core and has an uninterrupted target bout equal to goal
  verify no interval before/after a cue is mistaken for a recovery or additional dose
  return errors

PARTIAL_ALTERNATIVE(input):
  do not call a stretched complete plan with insufficient capacity
  take the first M reference nodes in order and place at the core pattern
  use prefix validation: require reference indices 0 ... M-1, not full interpolation
  omit full-plan minimum calendar/capacity, full coverage, and final-goal checks
  retain input, structure, exact templates, dose limits, metrics, and spacing checks
  if any remaining rule fails, do not offer that prefix
  label "introductory block; goal not reached", with maximum planned bout only
  return outside Plan, requiring explicit selection; never substitute silently
```

No runtime AI, random seed, network lookup, wall-clock timestamp, or implicit baseline enters these functions. Creation timestamps belong in an outer persistence record. A saved plan records both curriculum and policy versions so a later policy change cannot silently alter it.

### TypeScript contract sketches

These are design signatures, not compiled implementation. Their numeric constants follow [P1](#p1-policy-basis-and-recommended-parameters); no project code was executed.

```ts
type Activity = 'running' | 'race-walking';
type Input = Readonly<{
  activity: Activity;
  weeks: number; // finite integer, runtime-validated
  sessionsPerWeek: number; // scheduled slots, not all core sessions
}>;
type Interval = Readonly<{
  kind: 'warmup' | 'run' | 'walk' | 'cooldown';
  seconds: number;
}>;
type Cue = Readonly<{
  intervalIndex: number;
  offsetSeconds: number;
  textKey: string;
}>;
type Metrics = Readonly<{
  totalSeconds: number;
  targetSeconds: number;
  recoverySeconds: number; // main-block ordinary walking only
  longestTargetBoutSeconds: number;
}>;
type Session = Readonly<{
  id: string; // derived from input, versions, week and slot
  dayIndex: number;
  role: 'core' | 'easy';
  optional: boolean;
  referenceIndex: number | null; // null only for easy sessions
  intervals: readonly Interval[];
  cues: readonly Cue[];
  metrics: Metrics;
}>;
type Week = Readonly<{
  index: number;
  sessions: readonly Session[];
}>;
type Plan = Readonly<{
  kind: 'plan';
  status: 'proposed';
  input: Input;
  policyVersion: string;
  curriculumVersion: string;
  goalSeconds: number;
  assumptions: readonly string[];
  weeks: readonly Week[];
}>;
type ViolationCode =
  | 'INPUT_DOMAIN'
  | 'UNKNOWN_VERSION'
  | 'SHAPE'
  | 'QUANTIZATION'
  | 'BOOKENDS'
  | 'CATALOGUE_MISMATCH'
  | 'SEQUENCE'
  | 'SPACING'
  | 'FREQUENCY'
  | 'SESSION_LIMIT'
  | 'WEEK_LIMIT'
  | 'RECENT_INCREASE'
  | 'BOUT_INCREASE'
  | 'CUE_RANGE'
  | 'METRICS'
  | 'FINAL_GOAL';
type Violation = Readonly<{
  code: ViolationCode;
  path: string;
  message: string;
  actual?: number;
  limit?: number;
}>;
type Infeasible = Readonly<{
  kind: 'infeasible';
  reason:
    'INVALID_INPUT' | 'INSUFFICIENT_CURRICULUM_CAPACITY' | 'POLICY_CONFLICT';
  explanation: string;
  requiredCoreSlots?: number;
  availableCoreSlots?: number;
  minimumWeeksAtRequestedFrequency?: number;
  alternatives: readonly (
    | { kind: 'change-input'; input: Input }
    | { kind: 'partial-introduction'; explanation: string }
  )[];
  violations: readonly Violation[];
}>;
type Template = Readonly<{
  id: string;
  main: readonly Interval[];
  cues: readonly Cue[]; // indices relative to main; offset when adding warmup
}>;
type SessionContext = Readonly<{
  input: Input;
  weekIndex: number;
}>;
type Policy = Readonly<{
  version: string;
  curriculumVersion: string;
  minimumWeeks: number;
  maxCorePerWeek: number;
  goalSeconds: number;
  quantumSeconds: number;
  minCoreDaySpacing: number;
  recentWindowDays: number;
  easyMainSeconds: number;
  warmupSeconds: number;
  cooldownSeconds: number;
  maxSessionSeconds: number;
  maxWeeklyTargetSeconds: number;
  maxWeeklyTotalSeconds: number;
  maxWeeklyTargetIncreaseSeconds: number;
  maxWeeklyTotalIncreaseSeconds: number;
  maxRecentTotalIncreaseSeconds: number;
  maxRecentTargetIncreaseSeconds: number;
  maxBoutIncreaseSeconds: number;
  exceptionalEdges: readonly {
    fromTemplate: string;
    toTemplate: string;
    maxBoutIncreaseSeconds: number;
  }[];
}>;
declare function generatePlan(input: Input): Plan | Infeasible;
declare function validatePlan(plan: Plan): Violation[];
declare function referenceIndex(
  i: number,
  slots: number,
  nodes: number,
): number;
declare function chooseDays(slotsPerWeek: number): {
  core: readonly number[];
  extra: readonly number[];
};
declare function templateSession(
  template: Template,
  dayIndex: number,
  node: number,
  policy: Policy,
  context: SessionContext,
): Session;
declare function easyWalkSession(
  dayIndex: number,
  policy: Policy,
  context: SessionContext,
): Session; // always optional
declare function summarize(intervals: readonly Interval[]): Metrics;
declare function recentMaxima(
  priorCore: readonly { ordinalDay: number; metrics: Metrics }[],
  currentOrdinalDay: number,
): Metrics | null;
```

The requested interval union cannot distinguish sport walking from recovery walking if both use “walk.” For this sketch, **“run” is the target-activity slot**, interpreted through plan.input.activity; race-walking UI must say “race walk.” Ordinary recovery always uses “walk.” This compatibility choice is explicit technical debt: renaming the internal kind to “active” before implementation would be clearer, but would change the requested shape. Never count all walking as race-walking progress.

Define recentMaxima over prior **core** sessions where ordinalDay is in [currentOrdinalDay − **30**, currentOrdinalDay), taking component maxima independently. This is planned calendar exposure, not the study's device-recorded distance window or proof of actual tolerance. [P1](#p1-policy-basis-and-recommended-parameters) Actual completed history, interruptions, and feedback need a separate execution/replanning contract.

## Property-based invariants to implement later

These assertions derive from [P1](#p1-policy-basis-and-recommended-parameters), [P2](#p2-generation-and-feasibility), and the linked catalogues; they are proposed tests, not passing test evidence.

- All legal integer inputs produce either a structurally valid Plan or a reasoned Infeasible; reject fractional, nonfinite, negative, and out-of-range values and unknown activities.
- Same input and versions produce structurally identical results. No ambient time, locale-dependent ordering, random IDs, network state, or mutation of catalogue/input objects.
- Every Plan has exactly the requested weeks and slots; dates are sorted and unique. Core and optional-easy counts match policy.
- Intervals are positive integer seconds on the **30-second** quantum. There is exactly one **300-second** warm-up first and one **300-second** cool-down last, with no bookends inside the main block.
- Each core main block equals its catalogue node exactly. Interpolation indices start at the initial node, end at the final node, never decrease or skip, and visit every node. Repeats retain source identity.
- **9×3 running** equals the reference including **R22** at the documented disputed session; **16×3 race walking** equals P4. [P3](#p3-running-catalogue-and-worked-examples), [P4](#p4-race-walking-preset)
- No more than **3 core sessions** in a rolling **7-date** window; adjacent core dates differ by at least **2**, including across weeks. Date binding/DST tests belong to the future scheduler.
- All per-session, per-week, and recent-window limits hold with their own units and denominators. Missing history produces no ratio; the initial template still faces absolute limits.
- Recompute totals from intervals. Bookends, ordinary recoveries, and optional walks count toward time on feet; only target intervals count toward target exposure. Neither measure automatically counts as vigorous.
- Cue indices and offsets remain in range; cues add no time. Contiguous target intervals, if ever split by representation, count as a single uninterrupted bout.
- The last calendar session contains an uninterrupted target bout exactly equal to the fixed goal, with no recovery embedded in it. A scheduled final goal is not a completed or technically legal performance.
- “Monotonic-ish” means nondecreasing curriculum position and bounded approved transitions. Do **not** assert monotonically increasing weekly minutes, every session's longest bout, or monotonically decreasing walking recoveries: the reference intentionally violates these.
- Changing only frequency above the core cap leaves the core sequence identical for the same duration and changes only optional walks and their totals.
- Infeasible results never contain a goal-complete Plan. Partial alternatives never masquerade as successful generation.
- Mutation checks should detect an added target interval, shortened recovery, missing bookend, moved adjacent core date, altered template ID, incorrect metric, and removed final goal.

Exhaustive input enumeration is small: **2 activities × 17 lengths × 7 frequencies = 238 combinations**, calculated from [owner ranges](../logic/product.md). Pair exhaustive enumeration with randomized corrupted plans and catalogue golden fixtures; do not rely solely on random input sampling.

## P3: Running catalogue and worked examples

All numeric cells in the running catalogue are copied or calculated from the [local reference](../design/running-preset-plan.md). R = running, W = easy walking; values are minutes. The main block excludes the fixed bookends. The source's proposed **R22** choice is preserved.

| Key | Main block                   | Target minutes | Full session minutes |
| --- | ---------------------------- | -------------: | -------------------: |
| A   | (R1 W1.5) × 7, R1            |              8 |                 28.5 |
| B   | (R1.5 W2) × 5, R1.5          |              9 |                   29 |
| C   | R1.5 W1.5 R3 W3 R1.5 W1.5 R3 |              9 |                   25 |
| D   | R3 W1.5 R5 W2.5 R3 W1.5 R5   |             16 |                 31.5 |
| E   | R5 W3 R5 W3 R5               |             15 |                   31 |
| F   | R8 W5 R8                     |             16 |                   31 |
| G   | R20                          |             20 |                   30 |
| H   | R5 W3 R8 W3 R5               |             18 |                   34 |
| I   | R10 W3 R10                   |             20 |                   33 |
| J   | R22                          |             22 |                   32 |
| K   | R25                          |             25 |                   35 |
| L   | R28                          |             28 |                   38 |
| M   | R30                          |             30 |                   40 |

The ordered reference-node list is A,A,A,B,B,B,C,C,C,D,D,D,E,F,G,H,I,J,K,K,K,L,L,L,M,M,M. Repeated keys still have distinct node indices. **e** denotes the proposed optional W5 main block, full duration **15 minutes**, from [P1](#p1-policy-basis-and-recommended-parameters).

The following tables are **worked outputs of the specified arithmetic**, not executed application output. Every key expands to the exact main block above. Totals include bookends and every offered extra. All numbers derive from this catalogue and [P2 interpolation](#template-index-interpolation).

### Running 9 weeks, 3 slots

Exact reference reproduction. Core days use the P2 pattern; the calendar can later be rotated.

| Week | Core main blocks, in order | Weekly target min | Weekly total min |
| ---- | -------------------------- | ----------------: | ---------------: |
| 1    | A / A / A                  |                24 |             85.5 |
| 2    | B / B / B                  |                27 |               87 |
| 3    | C / C / C                  |                27 |               75 |
| 4    | D / D / D                  |                48 |             94.5 |
| 5    | E / F / G                  |                51 |               92 |
| 6    | H / I / J                  |                60 |               99 |
| 7    | K / K / K                  |                75 |              105 |
| 8    | L / L / L                  |                84 |              114 |
| 9    | M / M / M                  |                90 |              120 |

### Running 8 weeks, 2 slots: Infeasible, with partial alternative

Do not fabricate a goal-reaching output. The following **prefix alternative**, derived from [P2](#p2-generation-and-feasibility), preserves the first **16 reference exposures**. Its final scheduled longest bout is **8 minutes**, while its earlier maximum scheduled bout is **20 minutes**; neither is evidence of completed ability. It does not reach the fixed goal. A full schedule at this frequency first has sufficient capacity at **14 weeks**. [Catalogue arithmetic](#p3-running-catalogue-and-worked-examples)

| Week | Main block 1 | Main block 2 |
| ---- | ------------ | ------------ |
| 1    | A            | A            |
| 2    | A            | B            |
| 3    | B            | B            |
| 4    | C            | C            |
| 5    | C            | D            |
| 6    | D            | D            |
| 7    | E            | F            |
| 8    | G            | H            |

An even gentler introductory alternative would require its own reviewed templates; this prefix is offered to make the policy's limitation concrete, not because truncation has been clinically validated.

### Running 12 weeks, 3 slots

| Week | Core main blocks | Weekly target min | Weekly total min |
| ---- | ---------------- | ----------------: | ---------------: |
| 1    | A / A / A        |                24 |             85.5 |
| 2    | A / A / B        |                25 |               86 |
| 3    | B / B / B        |                27 |               87 |
| 4    | C / C / C        |                27 |               75 |
| 5    | C / D / D        |                41 |               88 |
| 6    | D / D / E        |                47 |               94 |
| 7    | F / G / G        |                56 |               91 |
| 8    | H / I / J        |                60 |               99 |
| 9    | J / K / K        |                72 |              102 |
| 10   | K / K / L        |                78 |              108 |
| 11   | L / L / L        |                84 |              114 |
| 12   | M / M / M        |                90 |              120 |

### Running 16 weeks, 4 slots

Each week is chronologically **e / core 1 / core 2 / core 3**, on days from [P2](#p2-generation-and-feasibility). The extra is optional ordinary walking.

| Week | Core main blocks | Extra main block | Weekly target min | Weekly total min |
| ---- | ---------------- | ---------------- | ----------------: | ---------------: |
| 1    | A / A / A        | e                |                24 |            100.5 |
| 2    | A / A / A        | e                |                24 |            100.5 |
| 3    | B / B / B        | e                |                27 |              102 |
| 4    | B / B / C        | e                |                27 |               98 |
| 5    | C / C / C        | e                |                27 |               90 |
| 6    | C / C / D        | e                |                34 |             96.5 |
| 7    | D / D / D        | e                |                48 |            109.5 |
| 8    | D / E / E        | e                |                46 |            108.5 |
| 9    | F / F / G        | e                |                52 |              107 |
| 10   | G / H / I        | e                |                58 |              112 |
| 11   | I / J / J        | e                |                64 |              112 |
| 12   | K / K / K        | e                |                75 |              120 |
| 13   | K / K / L        | e                |                78 |              123 |
| 14   | L / L / L        | e                |                84 |              129 |
| 15   | L / L / M        | e                |                86 |              131 |
| 16   | M / M / M        | e                |                90 |              135 |

### Running 24 weeks with 5 or 7 slots

The core sequence is identical because extras cannot advance the curriculum. **5-slot** weeks are e / e / core 1 / core 2 / core 3; **7-slot** weeks are e / e / core 1 / e / core 2 / e / core 3. Thus the extra main blocks are respectively **W5 × 2** and **W5 × 4**, each with its own bookends. [P1 and calendar rationale](#p2-generation-and-feasibility)

| Week | Core main blocks for both plans | Weekly target min | Total min, 5 slots | Total min, 7 slots |
| ---- | ------------------------------- | ----------------: | -----------------: | -----------------: |
| 1    | A / A / A                       |                24 |              115.5 |              145.5 |
| 2    | A / A / A                       |                24 |              115.5 |              145.5 |
| 3    | A / A / A                       |                24 |              115.5 |              145.5 |
| 4    | B / B / B                       |                27 |                117 |                147 |
| 5    | B / B / B                       |                27 |                117 |                147 |
| 6    | B / B / C                       |                27 |                113 |                143 |
| 7    | C / C / C                       |                27 |                105 |                135 |
| 8    | C / C / C                       |                27 |                105 |                135 |
| 9    | C / D / D                       |                41 |                118 |                148 |
| 10   | D / D / D                       |                48 |              124.5 |              154.5 |
| 11   | D / D / D                       |                48 |              124.5 |              154.5 |
| 12   | E / E / E                       |                45 |                123 |                153 |
| 13   | F / F / F                       |                48 |                123 |                153 |
| 14   | G / G / H                       |                58 |                124 |                154 |
| 15   | H / H / I                       |                56 |                131 |                161 |
| 16   | I / I / J                       |                62 |                128 |                158 |
| 17   | J / J / K                       |                69 |                129 |                159 |
| 18   | K / K / K                       |                75 |                135 |                165 |
| 19   | K / K / K                       |                75 |                135 |                165 |
| 20   | K / L / L                       |                81 |                141 |                171 |
| 21   | L / L / L                       |                84 |                144 |                174 |
| 22   | L / L / L                       |                84 |                144 |                174 |
| 23   | M / M / M                       |                90 |                150 |                180 |
| 24   | M / M / M                       |                90 |                150 |                180 |

Reaching the goal before the final week produces maintenance, not escalation. None of these target-minute totals establish vigorous minutes, distance, tolerability, or completed sessions.

## Race walking: evidence and technique distinctions

Race walking is a technique-defined gait. World Athletics requires continued contact without a loss visible to the human eye and a straight advancing leg from first contact until that leg reaches the vertical position beneath the body. The rule concerns human visual judging, not a guarantee of contact in every high-speed-camera frame. [World Athletics rule book](https://worldathletics.org/download/download?filename=f9cfe5b0-2767-4eac-a43f-3d4f91b432d9.pdf&urlslug=C1.1+%26+C2.1+-+Competition+Rules+%26+Technical+Rules), [retrieved World Athletics-authored handbook copy](https://abraat.org.br/gestor/app/abraat/repositorio/publicacoes/regras/competitionandtechnicalrules%E2%80%932026editionfev2026.pdf)

**The app cannot judge or certify legal technique.** Timer completion records time spent attempting the activity, not official race-walking legality. Neither GPS nor a self-rating proves compliance. Coaching materials require qualified review; do not cue forceful knee locking or hyperextension.

| Issue                         | Primary evidence                                                                                                                                                                                                                                                                                                                                                                   | Implication                                                                                                                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Different mechanics           | A comparison in **10 competitive racewalkers** found differences including greater ankle dorsiflexion and external knee hyperextension moment. [Cairns et al.](https://pubmed.ncbi.nlm.nih.gov/3747807/)                                                                                                                                                                           | Ordinary-walking endurance is not race-walking readiness. Ground contact does not establish universal knee safety or lower injury risk.                                                                                |
| High sport-specific frequency | A retrospective survey received **400 of 682** questionnaires; injury reporting was highest with **6–7 weekly sessions**, lowest with **3 or fewer**. [Francis et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC1320398/)                                                                                                                                                          | Supports caution, not a causal threshold. Recall, selection, training exposure, and other confounding prevent claiming the proposed cap is medically validated.                                                        |
| Technique drills              | Acute muscle-activation work assessed **6 drills in 10 young trained walkers**; drills differed in activation and some risked encouraging visible flight. [Hanley and Drake](https://worldathletics.org/download/downloadnsa?filename=f4f1b49e-54bc-49b2-b3fa-d33741746a54.pdf&urlslug=effectiveness-of-popular-race-walking-drills)                                               | This is not a trial of beginner learning or injury prevention. Prefer simple same-gait attention cues pending coach review.                                                                                            |
| Shin load                     | Greater ankle dorsiflexion establishes a different mechanical demand, not a quantified novice shin-injury risk. [Cairns](https://pubmed.ncbi.nlm.nih.gov/3747807/) AAOS links shin symptoms with repetitive overload and sudden changes in activity, and discusses alternative causes including stress injury. [AAOS](https://www.orthoinfo.org/diseases--conditions/shin-splints) | Keep practice exposure separate; avoid forced toe lifting/overstriding. Do not label shin pain harmless adaptation or infer a diagnosis. Stop aggravating activity and seek assessment when symptoms persist or recur. |

No validated beginner protocol establishing the fixed continuous race-walking endpoint was located in this targeted search. That is a search limitation, not proof no such program exists. The following curriculum is an original candidate for coach and clinical review.

## P4: Race-walking preset

Proposed default: **16 weeks × 3 nonconsecutive core sessions**, with the same main block on each core day within a week. **Q** means race-walking technique/endurance practice; **W** means ordinary easy walking. Every session adds the fixed **5-minute** ordinary-walk warm-up and **5-minute** cool-down. These are proposed doses, with the goal fixed by the [product contract](../logic/product.md); the physiological literature above does not prescribe this table.

All numeric cells below are **P/A**: original proposed template durations and their sums. The rationale is short initial skill exposure, stable easy recoveries, consolidation of total activity while bouts lengthen, then continuous duration growth. Repeated Q bouts have W1.5 **between bouts only**.

| Week | Main block, each core day | Q min/session | Main min | Full min/session | Weekly Q min |
| ---- | ------------------------- | ------------: | -------: | ---------------: | -----------: |
| 1    | Q0.5 × 6, W1.5 between    |             3 |     10.5 |             20.5 |            9 |
| 2    | Q1 × 6, W1.5 between      |             6 |     13.5 |             23.5 |           18 |
| 3    | Q1.5 × 6, W1.5 between    |             9 |     16.5 |             26.5 |           27 |
| 4    | Q2 × 6, W1.5 between      |            12 |     19.5 |             29.5 |           36 |
| 5    | Q3 × 5, W1.5 between      |            15 |       21 |               31 |           45 |
| 6    | Q4 × 4, W1.5 between      |            16 |     20.5 |             30.5 |           48 |
| 7    | Q5 × 4, W1.5 between      |            20 |     24.5 |             34.5 |           60 |
| 8    | Q7 × 3, W1.5 between      |            21 |       24 |               34 |           63 |
| 9    | Q10 W1.5 Q10 W1.5 Q5      |            25 |       28 |               38 |           75 |
| 10   | Q15 W1.5 Q15              |            30 |     31.5 |             41.5 |           90 |
| 11   | Q20 W1.5 Q10              |            30 |     31.5 |             41.5 |           90 |
| 12   | Q25 W1.5 Q5               |            30 |     31.5 |             41.5 |           90 |
| 13   | Q25                       |            25 |       25 |               35 |           75 |
| 14   | Q30                       |            30 |       30 |               40 |           90 |
| 15   | Q35                       |            35 |       35 |               45 |          105 |
| 16   | Q40                       |            40 |       40 |               50 |          120 |

The table contains **48 distinct session nodes**, with each row expanded to its prescribed repetitions. Maximum adjacent increases are **5 minutes** for the longest bout, target time, and total session duration; maximum weekly increases are **15 minutes** for target time and total duration. These are arithmetic properties of [this proposal](#p4-race-walking-preset), not established safe increments.

Technique-drill specification, also original proposal:

- In the introductory short-bout stages, every Q segment is relaxed technique practice with ordinary walking between segments.
- In longer Q segments, use the opening **30 seconds** for a same-gait focus cue within the existing interval; it adds no time and does not interrupt continuity. [P1 quantum and cue policy](#p1-policy-basis-and-recommended-parameters)
- Rotate comfortable upright posture/relaxed shoulders, smooth heel-to-forefoot progression without deliberate overstriding, natural arm–leg coordination, and the rule's straight advancing leg without forceful locking. Exact demonstrations and wording require coach review.
- A cue is an annotation, not an additional workout interval. If the user switches to ordinary walking, end/reset the current continuous-target-bout accumulator while preserving cumulative target exposure; separated bouts do not earn a continuous race-walking goal.
- Keep effort comfortable enough to attend to technique. Deteriorating form, inability to follow the gait cue, or concerning symptoms calls for an easier bout, repeat, or pause; elapsed calendar time does not establish readiness.

The consolidation region holds **30 Q minutes** while increasing the longest bout from **15 to 25 minutes**, then reduces total exposure to **25 minutes** when removing the remaining recovery. These are intentional tradeoffs in [the proposed table](#p4-race-walking-preset), not evidence that technique acquisition follows this timetable.

Compared with running, change the catalogue, starting practice duration, recovery pattern, goal, duration ceilings, increase envelopes, technique cues, and curriculum floor as specified in [P1](#p1-policy-basis-and-recommended-parameters). Retain the core-frequency cap, separate ordinary-walk extras, deterministic allocation, and actual-versus-planned distinction. Do not multiply the running curve by the ratio of the goals.

## Retrieval record and review gates

Research used official guidance and original studies; search results were used for discovery and explicitly identified indexed-only material. Retrieval was attempted on the document date. No paywalled full text is described as read when only an abstract was available.

| Source                                                                                                                                                                                                                                                                                        | Retrieval result and boundary                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [NHS plan](https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/), AHA warm-up and adult guidance linked above, CDC intensity, WHO fact sheet, AAOS shin guidance                                                                                | Page text retrieved. Organizational guidance does not validate our generated schedules.                                                                                                                                                                                                                                       |
| [Buist](https://pubmed.ncbi.nlm.nih.gov/17940147/) and [Cairns](https://pubmed.ncbi.nlm.nih.gov/3747807/)                                                                                                                                                                                     | PubMed abstracts retrieved; conclusions here do not depend on unseen full-text details.                                                                                                                                                                                                                                       |
| [Frandsen publisher](https://bjsm.bmj.com/content/59/17/1203.long)                                                                                                                                                                                                                            | Publisher denied access. Published full-paper copy at the sports-trauma research centre linked above was retrieved by the research subtask; a later repeat request timed out. Observational findings remain distinct from intervention evidence.                                                                              |
| [Francis](https://pmc.ncbi.nlm.nih.gov/articles/PMC1320398/)                                                                                                                                                                                                                                  | Initial subtask request encountered a challenge; later root retrieval succeeded for the abstract and page links. Scanned full-text pages were not needed for the frequency finding.                                                                                                                                           |
| [ACSM historical walking handout](https://www.acsm.org/docs/default-source/files-for-resource-library/starting-a-walking-program.pdf)                                                                                                                                                         | Direct retrieval returned not found. Its indexed historical percentage advice is not adopted as current ACSM policy.                                                                                                                                                                                                          |
| [WHO guideline publication](https://www.who.int/publications/i/item/9789240015128)                                                                                                                                                                                                            | Landing page retrieved by research subtask; full linked download failed. Report relies on accessible organizational pages for its general-guidance claims.                                                                                                                                                                    |
| [World Athletics current rules listing](https://worldathletics.org/about-iaaf/documents/book-of-rules) and [official handbook](https://worldathletics.org/download/download?filename=acdec6c6-1261-4c7f-96d2-92f712707e99.pdf&urlslug=Competition+and+Technical+Rules+%E2%80%93+2026+Edition) | Official indexed text was available, but direct requests were forbidden. The World Athletics-authored handbook copy hosted by ABRAAT was retrieved; the technical definition was also indexed. Completeness against the latest amendments remains unverified; recheck the official rules before publishing technique content. |
| [Hanley and Drake drill paper](https://worldathletics.org/download/downloadnsa?filename=f4f1b49e-54bc-49b2-b3fa-d33741746a54.pdf&urlslug=effectiveness-of-popular-race-walking-drills)                                                                                                        | Official indexed abstract/text available; direct PDF blocked. No longitudinal training or injury-prevention conclusion is inferred.                                                                                                                                                                                           |

Owner review selects product behavior; qualified curriculum review evaluates the actual session content and transitions. A later implementation needs deterministic checks and the repository's required code gates. Device timing/audio testing, native builds, clinical validation, and release are separate gates; none was performed by this research task.

## Open questions for the product owner

1. Approve “sessions per week” as movement slots with clearly optional ordinary-walk extras above the core cap, or require the UI to call it “activity days”?
2. Accept unsupported results throughout the lowest-frequency range and at short durations under this reference-preserving policy, with explicit partial-block alternatives?
3. Approve template-index repetition as the initial deterministic allocation policy, recognizing that its stretched schedules are not validated personalized prescriptions?
4. Which qualified reviewer will assess the reference's abrupt continuous-bout transition, the proposed software envelopes, and the complete race-walking catalogue before public use?
5. Confirm the already documented local week-six final-run variant before freezing a curriculum version; this report follows the current file without changing it.
6. Should difficult-session repetitions be held for explicit user readiness feedback, and what interruption/return pathway should replace calendar-driven advancement?
7. Should the internal activity interval kind be renamed to “active” before implementation, avoiding the ambiguous use of “run” for race walking?
8. Who will review race-walking demonstrations and verify the latest official rules, and how should the app explain that timed completion does not certify legal technique?
