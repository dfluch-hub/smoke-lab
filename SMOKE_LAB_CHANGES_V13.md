# SMOKE LAB v13 — Resilience, Backup & Restore

Version: 0.13.0

## Added
- Strict local JSON backup validation before any restore write.
- Restore preview with counts and Journey state before destructive confirmation.
- Transactional localStorage-key restore with best-effort rollback if any write fails.
- Restore imports only source-of-truth data; computed Control Model / Weekly Review / Maintenance summaries are rebuilt, never trusted from backup.
- Compatibility protection for backups and local data from a newer storage schema.
- Storage round-trip health check before the app begins accepting behavior data.
- Sticky runtime storage-error warning when a repository write/read/remove fails.
- Full app React error boundary with a non-destructive reload screen.
- Blocking safe screen when local storage is unavailable instead of pretending entries were saved.
- v13 resilience tests for validation, normalization, future schemas, malformed JSON, rollback, and storage availability.

## Safety choices
- Restore never happens immediately after selecting a file; the user must review and confirm.
- Invalid backups do not modify local storage.
- Existing data is snapshotted before restore writes.
- No behavioral events, outcomes, or clinical meaning are invented during normalization.
- Computed analytics are regenerated from restored logs.
- A future storage schema is left untouched by an older app version.
