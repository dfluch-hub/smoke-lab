import { translations } from '../src/i18n/translations';
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  PREFERRED_LOCALE_KEY,
  STORAGE_SCHEMA_VERSION_KEY,
  StorageAdapter,
  StorageMigrationService,
} from '../src/services/StorageMigrationService';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

class MemoryStorage implements StorageAdapter {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.has(key) ? this.data.get(key)! : null; }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
  removeItem(key: string) { this.data.delete(key); }
}

const storage = new MemoryStorage();
storage.setItem('smokelab_user_profile', JSON.stringify({
  id: 'legacy-user',
  version: 1,
  preferredLanguage: 'de',
  goal: 'pattern',
  automaticSituations: ['Coffee'],
  onboardingCompleted: true,
  baseline: { typicalCigarettesPerDay: 10, yearsSmoking: 5 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}));
storage.setItem('smokelab_smoking_events', JSON.stringify([{ id: 's1' }]));

const first = StorageMigrationService.run(storage);
assert(first.fromVersion === 1, 'existing pre-marker data should be treated as schema v1');
assert(first.toVersion === CURRENT_STORAGE_SCHEMA_VERSION, 'migration should end at current storage schema');
assert(first.migrated, 'legacy storage should report a migration');
assert(storage.getItem('smokelab_user_profile') === null, 'legacy profile key should be removed after a successful one-way import');
assert(storage.getItem('smokelab_user_profile_v1') !== null, 'profile should be available under the current repository key');
assert(storage.getItem('smokelab_smoking_events_v1') !== null, 'behavior events must survive migration');
assert(storage.getItem(PREFERRED_LOCALE_KEY) === 'de', 'existing profile language should seed the locale preference');
assert(storage.getItem(STORAGE_SCHEMA_VERSION_KEY) === String(CURRENT_STORAGE_SCHEMA_VERSION), 'schema marker should be persisted');
const migratedProfile = JSON.parse(storage.getItem('smokelab_user_profile_v1') || '{}');
assert(migratedProfile.version === 2, 'profile data version should be raised without rewriting user choices');

const second = StorageMigrationService.run(storage);
assert(second.migrated === false, 'running migrations twice must be idempotent');
assert(second.migrationCodes.length === 0, 'second migration pass should have no work');

const freshStorage = new MemoryStorage();
const fresh = StorageMigrationService.run(freshStorage);
assert(fresh.toVersion === CURRENT_STORAGE_SCHEMA_VERSION, 'fresh installs should initialize directly at the current schema');
assert(freshStorage.getItem(STORAGE_SCHEMA_VERSION_KEY) === String(CURRENT_STORAGE_SCHEMA_VERSION), 'fresh installs should persist a schema marker');
assert(StorageMigrationService.run(freshStorage).migrated === false, 'fresh schema initialization should also be idempotent');

const conflictStorage = new MemoryStorage();
conflictStorage.setItem('smokelab_user_profile_v1', JSON.stringify({ source: 'current' }));
conflictStorage.setItem('smokelab_user_profile', JSON.stringify({ source: 'legacy' }));
const conflict = StorageMigrationService.run(conflictStorage);
assert(conflict.toVersion === CURRENT_STORAGE_SCHEMA_VERSION, 'mixed legacy/current installs should still advance safely');
assert(JSON.parse(conflictStorage.getItem('smokelab_user_profile_v1') || '{}').source === 'current', 'migration must never overwrite a current key with a stale legacy copy');

const futureStorage = new MemoryStorage();
futureStorage.setItem(STORAGE_SCHEMA_VERSION_KEY, '99');
futureStorage.setItem('smokelab_user_profile_v1', JSON.stringify({ keep: true }));
const future = StorageMigrationService.run(futureStorage);
assert(future.toVersion === 99, 'future schemas must never be silently downgraded');
assert(future.migrationCodes.includes('future_schema_detected_no_downgrade'), 'future schema protection should be explicit');
assert(JSON.parse(futureStorage.getItem('smokelab_user_profile_v1') || '{}').keep === true, 'future data must remain untouched');

const enKeys = Object.keys(translations.en).sort();
const deKeys = Object.keys(translations.de).sort();
assert(enKeys.join('|') === deKeys.join('|'), 'German and English translation tables must expose identical keys');
for (const key of enKeys) {
  assert(String(translations.en[key as keyof typeof translations.en]).trim().length > 0, `English translation must not be empty: ${key}`);
  assert(String(translations.de[key as keyof typeof translations.de]).trim().length > 0, `German translation must not be empty: ${key}`);
}

console.log('Smoke Lab v12 product-readiness tests: OK');
