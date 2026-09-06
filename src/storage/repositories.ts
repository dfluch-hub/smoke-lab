import {
  SmokingEvent,
  CravingEvent,
  UserProfile,
  JourneyProgress,
  PersonalExperiment,
  QuitSupportPlan,
  LapseRecoveryRecord,
} from '../types';
import { safeStorageGet, safeStorageRemove, safeStorageSet } from './safeStorage';
import { JourneyLifecycleEngine } from '../services/behavior/JourneyLifecycleEngine';

export const STORAGE_KEYS = {
  USER_PROFILE: 'smokelab_user_profile_v1',
  SMOKING_EVENTS: 'smokelab_smoking_events_v1',
  CRAVING_EVENTS: 'smokelab_craving_events_v1',
  JOURNEY_PROGRESS: 'smokelab_journey_progress_v1',
  EXPERIMENTS: 'smokelab_personal_experiments_v1',
  QUIT_SUPPORT: 'smokelab_quit_support_v1',
  LAPSE_RECOVERY: 'smokelab_lapse_recovery_v1',
};

export const defaultJourneyProgress: JourneyProgress = {
  phase: 'discover',
  phaseName: 'PHASE 1 · DISCOVER',
  dayInLab: 1,
  currentDayStartedAt: undefined,
  completedDays: [],
  missionCompletions: {},
  missionResponses: {},
  controlScore: 50,
  totalCigarettesLogged: 0,
  totalCravingsLogged: 0,
  totalInterruptedLoops: 0,
  lastBaselineComparison: 'learning',
};

