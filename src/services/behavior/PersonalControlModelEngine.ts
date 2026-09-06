import {
  CravingEvent,
  PersonalExperiment,
  SmokingEvent,
  UserProfile,
} from '../../types';
import { formatPlace, formatSituation } from '../../i18n/translations';
import { ExperimentSequencingEngine } from './ExperimentSequencingEngine';
import { PatternEngine, EvidenceStrength } from './PatternEngine';

export type ControlModelMaturity = 'learning' | 'forming' | 'mapped';

export interface ControlLoopSignal {
  id: string;
  trigger: string;
  place?: string;
  timeWindow?: string;
  count: number;
  uniqueDays: number;
  strength: EvidenceStrength;
  averageCraving?: number;
}

export interface StrategySignal {
  interventionId: string;
  trigger: string;
  attempts: number;
  helpfulCount: number;
  helpfulRate: number;
  uniqueDays: number;
  averageIntensityChange?: number;
  strength: EvidenceStrength;
}

export interface CravingDynamicsSignal {
  trigger: string;
  observations: number;
  uniqueDays: number;
  averageInitialIntensity: number;
  reassessed: number;
  averageIntensityChange?: number;
  helpfulRate?: number;
  strength: EvidenceStrength;
}

export interface ControlPlanStep {
  id: string;
  titleDe: string;
  titleEn: string;
  bodyDe: string;
  bodyEn: string;
  evidence: EvidenceStrength;
}

export interface PersonalControlModel {
  maturity: ControlModelMaturity;
  totalObservations: number;
  uniqueDays: number;
  headlineDe: string;
  headlineEn: string;
  summaryDe: string;
  summaryEn: string;
  primaryLoop: ControlLoopSignal | null;
  secondaryLoops: ControlLoopSignal[];
  strongestTrigger: string | null;
  strongestTriggerCount: number;
  strongestTriggerDays: number;
  mostCommonPlace: string | null;
  peakTimeWindow: string | null;
  automaticRatio: number | null;
  strategies: StrategySignal[];
  cravingDynamics: CravingDynamicsSignal[];
  openQuestionDe?: string;
  openQuestionEn?: string;
  controlPlan: ControlPlanStep[];
  limitationsDe: string;
  limitationsEn: string;
}

const dayKey = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp.slice(0, 10);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const strategyName = (id: string, locale: 'de' | 'en'): string => {
  const names: Record<string, { de: string; en: string }> = {
    THREE_MINUTE_DELAY: { de: 'kurzer Entscheidungsabstand', en: 'a short decision gap' },
    CHANGE_LOCATION: { de: 'Ort wechseln', en: 'changing location' },
    COFFEE_SEPARATION: { de: 'Kaffee und Zigarette trennen', en: 'separating coffee and cigarette' },
    AFTER_MEAL_RESET: { de: 'die Routine nach dem Essen unterbrechen', en: 'interrupting the after-meal routine' },
    HANDS_BUSY: { de: 'die Hände kurz anders beschäftigen', en: 'keeping your hands busy briefly' },
    CONSCIOUS_CHOICE: { de: 'die Entscheidung bewusst vertagen', en: 'deliberately postponing the decision' },
    MORNING_DELAY: { de: 'die erste Zigarette verschieben', en: 'delaying the first cigarette' },
    BREAK_ROUTINE: { de: 'die Pausenroutine verändern', en: 'changing the break routine' },
  };
  return names[id]?.[locale] || id;
};

const defaultStrategyForTrigger = (trigger: string): string => {
  const key = PatternEngine.normalizeTriggerKey(trigger);
  if (key === 'Coffee') return 'COFFEE_SEPARATION';
  if (key === 'After meals') return 'AFTER_MEAL_RESET';
  if (key === 'Boredom') return 'HANDS_BUSY';
  if (key === 'Work breaks') return 'BREAK_ROUTINE';
  if (key === 'Morning routine') return 'MORNING_DELAY';
  if (key === 'Alcohol' || key === 'Social') return 'CONSCIOUS_CHOICE';
  if (key === 'Habit') return 'CHANGE_LOCATION';
  return 'THREE_MINUTE_DELAY';
};

