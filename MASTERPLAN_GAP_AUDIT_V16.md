# SMOKE LAB — Masterplan Gap Audit v16

## Closed in v16
- Controlled service-worker update UX
- Conservative update polling policy
- Mobile dynamic viewport hardening
- iOS/iPadOS safe-area hardening
- Icon dimension / opacity validation
- Desktop PWA navigation containment
- Dedicated PWA regression policy test

## Still required before calling this a release
1. Successful production dependency install and Vite production build in a network-enabled environment.
2. Run the built app in a real browser over HTTPS.
3. Verify installability in Chrome/Edge and Add-to-Home-Screen behavior in Safari/iOS.
4. Verify offline reload after the service worker has cached the production app.
5. Verify an actual v16 -> newer-version service-worker update while behavioral data exists.
6. Smoke-test at least one physical iPhone viewport and one Android/Chromium viewport.
7. Final legal/commercial packaging and checkout/access flow remain outside the PWA runtime itself.

## Release terminology
v16 is a release-hardening build. It is not called a production release until the real production build and browser/PWA checks above have passed.
