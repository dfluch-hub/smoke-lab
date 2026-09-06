# SMOKE LAB v16 — Release / PWA Hardening

Version: 0.16.0

## Scope
v16 moves Smoke Lab from product/UI hardening toward a browser-installable release candidate path.

## Changes
- PWA updates changed from silent auto-update to an explicit, user-controlled update prompt.
- New versions are checked when the app returns online, becomes visible, and at a conservative hourly interval.
- Saved local behavioral data is not cleared by an app update.
- Dynamic viewport height (`100dvh`) is used for modern mobile browsers.
- Top, bottom, left, and right safe-area insets are respected where the app reaches device edges.
- Desktop bottom navigation stays inside the simulated app frame.
- Production PWA manifest remains the single source of truth.
- PWA release policy is covered by a dedicated v16 regression test.
- `workbox-window` is explicitly declared for the React PWA registration integration.
- Periodic update checks use no-store service-worker fetches and clean up lifecycle listeners.

## Release principle
Smoke Lab must never silently refresh in the middle of a user entry merely because a new service worker became available.
