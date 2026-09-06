import { BackupRestoreService } from '../src/services/BackupRestoreService';
import { StorageHealthService } from '../src/services/StorageHealthService';
import { CURRENT_STORAGE_SCHEMA_VERSION, StorageAdapter } from '../src/services/StorageMigrationService';
import { STORAGE_KEYS, defaultJourneyProgress } from '../src/storage/repositories';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

class MemoryStorage implements StorageAdapter {
  protected data = new Map<string, string>();
  getItem(key: string) { return this.data.has(key) ? this.data.get(key)! : null; }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
  removeItem(key: string) { this.data.delete(key); }
}

class FailOnceStorage extends MemoryStorage {
  failKey = '';
  failed = false;
  setItem(key: string, value: string) {
    if (key === this.failKey && !this.failed) {
      this.failed = true;
      throw new Error('simulated quota failure');
    }
    super.setItem(key, value);
  }
}

class WriteBlockedStorage extends MemoryStorage {
  setItem(_key: string, _value: string): void { throw new Error('blocked'); }
}

const now = '2026-09-06T00:00:00.000Z';
const backup = {
  product: 'SMOKE LAB',
  exportVersion: 2,
  storageSchemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
  exportedAt: now,
  profile: {
    id: 'user-1', version: 2,
    baseline: { typicalCigarettesPerDay: 12, yearsSmoking: 8 },
    goal: 'reduce', automaticSituations: ['Coffee'], onboardingCompleted: true,
    createdAt: now, updatedAt: now, preferredLanguage: 'de',
  },
  journey: { ...defaultJourneyProgress, completedDays: [1, 3], dayInLab: 8 },
  smokingEvents: [
    { id: 's1', timestamp: now, trigger: 'Coffee', decisionType: 'automatic', cravingIntensity: 5 },
    { id: 's1', timestamp: '2026-09-05T23:00:00.000Z', trigger: 'Coffee', decisionType: 'automatic', cravingIntensity: 5 },
  ],
  cravingEvents: [
    { id: 'c1', timestamp: now, trigger: 'Coffee', initialIntensity: 6, interventionId: 'THREE_MINUTE_DELAY', interventionStartedAt: now, interrupted: true },
  ],
  personalExperiments: [],
  quitSupport: { enabled: true, createdAt: now, updatedAt: now, highRiskPlans: [] },
  lapseRecovery: [],
  currentControlModel: { should: 'be ignored on restore' },
};

const validated = BackupRestoreService.validate(backup);
assert(validated.ok, `valid backup should pass: ${validated.errors.join(',')}`);
assert(validated.preview?.smokingEvents === 1, 'duplicate smoking ids should be normalized before preview');
assert(validated.preview?.journeyDay === 2, 'journey gaps should normalize to the first uncompleted day');
assert(validated.warnings.some((w) => w.includes('normalized:')), 'normalization should be disclosed as a warning');

const target = new MemoryStorage();
target.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify({ old: true }));
const restored = BackupRestoreService.restore(validated, target);
assert(restored.ok, 'validated backup should restore successfully');
const restoredProfile = JSON.parse(target.getItem(STORAGE_KEYS.USER_PROFILE) || '{}');
assert(restoredProfile.id === 'user-1', 'restore should replace source-of-truth profile');
const restoredSmokes = JSON.parse(target.getItem(STORAGE_KEYS.SMOKING_EVENTS) || '[]');
assert(restoredSmokes.length === 1, 'restore should write normalized source-of-truth events');
assert(target.getItem('currentControlModel') === null, 'computed export summaries must never be restored as storage truth');

const wrongProduct = BackupRestoreService.validate({ ...backup, product: 'OTHER' });
assert(!wrongProduct.ok && wrongProduct.errors.includes('wrong_product'), 'wrong-product JSON must be rejected');

const future = BackupRestoreService.validate({ ...backup, storageSchemaVersion: CURRENT_STORAGE_SCHEMA_VERSION + 1 });
assert(!future.ok && future.errors.includes('future_storage_schema'), 'future backup schemas must be rejected by older app versions');

const badEvent = BackupRestoreService.validate({
  ...backup,
  smokingEvents: [{ id: 'bad', timestamp: now, trigger: 'Coffee', decisionType: 'automatic', cravingIntensity: 99 }],
});
assert(!badEvent.ok && badEvent.errors.some((e) => e.startsWith('smoking_event_invalid')), 'invalid intensity must fail strict backup validation');

const malformed = BackupRestoreService.parse('{ definitely-not-json');
assert(!malformed.ok && malformed.errors.includes('invalid_json'), 'malformed JSON must be rejected without storage writes');

const rollbackStorage = new FailOnceStorage();
rollbackStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify({ id: 'original' }));
rollbackStorage.setItem(STORAGE_KEYS.SMOKING_EVENTS, JSON.stringify([{ id: 'original-smoke' }]));
rollbackStorage.failKey = STORAGE_KEYS.CRAVING_EVENTS;
const rolledBack = BackupRestoreService.restore(validated, rollbackStorage);
assert(!rolledBack.ok && rolledBack.rolledBack === true, 'a failed restore write should trigger successful rollback');
assert(JSON.parse(rollbackStorage.getItem(STORAGE_KEYS.USER_PROFILE) || '{}').id === 'original', 'rollback must restore the prior profile');
assert(JSON.parse(rollbackStorage.getItem(STORAGE_KEYS.SMOKING_EVENTS) || '[]')[0].id === 'original-smoke', 'rollback must restore prior event data');

const healthy = StorageHealthService.check(new MemoryStorage());
assert(healthy.ok && healthy.code === 'ok', 'working storage should pass round-trip health check');
const blocked = StorageHealthService.check(new WriteBlockedStorage());
assert(!blocked.ok && blocked.code === 'write_failed', 'blocked storage should be detected before app use');

console.log('Smoke Lab v13 resilience tests: OK');
