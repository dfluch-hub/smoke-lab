import {
  CravingEvent,
  JourneyProgress,
  LapseRecoveryRecord,
  PersonalExperiment,
  QuitSupportPlan,
  SmokingEvent,
  UserProfile,
} from '../types';
import { STORAGE_KEYS, defaultJourneyProgress } from '../storage/repositories';
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  PREFERRED_LOCALE_KEY,
  STORAGE_SCHEMA_VERSION_KEY,
  StorageAdapter,
} from './StorageMigrationService';
import { StateIntegrityEngine } from './behavior/StateIntegrityEngine';

export interface BackupPreview {
  exportedAt?: string;
  exportVersion: number;
  storageSchemaVersion: number;
  language: 'de' | 'en';
  goal: UserProfile['goal'];
  smokingEvents: number;
  cravingEvents: number;
  experiments: number;
  recoveries: number;
  journeyDay: number;
}

export interface BackupValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  preview?: BackupPreview;
  payload?: RestorePayload;
}

export interface RestoreResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  repairCodes: string[];
  preview?: BackupPreview;
  rolledBack?: boolean;
}

interface RestorePayload {
  profile: UserProfile;
  journey: JourneyProgress;
  smokingEvents: SmokingEvent[];
  cravingEvents: CravingEvent[];
  personalExperiments: PersonalExperiment[];
  quitSupport: QuitSupportPlan;
  lapseRecovery: LapseRecoveryRecord[];
}

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isIsoLike = (value: unknown) => isString(value) && !Number.isNaN(Date.parse(value));
const validIntensity = (value: unknown) => value === undefined || (isFiniteNumber(value) && value >= 1 && value <= 10);
const validGoal = (value: unknown): value is UserProfile['goal'] => value === 'pattern' || value === 'reduce' || value === 'quit';
const validLanguage = (value: unknown): value is UserProfile['preferredLanguage'] => value === 'de' || value === 'en';

const parseExportVersion = (value: unknown): number | null => {
  if (!isFiniteNumber(value)) return null;
  const rounded = Math.round(value);
  return rounded === 1 || rounded === 2 ? rounded : null;
};

const validateProfile = (value: unknown, errors: string[]): UserProfile | null => {
  if (!isObject(value)) { errors.push('profile_missing_or_invalid'); return null; }
  const baseline = value.baseline;
  if (!isString(value.id) || !validGoal(value.goal) || !validLanguage(value.preferredLanguage) || !isObject(baseline)) {
    errors.push('profile_core_fields_invalid');
    return null;
  }
  if (!isFiniteNumber(baseline.typicalCigarettesPerDay) || baseline.typicalCigarettesPerDay < 0 ||
      !isFiniteNumber(baseline.yearsSmoking) || baseline.yearsSmoking < 0) {
    errors.push('profile_baseline_invalid');
    return null;
  }
  if (!isIsoLike(value.createdAt) || !isIsoLike(value.updatedAt)) {
    errors.push('profile_dates_invalid');
    return null;
  }
  return {
    ...(value as unknown as UserProfile),
    version: 2,
    automaticSituations: Array.isArray(value.automaticSituations)
      ? value.automaticSituations.filter((item): item is string => typeof item === 'string')
      : [],
    onboardingCompleted: Boolean(value.onboardingCompleted),
  };
};

const validateSmokingEvents = (value: unknown, errors: string[]): SmokingEvent[] => {
  if (!Array.isArray(value)) { errors.push('smoking_events_not_array'); return []; }
  const result: SmokingEvent[] = [];
  value.forEach((item, index) => {
    if (!isObject(item) || !isString(item.id) || !isIsoLike(item.timestamp) || !isString(item.trigger) ||
        (item.decisionType !== 'automatic' && item.decisionType !== 'intentional') || !validIntensity(item.cravingIntensity)) {
      errors.push(`smoking_event_invalid:${index}`);
      return;
    }
    result.push(item as unknown as SmokingEvent);
  });
  return result;
};

const validOutcome = (value: unknown) => value === undefined || ['gone', 'weaker', 'unchanged', 'stronger', 'smoked'].includes(String(value));
const validateCravingEvents = (value: unknown, errors: string[]): CravingEvent[] => {
  if (!Array.isArray(value)) { errors.push('craving_events_not_array'); return []; }
  const result: CravingEvent[] = [];
  value.forEach((item, index) => {
    if (!isObject(item) || !isString(item.id) || !isIsoLike(item.timestamp) || !isString(item.trigger) ||
        !isFiniteNumber(item.initialIntensity) || item.initialIntensity < 1 || item.initialIntensity > 10 ||
        !isString(item.interventionId) || !isIsoLike(item.interventionStartedAt) ||
        !validIntensity(item.finalIntensity) || !validOutcome(item.outcome)) {
      errors.push(`craving_event_invalid:${index}`);
      return;
    }
    result.push(item as unknown as CravingEvent);
  });
  return result;
};