// ==========================================
// SmokingEventRepository
// ==========================================
export class SmokingEventRepository {
  static getAll(): SmokingEvent[] {
    try {
      const raw = safeStorageGet(STORAGE_KEYS.SMOKING_EVENTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as SmokingEvent[] : [];
    } catch (err) {
      console.error('Error reading SmokingEvents:', err);
      return [];
    }
  }

  static getToday(): SmokingEvent[] {
    const all = this.getAll();
    const now = new Date();
    const localTodayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return all.filter((e) => {
      try {
        const eventDate = new Date(e.timestamp);
        const eventDateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
        return eventDateStr === localTodayDate;
      } catch {
        return e.timestamp.startsWith(localTodayDate);
      }
    });
  }

  static getById(id: string): SmokingEvent | null {
    const all = this.getAll();
    return all.find((e) => e.id === id) || null;
  }

  static save(event: SmokingEvent): void {
    try {
      const all = this.getAll();
      const existingIndex = all.findIndex((e) => e.id === event.id);
      if (existingIndex >= 0) {
        all[existingIndex] = event;
      } else {
        all.unshift(event);
      }
      safeStorageSet(STORAGE_KEYS.SMOKING_EVENTS, JSON.stringify(all));
    } catch (err) {
      console.error('Error saving SmokingEvent:', err);
    }
  }

  static update(id: string, partial: Partial<SmokingEvent>): SmokingEvent | null {
    try {
      const all = this.getAll();
      const idx = all.findIndex((e) => e.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...partial };
      safeStorageSet(STORAGE_KEYS.SMOKING_EVENTS, JSON.stringify(all));
      return all[idx];
    } catch (err) {
      console.error('Error updating SmokingEvent:', err);
      return null;
    }
  }

  static replaceAll(events: SmokingEvent[]): void {
    try {
      safeStorageSet(STORAGE_KEYS.SMOKING_EVENTS, JSON.stringify(Array.isArray(events) ? events : []));
    } catch (err) {
      console.error('Error replacing SmokingEvents:', err);
    }
  }

  static clear(): void {
    safeStorageRemove(STORAGE_KEYS.SMOKING_EVENTS);
  }
}

// ==========================================
// CravingEventRepository
// ==========================================
export class CravingEventRepository {
  static getAll(): CravingEvent[] {
    try {
      const raw = safeStorageGet(STORAGE_KEYS.CRAVING_EVENTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as CravingEvent[] : [];
    } catch (err) {
      console.error('Error reading CravingEvents:', err);
      return [];
    }
  }

  static getToday(): CravingEvent[] {
    const all = this.getAll();
    const now = new Date();
    const localTodayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return all.filter((e) => {
      try {
        const eventDate = new Date(e.timestamp);
        const eventDateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
        return eventDateStr === localTodayDate;
      } catch {
        return e.timestamp.startsWith(localTodayDate);
      }
    });
  }

  static getById(id: string): CravingEvent | null {
    const all = this.getAll();
    return all.find((e) => e.id === id) || null;
  }

  static save(event: CravingEvent): void {
    try {
      const all = this.getAll();
      const existingIndex = all.findIndex((e) => e.id === event.id);
      if (existingIndex >= 0) {
        all[existingIndex] = event;
      } else {
        all.unshift(event);
      }
      safeStorageSet(STORAGE_KEYS.CRAVING_EVENTS, JSON.stringify(all));
    } catch (err) {
      console.error('Error saving CravingEvent:', err);
    }
  }

  static update(id: string, partial: Partial<CravingEvent>): CravingEvent | null {
    try {
      const all = this.getAll();
      const idx = all.findIndex((e) => e.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...partial };
      safeStorageSet(STORAGE_KEYS.CRAVING_EVENTS, JSON.stringify(all));
      return all[idx];
    } catch (err) {
      console.error('Error updating CravingEvent:', err);
      return null;
    }
  }

  static remove(id: string): void {
    try {
      const remaining = this.getAll().filter((event) => event.id !== id);
      safeStorageSet(STORAGE_KEYS.CRAVING_EVENTS, JSON.stringify(remaining));
    } catch (err) {
      console.error('Error removing CravingEvent:', err);
    }
  }

  static replaceAll(events: CravingEvent[]): void {
    try {
      safeStorageSet(STORAGE_KEYS.CRAVING_EVENTS, JSON.stringify(Array.isArray(events) ? events : []));
    } catch (err) {
      console.error('Error replacing CravingEvents:', err);
    }
  }

  static clear(): void {
    safeStorageRemove(STORAGE_KEYS.CRAVING_EVENTS);
  }
}

// ==========================================
// ProfileRepository
// ==========================================
export class ProfileRepository {
  static get(): UserProfile | null {
    try {
      const raw = safeStorageGet(STORAGE_KEYS.USER_PROFILE);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<UserProfile>;
      const baseline = parsed?.baseline as UserProfile['baseline'] | undefined;
      const validGoal = parsed.goal === 'pattern' || parsed.goal === 'reduce' || parsed.goal === 'quit';
      const validLanguage = parsed.preferredLanguage === 'de' || parsed.preferredLanguage === 'en';
      const validBaseline = Boolean(
        baseline &&
        typeof baseline.typicalCigarettesPerDay === 'number' && Number.isFinite(baseline.typicalCigarettesPerDay) && baseline.typicalCigarettesPerDay >= 0 &&
        typeof baseline.yearsSmoking === 'number' && Number.isFinite(baseline.yearsSmoking) && baseline.yearsSmoking >= 0
      );
      if (typeof parsed.id !== 'string' || !parsed.id || !validGoal || !validLanguage || !validBaseline) return null;
      return {
        ...(parsed as UserProfile),
        automaticSituations: Array.isArray(parsed.automaticSituations)
          ? parsed.automaticSituations.filter((item): item is string => typeof item === 'string')
          : [],
        onboardingCompleted: Boolean(parsed.onboardingCompleted),
      };
    } catch (err) {
      console.error('Error reading UserProfile:', err);
      return null;
    }
  }

  static save(profile: UserProfile): void {
    try {
      const next: UserProfile = { ...profile, updatedAt: new Date().toISOString() };
      safeStorageSet(STORAGE_KEYS.USER_PROFILE, JSON.stringify(next));
    } catch (err) {
      console.error('Error saving UserProfile:', err);
    }
  }

  static update(partial: Partial<UserProfile>): UserProfile | null {
    const current = this.get();
    if (!current) return null;
    const updated: UserProfile = {
      ...current,
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    this.save(updated);
    return updated;
  }

  static clear(): void {
    safeStorageRemove(STORAGE_KEYS.USER_PROFILE);
  }
}

// ==========================================
// JourneyRepository
// ==========================================
export class JourneyRepository {
  static get(): JourneyProgress {
    try {
      const raw = safeStorageGet(STORAGE_KEYS.JOURNEY_PROGRESS);
      if (!raw) return defaultJourneyProgress;
      const parsed = JSON.parse(raw) as Partial<JourneyProgress>;
      return {
        ...defaultJourneyProgress,
        ...parsed,
        completedDays: Array.isArray(parsed.completedDays) ? parsed.completedDays : [],
        missionCompletions: parsed.missionCompletions || {},
        missionResponses: parsed.missionResponses || {},
      };
    } catch {
      return defaultJourneyProgress;
    }
  }

