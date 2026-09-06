import type {
  LapseRecoveryRecord,
  QuitSupportPlan,
  SmokingEvent,
  UserProfile,
} from '../../types';
import { QuitRecoveryEngine } from './QuitRecoveryEngine';

export type PostSmokingAction = 'open_recovery' | 'none';

export interface PostSmokingFlowDecision {
  action: PostSmokingAction;
  reasonCodes: string[];
}

/**
 * Keeps every entry point that can save a cigarette on the same post-save path.
 *
 * This is product-flow orchestration, not a clinical rule. It only decides
 * whether an already-configured post-quit recovery review should be surfaced.
 */
export class PostSmokingFlowEngine {
  static afterSavedSmokingEvent(
    profile: UserProfile,
    event: SmokingEvent,
    quitSupport: QuitSupportPlan,
    recoveries: LapseRecoveryRecord[] = [],
  ): PostSmokingFlowDecision {
    if (profile.goal !== 'quit') {
      return { action: 'none', reasonCodes: ['goal_not_quit'] };
    }

    if (recoveries.some((record) => record.smokingEventId === event.id)) {
      return { action: 'none', reasonCodes: ['recovery_already_recorded'] };
    }

    if (!quitSupport.enabled) {
      return { action: 'none', reasonCodes: ['quit_support_disabled'] };
    }

    if (!quitSupport.quitDate) {
      return { action: 'none', reasonCodes: ['quit_date_not_set'] };
    }

    if (!QuitRecoveryEngine.eventIsAfterQuitDate(event, quitSupport)) {
      return { action: 'none', reasonCodes: ['event_before_quit_date'] };
    }

    return {
      action: 'open_recovery',
      reasonCodes: ['post_quit_smoking_event', 'recovery_not_yet_recorded'],
    };
  }
}