const validateJourney = (value: unknown, errors: string[]): JourneyProgress => {
  if (!isObject(value)) { errors.push('journey_invalid'); return defaultJourneyProgress; }
  const day = value.dayInLab;
  if (!isFiniteNumber(day) || day < 1 || day > 30 || !Array.isArray(value.completedDays) || !isObject(value.missionCompletions) || !isObject(value.missionResponses)) {
    errors.push('journey_core_fields_invalid');
    return defaultJourneyProgress;
  }
  return { ...defaultJourneyProgress, ...(value as unknown as JourneyProgress) };
};

const validExperimentStatus = (value: unknown) => ['suggested', 'active', 'completed', 'paused'].includes(String(value));
const validateExperiments = (value: unknown, errors: string[]): PersonalExperiment[] => {
  if (!Array.isArray(value)) { errors.push('experiments_not_array'); return []; }
  const result: PersonalExperiment[] = [];
  value.forEach((item, index) => {
    if (!isObject(item) || !isString(item.id) || !isString(item.signature) || !validExperimentStatus(item.status) ||
        !isString(item.targetTrigger) || !isString(item.interventionId) || !isFiniteNumber(item.targetAttempts) || item.targetAttempts < 1 ||
        !Array.isArray(item.attemptCravingIds)) {
      errors.push(`experiment_invalid:${index}`);
      return;
    }
    result.push(item as unknown as PersonalExperiment);
  });
  return result;
};

const validateQuitSupport = (value: unknown, errors: string[]): QuitSupportPlan => {
  if (!isObject(value) || !Array.isArray(value.highRiskPlans) || !isIsoLike(value.createdAt) || !isIsoLike(value.updatedAt)) {
    errors.push('quit_support_invalid');
    const now = new Date().toISOString();
    return { enabled: true, createdAt: now, updatedAt: now, highRiskPlans: [] };
  }
  return value as unknown as QuitSupportPlan;
};

const validateRecoveries = (value: unknown, errors: string[]): LapseRecoveryRecord[] => {
  if (!Array.isArray(value)) { errors.push('recovery_not_array'); return []; }
  const result: LapseRecoveryRecord[] = [];
  value.forEach((item, index) => {
    if (!isObject(item) || !isString(item.id) || !isString(item.smokingEventId) || !isIsoLike(item.createdAt) || !isString(item.trigger)) {
      errors.push(`recovery_invalid:${index}`);
      return;
    }
    result.push(item as unknown as LapseRecoveryRecord);
  });
  return result;
};

const snapshotKeys = [
  STORAGE_KEYS.USER_PROFILE,
  STORAGE_KEYS.SMOKING_EVENTS,
  STORAGE_KEYS.CRAVING_EVENTS,
  STORAGE_KEYS.JOURNEY_PROGRESS,
  STORAGE_KEYS.EXPERIMENTS,
  STORAGE_KEYS.QUIT_SUPPORT,
  STORAGE_KEYS.LAPSE_RECOVERY,
  STORAGE_SCHEMA_VERSION_KEY,
  PREFERRED_LOCALE_KEY,
] as const;

const getDefaultStorage = (): StorageAdapter => window.localStorage;

