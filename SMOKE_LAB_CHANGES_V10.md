# SMOKE LAB v10 — Goal Orchestration & Integration Pass

## Purpose
v10 is an integration release, not a new isolated feature. It reduces competing recommendations and makes Pattern / Reduce / Quit behave as coherent product modes across Today, the craving flow, Journey, recovery and Maintenance.

## Added

### GoalModeCoordinator
New deterministic orchestration layer:
- keeps one primary behavioral focus at a time;
- unresolved post-quit recovery outranks all routine tasks;
- a deliberately activated personal experiment outranks generic recommendations;
- after Day 30, Maintenance replaces the old daily Journey priority;
- Quit mode prioritizes prepared protection / missing protection plans / preparation gaps;
- Reduce mode prioritizes a repeated lower-intensity automatic-loop candidate when the data supports one;
- otherwise falls back to Journey, experiment sequencing or the existing Next Best Action engine.

This is product prioritization only. It is not a clinical risk or treatment score.

### Persistent recovery access
A post-quit smoking event is no longer only offered for review immediately after logging. If the recovery sheet is dismissed, Today can surface the unresolved situation again until a recovery record exists.

### InterventionPriorityEngine
Competing intervention sources now use an explicit order:
1. active personal experiment,
2. exact matching Quit protection plan,
3. current Journey intervention,
4. adaptive intervention selection.

This fixes a product conflict where a Journey intervention could previously outrank a protection plan the user had explicitly prepared for the same Quit-mode context.

### Today integration
Today can now surface a single goal-aware focus card for:
- pending recovery,
- post-Day-30 Maintenance,
- Quit protection,
- Quit preparation,
- grounded Reduce opportunities.

Generic Next Best Action is suppressed whenever a higher-priority focus already exists.

### Journey conflict handling
If an active personal experiment temporarily conflicts with the current Journey intervention, the Journey is not deleted or reset. Its intervention is deferred until it fits again.

### Goal switching in Me
Users can switch between:
- Understand pattern,
- Reduce,
- Quit.

Changing focus does not delete logs, experiments, Control Model data or 30-day Journey progress.

### Goal-aware Maintenance
Maintenance copy now differs by goal:
- Pattern: keep the personal map current;
- Reduce: interpret change across several logged days, not one day;
- Quit: recovery after an unplanned cigarette returns to the protection plan without a reset.

## Validation
v10 adds tests for:
- recovery priority and persistence;
- experiment priority after recovery is resolved;
- post-quit protection focus;
- Reduce-mode grounded candidate priority;
- Maintenance replacing the finished Journey;
- intervention priority order.
