# SMOKE LAB — Masterplan Gap Audit v14

## Closed / materially hardened in v14
- [x] One canonical definition of Journey completion: all 30 days.
- [x] Corrupt Day-30-with-gaps state cannot activate Maintenance.
- [x] Journey resumes at the first chronological gap after restore/repair.
- [x] Completing a missing day skips already completed later days instead of getting stuck.
- [x] Goal changes preserve logs, Journey, experiments and learned protection plans.
- [x] Leaving Quit mode suspends quit support without deleting history.
- [x] Returning to Quit mode does not silently reactivate a quit date already in the past.
- [x] Future quit dates can survive a goal-mode round trip.
- [x] Suspended quit support cannot promote Quit protection.
- [x] Internal lifecycle release-gate invariants added.
- [x] Cross-mode state matrix added for Pattern / Reduce / Quit / Recovery / Maintenance.

## Automated verification at v14
- [x] 14 behavior/integration suites pass.
- [x] v14 lifecycle suite: 25 grouped scenarios/invariants.
- [x] Dependency-free TypeScript service/storage/test graph compiles with `tsc`.
- [x] 70 TS/TSX files pass syntax transpilation scan.

## Implemented but still needs full-app / real-device QA
- [~] Goal-transition notice with VoiceOver/TalkBack.
- [~] Backup/restore while a Journey gap exists on a real installed PWA.
- [~] Rapid tab changes while Recovery or a personal experiment is active.
- [~] PWA update/reload during an open craving flow.
- [~] Full DE/EN editorial pass across accumulated modules.

## Still required before Release Candidate
- [ ] Successful full npm dependency install and Vite production build in a build-capable environment.
- [ ] Full UI end-to-end pass from onboarding through Maintenance.
- [ ] Physical iPhone install/offline/update test.
- [ ] Android install/offline/update test.
- [ ] Rapid-interaction / double-action UI pass across all major modals.
- [ ] Final accessibility device pass.
- [ ] Final legal/privacy/about copy and release packaging.
