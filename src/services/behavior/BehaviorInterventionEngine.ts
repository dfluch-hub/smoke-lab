import { CravingEvent, Intervention } from '../../types';
import { INTERVENTIONS, getInterventionById } from './interventionLibrary';
import { PatternEngine } from './PatternEngine';

export interface InterventionSelectionResult {
  intervention: Intervention;
  isAdaptiveRecommendation: boolean;
  isJourneyExperiment?: boolean;
  isPersonalExperiment?: boolean;
  isQuitPlan?: boolean;
  personalExperimentId?: string;
  adaptiveNoteKey?: string;
}

export class BehaviorInterventionEngine {
  /**
   * Checks whether the user is in a driving context, which requires safe confirmation before interaction
   */
  static isDrivingContext(trigger?: string, place?: string): boolean {
    const t = (trigger || '').trim().toLowerCase();
    const p = (place || '').trim().toLowerCase();
    return (
      t === 'autofahren' ||
      t === 'driving' ||
      t.includes('auto') ||
      t.includes('driv') ||
      p === 'auto' ||
      p === 'car' ||
      p.includes('driv')
    );
  }

  /**
   * Selects an appropriate micro-intervention based on trigger, context, and historical outcomes.
   * If at least 3 completed interventions exist for this specific trigger, checks for personal outcome advantages.
   */
  static selectIntervention(
    trigger: string,
    place?: string,
    historicalCravings: CravingEvent[] = [],
    preferredInterventionId?: string
  ): InterventionSelectionResult {
    const rawTrigger = PatternEngine.normalizeTriggerKey(trigger);
    const t = rawTrigger.toLowerCase();
    const p = (place || '').trim().toLowerCase();

    // A journey mission may deliberately prescribe one intervention as an experiment.
    // This is an experiment override, not a claim that the intervention is personally superior.
    if (preferredInterventionId) {
      return {
        intervention: getInterventionById(preferredInterventionId),
        isAdaptiveRecommendation: false,
        isJourneyExperiment: true,
      };
    }

    // 1. Check historical performance for this trigger (requires at least 3 completed outcomes)
    const triggerEvents = historicalCravings.filter(
      (c) =>
        c.trigger &&
        PatternEngine.normalizeTriggerKey(c.trigger).toLowerCase() === t &&
        c.outcome &&
        c.interventionId
    );

    if (triggerEvents.length >= 3) {
      // Calculate effectiveness score for each intervention used for this trigger:
      // outcome: 'gone' (+2), 'weaker' (+1), 'unchanged' (0), 'stronger' (-1), 'smoked' (-1)
      const stats: Record<string, { total: number; score: number; successCount: number }> = {};
      for (const ev of triggerEvents) {
        if (!stats[ev.interventionId]) {
          stats[ev.interventionId] = { total: 0, score: 0, successCount: 0 };
        }
        stats[ev.interventionId].total += 1;
        if (ev.outcome === 'gone') {
          stats[ev.interventionId].score += 2;
          stats[ev.interventionId].successCount += 1;
        } else if (ev.outcome === 'weaker') {
          stats[ev.interventionId].score += 1;
          stats[ev.interventionId].successCount += 1;
        } else if (ev.outcome === 'unchanged') {
          stats[ev.interventionId].score += 0;
        } else if (ev.outcome === 'stronger' || ev.outcome === 'smoked') {
          stats[ev.interventionId].score -= 1;
        }
      }

      // Find candidate with at least 2 uses and highest average score
      let bestInterventionId: string | null = null;
      let highestAvg = 0.5; // Must have positive average impact

      for (const [id, data] of Object.entries(stats)) {
        if (data.total >= 2) {
          const avg = data.score / data.total;
          if (avg > highestAvg) {
            highestAvg = avg;
            bestInterventionId = id;
          }
        }
      }

      if (bestInterventionId) {
        const adaptiveIntervention = getInterventionById(bestInterventionId);
        return {
          intervention: adaptiveIntervention,
          isAdaptiveRecommendation: true,
          adaptiveNoteKey: 'adaptiveInterventionNote',
        };
      }
    }

    // 2. Deterministic Rule Matching by Trigger & Context
    // COFFEE -> COFFEE_SEPARATION
    if (t === 'kaffee' || t === 'coffee') {
      return {
        intervention: getInterventionById('COFFEE_SEPARATION'),
        isAdaptiveRecommendation: false,
      };
    }

    // AFTER_MEAL -> AFTER_MEAL_RESET
    if (t === 'nach dem essen' || t === 'after meals' || t.includes('essen') || t.includes('meal')) {
      return {
        intervention: getInterventionById('AFTER_MEAL_RESET'),
        isAdaptiveRecommendation: false,
      };
    }

    // BOREDOM -> HANDS_BUSY
    if (t === 'langeweile' || t === 'boredom') {
      return {
        intervention: getInterventionById('HANDS_BUSY'),
        isAdaptiveRecommendation: false,
      };
    }

    // WORK_BREAK -> CHANGE_LOCATION or BREAK_ROUTINE
    if (t === 'arbeitspause' || t === 'arbeitspausen' || t === 'work breaks' || t === 'work break') {
      if (p.includes('arbeit') || p.includes('work') || p.includes('office') || p.includes('draußen') || p.includes('outside')) {
        return {
          intervention: getInterventionById('CHANGE_LOCATION'),
          isAdaptiveRecommendation: false,
        };
      }
      return {
        intervention: getInterventionById('BREAK_ROUTINE'),
        isAdaptiveRecommendation: false,
      };
    }

    // HABIT -> THREE_MINUTE_DELAY or CHANGE_LOCATION
    if (t === 'gewohnheit' || t === 'habit') {
      if (p.includes('zuhause') || p.includes('home') || p.includes('arbeit') || p.includes('work')) {
        return {
          intervention: getInterventionById('CHANGE_LOCATION'),
          isAdaptiveRecommendation: false,
        };
      }
      return {
        intervention: getInterventionById('THREE_MINUTE_DELAY'),
        isAdaptiveRecommendation: false,
      };
    }

    // STRESS -> THREE_MINUTE_DELAY or CONSCIOUS_CHOICE
    if (t === 'stress') {
      return {
        intervention: getInterventionById('THREE_MINUTE_DELAY'),
        isAdaptiveRecommendation: false,
      };
    }

    // SOCIAL -> CONSCIOUS_CHOICE or HANDS_BUSY
    if (t === 'sozial' || t === 'social' || t === 'gesellschaft') {
      return {
        intervention: getInterventionById('CONSCIOUS_CHOICE'),
        isAdaptiveRecommendation: false,
      };
    }

    // ALCOHOL -> CONSCIOUS_CHOICE
    if (t === 'alkohol' || t === 'alcohol') {
      return {
        intervention: getInterventionById('CONSCIOUS_CHOICE'),
        isAdaptiveRecommendation: false,
      };
    }

    // MORNING_ROUTINE -> MORNING_DELAY
    if (t === 'morgenroutine' || t === 'morning routine' || t === 'morning' || t === 'morgens') {
      return {
        intervention: getInterventionById('MORNING_DELAY'),
        isAdaptiveRecommendation: false,
      };
    }

    // EVENING_ROUTINE -> THREE_MINUTE_DELAY or CHANGE_LOCATION
    if (t === 'abendroutine' || t === 'evening routine' || t === 'evening' || t === 'abends') {
      if (p.includes('zuhause') || p.includes('home')) {
        return {
          intervention: getInterventionById('CHANGE_LOCATION'),
          isAdaptiveRecommendation: false,
        };
      }
      return {
        intervention: getInterventionById('THREE_MINUTE_DELAY'),
        isAdaptiveRecommendation: false,
      };
    }

    // OTHER -> THREE_MINUTE_DELAY
    return {
      intervention: getInterventionById('THREE_MINUTE_DELAY'),
      isAdaptiveRecommendation: false,
    };
  }
}
