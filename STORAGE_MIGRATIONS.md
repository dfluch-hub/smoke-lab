# SMOKE LAB — Local Storage Migration Contract

Smoke Lab is local-first. Updating the app must therefore treat a user's browser storage as durable product data.

## Current schema
- Storage schema: **2**
- Marker: `smokelab_storage_schema_version`
- Profile schema written by new installs: **2**

The storage schema is intentionally independent of the app/package version. A UI-only release does not require a data migration.

## Rules for every future migration
1. Run migrations before integrity repair or normal repository reads that depend on the new shape.
2. Make migrations one-way and idempotent.
3. Never invent smoking events, craving events, experiment outcomes, goals, dates, medical meaning or user choices.
4. Prefer copying/normalizing known structure over deleting unknown data.
5. Never downgrade a storage schema newer than the app understands.
6. Add a deterministic automated test for every new migration step.
7. Keep structural corruption repair in `StateIntegrityEngine`; keep version-to-version shape changes in `StorageMigrationService`.
8. Only advance the schema marker after the migration step has completed.

## v1 → v2
- Imports supported early unversioned prototype keys into current repository keys when the current key is absent.
- Raises stored profile version from 1 to 2.
- Seeds `smokelab_preferred_locale` from an existing `preferredLanguage` when needed.
- Does not rewrite behavioral event content.

## Future pattern
Add a new migration step in sequence, for example:

`if (cursor < 3) { migrateV2ToV3(storage, codes); cursor = 3; }`

Then update `CURRENT_STORAGE_SCHEMA_VERSION` and add tests proving data preservation and idempotence.
