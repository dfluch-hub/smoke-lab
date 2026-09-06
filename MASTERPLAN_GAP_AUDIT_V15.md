# SMOKE LAB — Masterplan Gap Audit v15

## Status after v15

### Implemented and code-level tested
- Core smoking/craving logging and interruption flow
- Pattern intelligence and cautious evidence labels
- Adaptive 30-day Journey with canonical lifecycle rules
- Personal experiments, sequencing and personal control model
- Understand / Reduce / Quit goal modes with transition preservation
- Quit preparation, protection plans and non-reset Recovery
- Weekly review and post-Day-30 Maintenance
- Local storage integrity, migrations, export/restore and rollback
- Central priority/orchestration of competing actions
- Post-smoking routing consistency across logging entry points
- Duplicate-submit / save-close hardening for critical flows
- Completed-Journey transition to Maintenance
- Empty-state and zero-data safeguards
- Core accessibility semantics/focus infrastructure
- DE/EN key parity infrastructure

### Implemented but still requires browser/device end-to-end QA
- All React interaction paths and modal focus behavior
- iOS Safari / installed PWA layout and safe-area behavior
- Android browser / installed PWA behavior
- Service-worker cache/update lifecycle
- Offline cold-start and offline navigation
- Backup file picker/download behavior on real devices
- Visual DE/EN walkthrough for clipping, overflow and copy consistency
- VoiceOver/TalkBack validation

### Release gates still open
1. Install dependencies and complete a real Vite production build.
2. Run the built bundle, not only dependency-free engines/tests.
3. Perform browser smoke tests for onboarding → logging → Journey → goal changes → Recovery → Maintenance.
4. Install as PWA on iPhone and Android and test offline/update behavior.
5. Verify manifest/icons/splash/safe-area presentation on device.
6. Complete final accessibility and DE/EN visual QA.
7. Fix issues found in those runtime/device checks.
8. Re-run the original masterplan line by line before declaring RC1.

## Release wording
v15 is an **end-to-end/UI hardening development build**, not a Release Candidate and not a clinically validated product.
