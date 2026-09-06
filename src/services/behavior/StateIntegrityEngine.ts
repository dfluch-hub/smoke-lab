import {
  CravingEvent,
  JourneyProgress,
  LapseRecoveryRecord,
  PersonalExperiment,
  QuitSupportPlan,
  SmokingEvent,
} from '../../types';
import { JourneyLifecycleEngine } from './JourneyLifecycleEngine';

export interface SmokeLabStateSnapshot {
  smokingEvents: SmokingEvent[];
  cravingEvents: CravingEvent[];
  journey: JourneyProgress;
  experiments: PersonalExperiment[];
  quitSupport: QuitSupportPlan;
  recoveries: LapseRecoveryRecord[];
}

export interface StateIntegrityResult {
  state: SmokeLabStateSnapshot;
  repairCodes: string[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isIsoLike = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && Number.isFinite(new Date(value).getTime());

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const finiteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const optionalIntensity = (value: unknown): number | undefined => {
  const n = finiteNumber(value);
  return n === undefined ? undefined : clamp(Math.round(n), 1, 10);
};

const newestFirst = <T extends { timestamp?: string; createdAt?: string; updatedAt?: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => {
    const aRaw = a.timestamp || a.updatedAt || a.createdAt || '';
    const bRaw = b.timestamp || b.updatedAt || b.createdAt || '';
    const aTime = new Date(aRaw).getTime();
    const bTime = new Date(bRaw).getTime();
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  });

const dedupeBy = <T>(items: T[], key: (item: T) => string): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

const sanitizeSmokingEvents = (input: unknown): SmokingEvent[] => {
  if (!Array.isArray(input)) return [];
  const valid: SmokingEvent[] = [];
  for (const raw of input) {
    if (!isObject(raw)) continue;
    if (typeof raw.id !== 'string' || !raw.id.trim()) continue;
    if (!isIsoLike(raw.timestamp)) continue;
    if (typeof raw.trigger !== 'string' || !raw.trigger.trim()) continue;
    if (raw.decisionType !== 'automatic' && raw.decisionType !== 'intentional') continue;

    const event: SmokingEvent = {
      ...(raw as unknown as SmokingEvent),
      id: raw.id,
      timestamp: raw.timestamp,
      trigger: raw.trigger,
      decisionType: raw.decisionType,
      behavior: 'smoking',
      action: 'cigarette',
    };
    const intensity = optionalIntensity(raw.cravingIntensity);
    if (intensity === undefined) delete event.cravingIntensity;
    else event.cravingIntensity = intensity;
    valid.push(event);
  }
  return dedupeBy(newestFirst(valid), (event) => event.id);
};

const sanitizeCravingEvents = (input: unknown): CravingEvent[] => {
  if (!Array.isArray(input)) return [];
  const outcomes = new Set(['gone', 'weaker', 'unchanged', 'stronger', 'smoked']);
  const valid: CravingEvent[] = [];
  for (const raw of input) {
    if (!isObject(raw)) continue;
    if (typeof raw.id !== 'string' || !raw.id.trim()) continue;
    if (!isIsoLike(raw.timestamp)) continue;
    if (typeof raw.trigger !== 'string' || !raw.trigger.trim()) continue;
    if (typeof raw.interventionId !== 'string' || !raw.interventionId.trim()) continue;
    if (!isIsoLike(raw.interventionStartedAt)) continue;
    const initialIntensity = optionalIntensity(raw.initialIntensity);
    if (initialIntensity === undefined) continue;

    const event: CravingEvent = {
      ...(raw as unknown as CravingEvent),
      id: raw.id,
      timestamp: raw.timestamp,
      trigger: raw.trigger,
      initialIntensity,
      interventionId: raw.interventionId,
      interventionStartedAt: raw.interventionStartedAt,
    };
    if (!outcomes.has(String(raw.outcome))) delete event.outcome;
    const finalIntensity = optionalIntensity(raw.finalIntensity);
    if (finalIntensity === undefined) delete event.finalIntensity;
    else event.finalIntensity = finalIntensity;
    const elapsed = finiteNumber(raw.elapsedSeconds);
    if (elapsed === undefined) delete event.elapsedSeconds;
    else event.elapsedSeconds = Math.max(0, Math.round(elapsed));
    valid.push(event);
  }
  return dedupeBy(newestFirst(valid), (event) => event.id);
};

const sanitizeExperiments = (input: unknown, cravingIds: Set<string>): PersonalExperiment[] => {
  if (!Array.isArray(input)) return [];
  const statuses = new Set(['suggested', 'active', 'completed', 'paused']);
  const kinds = new Set(['context_shift', 'cue_separation', 'routine_break', 'delay_test', 'repeat_strategy', 'time_window_test']);
  const valid: PersonalExperiment[] = [];

  for (const raw of input) {
    if (!isObject(raw)) continue;
    if (typeof raw.id !== 'string' || !raw.id.trim()) continue;
    if (typeof raw.signature !== 'string' || !raw.signature.trim()) continue;
    if (!kinds.has(String(raw.kind)) || !statuses.has(String(raw.status))) continue;
    if (!isIsoLike(raw.createdAt)) continue;
    if (typeof raw.targetTrigger !== 'string' || !raw.targetTrigger.trim()) continue;
    if (typeof raw.interventionId !== 'string' || !raw.interventionId.trim()) continue;

    const attempts = Array.isArray(raw.attemptCravingIds)
      ? [...new Set(raw.attemptCravingIds.filter((id): id is string => typeof id === 'string' && cravingIds.has(id)))]
      : [];
    const targetAttemptsRaw = finiteNumber(raw.targetAttempts);
    const targetAttempts = targetAttemptsRaw === undefined ? 3 : clamp(Math.round(targetAttemptsRaw), 1, 20);
    const exp = {
      ...(raw as unknown as PersonalExperiment),
      attemptCravingIds: attempts,
      targetAttempts,
    };
    valid.push(exp);
  }

  const deduped = dedupeBy(
    newestFirst(valid.map((item) => ({ ...item, timestamp: item.completedAt || item.activatedAt || item.createdAt }))),
    (item) => item.id,
  ).map(({ timestamp: _timestamp, ...item }) => item as PersonalExperiment);

  const active = deduped
    .filter((item) => item.status === 'active')
    .sort((a, b) => new Date(b.activatedAt || b.createdAt).getTime() - new Date(a.activatedAt || a.createdAt).getTime());
  const winnerId = active[0]?.id;
  return deduped.map((item) => item.status === 'active' && item.id !== winnerId ? { ...item, status: 'paused' } : item);
};

const sanitizeJourney = (
  input: unknown,
  smokeCount: number,
  cravingCount: number,
  interruptedCount: number,
): JourneyProgress => {
  const raw = isObject(input) ? input : {};
  const completedDays = JourneyLifecycleEngine.normalizeCompletedDays(raw.completedDays);
  const journeyComplete = JourneyLifecycleEngine.isCompleteDays(completedDays);
  const dayInLab = journeyComplete ? 30 : JourneyLifecycleEngine.firstIncompleteDay(completedDays);

  const missionCompletions: JourneyProgress['missionCompletions'] = {};
  if (isObject(raw.missionCompletions)) {
    for (const [key, value] of Object.entries(raw.missionCompletions)) {
      if (!isObject(value)) continue;
      const day = finiteNumber(value.day);
      if (day === undefined || !Number.isInteger(day) || day < 1 || day > 30) continue;
      if (!isIsoLike(value.completedAt)) continue;
      missionCompletions[String(day)] = value as unknown as JourneyProgress['missionCompletions'][string];
    }
  }

  const missionResponses = isObject(raw.missionResponses)
    ? raw.missionResponses as JourneyProgress['missionResponses']
    : {};
  const controlRaw = finiteNumber(raw.controlScore);
  const controlScore = controlRaw === undefined ? 50 : clamp(Math.round(controlRaw), 0, 100);
  const currentDayStartedAt = isIsoLike(raw.currentDayStartedAt) ? raw.currentDayStartedAt : undefined;
  const completionCandidate = {
    completedDays,
    missionCompletions,
    journeyCompletedAt: isIsoLike(raw.journeyCompletedAt) ? raw.journeyCompletedAt : undefined,
  };
  const journeyCompletedAt = JourneyLifecycleEngine.completionTimestamp(completionCandidate);
  const baseline = ['learning', 'lower', 'stable', 'higher'].includes(String(raw.lastBaselineComparison))
    ? raw.lastBaselineComparison as JourneyProgress['lastBaselineComparison']
    : 'learning';

  return {
    phase: JourneyLifecycleEngine.phaseForDay(dayInLab),
    phaseName: JourneyLifecycleEngine.phaseNameForDay(dayInLab),
    dayInLab,
    currentDayStartedAt,
    completedDays,
    missionCompletions,
    missionResponses,
    journeyCompletedAt,
    controlScore,
    totalCigarettesLogged: smokeCount,
    totalCravingsLogged: cravingCount,
    totalInterruptedLoops: interruptedCount,
    lastBaselineComparison: baseline,
  };
};

const sanitizeQuitSupport = (input: unknown): QuitSupportPlan => {
  const now = new Date().toISOString();
  const raw = isObject(input) ? input : {};
  const date = typeof raw.quitDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.quitDate) ? raw.quitDate : undefined;
  const plans = Array.isArray(raw.highRiskPlans)
    ? raw.highRiskPlans.filter((item): item is QuitSupportPlan['highRiskPlans'][number] =>
      isObject(item) && typeof item.id === 'string' && Boolean(item.id) && typeof item.signature === 'string' && Boolean(item.signature) && typeof item.trigger === 'string' && Boolean(item.trigger) && typeof item.planText === 'string')
    : [];
  const dedupedPlans = dedupeBy(newestFirst(plans), (plan) => plan.signature);
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
    quitDate: date,
    createdAt: isIsoLike(raw.createdAt) ? raw.createdAt : now,
    updatedAt: isIsoLike(raw.updatedAt) ? raw.updatedAt : now,
    highRiskPlans: dedupedPlans,
  };
};

