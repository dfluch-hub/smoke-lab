import { CravingEvent, SmokingEvent } from '../../types';
import { formatPlace, formatSituation } from '../../i18n/translations';

export interface FrequencyItem {
  name: string;
  count: number;
  percentage: number;
}

export interface HourlyDistributionItem {
  hour: number; // 0 - 23
  label: string; // e.g. "08:00"
  count: number;
  intensitySum: number;
}

export interface TriggerInterventionStat {
  interventionId: string;
  totalAttempts: number;
  successCount: number; // gone or weaker
  successRate: number; // 0 - 100
}

export type EvidenceStrength = 'insufficient' | 'emerging' | 'established';

export interface CombinationPattern {
  key: string;
  labelDe: string;
  labelEn: string;
  trigger: string;
  place?: string;
  timeWindow?: string;
  count: number;
  strength: EvidenceStrength;
}

export interface PatternAnalysisResult {
  totalObservations: number;
  uniqueDaysRecorded: number;
  hasEnoughDataForTriggers: boolean; // >= 5 events
  hasEnoughDataForPatterns: boolean; // >= 8 total observations
  hasEnoughDataForTime: boolean; // >= 7 timestamped events
  strongestTrigger: FrequencyItem | null;
  triggerConfidence: EvidenceStrength;
  topTriggers: FrequencyItem[];
  topPlaces: FrequencyItem[];
  automaticRatio: number; // 0 - 100
  intentionalRatio: number; // 0 - 100
  averageCravingIntensity: number | null; // 1 - 10
  peakHourLabel: string | null; // e.g. "08:00"
  peakTimeWindowDe: string | null;
  peakTimeWindowEn: string | null;
  hourlyDistribution: HourlyDistributionItem[];
  interventionsByTrigger: Record<string, TriggerInterventionStat[]>;
  combinations: CombinationPattern[];
}

export class PatternEngine {
  /**
   * Stored logs may come from either UI language. Normalize them before
   * grouping so switching DE/EN never splits one real pattern into two.
   */
  static normalizeTriggerKey(trigger?: string): string {
    const raw = (trigger || '').trim().toLowerCase();
    const map: Record<string, string> = {
      kaffee: 'Coffee', coffee: 'Coffee',
      stress: 'Stress',
      'nach dem essen': 'After meals', 'after meals': 'After meals', 'after meal': 'After meals',
      alkohol: 'Alcohol', alcohol: 'Alcohol',
      langeweile: 'Boredom', boredom: 'Boredom',
      sozial: 'Social', social: 'Social', gesellschaft: 'Social',
      autofahren: 'Driving', driving: 'Driving',
      gewohnheit: 'Habit', habit: 'Habit',
      arbeitspause: 'Work breaks', arbeitspausen: 'Work breaks', 'work break': 'Work breaks', 'work breaks': 'Work breaks',
      morgenroutine: 'Morning routine', morgens: 'Morning routine', morning: 'Morning routine', 'morning routine': 'Morning routine',
      abendroutine: 'Evening routine', abends: 'Evening routine', evening: 'Evening routine', 'evening routine': 'Evening routine',
      sonstiges: 'Other', andere: 'Other', other: 'Other',
    };
    return map[raw] || (trigger || '').trim();
  }

  static normalizePlaceKey(place?: string): string {
    const raw = (place || '').trim().toLowerCase();
    const map: Record<string, string> = {
      zuhause: 'Home', home: 'Home',
      arbeit: 'Work', work: 'Work', office: 'Work',
      auto: 'Car', car: 'Car',
      'draußen': 'Outside', outside: 'Outside',
      'restaurant / bar': 'Restaurant / Bar',
      'bei anderen': "At someone else's", "at someone else's": "At someone else's",
      'soziales treffen': 'Social gathering', 'social gathering': 'Social gathering', social: 'Social gathering',
      sonstiges: 'Other', other: 'Other',
    };
    return map[raw] || (place || '').trim();
  }
  public static readonly MIN_EVENTS_FOR_TRIGGER = 5;
  public static readonly MIN_EVENTS_FOR_PATTERNS = 8;
  public static readonly MIN_EVENTS_FOR_TIME = 7;
  public static readonly MIN_EVENTS_FOR_COMBINATION = 3;
  public static readonly MIN_USES_FOR_INTERVENTION_EFFECTIVENESS = 3;