  static save(progress: JourneyProgress): void {
    try {
      safeStorageSet(STORAGE_KEYS.JOURNEY_PROGRESS, JSON.stringify(progress));
    } catch (err) {
      console.error('Error saving JourneyProgress:', err);
    }
  }

  static update(partial: Partial<JourneyProgress>): JourneyProgress {
    const current = this.get();
    const updated: JourneyProgress = { ...current, ...partial };
    this.save(updated);
    return updated;
  }


  static setResponse(key: string, value: string | number | string[]): JourneyProgress {
    const current = this.get();
    return this.update({
      missionResponses: {
        ...current.missionResponses,
        [key]: value,
      },
    });
  }

  static completeDay(
    day: number,
    phase: JourneyProgress['phase'],
    nextPhase: JourneyProgress['phase'],
    response?: string | number | string[],
    evidenceIds: string[] = []
  ): JourneyProgress {
    const current = this.get();
    if (current.completedDays.includes(day)) return current;

    const completedAt = new Date().toISOString();
    const completedDays = [...current.completedDays, day].sort((a, b) => a - b);
    const missionCompletions = {
      ...current.missionCompletions,
      [String(day)]: { day, completedAt, response, evidenceIds },
    };
    const missionResponses = response === undefined
      ? current.missionResponses
      : { ...current.missionResponses, [`day_${day}`]: response };

    const journeyComplete = JourneyLifecycleEngine.isCompleteDays(completedDays);
    const nextOpenDay = journeyComplete ? 30 : JourneyLifecycleEngine.firstIncompleteDay(completedDays);
    const nextPhaseId = JourneyLifecycleEngine.phaseForDay(nextOpenDay);
    return this.update({
      phase: journeyComplete ? phase : nextPhaseId,
      phaseName: JourneyLifecycleEngine.phaseNameForDay(nextOpenDay),
      dayInLab: nextOpenDay,
      currentDayStartedAt: journeyComplete ? current.currentDayStartedAt : completedAt,
      completedDays,
      missionCompletions,
      missionResponses,
      journeyCompletedAt: journeyComplete ? completedAt : undefined,
    });
  }

