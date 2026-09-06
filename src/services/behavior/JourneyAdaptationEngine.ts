import { CravingEvent, SmokingEvent, UserProfile } from '../../types';
import { PatternEngine } from './PatternEngine';

export type JourneyChallengeLevel = 'gentle' | 'standard' | 'stretch';
export type JourneyDataStage = 'learning' | 'signal' | 'pattern';

export interface JourneyAdaptationProfile {
  challengeLevel: JourneyChallengeLevel;
  dataStage: JourneyDataStage;
  personalized: boolean;
  targetTrigger?: string;
  targetPlace?: string;
  targetTimeWindow?: string;
  preferredInterventionId?: string;
  highIntensityTrigger?: string;
  recentCompletedAttempts: number;
  recentHelpfulRate: number | null;
  recentAverageIntensity: number | null;
  reasonDe: string;
  reasonEn: string;
}

/**
 * Creates a cautious, local adaptation profile for the 30-day Journey.
 *
 * This is not a clinical risk score or prediction model. It only decides how
 * specific/demanding the next behavioral experiment should be based on the
 * user's own completed observations.
 */
export class JourneyAdaptationEngine {
  private static eventTime(event: CravingEvent | SmokingEvent): number {
    const value = new Date(event.timestamp).getTime();
    return Number.isFinite(value) ? value : 0;
  }

  private static recentCompletedCravings(cravingEvents: CravingEvent[], limit = 6): CravingEvent[] {
    return [...cravingEvents]
      .filter((event) => Boolean(event.outcome))
      .sort((a, b) => this.eventTime(b) - this.eventTime(a))
      .slice(0, limit);
  }

  private static bestInterventionId(cravingEvents: CravingEvent[]): string | undefined {
    const analysis = PatternEngine.analyze([], cravingEvents);
    let best: { id: string; successRate: number; attempts: number } | undefined;

    Object.values(analysis.interventionsByTrigger).forEach((stats) => {
      stats.forEach((stat) => {
        if (stat.totalAttempts < PatternEngine.MIN_USES_FOR_INTERVENTION_EFFECTIVENESS) return;
        if (stat.successRate < 50) return;
        if (
          !best ||
          stat.successRate > best.successRate ||
          (stat.successRate === best.successRate && stat.totalAttempts > best.attempts)
        ) {
          best = { id: stat.interventionId, successRate: stat.successRate, attempts: stat.totalAttempts };
        }
      });
    });
    return best?.id;
  }

  private static highIntensityTrigger(smokingEvents: SmokingEvent[], cravingEvents: CravingEvent[]): string | undefined {
    const values: Record<string, { sum: number; count: number }> = {};
    const add = (trigger?: string, intensity?: number) => {
      if (!trigger || typeof intensity !== 'number' || intensity <= 0) return;
      const key = PatternEngine.normalizeTriggerKey(trigger);
      if (!values[key]) values[key] = { sum: 0, count: 0 };
      values[key].sum += intensity;
      values[key].count += 1;
    };
    cravingEvents.forEach((event) => add(event.trigger, event.initialIntensity));
    smokingEvents.filter((event) => !event.linkedCravingEventId).forEach((event) => add(event.trigger, event.cravingIntensity));

    let best: { trigger: string; avg: number; count: number } | undefined;
    Object.entries(values).forEach(([trigger, value]) => {
      if (value.count < 3) return;
      const avg = value.sum / value.count;
      if (!best || avg > best.avg || (avg === best.avg && value.count > best.count)) {
        best = { trigger, avg, count: value.count };
      }
    });
    return best?.trigger;
  }