export class BackupRestoreService {
  static validate(input: unknown): BackupValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!isObject(input)) return { ok: false, errors: ['backup_not_object'], warnings };
    if (input.product !== 'SMOKE LAB') errors.push('wrong_product');

    const exportVersion = parseExportVersion(input.exportVersion);
    if (exportVersion === null) errors.push('unsupported_export_version');

    const rawSchema = input.storageSchemaVersion;
    const storageSchemaVersion = isFiniteNumber(rawSchema) && Number.isInteger(rawSchema) ? rawSchema : 1;
    if (storageSchemaVersion > CURRENT_STORAGE_SCHEMA_VERSION) errors.push('future_storage_schema');
    if (storageSchemaVersion < CURRENT_STORAGE_SCHEMA_VERSION) warnings.push('older_backup_will_be_normalized');

    const profile = validateProfile(input.profile, errors);
    const journey = validateJourney(input.journey, errors);
    const smokingEvents = validateSmokingEvents(input.smokingEvents, errors);
    const cravingEvents = validateCravingEvents(input.cravingEvents, errors);
    const personalExperiments = validateExperiments(input.personalExperiments ?? [], errors);
    const quitSupport = validateQuitSupport(input.quitSupport ?? {
      enabled: true,
      createdAt: input.exportedAt || new Date().toISOString(),
      updatedAt: input.exportedAt || new Date().toISOString(),
      highRiskPlans: [],
    }, errors);
    const lapseRecovery = validateRecoveries(input.lapseRecovery ?? [], errors);

    if (!profile || exportVersion === null || errors.length > 0) return { ok: false, errors, warnings };

    const repaired = StateIntegrityEngine.repair({
      smokingEvents,
      cravingEvents,
      journey,
      experiments: personalExperiments,
      quitSupport,
      recoveries: lapseRecovery,
    });
    if (repaired.repairCodes.length > 0) warnings.push(...repaired.repairCodes.map((code) => `normalized:${code}`));

    const payload: RestorePayload = {
      profile,
      journey: repaired.state.journey,
      smokingEvents: repaired.state.smokingEvents,
      cravingEvents: repaired.state.cravingEvents,
      personalExperiments: repaired.state.experiments,
      quitSupport: repaired.state.quitSupport,
      lapseRecovery: repaired.state.recoveries,
    };

    const preview: BackupPreview = {
      exportedAt: isString(input.exportedAt) ? input.exportedAt : undefined,
      exportVersion,
      storageSchemaVersion,
      language: profile.preferredLanguage,
      goal: profile.goal,
      smokingEvents: payload.smokingEvents.length,
      cravingEvents: payload.cravingEvents.length,
      experiments: payload.personalExperiments.length,
      recoveries: payload.lapseRecovery.length,
      journeyDay: payload.journey.dayInLab,
    };
    return { ok: true, errors: [], warnings, preview, payload };
  }

  static parse(text: string): BackupValidationResult {
    if (text.length > 10_000_000) return { ok: false, errors: ['backup_too_large'], warnings: [] };
    try {
      return this.validate(JSON.parse(text));
    } catch {
      return { ok: false, errors: ['invalid_json'], warnings: [] };
    }
  }

  /**
   * Replaces all source-of-truth local data only after a complete validation pass.
   * Writes are transactional at the localStorage-key level: on any write failure,
   * the prior values are restored best-effort and no partial imported state is accepted.
   */
  static restore(validated: BackupValidationResult, storage: StorageAdapter = getDefaultStorage()): RestoreResult {
    if (!validated.ok || !validated.payload || !validated.preview) {
      return { ok: false, errors: validated.errors.length ? validated.errors : ['backup_not_validated'], warnings: validated.warnings, repairCodes: [] };
    }

    const previous = new Map<string, string | null>();
    try {
      for (const key of snapshotKeys) previous.set(key, storage.getItem(key));
    } catch {
      return { ok: false, errors: ['storage_snapshot_failed'], warnings: validated.warnings, repairCodes: [] };
    }

    const payload = validated.payload;
    const next = new Map<string, string>([
      [STORAGE_KEYS.USER_PROFILE, JSON.stringify(payload.profile)],
      [STORAGE_KEYS.SMOKING_EVENTS, JSON.stringify(payload.smokingEvents)],
      [STORAGE_KEYS.CRAVING_EVENTS, JSON.stringify(payload.cravingEvents)],
      [STORAGE_KEYS.JOURNEY_PROGRESS, JSON.stringify(payload.journey)],
      [STORAGE_KEYS.EXPERIMENTS, JSON.stringify(payload.personalExperiments)],
      [STORAGE_KEYS.QUIT_SUPPORT, JSON.stringify(payload.quitSupport)],
      [STORAGE_KEYS.LAPSE_RECOVERY, JSON.stringify(payload.lapseRecovery)],
      [STORAGE_SCHEMA_VERSION_KEY, String(CURRENT_STORAGE_SCHEMA_VERSION)],
      [PREFERRED_LOCALE_KEY, payload.profile.preferredLanguage],
    ]);

    try {
      for (const [key, value] of next) storage.setItem(key, value);
    } catch {
      let rollbackFailed = false;
      for (const key of snapshotKeys) {
        try {
          const old = previous.get(key) ?? null;
          if (old === null) storage.removeItem(key);
          else storage.setItem(key, old);
        } catch {
          rollbackFailed = true;
        }
      }
      return {
        ok: false,
        errors: [rollbackFailed ? 'restore_write_failed_rollback_incomplete' : 'restore_write_failed_rolled_back'],
        warnings: validated.warnings,
        repairCodes: validated.warnings.filter((item) => item.startsWith('normalized:')).map((item) => item.slice('normalized:'.length)),
        preview: validated.preview,
        rolledBack: !rollbackFailed,
      };
    }

    return {
      ok: true,
      errors: [],
      warnings: validated.warnings,
      repairCodes: validated.warnings.filter((item) => item.startsWith('normalized:')).map((item) => item.slice('normalized:'.length)),
      preview: validated.preview,
    };
  }
}