  static clear(): void {
    safeStorageRemove(STORAGE_KEYS.JOURNEY_PROGRESS);
  }
}



// ==========================================
// ExperimentRepository
// ==========================================
export class ExperimentRepository {
  static getAll(): PersonalExperiment[] {
    try {
      const raw = safeStorageGet(STORAGE_KEYS.EXPERIMENTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as PersonalExperiment[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Error reading PersonalExperiments:', err);
      return [];
    }
  }

  static getById(id: string): PersonalExperiment | null {
    return this.getAll().find((experiment) => experiment.id === id) || null;
  }

  static getActive(): PersonalExperiment | null {
    return this.getAll().find((experiment) => experiment.status === 'active') || null;
  }

  static save(experiment: PersonalExperiment): void {
    try {
      const all = this.getAll();
      const index = all.findIndex((item) => item.id === experiment.id);
      if (index >= 0) all[index] = experiment;
      else all.unshift(experiment);
      safeStorageSet(STORAGE_KEYS.EXPERIMENTS, JSON.stringify(all));
    } catch (err) {
      console.error('Error saving PersonalExperiment:', err);
    }
  }

  static activate(experiment: PersonalExperiment): PersonalExperiment {
    const now = new Date().toISOString();
    const all = this.getAll().map((item) =>
      item.status === 'active' && item.id !== experiment.id ? { ...item, status: 'paused' as const } : item
    );
    const active: PersonalExperiment = {
      ...experiment,
      status: 'active',
      activatedAt: experiment.activatedAt || now,
      attemptCravingIds: experiment.attemptCravingIds || [],
    };
    const index = all.findIndex((item) => item.id === active.id);
    if (index >= 0) all[index] = active;
    else all.unshift(active);
    safeStorageSet(STORAGE_KEYS.EXPERIMENTS, JSON.stringify(all));
    return active;
  }

  static update(id: string, partial: Partial<PersonalExperiment>): PersonalExperiment | null {
    try {
      const all = this.getAll();
      const index = all.findIndex((item) => item.id === id);
      if (index < 0) return null;
      all[index] = { ...all[index], ...partial };
      safeStorageSet(STORAGE_KEYS.EXPERIMENTS, JSON.stringify(all));
      return all[index];
    } catch (err) {
      console.error('Error updating PersonalExperiment:', err);
      return null;
    }
  }

  static recordAttempt(experimentId: string, cravingId: string): PersonalExperiment | null {
    const experiment = this.getById(experimentId);
    if (!experiment) return null;
    const attemptCravingIds = experiment.attemptCravingIds.includes(cravingId)
      ? experiment.attemptCravingIds
      : [...experiment.attemptCravingIds, cravingId];
    return this.update(experimentId, { attemptCravingIds });
  }

  static replaceAll(experiments: PersonalExperiment[]): void {
    try {
      safeStorageSet(STORAGE_KEYS.EXPERIMENTS, JSON.stringify(Array.isArray(experiments) ? experiments : []));
    } catch (err) {
      console.error('Error replacing PersonalExperiments:', err);
    }
  }

  static clear(): void {
    safeStorageRemove(STORAGE_KEYS.EXPERIMENTS);
  }
}



const createDefaultQuitSupportPlan = (): QuitSupportPlan => {
  const now = new Date().toISOString();
  return { enabled: true, createdAt: now, updatedAt: now, highRiskPlans: [] };
};

export const defaultQuitSupportPlan: QuitSupportPlan = createDefaultQuitSupportPlan();

export class QuitSupportRepository {
  static get(): QuitSupportPlan {
    try {
      const raw = safeStorageGet(STORAGE_KEYS.QUIT_SUPPORT);
      const defaults = createDefaultQuitSupportPlan();
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as Partial<QuitSupportPlan>;
      return { ...defaults, ...parsed, highRiskPlans: Array.isArray(parsed.highRiskPlans) ? parsed.highRiskPlans : [] };
    } catch {
      return createDefaultQuitSupportPlan();
    }
  }
  static save(plan: QuitSupportPlan): void {
    const next = { ...plan, updatedAt: new Date().toISOString() };
    safeStorageSet(STORAGE_KEYS.QUIT_SUPPORT, JSON.stringify(next));
  }
  static update(partial: Partial<QuitSupportPlan>): QuitSupportPlan {
    const current = this.get();
    const next = { ...current, ...partial, updatedAt: new Date().toISOString() };
    this.save(next); return next;
  }
  static addHighRiskPlan(plan: QuitSupportPlan['highRiskPlans'][number]): QuitSupportPlan {
    const current = this.get();
    const deduped = current.highRiskPlans.filter((item) => item.signature !== plan.signature);
    return this.update({ highRiskPlans: [plan, ...deduped] });
  }
  static clear(): void { safeStorageRemove(STORAGE_KEYS.QUIT_SUPPORT); }
}

export class LapseRecoveryRepository {
  static getAll(): LapseRecoveryRecord[] {
    try {
      const raw = safeStorageGet(STORAGE_KEYS.LAPSE_RECOVERY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as LapseRecoveryRecord[] : [];
    } catch { return []; }
  }
  static save(record: LapseRecoveryRecord): void {
    const all = this.getAll();
    const idx = all.findIndex((item) => item.id === record.id || item.smokingEventId === record.smokingEventId);
    if (idx >= 0) all[idx] = record; else all.unshift(record);
    safeStorageSet(STORAGE_KEYS.LAPSE_RECOVERY, JSON.stringify(all));
  }
  static getBySmokingEventId(id: string): LapseRecoveryRecord | null { return this.getAll().find((item) => item.smokingEventId === id) || null; }
  static replaceAll(records: LapseRecoveryRecord[]): void {
    safeStorageSet(STORAGE_KEYS.LAPSE_RECOVERY, JSON.stringify(Array.isArray(records) ? records : []));
  }
  static clear(): void { safeStorageRemove(STORAGE_KEYS.LAPSE_RECOVERY); }
}

// Global wipe
export function resetAllData(): void {
  SmokingEventRepository.clear();
  CravingEventRepository.clear();
  ProfileRepository.clear();
  JourneyRepository.clear();
  ExperimentRepository.clear();
  QuitSupportRepository.clear();
  LapseRecoveryRepository.clear();
}
