# SMOKE LAB v14 — Lifecycle Scenario Matrix

Version: 0.14.0

## Why this version exists
v14 is a state-machine hardening release. The goal is not to add another behavioral feature, but to make Journey, goal modes, Quit/Recovery, experiments and Maintenance agree when state arrives out of order, is restored from backup, or changes across modes.

## New: JourneyLifecycleEngine
A single dependency-free source of truth now defines:
- valid/unique Journey completion days,
- the first chronologically open day,
- true Journey completion (all 30 days, not merely a Day-30 flag),
- canonical phase and phase label,
- conservative recovery of an existing completion timestamp,
- lifecycle consistency issue codes for QA.

### Bug fixed: false Day-30 completion
Previously, a damaged/restored state containing `completedDays: [1, 30]` could be interpreted as completed because Day 30 existed. That could activate Maintenance while Days 2–29 were still missing.

Now:
- the Journey is complete only when all 30 unique days are present;
- a false `journeyCompletedAt` is removed by deterministic integrity repair;
- the app resumes at the first missing chronological day;
- Maintenance uses the same strict completion rule.

### Bug fixed: getting stuck after an out-of-order completion
If a restored state contained Days 1 and 3 as completed and the user then completed Day 2, the repository used to advance to Day 3 even though Day 3 was already complete.

Now completion advances to the first genuinely open day (Day 4 in that example).

## New: GoalTransitionEngine
Goal changes no longer mean only changing the profile string.

Policy:
- behavioral logs, Journey, experiments and learned protection plans are preserved;
- leaving Quit mode suspends quit support rather than deleting it;
- returning to Quit mode reactivates support;
- a still-future quit date can be kept;
- a quit date already in the past is not silently reactivated after a period in another goal mode;
- historical protection plans remain available.

This prevents old cigarettes from suddenly becoming unresolved post-quit recovery events when a user returns to Quit mode months/days later.

The goal selector now shows a short accessible status message explaining what happened to the quit plan.

## Quit-support consistency
- `QuitRecoveryEngine.status()` treats suspended quit support as not active.
- Goal orchestration only promotes quit protection when quit support is enabled.

## New: LifecycleReleaseGateEngine
Internal QA-only invariant audit. It is not a user score and has no clinical meaning.

Blocking examples:
- Journey day does not match the first open chronological day;
- completion marker exists without all 30 days;
- more than one active personal experiment;
- experiment attempts reference missing craving events;
- recovery references a missing smoking event;
- duplicate high-risk protection signatures.

Safe but unusual historical state (for example a later completed day with an earlier gap) is surfaced as a warning rather than treated as a runtime blocker when the current Journey day is canonical.

## v14 scenario matrix
The new suite covers 25 grouped lifecycle scenarios/invariants, including:
- corrupted Day-30 state;
- first-open-day recovery;
- out-of-order Journey completion;
- final Day-30 completion;
- Quit → Reduce suspension;
- Reduce/Pattern → Quit reactivation;
- stale past quit dates;
- future quit dates;
- Pattern / Reduce / Quit orchestration;
- active experiments;
- quit-day protection;
- post-quit recovery;
- resolved recovery;
- Recovery vs active experiment priority;
- Maintenance after real 30-day completion;
- Quit protection vs Maintenance;
- stale quit plan ignored outside Quit mode;
- suspended quit plan not allowed to activate protection;
- pre/post deterministic integrity-release-gate checks.

## Validation
All 14 dependency-free behavior/integration test suites pass.
The complete dependency-free TypeScript service/storage/test graph compiles with `tsc`.
All project TS/TSX files are syntax-scanned using TypeScript transpilation.

A full Vite/React production build still requires installed external npm dependencies and remains a separate release gate.
