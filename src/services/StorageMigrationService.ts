/**
 * SMOKE LAB local-storage migrations.
 *
 * Migrations are intentionally conservative: copy/normalize known structural data,
 * never fabricate behavioral events, outcomes, goals, or clinical meaning.
 * The schema marker is separate from the app/package version so future releases
 * can evolve UI without rewriting user data.
 */

export const CURRENT_STORAGE_SCHEMA_VERSION = 2;
export const STORAGE_SCHEMA_VERSION_KEY = 'smokelab_storage_schema_version';
export const PREFERRED_LOCALE_KEY = 'smokelab_preferred_locale';

const CURRENT_KEYS = {
  profile: 'smokelab_user_profile_v1',
  smoking: 'smokelab_smoking_events_v1',
  craving: 'smokelab_craving_events_v1',
  journey: 'smokelab_journey_progress_v1',
  experiments: 'smokelab_personal_experiments_v1',
  quit: 'smokelab_quit_support_v1',
  recovery: 'smokelab_lapse_recovery_v1',
} as const;

// Early prototypes used unversioned keys. We support them as a one-way import.
const LEGACY_KEY_PAIRS: Array<[string, string]> = [
  ['smokelab_user_profile', CURRENT_KEYS.profile],
  ['smokelab_smoking_events', CURRENT_KEYS.smoking],
  ['smokelab_craving_events', CURRENT_KEYS.craving],
  ['smokelab_journey_progress', CURRENT_KEYS.journey],
  ['smokelab_personal_experiments', CURRENT_KEYS.experiments],
  ['smokelab_quit_support', CURRENT_KEYS.quit],
  ['smokelab_lapse_recovery', CURRENT_KEYS.recovery],
];

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StorageMigrationReport {
  fromVersion: number;
  toVersion: number;
  migrated: boolean;
  migrationCodes: string[];
}

const parseVersion = (raw: string | null): number | null => {
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
};

const hasSmokeLabData = (storage: StorageAdapter): boolean => {
  const knownKeys = [
    ...Object.values(CURRENT_KEYS),
    ...LEGACY_KEY_PAIRS.map(([legacy]) => legacy),
    PREFERRED_LOCALE_KEY,
  ];
  return knownKeys.some((key) => storage.getItem(key) !== null);
};

const migrateV1ToV2 = (storage: StorageAdapter, codes: string[]) => {
  for (const [legacyKey, currentKey] of LEGACY_KEY_PAIRS) {
    const legacy = storage.getItem(legacyKey);
    if (legacy === null || storage.getItem(currentKey) !== null) continue;
    storage.setItem(currentKey, legacy);
    storage.removeItem(legacyKey);
    codes.push(`legacy_key_imported:${legacyKey}`);
  }

  const rawProfile = storage.getItem(CURRENT_KEYS.profile);
  if (!rawProfile) return;
  try {
    const profile = JSON.parse(rawProfile) as Record<string, unknown>;
    let changed = false;

    const currentProfileVersion = typeof profile.version === 'number' && Number.isFinite(profile.version)
      ? Math.max(1, Math.round(profile.version))
      : 1;
    if (currentProfileVersion < 2) {
      profile.version = 2;
      changed = true;
      codes.push('profile_schema_version_raised');
    }

    const preferredLanguage = profile.preferredLanguage;
    if (
      storage.getItem(PREFERRED_LOCALE_KEY) === null &&
      (preferredLanguage === 'de' || preferredLanguage === 'en')
    ) {
      storage.setItem(PREFERRED_LOCALE_KEY, preferredLanguage);
      codes.push('locale_synced_from_profile');
    }

    if (changed) storage.setItem(CURRENT_KEYS.profile, JSON.stringify(profile));
  } catch {
    // A malformed profile is intentionally left untouched here. The integrity
    // layer decides whether it can be repaired safely; migration must not guess.
    codes.push('profile_migration_skipped_malformed_json');
  }
};

export class StorageMigrationService {
  static run(
    storage: StorageAdapter = localStorage,
  ): StorageMigrationReport {
    const explicitVersion = parseVersion(storage.getItem(STORAGE_SCHEMA_VERSION_KEY));
    const hadData = hasSmokeLabData(storage);
    const fromVersion = explicitVersion ?? (hadData ? 1 : CURRENT_STORAGE_SCHEMA_VERSION);
    const codes: string[] = [];

    let cursor = fromVersion;
    if (cursor < 2) {
      migrateV1ToV2(storage, codes);
      cursor = 2;
    }

    // Never silently downgrade data from a future schema.
    if (cursor > CURRENT_STORAGE_SCHEMA_VERSION) {
      return {
        fromVersion,
        toVersion: cursor,
        migrated: false,
        migrationCodes: ['future_schema_detected_no_downgrade'],
      };
    }

    if (explicitVersion !== cursor) {
      storage.setItem(STORAGE_SCHEMA_VERSION_KEY, String(cursor));
      if (!hadData && fromVersion === CURRENT_STORAGE_SCHEMA_VERSION) {
        codes.push('fresh_storage_schema_initialized');
      } else if (fromVersion !== cursor) {
        codes.push(`schema_${fromVersion}_to_${cursor}`);
      } else {
        codes.push('schema_marker_restored');
      }
    }

    return {
      fromVersion,
      toVersion: cursor,
      migrated: codes.length > 0,
      migrationCodes: codes,
    };
  }

  static getSchemaVersion(storage: StorageAdapter = localStorage): number {
    return parseVersion(storage.getItem(STORAGE_SCHEMA_VERSION_KEY)) ?? 1;
  }
}
