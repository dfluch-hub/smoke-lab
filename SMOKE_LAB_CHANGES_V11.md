# SMOKE LAB v11 — Release Hardening

Version: **0.11.0**

This release is intentionally focused on robustness rather than feature count.

## Structural state integrity
- Added `StateIntegrityEngine` for deterministic repair of locally stored product state.
- Removes duplicate/invalid event records without inventing observations.
- Clamps out-of-range recorded intensities to the supported 1–10 scale.
- Removes orphan smoking/craving links.
- Reconciles Journey counters with actual stored events.
- Restores Journey to the first missing chronological Lab day if progress becomes inconsistent.
- Prevents multiple personal experiments from remaining active after stale/corrupt state; the most recently activated remains active and older ones are paused.
- Removes experiment-attempt references to craving events that no longer exist.
- Deduplicates protection plans by signature and recovery records by smoking event.
- Invalid quit dates are removed instead of interpreted.
- Repair is idempotent and does not manufacture user choices, outcomes or medical meaning.

## Startup repair
- Added `StorageIntegrityService`.
- Existing local state is checked once when an existing profile loads.
- Repairs are persisted only when a deterministic structural inconsistency is found.

## Repository hardening
- Smoking, craving and recovery repositories now safely handle non-array JSON instead of assuming valid storage.
- Added internal `replaceAll` methods for controlled integrity repair.
- Profile reads validate critical fields before the main UI is allowed to use them.
- Saving a profile no longer mutates the caller object.
- Fresh Quit-support defaults use fresh timestamps rather than one module-load timestamp.

## One-focus Today screen
- Suggested personal experiments are now shown only when `GoalModeCoordinator` actually selected that experiment question as the current focus.
- Recovery, Quit protection, reduction and Maintenance can no longer be visually undermined by a second unrelated suggested experiment.
- The Journey card appears on Today only when Journey is the selected primary task. It remains fully available in Lab at all times.

## Quit / Maintenance conflict fixed
- A moment-specific prepared protection plan on Quit day or after the Quit date now outranks the generic weekly Maintenance card.
- Recovery still remains highest priority.
- A deliberately active personal experiment still remains above the protection plan by design.

## Driving branch consistency
- After explicit confirmation that the user is safely parked, the craving flow now uses the exact same intervention priority resolver as the normal path.
- Fixed a branch where Journey could incorrectly outrank a matching prepared Quit protection plan.

## Duplicate-submit protection
- Quick Smoking Log now guards against rapid double-submit before React can rerender the disabled state.
- Lapse Recovery has the same guard.
- Lapse Recovery also resets/reloads its form correctly when a different smoking event is opened.

## Tests
Added `tests/v11-release-hardening.test.ts` covering:
- corrupted/duplicate event repair;
- orphan-link removal;
- Journey chronology recovery;
- real-count reconciliation;
- single-active-experiment invariant;
- stale experiment attempt cleanup;
- protection/recovery deduplication;
- invalid Quit-date handling;
- repair idempotence;
- Quit protection vs Maintenance priority.

The full behavior test suite from v2–v11 passes in the local TypeScript test harness used for this development pass.
