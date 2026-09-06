import type { GoalChoice, QuitSupportPlan } from '../../types';

export interface GoalTransitionDecision {
  nextGoal: GoalChoice;
  quitSupport: QuitSupportPlan;
  reasonCodes: string[];
}

const localDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Coordinates goal switches without resetting behavioral history.
 *
 * Quit plans are suspended when the user leaves Quit mode. When Quit mode is
 * activated again, protection plans are preserved, but a quit date that is
 * already in the past must be explicitly chosen again. This prevents historical
 * cigarettes from suddenly being reclassified as unresolved post-quit events.
 */
export class GoalTransitionEngine {
  static transition(
    currentGoal: GoalChoice,
    nextGoal: GoalChoice,
    currentQuitSupport: QuitSupportPlan,
    now: Date = new Date(),
  ): GoalTransitionDecision {
    if (currentGoal === nextGoal) {
      return { nextGoal, quitSupport: currentQuitSupport, reasonCodes: ['goal_unchanged'] };
    }

    const updatedAt = now.toISOString();
    const base: QuitSupportPlan = { ...currentQuitSupport, updatedAt };

    if (currentGoal === 'quit' && nextGoal !== 'quit') {
      return {
        nextGoal,
        quitSupport: { ...base, enabled: false },
        reasonCodes: ['goal_changed', 'quit_support_suspended', 'behavior_history_preserved'],
      };
    }

    if (nextGoal === 'quit') {
      const today = localDate(now);
      const staleDate = Boolean(base.quitDate && base.quitDate < today);
      return {
        nextGoal,
        quitSupport: {
          ...base,
          enabled: true,
          quitDate: staleDate ? undefined : base.quitDate,
        },
        reasonCodes: [
          'goal_changed',
          'quit_support_activated',
          staleDate ? 'stale_quit_date_requires_reconfirmation' : 'quit_date_state_preserved',
          'protection_plans_preserved',
          'behavior_history_preserved',
        ],
      };
    }

    return {
      nextGoal,
      quitSupport: base,
      reasonCodes: ['goal_changed', 'behavior_history_preserved'],
    };
  }
}
