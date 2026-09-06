import { CravingEvent, JourneyProgress, SmokingEvent, UserProfile } from '../../types';
import { formatPlace, formatSituation } from '../../i18n/translations';
import { PatternEngine } from './PatternEngine';
import { PersonalControlModel } from './PersonalControlModelEngine';

export interface ReductionOpportunity {
  trigger: string;
  place?: string;
  timeWindow?: string;
  observations: number;
  uniqueDays: number;
  averageCraving: number;
  automaticCount: number;
  titleDe: string;
  titleEn: string;
  bodyDe: string;
  bodyEn: string;
}

export interface BaselineComparison {
  daysObserved: number;
  recentAverage: number | null;
  baseline: number;
  percentDifference: number | null;
}

export interface QuitPreparationItem {
  id: string;
  complete: boolean;
  titleDe: string;
  titleEn: string;
  detailDe: string;
  detailEn: string;
}

export interface QuitPreparation {
  completed: number;
  total: number;
  items: QuitPreparationItem[];
  nextStepDe: string;
  nextStepEn: string;
}

const dayKey = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp.slice(0, 10);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/** Goal-specific support that remains pattern-first and non-coercive. */
export class GoalSupportEngine {
  static baselineComparison(profile: UserProfile, smokingEvents: SmokingEvent[]): BaselineComparison {
    const byDay = new Map<string, number>();
    for (const event of smokingEvents) {
      const key = dayKey(event.timestamp);
      byDay.set(key, (byDay.get(key) || 0) + 1);
    }
    const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-7);
    const recentAverage = days.length >= 3
      ? Math.round((days.reduce((sum, [, count]) => sum + count, 0) / days.length) * 10) / 10
      : null;
    const baseline = profile.baseline.typicalCigarettesPerDay || 0;
    const percentDifference = recentAverage !== null && baseline > 0
      ? Math.round(((recentAverage - baseline) / baseline) * 100)
      : null;
    return { daysObserved: days.length, recentAverage, baseline, percentDifference };
  }

  /**
   * Finds a conservative candidate for a reduction experiment: a repeated,
   * relatively low-intensity, automatic smoking loop. It never calls this the
   * "easiest cigarette" because the logs cannot prove that.
   */
  static reductionOpportunity(smokingEvents: SmokingEvent[]): ReductionOpportunity | null {
    const groups = new Map<string, {
      trigger: string;
      place?: string;
      timeWindow?: string;
      count: number;
      automaticCount: number;
      intensitySum: number;
      intensityCount: number;
      days: Set<string>;
    }>();

    for (const event of smokingEvents) {
      if (!event.trigger || event.decisionType !== 'automatic' || typeof event.cravingIntensity !== 'number') continue;
      const trigger = PatternEngine.normalizeTriggerKey(event.trigger);
      const place = event.place ? PatternEngine.normalizePlaceKey(event.place) : undefined;
      const date = new Date(event.timestamp);
      const timeWindow = Number.isNaN(date.getTime()) ? undefined : PatternEngine.getTimeWindow(date.getHours()).id;
      const key = `${trigger}|${place || ''}|${timeWindow || ''}`;
      const item = groups.get(key) || {
        trigger, place, timeWindow, count: 0, automaticCount: 0,
        intensitySum: 0, intensityCount: 0, days: new Set<string>(),
      };
      item.count += 1;
      item.automaticCount += 1;
      item.intensitySum += event.cravingIntensity;
      item.intensityCount += 1;
      item.days.add(dayKey(event.timestamp));
      groups.set(key, item);
    }

    const candidates = [...groups.values()]
      .filter((item) => item.count >= 3 && item.days.size >= 2 && item.intensityCount >= 3)
      .map((item) => ({ ...item, averageCraving: item.intensitySum / item.intensityCount }))
      .filter((item) => item.averageCraving <= 5.5)
      .sort((a, b) => a.averageCraving - b.averageCraving || b.days.size - a.days.size || b.count - a.count);

    const best = candidates[0];
    if (!best) return null;

    const triggerDe = formatSituation(best.trigger, 'de');
    const triggerEn = formatSituation(best.trigger, 'en');
    const placeDe = best.place ? formatPlace(best.place, 'de') : null;
    const placeEn = best.place ? formatPlace(best.place, 'en') : null;
    const windowDe = best.timeWindow ? PatternEngine.getTimeWindowLabel(best.timeWindow, 'de') : null;
    const windowEn = best.timeWindow ? PatternEngine.getTimeWindowLabel(best.timeWindow, 'en') : null;
    const avg = Math.round(best.averageCraving * 10) / 10;

    return {
      trigger: best.trigger,
      place: best.place,
      timeWindow: best.timeWindow,
      observations: best.count,
      uniqueDays: best.days.size,
      averageCraving: avg,
      automaticCount: best.automaticCount,
      titleDe: 'Kandidat für einen sanften Reduktionstest',
      titleEn: 'Candidate for a gentle reduction test',
      bodyDe: `${triggerDe}${placeDe ? ` · ${placeDe}` : ''}${windowDe ? ` · ${windowDe}` : ''} tauchte ${best.count}-mal automatisch auf, bei Ø ${avg}/10 Drang. Das macht diese Schleife zu einem sinnvollen Testkandidaten – nicht automatisch zu einer „leichten“ Zigarette.`,
      bodyEn: `${triggerEn}${placeEn ? ` · ${placeEn}` : ''}${windowEn ? ` · ${windowEn}` : ''} appeared automatically ${best.count} times at an average urge of ${avg}/10. That makes it a useful test candidate, not automatically an “easy” cigarette.`,
    };
  }

  static quitPreparation(
    model: PersonalControlModel,
    journey: JourneyProgress,
    cravingEvents: CravingEvent[],
  ): QuitPreparation {
    const hasMappedTrigger = Boolean(model.strongestTrigger && model.strongestTriggerCount >= 5 && model.strongestTriggerDays >= 2);
    const hasTestedStrategy = model.strategies.some((strategy) => strategy.attempts >= 3 && strategy.uniqueDays >= 2);
    const hasObservedHardMoment = model.cravingDynamics.some((signal) => signal.observations >= 3 && signal.averageInitialIntensity >= 7);
    const hasIfThenPlan = Boolean(journey.missionResponses['if_then_plan']);
    const hasLapsePlan = Boolean(journey.missionResponses['lapse_plan']);
    const hasMultipleDays = model.uniqueDays >= 3;
    const hasReassessmentPractice = cravingEvents.filter((event) => Boolean(event.outcome) && event.outcome !== 'smoked').length >= 3;

    const items: QuitPreparationItem[] = [
      {
        id: 'map', complete: hasMappedTrigger && hasMultipleDays,
        titleDe: 'Hauptauslöser kartiert', titleEn: 'Main cue mapped',
        detailDe: 'Ein wiederkehrender Auslöser über mehrere Tage ist sichtbar.',
        detailEn: 'A recurring cue is visible across multiple days.',
      },
      {
        id: 'strategy', complete: hasTestedStrategy && hasReassessmentPractice,
        titleDe: 'Mindestens eine Strategie getestet', titleEn: 'At least one strategy tested',
        detailDe: 'Nicht nur ausgewählt, sondern in mehreren echten Situationen erneut bewertet.',
        detailEn: 'Not just selected, but reassessed in several real situations.',
      },
      {
        id: 'hard_moment', complete: hasObservedHardMoment,
        titleDe: 'Schwierige Situation erkannt', titleEn: 'Hard situation identified',
        detailDe: 'Smoke Lab kennt mindestens einen wiederholt stärkeren Drang-Kontext.',
        detailEn: 'Smoke Lab knows at least one repeatedly stronger urge context.',
      },
      {
        id: 'if_then', complete: hasIfThenPlan,
        titleDe: 'Wenn–Dann-Plan vorbereitet', titleEn: 'If–then plan prepared',
        detailDe: 'Eine konkrete Antwort für einen erwartbaren Auslöser ist festgelegt.',
        detailEn: 'A concrete response to an expected cue is defined.',
      },
      {
        id: 'lapse', complete: hasLapsePlan,
        titleDe: 'Plan für einen Ausrutscher vorbereitet', titleEn: 'Lapse plan prepared',
        detailDe: 'Eine Zigarette soll später nicht in „alles verloren“ übersetzt werden.',
        detailEn: 'One cigarette should not later translate into “everything is lost.”',
      },
    ];

    const incomplete = items.find((item) => !item.complete);
    const nextStepDe = incomplete
      ? `Als Nächstes: ${incomplete.titleDe}.`
      : 'Die wichtigsten Vorbereitungselemente sind vorhanden. Ein Aufhördatum bleibt optional und sollte nicht erzwungen werden.';
    const nextStepEn = incomplete
      ? `Next: ${incomplete.titleEn}.`
      : 'The main preparation elements are in place. A quit date remains optional and should not be forced.';

    return {
      completed: items.filter((item) => item.complete).length,
      total: items.length,
      items,
      nextStepDe,
      nextStepEn,
    };
  }
}
