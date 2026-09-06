# SMOKE LAB v12 — Product Readiness I

Version: **0.12.0**

This release focuses on preserving user data across updates, clearer learning states, accessibility fundamentals, bilingual consistency and a less fragile PWA shell.

## Forward storage migrations
- Added `StorageMigrationService` with an explicit storage-schema marker separate from the package/app version.
- Current storage schema: **2**.
- Existing installs without a marker are safely inferred as the previous schema when Smoke Lab data exists.
- Early unversioned prototype keys are imported one-way into the current repository keys when no current copy exists.
- Behavioral logs are copied as-is; migrations do not fabricate observations, outcomes, goals or clinical meaning.
- Existing profile language seeds the dedicated locale preference if it does not exist yet.
- Profile data version is raised from 1 to 2 without changing user choices.
- Future/unknown storage schemas are never silently downgraded.
- Migration execution is idempotent and runs before the existing structural integrity layer.
- New profiles are created directly at profile schema version 2.

## Language consistency
- Added automated DE/EN translation-table parity testing: both language tables must expose the same keys and non-empty copy.
- The language provider can recover the preferred language directly from an older profile before migrations have completed, avoiding a wrong-language first frame after an update.
- Changing language under `Me` now updates both the UI locale and the persisted profile language.
- Core navigation/dialog/offline accessibility labels now follow the selected language.
- Offline copy now accurately says that local data remains available; it no longer implies a separate remote cache.

## Explicit empty states
- Added a reusable premium `EmptyState` component.
- Patterns now explains what needs to happen before a recurring pattern can responsibly be shown.
- Progress now explains why no trend is shown before real observations exist.
- Today and Progress render Control as `—` before behavioral observations instead of exposing the internal neutral starting value as if it were measured progress.
- Empty states route users back to Today rather than presenting dead ends.

## Accessibility fundamentals
- Browser zoom is no longer disabled in the viewport metadata.
- Added global keyboard `:focus-visible` styling.
- Added reduced-motion behavior via `prefers-reduced-motion`.
- Added a keyboard skip link to main app content.
- Bottom navigation exposes localized navigation labeling and `aria-current` for the active destination.
- `ModalSheet` now has dialog semantics, Escape handling, initial focus, focus trapping and focus restoration.
- Journey mission sheet now has dialog labeling, Escape handling, initial focus and focus restoration.
- Full-screen Craving Mode now exposes modal-dialog semantics.
- Key icon-only controls and selection controls received larger touch targets and selection/accessibility state (`aria-pressed` where appropriate).
- Offline status uses a polite live region.

## PWA / offline hardening
- Removed the stale duplicate static `public/manifest.json` path; the Vite PWA plugin is now the single manifest source.
- Manifest output is explicitly `manifest.webmanifest`.
- Added the maskable icon to the precached install assets.
- Workbox now cleans outdated caches, claims active clients and uses an explicit app-shell navigation fallback.
- Dev service workers are disabled to prevent stale development caches from being mistaken for product defects.
- iPadOS desktop-class user agents are recognized for iOS install guidance.
- Standalone display-mode changes are observed after installation.

## Export portability
- JSON exports now use `exportVersion: 2` and include `storageSchemaVersion` so future imports/support tooling can identify the local-data format.

## Validation performed in this pass
- All **12 dependency-free behavior/product test suites** compile and execute successfully:
  - engine
  - journey
  - adaptation
  - hypothesis
  - experiment sequencing
  - personal control model
  - goal support
  - quit/recovery
  - v9 integration
  - v10 integration
  - v11 release hardening
  - v12 product readiness
- v12 migration tests cover legacy-key import, data preservation, locale carry-forward, schema marking, idempotence and future-schema no-downgrade behavior.
- Automated DE/EN key parity and non-empty copy tests pass.
- Static readiness checks verify zoom support, generated-manifest ownership, cache cleanup, app-shell fallback, maskable icon presence, disabled dev SW, dialog semantics, Escape/focus behavior, reduced motion, focus-visible styling, skip link, empty-state integration and legacy-language recovery.
- TypeScript transpile/syntax pass succeeds for the complete source/test tree in this version.

## Still not claimed
This is **not yet a Release Candidate**. A real production Vite build still requires the external npm dependencies to be available. During this pass, `npm install --no-audit --no-fund` was attempted for 180 seconds and the execution environment timed out before packages were installed. Real-device iOS/Android PWA, screen-reader, offline-update and complete end-to-end Journey/goal-mode QA therefore remain open release tasks.