  static build(
    profile: UserProfile,
    smokingEvents: SmokingEvent[] = [],
    cravingEvents: CravingEvent[] = []
  ): JourneyAdaptationProfile {
    const analysis = PatternEngine.analyze(smokingEvents, cravingEvents);
    const recent = this.recentCompletedCravings(cravingEvents);
    const helpful = recent.filter((event) => event.outcome === 'gone' || event.outcome === 'weaker').length;
    const difficult = recent.filter((event) => event.outcome === 'stronger' || event.outcome === 'smoked').length;
    const recentHelpfulRate = recent.length ? Math.round((helpful / recent.length) * 100) : null;
    const intensityValues = recent.map((event) => event.initialIntensity).filter((value) => typeof value === 'number' && value > 0);
    const recentAverageIntensity = intensityValues.length
      ? Math.round((intensityValues.reduce((sum, value) => sum + value, 0) / intensityValues.length) * 10) / 10
      : null;

    let challengeLevel: JourneyChallengeLevel = 'standard';
    if (
      recent.length < 3 ||
      (recentAverageIntensity !== null && recentAverageIntensity >= 8) ||
      (recent.length >= 3 && difficult / recent.length >= 0.5)
    ) {
      challengeLevel = 'gentle';
    } else if (
      recent.length >= 5 &&
      recentHelpfulRate !== null && recentHelpfulRate >= 60 &&
      (recentAverageIntensity === null || recentAverageIntensity <= 6.5)
    ) {
      challengeLevel = 'stretch';
    }

    let dataStage: JourneyDataStage = 'learning';
    if (analysis.hasEnoughDataForPatterns || analysis.triggerConfidence === 'established') dataStage = 'pattern';
    else if (analysis.totalObservations >= 3 || analysis.triggerConfidence === 'emerging') dataStage = 'signal';

    const combo = analysis.combinations[0];
    const strongest = analysis.strongestTrigger?.name || analysis.topTriggers[0]?.name;
    const onboarding = profile.automaticSituations?.[0]
      ? PatternEngine.normalizeTriggerKey(profile.automaticSituations[0])
      : undefined;

    const targetTrigger = combo?.trigger || strongest || onboarding;
    const targetPlace = combo?.place || analysis.topPlaces[0]?.name;
    const targetTimeWindow = combo?.timeWindow;
    const preferredInterventionId = this.bestInterventionId(cravingEvents);
    const highIntensityTrigger = this.highIntensityTrigger(smokingEvents, cravingEvents);
    const personalized = dataStage !== 'learning' || Boolean(preferredInterventionId || combo);

    let reasonDe = 'Smoke Lab sammelt noch Ausgangsdaten. Deshalb bleibt der heutige Test bewusst einfach.';
    let reasonEn = 'Smoke Lab is still collecting baseline observations, so today’s test stays deliberately simple.';

    if (combo && combo.count >= PatternEngine.MIN_EVENTS_FOR_COMBINATION) {
      reasonDe = `${PatternEngine.normalizeTriggerKey(combo.trigger)}${combo.place ? ` + ${PatternEngine.normalizePlaceKey(combo.place)}` : ''} ist wiederholt gemeinsam aufgetaucht. Der heutige Test zielt deshalb auf genau diese Schleife.`;
      reasonEn = `${PatternEngine.normalizeTriggerKey(combo.trigger)}${combo.place ? ` + ${PatternEngine.normalizePlaceKey(combo.place)}` : ''} has repeatedly appeared together, so today’s test targets that specific loop.`;
    } else if (strongest && analysis.topTriggers[0]?.count >= 3) {
      reasonDe = `${PatternEngine.normalizeTriggerKey(strongest)} taucht in deinen bisherigen Einträgen am häufigsten auf. Deshalb wird der heutige Test daran ausgerichtet.`;
      reasonEn = `${PatternEngine.normalizeTriggerKey(strongest)} appears most often in your current logs, so today’s test is oriented around it.`;
    }

    if (preferredInterventionId) {
      reasonDe += ' Eine bereits mehrfach hilfreiche Strategie wird bevorzugt, ohne daraus eine Garantie abzuleiten.';
      reasonEn += ' A strategy that has been helpful repeatedly is preferred without treating that as a guarantee.';
    }

    if (challengeLevel === 'gentle' && recent.length >= 3) {
      reasonDe += ' Die letzten Situationen waren eher intensiv oder wenig veränderbar; die Aufgabe wird deshalb nicht unnötig erschwert.';
      reasonEn += ' Recent situations were relatively intense or less responsive, so the task is not made unnecessarily harder.';
    } else if (challengeLevel === 'stretch') {
      reasonDe += ' Mehrere jüngere Versuche waren gut durchführbar; deshalb darf der nächste Test etwas mehr Wiederholung enthalten.';
      reasonEn += ' Several recent attempts were manageable, so the next test can include slightly more repetition.';
    }

    return {
      challengeLevel,
      dataStage,
      personalized,
      targetTrigger,
      targetPlace,
      targetTimeWindow,
      preferredInterventionId,
      highIntensityTrigger,
      recentCompletedAttempts: recent.length,
      recentHelpfulRate,
      recentAverageIntensity,
      reasonDe,
      reasonEn,
    };
  }
}
