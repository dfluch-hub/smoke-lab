# SMOKE LAB — Masterplan Gap Audit v13

## Newly hardened in v13
- [x] JSON backup can be restored locally.
- [x] Backup is validated before mutation.
- [x] Restore preview + explicit destructive confirmation.
- [x] Restore has key-level transactional rollback on write failure.
- [x] Computed analytics are not trusted as source-of-truth during restore.
- [x] Storage availability is checked before normal use.
- [x] Runtime storage errors surface visibly instead of remaining silent.
- [x] UI crash boundary does not reset user data automatically.
- [x] Future-schema data is protected from older-app writes.

## Implemented but still needs real-device / full-app QA
- [~] Backup download + restore on iOS Safari / installed PWA.
- [~] Very large real-world backup files and browser quota behavior.
- [~] VoiceOver/TalkBack across restore modal and failure screens.
- [~] Service-worker update while an older tab still holds a newer/older schema.
- [~] Full DE/EN copy review across all accumulated feature modules.

## Still required before Release Candidate
- [ ] Successful full dependency install and Vite production build in a build-capable environment.
- [ ] Install and update test on physical iPhone and Android.
- [ ] Full 30-day Journey state-machine scenario matrix.
- [ ] Full goal-mode scenario matrix: Pattern / Reduce / Quit / post-quit Recovery / Maintenance.
- [ ] Cross-tab and rapid-interaction testing.
- [ ] PWA update/reload behavior with an active craving flow.
- [ ] Final accessibility device pass.
- [ ] Final legal/privacy/about copy and release packaging.
