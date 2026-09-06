# SMOKE LAB v17 — GitHub + Netlify Release Pipeline

Version: 0.17.0

## Scope
v17 turns the v16 PWA-hardening build into a repository/deployment-ready release candidate with GitHub as the source of truth and a dedicated Netlify project as the production host.

## Changes
- Added `netlify.toml` with the production build command and `dist` publish directory.
- Added SPA fallback for direct navigation/reload.
- Added explicit cache policy so `sw.js` and the web app manifest are not pinned by a CDN/browser.
- Added long-lived caching for Vite fingerprinted assets.
- Added conservative security headers that do not request camera, microphone, or geolocation access.
- Added GitHub Actions release validation on pushes and pull requests to `main`.
- CI now runs dependency installation, TypeScript validation, all behavioral regression suites, and a production Vite build. The repository currently has no lockfile, so CI uses `npm install`; a future lockfile can switch this to `npm ci`.
- Added a v17 deployment/release policy regression test.
- Added `npm run check:release` as the single local release gate.

## Deployment principle
GitHub is the canonical codebase. Netlify should deploy from the GitHub repository; production changes should come from committed code rather than manual edits in Netlify.
