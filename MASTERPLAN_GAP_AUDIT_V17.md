# SMOKE LAB — Masterplan Gap Audit v17

## Closed in v17
- Repository-ready production configuration
- Dedicated Netlify build/publish configuration
- SPA direct-route/reload fallback
- Explicit service-worker CDN cache policy
- GitHub CI release gate
- One-command local release gate
- Deployment policy regression test

## Still required before calling this a production release
1. Put this v17 code in the dedicated SMOKE LAB GitHub repository.
2. Connect that repository to a separate Netlify site.
3. Let GitHub Actions pass on the real repository.
4. Let Netlify complete a real production build over HTTPS.
5. Verify installability and offline reload on at least one physical iPhone and one Chromium/Android device.
6. Verify one real service-worker update from v17 to a later version while behavioral data exists.
7. Final legal/commercial packaging and checkout/access flow remain separate from the PWA runtime.

## Release terminology
v17 is deployment-ready. Production release status starts only after the real GitHub/Netlify pipeline and physical-device smoke tests have passed.
