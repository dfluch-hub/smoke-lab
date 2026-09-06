import type { JourneyPhaseId, JourneyProgress } from '../../types';

const DAY_COUNT = 30;

const validIso = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && Number.isFinite(new Date(value).getTime());

/**
 * Small, dependency-free source of truth for the 30-day Journey lifecycle.
 *
 * A single Day-30 flag is never enough to call the Journey complete. Completion
 * requires all 30 distinct days. This protects Maintenance and goal orchestration
 * from partial writes, old backups and out-of-order completion records.
 */
export class JourneyLifecycleEngine {
  static readonly totalDays = DAY_COUNT;

  static normalizeCompletedDays(input: unknown): number[] {
    if (!Array.isArray(input)) return [];
    return [...new Set(input.filter((day): day is number =>
      typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= DAY_COUNT,
    ))].sort((a, b) => a - b);
  }

  static isCompleteDays(input: unknown): boolean {
    const days = this.normalizeCompletedDays(input);
    if (days.length !== DAY_COUNT) return false;
    return days.every((day, index) => day === index + 1);
  }

  static isComplete(progress: Pick<JourneyProgress, 'completedDays'>): boolean {
    return this.isCompleteDays(progress.completedDays);
  }

  static firstIncompleteDay(input: unknown): number {
    const completed = new Set(this.normalizeCompletedDays(input));
    for (let day = 1; day <= DAY_COUNT; day += 1) {
      if (!completed.has(day)) return day;
    }
    return DAY_COUNT;
  }

  static phaseForDay(dayRaw: number): JourneyPhaseId {
    const day = Math.min(DAY_COUNT, Math.max(1, Math.round(dayRaw || 1)));
    if (day <= 5) return 'discover';
    if (day <= 11) return 'disrupt';
    if (day <= 18) return 'control';
    if (day <= 25) return 'break';
    return 'own';
  }

  static phaseNameForDay(day: number): string {
    const phase = this.phaseForDay(day);
    const names: Record<JourneyPhaseId, string> = {
      discover: 'DISCOVER',
      disrupt: 'DISRUPT',
      control: 'CONTROL',
      break: 'BREAK',
      own: 'OWN IT',
    };
    const numbers: Record<JourneyPhaseId, number> = {
      discover: 1,
      disrupt: 2,
      control: 3,
      break: 4,
      own: 5,
    };
    return `PHASE ${numbers[phase]} · ${names[phase]}`;
  }

  /**
   * Uses only timestamps already present in state. No completion time is invented.
   * Day 30 is preferred; otherwise the latest valid mission completion is used as
   * a conservative recovery value for structurally complete legacy state.
   */
  static completionTimestamp(progress: Pick<JourneyProgress, 'completedDays' | 'journeyCompletedAt' | 'missionCompletions'>): string | undefined {
    if (!this.isComplete(progress)) return undefined;
    if (validIso(progress.journeyCompletedAt)) return progress.journeyCompletedAt;

    const day30 = progress.missionCompletions?.['30']?.completedAt;
    if (validIso(day30)) return day30;

    const timestamps = Object.values(progress.missionCompletions || {})
      .map((record) => record?.completedAt)
      .filter(validIso)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return timestamps[0];
  }

  static canonicalDay(progress: Pick<JourneyProgress, 'completedDays'>): number {
    return this.isComplete(progress) ? DAY_COUNT : this.firstIncompleteDay(progress.completedDays);
  }

  static issueCodes(progress: Pick<JourneyProgress, 'completedDays' | 'dayInLab' | 'journeyCompletedAt'>): string[] {
    const completed = this.normalizeCompletedDays(progress.completedDays);
    const complete = this.isCompleteDays(completed);
    const expectedDay = complete ? DAY_COUNT : this.firstIncompleteDay(completed);
    const issues: string[] = [];
    if (progress.dayInLab !== expectedDay) issues.push('journey_day_not_first_open_day');
    if (Boolean(progress.journeyCompletedAt) && !complete) issues.push('journey_completion_marker_without_all_days');
    if (completed.includes(DAY_COUNT) && !complete) issues.push('day_30_present_with_earlier_gaps');
    return issues;
  }
}