  /**
   * Classify an hour (0-23) into standard behavioral time windows
   */
  public static getTimeWindow(hour: number): { id: string; de: string; en: string } {
    if (hour >= 6 && hour < 10) {
      return { id: 'morning', de: 'Morgen (06:00–10:00)', en: 'Morning (06:00–10:00)' };
    }
    if (hour >= 10 && hour < 12) {
      return { id: 'late_morning', de: 'Vormittag (10:00–12:00)', en: 'Late morning (10:00–12:00)' };
    }
    if (hour >= 12 && hour < 17) {
      return { id: 'afternoon', de: 'Nachmittag (12:00–17:00)', en: 'Afternoon (12:00–17:00)' };
    }
    if (hour >= 17 && hour < 21) {
      return { id: 'evening', de: 'Abend (17:00–21:00)', en: 'Evening (17:00–21:00)' };
    }
    if (hour >= 21 || hour < 2) {
      return { id: 'late_evening', de: 'Spätabend (21:00–02:00)', en: 'Late evening (21:00–02:00)' };
    }
    return { id: 'night', de: 'Nacht (02:00–06:00)', en: 'Night (02:00–06:00)' };
  }

  public static getTimeWindowLabel(id: string | undefined, locale: 'en' | 'de'): string | null {
    if (!id) return null;
    const labels: Record<string, { de: string; en: string }> = {
      morning: { de: 'Morgen', en: 'morning' },
      late_morning: { de: 'Vormittag', en: 'late morning' },
      afternoon: { de: 'Nachmittag', en: 'afternoon' },
      evening: { de: 'Abend', en: 'evening' },
      late_evening: { de: 'Spätabend', en: 'late evening' },
      night: { de: 'Nacht', en: 'night' },
    };
    return labels[id]?.[locale] || id;
  }

