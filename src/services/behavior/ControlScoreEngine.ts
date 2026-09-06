import { CravingEvent, SmokingEvent } from '../../types';

export class ControlScoreEngine {
  public static readonly BASE_SCORE = 50;
  public static readonly MIN_SCORE = 0;
  public static readonly MAX_SCORE = 100;
  public static readonly MAX_DAILY_GAIN = 3.2; // Maximum positive movement cap per day

  /**
   * Helper to format a timestamp into local date string YYYY-MM-DD
   */
  private static getDayKey(timestamp?: string): string {
    if (!timestamp) return 'unknown';
    try {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    } catch {
      // fallback
    }
    return timestamp.slice(0, 10);
  }

  /**
   * Calculates the internal precise Control Score (float, 0.0 - 100.0)
   * based on cumulative behavioral awareness with diminishing returns per day.
   * Smoking never subtracts points.
   */
  static calculatePreciseScore(
    cravings: CravingEvent[] = [],
    smokingEvents: SmokingEvent[] = []
  ): number {
    // Group events by day to calculate daily contributions with diminishing returns
    const dayBuckets: Record<string, { cravingEvents: CravingEvent[]; smokeEvents: SmokingEvent[] }> = {};

    for (const c of cravings) {
      const day = this.getDayKey(c.timestamp);
      if (!dayBuckets[day]) dayBuckets[day] = { cravingEvents: [], smokeEvents: [] };
      dayBuckets[day].cravingEvents.push(c);
    }

    for (const s of smokingEvents) {
      const day = this.getDayKey(s.timestamp);
      if (!dayBuckets[day]) dayBuckets[day] = { cravingEvents: [], smokeEvents: [] };
      dayBuckets[day].smokeEvents.push(s);
    }

    let totalGainedPoints = 0;

    // Process each day's actions
    for (const [, bucket] of Object.entries(dayBuckets)) {
      let dayRawPoints = 0;
      let actionIndexInDay = 0;

      // 1. Process craving events for the day
      for (const craving of bucket.cravingEvents) {
        // Diminishing returns multiplier for repeated actions within the same day
        const decay = Math.max(0.15, Math.pow(0.85, actionIndexInDay));
        actionIndexInDay++;

        let cravingPoints = 0;
        // Craving noticed before smoking: +0.3
        cravingPoints += 0.3;

        // Trigger identified: +0.2
        if (craving.trigger && craving.trigger.trim() && craving.trigger !== 'Other' && craving.trigger !== 'Sonstiges') {
          cravingPoints += 0.2;
        }

        // Context / place identified: +0.1
        if (craving.place && craving.place.trim()) {
          cravingPoints += 0.1;
        }

        // Intervention started: +0.3
        if (craving.interventionStartedAt) {
          cravingPoints += 0.3;
        }

        // Intervention reassessed: +0.5
        if (craving.outcome) {
          cravingPoints += 0.5;

          // Craving became weaker: +0.6
          if (craving.outcome === 'weaker') {
            cravingPoints += 0.6;
          }
          // Craving disappeared: +0.8
          else if (craving.outcome === 'gone') {
            cravingPoints += 0.8;
          }
        }

        dayRawPoints += cravingPoints * decay;
      }

      // 2. Process smoking logs for the day
      for (const smoke of bucket.smokeEvents) {
        const decay = Math.max(0.15, Math.pow(0.85, actionIndexInDay));
        actionIndexInDay++;

        let smokePoints = 0;
        // Automatic vs intentional decision identified: +0.2
        if (smoke.decisionType) {
          smokePoints += 0.2;
        }

        // Trigger identified: +0.2
        if (smoke.trigger && smoke.trigger.trim() && smoke.trigger !== 'Other' && smoke.trigger !== 'Sonstiges') {
          smokePoints += 0.2;
        }

        // Context identified: +0.1
        if (smoke.place && smoke.place.trim()) {
          smokePoints += 0.1;
        }

        dayRawPoints += smokePoints * decay;
      }

      // Apply the daily positive movement cap (~2.0 - 3.2 points max per day)
      const dayCappedPoints = Math.min(this.MAX_DAILY_GAIN, dayRawPoints);
      totalGainedPoints += dayCappedPoints;
    }

    const rawScore = this.BASE_SCORE + totalGainedPoints;
    return Math.min(this.MAX_SCORE, Math.max(this.MIN_SCORE, rawScore));
  }

  /**
   * Calculates the Control Score rounded to a whole integer for UI display (0 - 100).
   */
  static calculateScore(
    cravings: CravingEvent[] = [],
    smokingEvents: SmokingEvent[] = []
  ): number {
    const precise = this.calculatePreciseScore(cravings, smokingEvents);
    return Math.round(precise);
  }

  /**
   * User-facing explanation of the score
   */
  static getExplanation(locale: 'en' | 'de'): string {
    if (locale === 'de') {
      return 'Der Control Score misst, wie oft du automatische Gewohnheiten bewusst wahrnimmst und unterbrichst. Rauchen setzt deinen Fortschritt nicht zurück.';
    }
    return 'The Control Score reflects how often you notice and interrupt automatic loops. Smoking never resets your progress.';
  }
}