const sanitizeRecoveries = (input: unknown, smokeIds: Set<string>): LapseRecoveryRecord[] => {
  if (!Array.isArray(input)) return [];
  const valid = input.filter((raw): raw is LapseRecoveryRecord =>
    isObject(raw) && typeof raw.id === 'string' && Boolean(raw.id) && typeof raw.smokingEventId === 'string' && smokeIds.has(raw.smokingEventId) && isIsoLike(raw.createdAt) && typeof raw.trigger === 'string' && Boolean(raw.trigger));
  return dedupeBy(newestFirst(valid), (record) => record.smokingEventId);
};

const normalizedJson = (value: unknown): string => JSON.stringify(value);

/**
 * Repairs only structural inconsistencies that can be resolved deterministically.
 * It never invents smoking events, experiment outcomes, medical meaning or user choices.
 */
export class StateIntegrityEngine {
  static repair(snapshot: SmokeLabStateSnapshot): StateIntegrityResult {
    const repairCodes: string[] = [];
    let smokingEvents = sanitizeSmokingEvents(snapshot.smokingEvents);
    let cravingEvents = sanitizeCravingEvents(snapshot.cravingEvents);

    const smokeIds = new Set(smokingEvents.map((event) => event.id));
    const cravingIds = new Set(cravingEvents.map((event) => event.id));

    smokingEvents = smokingEvents.map((event) =>
      event.linkedCravingEventId && !cravingIds.has(event.linkedCravingEventId)
        ? { ...event, linkedCravingEventId: undefined }
        : event
    );
    cravingEvents = cravingEvents.map((event) =>
      event.linkedSmokingEventId && !smokeIds.has(event.linkedSmokingEventId)
        ? { ...event, linkedSmokingEventId: undefined }
        : event
    );

    const experiments = sanitizeExperiments(snapshot.experiments, cravingIds);
    const quitSupport = sanitizeQuitSupport(snapshot.quitSupport);
    const recoveries = sanitizeRecoveries(snapshot.recoveries, smokeIds);
    const journey = sanitizeJourney(
      snapshot.journey,
      smokingEvents.length,
      cravingEvents.length,
      cravingEvents.filter((event) => event.interrupted === true).length,
    );

    const next: SmokeLabStateSnapshot = { smokingEvents, cravingEvents, journey, experiments, quitSupport, recoveries };
    const sections: Array<[keyof SmokeLabStateSnapshot, string]> = [
      ['smokingEvents', 'smoking_events_repaired'],
      ['cravingEvents', 'craving_events_repaired'],
      ['journey', 'journey_progress_repaired'],
      ['experiments', 'experiments_repaired'],
      ['quitSupport', 'quit_support_repaired'],
      ['recoveries', 'recovery_records_repaired'],
    ];
    for (const [key, code] of sections) {
      if (normalizedJson(snapshot[key]) !== normalizedJson(next[key])) repairCodes.push(code);
    }

    return { state: next, repairCodes };
  }
}