/**
 * Builds a cautious on-device working model of the user's smoking loops.
 * This is descriptive product logic, not diagnosis, causal inference, or clinical prediction.
 */
export class PersonalControlModelEngine {
  static build(
    profile: UserProfile,
    smokingEvents: SmokingEvent[] = [],
    cravingEvents: CravingEvent[] = [],
    experiments: PersonalExperiment[] = [],
  ): PersonalControlModel {
    const analysis = PatternEngine.analyze(smokingEvents, cravingEvents);

    // Avoid double-counting a cigarette that is already linked to a craving event.
    const linkedSmokingIds = new Set(
      cravingEvents.map((event) => event.linkedSmokingEventId).filter(Boolean) as string[]
    );
    const observations = [
      ...cravingEvents.map((event) => ({
        trigger: PatternEngine.normalizeTriggerKey(event.trigger),
        place: event.place ? PatternEngine.normalizePlaceKey(event.place) : undefined,
        timestamp: event.timestamp,
        intensity: event.initialIntensity,
      })),
      ...smokingEvents
        .filter((event) => !linkedSmokingIds.has(event.id))
        .map((event) => ({
          trigger: PatternEngine.normalizeTriggerKey(event.trigger),
          place: event.place ? PatternEngine.normalizePlaceKey(event.place) : undefined,
          timestamp: event.timestamp,
          intensity: event.cravingIntensity,
        })),
    ];

    const uniqueDays = new Set(observations.map((event) => dayKey(event.timestamp))).size;

    const triggerDays = new Map<string, Set<string>>();
    const triggerCounts = new Map<string, number>();
    for (const event of observations) {
      if (!event.trigger) continue;
      triggerCounts.set(event.trigger, (triggerCounts.get(event.trigger) || 0) + 1);
      if (!triggerDays.has(event.trigger)) triggerDays.set(event.trigger, new Set());
      triggerDays.get(event.trigger)!.add(dayKey(event.timestamp));
    }

    // Build loop candidates with per-loop day stability rather than relying only on global days.
    const loopMap = new Map<string, { trigger: string; place?: string; timeWindow?: string; count: number; days: Set<string>; intensitySum: number; intensityCount: number }>();
    const addLoop = (trigger: string, place: string | undefined, timeWindow: string | undefined, timestamp: string, intensity?: number) => {
      const id = `${trigger}|${place || ''}|${timeWindow || ''}`;
      const current = loopMap.get(id) || { trigger, place, timeWindow, count: 0, days: new Set<string>(), intensitySum: 0, intensityCount: 0 };
      current.count += 1;
      current.days.add(dayKey(timestamp));
      if (typeof intensity === 'number') {
        current.intensitySum += intensity;
        current.intensityCount += 1;
      }
      loopMap.set(id, current);
    };

    for (const event of observations) {
      if (!event.trigger) continue;
      const date = new Date(event.timestamp);
      const window = Number.isNaN(date.getTime()) ? undefined : PatternEngine.getTimeWindow(date.getHours()).id;
      if (event.place) addLoop(event.trigger, event.place, undefined, event.timestamp, event.intensity);
      if (window) addLoop(event.trigger, undefined, window, event.timestamp, event.intensity);
      if (event.place && window) addLoop(event.trigger, event.place, window, event.timestamp, event.intensity);
    }

    const loops: ControlLoopSignal[] = [...loopMap.entries()]
      .map(([id, loop]) => {
        const uniqueLoopDays = loop.days.size;
        const strength: EvidenceStrength =
          loop.count >= 8 && uniqueLoopDays >= 3
            ? 'established'
            : loop.count >= 3 && uniqueLoopDays >= 2
              ? 'emerging'
              : 'insufficient';
        return {
          id,
          trigger: loop.trigger,
          place: loop.place,
          timeWindow: loop.timeWindow,
          count: loop.count,
          uniqueDays: uniqueLoopDays,
          strength,
          averageCraving: loop.intensityCount >= 3
            ? Math.round((loop.intensitySum / loop.intensityCount) * 10) / 10
            : undefined,
        };
      })
      .filter((loop) => loop.strength !== 'insufficient')
      .sort((a, b) => {
        const strengthScore = (value: EvidenceStrength) => value === 'established' ? 2 : value === 'emerging' ? 1 : 0;
        return strengthScore(b.strength) - strengthScore(a.strength)
          || b.uniqueDays - a.uniqueDays
          || b.count - a.count
          || ((b.place ? 1 : 0) + (b.timeWindow ? 1 : 0)) - ((a.place ? 1 : 0) + (a.timeWindow ? 1 : 0));
      });

    // Trigger-specific craving dynamics.
    const dynamicsMap = new Map<string, { count: number; days: Set<string>; initialSum: number; reassessed: number; deltaSum: number; helpful: number }>();
    for (const event of cravingEvents) {
      const trigger = PatternEngine.normalizeTriggerKey(event.trigger);
      if (!trigger || typeof event.initialIntensity !== 'number') continue;
      const item = dynamicsMap.get(trigger) || { count: 0, days: new Set<string>(), initialSum: 0, reassessed: 0, deltaSum: 0, helpful: 0 };
      item.count += 1;
      item.days.add(dayKey(event.timestamp));
      item.initialSum += event.initialIntensity;
      if (typeof event.finalIntensity === 'number') {
        item.reassessed += 1;
        item.deltaSum += event.initialIntensity - event.finalIntensity;
      }
      if (event.outcome === 'gone' || event.outcome === 'weaker') item.helpful += 1;
      dynamicsMap.set(trigger, item);
    }

    const cravingDynamics: CravingDynamicsSignal[] = [...dynamicsMap.entries()]
      .filter(([, item]) => item.count >= 3)
      .map(([trigger, item]) => ({
        trigger,
        observations: item.count,
        uniqueDays: item.days.size,
        averageInitialIntensity: Math.round((item.initialSum / item.count) * 10) / 10,
        reassessed: item.reassessed,
        averageIntensityChange: item.reassessed >= 2 ? Math.round((item.deltaSum / item.reassessed) * 10) / 10 : undefined,
        helpfulRate: item.count >= 3 ? Math.round((item.helpful / item.count) * 100) : undefined,
        strength: (item.count >= 8 && item.days.size >= 3 ? 'established' : item.days.size >= 2 ? 'emerging' : 'insufficient') as EvidenceStrength,
      }))
      .sort((a, b) => b.averageInitialIntensity - a.averageInitialIntensity || b.observations - a.observations);

    // Strategy memory, requiring repeated observations across days before stronger wording.
    const strategyMap = new Map<string, { trigger: string; interventionId: string; attempts: number; helpful: number; days: Set<string>; deltaSum: number; deltaCount: number }>();
    for (const event of cravingEvents) {
      if (!event.interventionId || !event.outcome || event.outcome === 'smoked') continue;
      const trigger = PatternEngine.normalizeTriggerKey(event.trigger);
      const id = `${trigger}|${event.interventionId}`;
      const item = strategyMap.get(id) || { trigger, interventionId: event.interventionId, attempts: 0, helpful: 0, days: new Set<string>(), deltaSum: 0, deltaCount: 0 };
      item.attempts += 1;
      item.days.add(dayKey(event.timestamp));
      if (event.outcome === 'gone' || event.outcome === 'weaker') item.helpful += 1;
      if (typeof event.finalIntensity === 'number') {
        item.deltaSum += event.initialIntensity - event.finalIntensity;
        item.deltaCount += 1;
      }
      strategyMap.set(id, item);
    }

    const strategies: StrategySignal[] = [...strategyMap.values()]
      .filter((item) => item.attempts >= 3)
      .map((item) => ({
        interventionId: item.interventionId,
        trigger: item.trigger,
        attempts: item.attempts,
        helpfulCount: item.helpful,
        helpfulRate: Math.round((item.helpful / item.attempts) * 100),
        uniqueDays: item.days.size,
        averageIntensityChange: item.deltaCount >= 2 ? Math.round((item.deltaSum / item.deltaCount) * 10) / 10 : undefined,
        strength: (item.attempts >= 5 && item.days.size >= 3 ? 'established' : item.days.size >= 2 ? 'emerging' : 'insufficient') as EvidenceStrength,
      }))
      .sort((a, b) => b.helpfulRate - a.helpfulRate || b.attempts - a.attempts);

    const strongestTrigger = analysis.strongestTrigger?.name || analysis.topTriggers[0]?.name || null;
    const strongestTriggerCount = strongestTrigger ? (triggerCounts.get(strongestTrigger) || 0) : 0;
    const strongestTriggerDays = strongestTrigger ? (triggerDays.get(strongestTrigger)?.size || 0) : 0;
    const automaticRatio = smokingEvents.filter((event) => event.decisionType).length >= 5 ? analysis.automaticRatio : null;

    const maturity: ControlModelMaturity =
      analysis.totalObservations >= 20 && uniqueDays >= 5 && (loops.some((loop) => loop.strength === 'established') || strategies.some((strategy) => strategy.strength === 'established'))
        ? 'mapped'
        : analysis.totalObservations >= 8 && uniqueDays >= 2
          ? 'forming'
          : 'learning';

    const nextQuestion = ExperimentSequencingEngine.next(profile, smokingEvents, cravingEvents, experiments);

    let headlineDe = 'Dein Modell entsteht.';
    let headlineEn = 'Your model is taking shape.';
    let summaryDe = 'Noch sammeln wir genug echte Situationen, um Auslöser, Kontext und Reaktion voneinander zu unterscheiden.';
    let summaryEn = 'We are still collecting enough real situations to separate cue, context, and response.';

    if (maturity === 'forming') {
      headlineDe = 'Deine Schleifen werden klarer.';
      headlineEn = 'Your loops are becoming clearer.';
      summaryDe = 'Smoke Lab sieht wiederkehrende Signale, hält offene Fragen aber bewusst offen, bis sie sich über mehrere Situationen und Tage bestätigen.';
      summaryEn = 'Smoke Lab can see recurring signals while deliberately keeping open questions open until they repeat across situations and days.';
    } else if (maturity === 'mapped') {
      headlineDe = 'Dein persönliches Control Model.';
      headlineEn = 'Your personal Control Model.';
      summaryDe = 'Mehrere Teile deines Musters wiederholen sich inzwischen über verschiedene Tage. Das Modell bleibt eine persönliche Arbeitskarte – keine Diagnose.';
      summaryEn = 'Several parts of your pattern now repeat across different days. The model remains a personal working map, not a diagnosis.';
    }

    const controlPlan: ControlPlanStep[] = [];
    const primaryLoop = loops[0] || null;
    const bestTriggerStrategy = primaryLoop
      ? strategies.find((strategy) => strategy.trigger === primaryLoop.trigger && strategy.helpfulRate >= 50)
      : undefined;

    if (primaryLoop) {
      const interventionId = bestTriggerStrategy?.interventionId || defaultStrategyForTrigger(primaryLoop.trigger);
      const triggerDe = formatSituation(primaryLoop.trigger, 'de');
      const triggerEn = formatSituation(primaryLoop.trigger, 'en');
      const contextDe = primaryLoop.place
        ? ` bei ${formatPlace(primaryLoop.place, 'de')}`
        : primaryLoop.timeWindow
          ? ` am ${PatternEngine.getTimeWindowLabel(primaryLoop.timeWindow, 'de') || primaryLoop.timeWindow}`
          : '';
      const contextEn = primaryLoop.place
        ? ` at ${formatPlace(primaryLoop.place, 'en')}`
        : primaryLoop.timeWindow
          ? ` in the ${PatternEngine.getTimeWindowLabel(primaryLoop.timeWindow, 'en') || primaryLoop.timeWindow}`
          : '';
      controlPlan.push({
        id: 'primary_loop',
        titleDe: `Wenn ${triggerDe}${contextDe} auftaucht`,
        titleEn: `When ${triggerEn.toLowerCase()}${contextEn} appears`,
        bodyDe: `Nicht sofort verbieten. Erst ${strategyName(interventionId, 'de')} und danach neu entscheiden.`,
        bodyEn: `Do not ban it immediately. First try ${strategyName(interventionId, 'en')}, then decide again.`,
        evidence: primaryLoop.strength,
      });
    }

    if (automaticRatio !== null && automaticRatio >= 60) {
      controlPlan.push({
        id: 'autopilot',
        titleDe: 'Wenn es nach Autopilot aussieht',
        titleEn: 'When it looks like autopilot',
        bodyDe: 'Vor der Zigarette einmal benennen: Auslöser, Ort, Stärke. Schon diese kurze Unterbrechung macht die Entscheidung beobachtbar.',
        bodyEn: 'Before the cigarette, name cue, place, and intensity once. That brief interruption makes the decision observable.',
        evidence: smokingEvents.length >= 10 ? 'established' : 'emerging',
      });
    }

    if (nextQuestion) {
      controlPlan.push({
        id: 'open_question',
        titleDe: 'Was wir als Nächstes klären',
        titleEn: 'What we clarify next',
        bodyDe: nextQuestion.questionDe,
        bodyEn: nextQuestion.questionEn,
        evidence: nextQuestion.experiment.sourceEvidence,
      });
    }

    if (controlPlan.length === 0) {
      controlPlan.push({
        id: 'observe',
        titleDe: 'Noch nichts optimieren',
        titleEn: 'Do not optimise yet',
        bodyDe: 'Erfasse echte Drang-Momente. Sobald sich Situationen wiederholen, baut Smoke Lab daraus einen konkreteren Plan.',
        bodyEn: 'Capture real urge moments. As situations repeat, Smoke Lab will turn them into a more specific plan.',
        evidence: 'insufficient',
      });
    }

    return {
      maturity,
      totalObservations: analysis.totalObservations,
      uniqueDays,
      headlineDe,
      headlineEn,
      summaryDe,
      summaryEn,
      primaryLoop,
      secondaryLoops: loops.slice(1, 4),
      strongestTrigger,
      strongestTriggerCount,
      strongestTriggerDays,
      mostCommonPlace: (analysis.topPlaces[0]?.count || 0) >= 5 ? analysis.topPlaces[0].name : null,
      peakTimeWindow: analysis.hasEnoughDataForTime ? (analysis.peakTimeWindowDe ? this.timeWindowIdFromLabel(analysis.peakTimeWindowDe) : null) : null,
      automaticRatio,
      strategies,
      cravingDynamics,
      openQuestionDe: nextQuestion?.questionDe,
      openQuestionEn: nextQuestion?.questionEn,
      controlPlan: controlPlan.slice(0, 3),
      limitationsDe: 'Dieses Modell fasst nur deine eigenen Einträge zusammen. Es ist keine Diagnose, keine Vorhersage und kein Beweis für Ursache oder Wirksamkeit.',
      limitationsEn: 'This model summarizes only your own entries. It is not a diagnosis, prediction, or proof of cause or effectiveness.',
    };
  }

  private static timeWindowIdFromLabel(label: string): string | null {
    const lower = label.toLowerCase();
    if (lower.includes('spätabend')) return 'late_evening';
    if (lower.includes('vormittag')) return 'late_morning';
    if (lower.includes('nachmittag')) return 'afternoon';
    if (lower.includes('morgen')) return 'morning';
    if (lower.includes('abend')) return 'evening';
    if (lower.includes('nacht')) return 'night';
    return null;
  }
}
