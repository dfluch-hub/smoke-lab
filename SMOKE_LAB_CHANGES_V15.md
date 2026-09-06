# SMOKE LAB v15 — End-to-End / UI Hardening

Version: 0.15.0

This release block hardens the real user flow instead of adding a new behavioral claim or score.

## Unified post-smoking recovery routing
- Added `PostSmokingFlowEngine` as the single deterministic rule for deciding whether a saved cigarette should open post-quit Recovery.
- The same rule is now used immediately after saving and later by Today when an unresolved event needs to reappear.
- Non-quit goals, disabled quit support, missing quit date, pre-quit events and already-reviewed events do not open Recovery.

## Save/close and double-submit race fixes
- Quick smoking log keeps the saved event available even if the sheet is closed immediately after save.
- Craving mode retains a saved smoking event when the user closes via the dialog close control.
- Craving outcomes, smoking fallback, Journey completion, onboarding completion, Recovery completion and Backup Restore are guarded against rapid duplicate submissions.
- Save-complete sheets temporarily disable close actions where closing could race persistence/routing.

## Journey and goal-transition integration
- Goal changes made from a Journey mission now go through `GoalTransitionEngine`, just like goal changes under Me.
- Leaving Quit mode therefore suspends quit support consistently.
- Re-entering Quit with a stale past quit date requires explicit reconfirmation rather than silently classifying later cigarettes as post-quit events.
- Completed Journey missions are read-only when reviewed.
- After all 30 Lab days are complete, Lab no longer presents Day 30 as a new “Today in the Lab” task; the UI explicitly transitions to Maintenance without resetting anything.

## Modal and navigation hardening
- Shared modal sheet supports close-locking during critical writes.
- Craving mode and Journey mission sheet receive focus trapping, initial focus, body scroll locking and guarded Escape behavior.
- Main-tab navigation resets the app shell to the top instead of retaining an unrelated scroll position.

## Onboarding data integrity
- Added `OnboardingBaselineEngine`.
- Cigarettes/day, smoking years, cigarettes/pack and pack price are normalized before persistence.
- Invalid zero/negative pack sizes can no longer poison later calculations.

## Restore resilience
- Restore confirmation is guarded against duplicate taps/writes while an import is already in progress.

## QA scope
v15 includes pure integration tests for onboarding baseline normalization and post-smoking recovery routing, plus source-level UI release checks for critical React wiring.

This is still not a browser/device Release Candidate. Full Vite production build, real PWA install/offline/update behavior and iOS/Android device walkthrough remain release gates for v16+.