  /**
   * Analyzes all smoking and craving events to discover real behavioral patterns
   * without fabricating future progress or jumping to premature conclusions.
   */
  static analyze(
    smokingEvents: SmokingEvent[] = [],
    cravingEvents: CravingEvent[] = []
  ): PatternAnalysisResult {
    // Avoid double counting: if a smoking event has a linked craving event,
    // they represent the same initial urge situation.
    const linkedSmokingIds = new Set(
      cravingEvents.map((c) => c.linkedSmokingEventId).filter(Boolean) as string[]
    );
    const unlinkedSmokingEvents = smokingEvents.filter((s) => !linkedSmokingIds.has(s.id));

    // Total distinct behavioral events
    const totalObservations = cravingEvents.length + unlinkedSmokingEvents.length;

    // Track unique days with logs
    const daysSet = new Set<string>();
    const allTimestamps: { timestamp: string; intensity?: number }[] = [];

    for (const c of cravingEvents) {
      daysSet.add(c.timestamp.slice(0, 10));
      allTimestamps.push({ timestamp: c.timestamp, intensity: c.initialIntensity });
    }
    for (const s of smokingEvents) {
      daysSet.add(s.timestamp.slice(0, 10));
      if (!s.linkedCravingEventId) {
        allTimestamps.push({ timestamp: s.timestamp, intensity: s.cravingIntensity });
      }
    }
    const uniqueDaysRecorded = daysSet.size;

    // 1. Compile Trigger Counts
    const triggerCounts: Record<string, number> = {};
    let totalTriggerLogs = 0;

    for (const c of cravingEvents) {
      if (c.trigger && c.trigger.trim()) {
        const trig = this.normalizeTriggerKey(c.trigger);
        triggerCounts[trig] = (triggerCounts[trig] || 0) + 1;
        totalTriggerLogs++;
      }
    }
    for (const s of unlinkedSmokingEvents) {
      if (s.trigger && s.trigger.trim()) {
        const trig = this.normalizeTriggerKey(s.trigger);
        triggerCounts[trig] = (triggerCounts[trig] || 0) + 1;
        totalTriggerLogs++;
      }
    }

    const topTriggers: FrequencyItem[] = Object.entries(triggerCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalTriggerLogs > 0 ? Math.round((count / totalTriggerLogs) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const hasEnoughDataForTriggers = totalTriggerLogs >= this.MIN_EVENTS_FOR_TRIGGER;
    const strongestTrigger = hasEnoughDataForTriggers && topTriggers.length > 0 ? topTriggers[0] : null;

    let triggerConfidence: EvidenceStrength = 'insufficient';
    if (strongestTrigger) {
      if (strongestTrigger.count >= 10 && uniqueDaysRecorded >= 3) {
        triggerConfidence = 'established';
      } else if (strongestTrigger.count >= this.MIN_EVENTS_FOR_TRIGGER) {
        triggerConfidence = 'emerging';
      }
    }

    // 2. Compile Places
    const placeCounts: Record<string, number> = {};
    let totalPlaceLogs = 0;

    for (const c of cravingEvents) {
      if (c.place && c.place.trim()) {
        const p = this.normalizePlaceKey(c.place);
        placeCounts[p] = (placeCounts[p] || 0) + 1;
        totalPlaceLogs++;
      }
    }
    for (const s of unlinkedSmokingEvents) {
      if (s.place && s.place.trim()) {
        const p = this.normalizePlaceKey(s.place);
        placeCounts[p] = (placeCounts[p] || 0) + 1;
        totalPlaceLogs++;
      }
    }

    const topPlaces: FrequencyItem[] = Object.entries(placeCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalPlaceLogs > 0 ? Math.round((count / totalPlaceLogs) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 3. Automaticity Ratio (from all smoking logs)
    let automaticCount = 0;
    let intentionalCount = 0;

    for (const s of smokingEvents) {
      if (s.decisionType === 'automatic') automaticCount++;
      else if (s.decisionType === 'intentional') intentionalCount++;
    }

    const totalDecisions = automaticCount + intentionalCount;
    const automaticRatio = totalDecisions >= 5 ? Math.round((automaticCount / totalDecisions) * 100) : 0;
    const intentionalRatio = totalDecisions >= 5 ? Math.round((intentionalCount / totalDecisions) * 100) : 0;

    // 4. Average Craving Intensity
    let intensitySum = 0;
    let intensityCount = 0;

    for (const item of allTimestamps) {
      if (typeof item.intensity === 'number' && item.intensity > 0) {
        intensitySum += item.intensity;
        intensityCount++;
      }
    }

    const averageCravingIntensity =
      intensityCount >= 3 ? Math.round((intensitySum / intensityCount) * 10) / 10 : null;

    // 5. Hourly 24h Distribution & Peak Hour
    const hourlyDistribution: HourlyDistributionItem[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      count: 0,
      intensitySum: 0,
    }));

    const timeWindowCounts: Record<string, { count: number; de: string; en: string }> = {};

    for (const item of allTimestamps) {
      try {
        const d = new Date(item.timestamp);
        if (!isNaN(d.getTime())) {
          const h = d.getHours();
          hourlyDistribution[h].count++;
          if (item.intensity) {
            hourlyDistribution[h].intensitySum += item.intensity;
          }
          const win = this.getTimeWindow(h);
          if (!timeWindowCounts[win.id]) {
            timeWindowCounts[win.id] = { count: 0, de: win.de, en: win.en };
          }
          timeWindowCounts[win.id].count++;
        }
      } catch {
        // ignore invalid date
      }
    }

    const hasEnoughDataForTime = allTimestamps.length >= this.MIN_EVENTS_FOR_TIME;

    let maxHourlyCount = 0;
    let peakHour = -1;
    for (const hd of hourlyDistribution) {
      if (hd.count > maxHourlyCount) {
        maxHourlyCount = hd.count;
        peakHour = hd.hour;
      }
    }

    const peakHourLabel =
      hasEnoughDataForTime && peakHour >= 0 && maxHourlyCount >= 2
        ? `${String(peakHour).padStart(2, '0')}:00`
        : null;

    let peakTimeWindowDe: string | null = null;
    let peakTimeWindowEn: string | null = null;
    if (hasEnoughDataForTime) {
      let maxWinCount = 0;
      for (const win of Object.values(timeWindowCounts)) {
        if (win.count > maxWinCount && win.count >= 3) {
          maxWinCount = win.count;
          peakTimeWindowDe = win.de;
          peakTimeWindowEn = win.en;
        }
      }
    }

    // 6. Combinations Analysis (Trigger + Place, Trigger + Time, Trigger + Place + Time)
    const comboMap: Record<string, { count: number; trigger: string; place?: string; timeWindow?: string; labelDe: string; labelEn: string }> = {};

    const evaluateCombo = (trig?: string, place?: string, timestamp?: string) => {
      if (!trig || !trig.trim()) return;
      const tNorm = this.normalizeTriggerKey(trig);
      const placeNorm = place && place.trim() ? this.normalizePlaceKey(place) : undefined;
      const usablePlace = placeNorm && placeNorm !== 'Other' ? placeNorm : undefined;

      let window: { id: string; de: string; en: string } | null = null;
      if (timestamp) {
        try {
          const d = new Date(timestamp);
          if (!isNaN(d.getTime())) window = this.getTimeWindow(d.getHours());
        } catch {
          window = null;
        }
      }

      // Trigger + Place
      if (usablePlace) {
        const key = `tp:${tNorm.toLowerCase()}_${usablePlace.toLowerCase()}`;
        if (!comboMap[key]) {
          comboMap[key] = {
            count: 0,
            trigger: tNorm,
            place: usablePlace,
            labelDe: `${tNorm} · ${usablePlace}`,
            labelEn: `${tNorm} · ${usablePlace}`,
          };
        }
        comboMap[key].count++;
      }

      // Trigger + Time Window
      if (window) {
        const key = `tt:${tNorm.toLowerCase()}_${window.id}`;
        if (!comboMap[key]) {
          comboMap[key] = {
            count: 0,
            trigger: tNorm,
            timeWindow: window.id,
            labelDe: `${tNorm} (${window.de.split(' ')[0]})`,
            labelEn: `${tNorm} (${window.en.split(' ')[0]})`,
          };
        }
        comboMap[key].count++;
      }

      // Most specific: Trigger + Place + Time Window
      if (usablePlace && window) {
        const key = `tpt:${tNorm.toLowerCase()}_${usablePlace.toLowerCase()}_${window.id}`;
        if (!comboMap[key]) {
          comboMap[key] = {
            count: 0,
            trigger: tNorm,
            place: usablePlace,
            timeWindow: window.id,
            labelDe: `${tNorm} · ${usablePlace} · ${window.de.split(' ')[0]}`,
            labelEn: `${tNorm} · ${usablePlace} · ${window.en.split(' ')[0]}`,
          };
        }
        comboMap[key].count++;
      }
    };

    for (const c of cravingEvents) {
      evaluateCombo(c.trigger, c.place, c.timestamp);
    }
    for (const s of unlinkedSmokingEvents) {
      evaluateCombo(s.trigger, s.place, s.timestamp);
    }

    const combinations: CombinationPattern[] = Object.entries(comboMap)
      .filter(([, data]) => data.count >= this.MIN_EVENTS_FOR_COMBINATION)
      .map(([key, data]) => ({
        key,
        trigger: data.trigger,
        place: data.place,
        timeWindow: data.timeWindow,
        labelDe: data.labelDe,
        labelEn: data.labelEn,
        count: data.count,
        strength: (data.count >= 8 && uniqueDaysRecorded >= 3 ? 'established' : 'emerging') as EvidenceStrength,
      }))
      .sort((a, b) => {
        const countDiff = b.count - a.count;
        if (countDiff !== 0) return countDiff;
        const specificityA = (a.place ? 1 : 0) + (a.timeWindow ? 1 : 0);
        const specificityB = (b.place ? 1 : 0) + (b.timeWindow ? 1 : 0);
        return specificityB - specificityA;
      });

    // 7. Intervention Effectiveness by Trigger
    const interventionsByTrigger: Record<string, TriggerInterventionStat[]> = {};
    const groupData: Record<string, Record<string, { total: number; success: number }>> = {};

    for (const c of cravingEvents) {
      if (c.trigger && c.interventionId && c.outcome) {
        const t = this.normalizeTriggerKey(c.trigger);
        if (!groupData[t]) groupData[t] = {};
        if (!groupData[t][c.interventionId]) {
          groupData[t][c.interventionId] = { total: 0, success: 0 };
        }
        groupData[t][c.interventionId].total++;
        if (c.outcome === 'gone' || c.outcome === 'weaker') {
          groupData[t][c.interventionId].success++;
        }
      }
    }

    for (const [t, intMap] of Object.entries(groupData)) {
      interventionsByTrigger[t] = Object.entries(intMap).map(([interventionId, stats]) => ({
        interventionId,
        totalAttempts: stats.total,
        successCount: stats.success,
        successRate: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0,
      }));
    }

    const hasEnoughDataForPatterns = totalObservations >= this.MIN_EVENTS_FOR_PATTERNS;

    return {
      totalObservations,
      uniqueDaysRecorded,
      hasEnoughDataForTriggers,
      hasEnoughDataForPatterns,
      hasEnoughDataForTime,
      strongestTrigger,
      triggerConfidence,
      topTriggers,
      topPlaces,
      automaticRatio,
      intentionalRatio,
      averageCravingIntensity,
      peakHourLabel,
      peakTimeWindowDe,
      peakTimeWindowEn,
      hourlyDistribution,
      interventionsByTrigger,
      combinations,
    };
  }

  /**
   * Generates one cautious, evidence-grounded Live Insight for Today.
   * Language deliberately separates observed signals from established patterns.
   */
  static getLiveInsight(
    smokingEvents: SmokingEvent[],
    cravingEvents: CravingEvent[],
    locale: 'en' | 'de'
  ): { title: string; text: string; evidence: EvidenceStrength } {
    const analysis = this.analyze(smokingEvents, cravingEvents);

    if (analysis.totalObservations === 0) {
      return locale === 'de'
        ? {
            title: 'Dein Lab wartet auf den ersten echten Moment.',
            text: 'Öffne „Ich will rauchen“, sobald ein echter Drang auftaucht. Smoke Lab beginnt erst dann, deine persönlichen Schleifen zu unterscheiden.',
            evidence: 'insufficient',
          }
        : {
            title: 'Your Lab is waiting for the first real moment.',
            text: 'Open “I want to smoke” when a real urge appears. Smoke Lab starts separating your personal loops from there.',
            evidence: 'insufficient',
          };
    }

    // A recurring context combination is more actionable than a raw frequency.
    if (analysis.combinations.length > 0) {
      const topCombo = analysis.combinations[0];
      if (topCombo.place) {
        return locale === 'de'
          ? {
              title: 'Eine konkrete Schleife zeichnet sich ab.',
              text: `${formatSituation(topCombo.trigger, locale)} und ${formatPlace(topCombo.place, locale)} sind bisher ${topCombo.count}-mal gemeinsam aufgetaucht. Das ist ein wiederkehrendes Signal – noch keine Diagnose.`,
              evidence: topCombo.strength,
            }
          : {
              title: 'A specific loop is emerging.',
              text: `${formatSituation(topCombo.trigger, locale)} and ${formatPlace(topCombo.place, locale)} have appeared together ${topCombo.count} times so far. That is a recurring signal, not a diagnosis.`,
              evidence: topCombo.strength,
            };
      }
    }

    if (analysis.strongestTrigger) {
      const trig = analysis.strongestTrigger;
      return locale === 'de'
        ? {
            title: `${formatSituation(trig.name, locale)} fällt gerade am stärksten auf.`,
            text: `${trig.count} deiner erfassten Situationen enthalten diesen Auslöser (${trig.percentage}%). Wir beobachten weiter, ob sich das über mehrere Tage bestätigt.`,
            evidence: analysis.triggerConfidence,
          }
        : {
            title: `${formatSituation(trig.name, locale)} stands out most right now.`,
            text: `${trig.count} of your logged situations contain this cue (${trig.percentage}%). We will keep watching whether it persists across days.`,
            evidence: analysis.triggerConfidence,
          };
    }

    // Before the formal trigger threshold, surface only a first signal.
    const earlyTrigger = analysis.topTriggers[0];
    if (analysis.totalObservations >= 3 && earlyTrigger) {
      return locale === 'de'
        ? {
            title: 'Ein erstes Signal wird sichtbar.',
            text: `${formatSituation(earlyTrigger.name, locale)} taucht bisher am häufigsten auf (${earlyTrigger.count}×). Dafür sind es noch zu wenige Daten, um von einem stabilen Muster zu sprechen.`,
            evidence: 'insufficient',
          }
        : {
            title: 'A first signal is becoming visible.',
            text: `${formatSituation(earlyTrigger.name, locale)} has appeared most often so far (${earlyTrigger.count}×). There is not enough data yet to call it a stable pattern.`,
            evidence: 'insufficient',
          };
    }

    if (smokingEvents.length >= 5 && analysis.automaticRatio > 0) {
      return locale === 'de'
        ? {
            title: 'Autopilot wird messbar.',
            text: `${analysis.automaticRatio}% deiner bisher klassifizierten Zigaretten wurden als automatisch erfasst. Das beschreibt nur deine bisherigen Einträge, nicht dich als Person.`,
            evidence: smokingEvents.length >= 10 && analysis.uniqueDaysRecorded >= 3 ? 'established' : 'emerging',
          }
        : {
            title: 'Autopilot is becoming measurable.',
            text: `${analysis.automaticRatio}% of your classified cigarettes so far were logged as automatic. This describes your current logs, not you as a person.`,
            evidence: smokingEvents.length >= 10 && analysis.uniqueDaysRecorded >= 3 ? 'established' : 'emerging',
          };
    }

    const remaining = Math.max(0, this.MIN_EVENTS_FOR_TRIGGER - analysis.totalObservations);
    return locale === 'de'
      ? {
          title: 'Die ersten Datenpunkte sind da.',
          text: remaining > 0
            ? `Noch etwa ${remaining} echte Situationen, dann kann Smoke Lab erste wiederkehrende Auslöser vorsichtig vergleichen.`
            : 'Smoke Lab sammelt weiter, damit einzelne Zufälle nicht zu früh als Muster erscheinen.',
          evidence: 'insufficient',
        }
      : {
          title: 'The first data points are in.',
          text: remaining > 0
            ? `About ${remaining} more real situations will let Smoke Lab cautiously compare recurring cues.`
            : 'Smoke Lab keeps collecting so isolated coincidences are not mistaken for patterns.',
          evidence: 'insufficient',
        };
  }

}
