# SMOKE LAB v17 — Release Validation

## Static validation added in v17
- GitHub Actions workflow present
- Dependency install in CI does not assume a missing lockfile
- Netlify production config present
- `dist` configured as publish directory
- SPA fallback configured
- service worker has no-cache/no-store policy at the hosting layer
- versioned Vite assets receive immutable cache headers
- v17 deployment policy regression test added
- previous v16 controlled-update PWA policy preserved

## Production validation still pending
The repository must be pushed to GitHub and connected to a dedicated Netlify site so the real network-enabled CI/build can validate dependency installation, the Vite production build, HTTPS service-worker behavior, installability, offline reload, and update behavior.
