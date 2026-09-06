import type {
  CravingEvent,
  JourneyProgress,
  LapseRecoveryRecord,
  PersonalExperiment,
  QuitSupportPlan,
  SmokingEvent,
  UserProfile,
} from '../../types';
import { JourneyLifecycleEngine } from './JourneyLifecycleEngine';

export interface LifecycleReleaseAudit {
  blocking: string[];
  warnings: string[];
  runtimeConsistent: boolean;
}

/**
 * Internal release/QA invariant audit. It does not score the user and is never
 * shown as a behavioral or clinical metric. It exists so scenario tests can
 * fail loudly when cross-module state becomes contradictory.
 */
export class LifecycleReleaseGateEngine {
  static audit(
    profile: UserProfile,
    progress: JourneyProgress,
    smokingEvents: SmokingEvent[] = [],
    cravingEvents: CravingEvent[] = [],
    experiments: PersonalExperiment[] = [],
    quitSupport: QuitSupportPlan,
    recoveries: LapseRecoveryRecord[] = [],
  ): LifecycleReleaseAudit {
    const blocking: string[] = [];
    const warnings: string[] = [];

    const journeyIssues = JourneyLifecycleEngine.issueCodes(progress);
    for (const issue of journeyIssues) {
      if (issue === 'day_30_present_with_earlier_gaps') warnings.push(issue);
      else blocking.push(issue);
    }

    const activeExperiments = experiments.filter((experiment) => experiment.status === 'active');
    if (activeExperiments.length > 1) blocking.push('multiple_active_experiments');

    const cravingIds = new Set(cravingEvents.map((event) => event.id));
    for (const experiment of experiments) {
      if (experiment.attemptCravingIds.some((id) => !cravingIds.has(id))) {
        blocking.push('experiment_attempt_references_missing_craving');
        break;
      }
    }

    const smokeIds = new Set(smokingEvents.map((event) => event.id));
    if (recoveries.some((record) => !smokeIds.has(record.smokingEventId))) {
      blocking.push('recovery_references_missing_smoking_event');
    }

    if (profile.goal !== 'quit' && quitSupport.enabled && quitSupport.quitDate) {
      warnings.push('dated_quit_support_active_outside_quit_goal');
    }
    if (profile.goal === 'quit' && !quitSupport.enabled) {
      warnings.push('quit_goal_with_suspended_quit_support');
    }

    const signatures = new Set<string>();
    for (const plan of quitSupport.highRiskPlans) {
      if (signatures.has(plan.signature)) {
        blocking.push('duplicate_high_risk_plan_signature');
        break;
      }
      signatures.add(plan.signature);
    }

    for (const experiment of activeExperiments) {
      if (experiment.attemptCravingIds.length >= experiment.targetAttempts) {
        warnings.push('active_experiment_reached_target_attempts_pending_evaluation');
      }
    }

    return {
      blocking: [...new Set(blocking)],
      warnings: [...new Set(warnings)],
      runtimeConsistent: blocking.length === 0,
    };
  }
}
