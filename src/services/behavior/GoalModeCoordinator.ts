import {
  CravingEvent,
  JourneyProgress,
  LapseRecoveryRecord,
  PersonalExperiment,
  QuitSupportPlan,
  SmokingEvent,
  UserProfile,
} from '../../types';
import { formatPlace, formatSituation } from '../../i18n/translations';
import { ExperimentSequencingEngine } from './ExperimentSequencingEngine';
import { GoalSupportEngine } from './GoalSupportEngine';
import { JourneyEngine } from './JourneyEngine';
import { MaintenanceEngine } from './MaintenanceEngine';
import { NextBestActionEngine } from './NextBestActionEngine';
import { PatternEngine } from './PatternEngine';
import { PersonalControlModelEngine } from './PersonalControlModelEngine';
import { QuitRecoveryEngine } from './QuitRecoveryEngine';
import { PostSmokingFlowEngine } from './PostSmokingFlowEngine';

export type GoalFocusSource =
  | 'recovery'
  | 'active_experiment'
  | 'maintenance'
  | 'quit_protection'
  | 'quit_preparation'
  | 'reduction'
  | 'journey'
  | 'pattern';

export type GoalFocusAction = 'open_recovery' | 'open_experiment' | 'open_lab' | 'open_craving' | 'none';

export interface GoalFocusDecision {
  source: GoalFocusSource;
  priority: number;
  titleDe: string;
  titleEn: string;
  bodyDe: string;
  bodyEn: string;
  ctaDe?: string;
  ctaEn?: string;
  action: GoalFocusAction;
  pendingRecoverySmokingEventId?: string;
  suppressGenericNextBestAction: boolean;
  deferJourneyIntervention: boolean;
  reasonCodes: string[];
}

const eventTime = (timestamp: string): number => {
  const value = new Date(timestamp).getTime();
  return Number.isFinite(value) ? value : 0;
};

/**
 * Creates one coherent focus across Journey, experiments, Reduce/Quit support,
 * recovery and Maintenance. It prevents the UI from presenting several
 * competing "do this next" messages at once.
 *
 * The ranking is a deterministic product heuristic, not a clinical score.
 */
export class GoalModeCoordinator {
  static build(
    profile: UserProfile,
    progress: JourneyProgress,
    smokingEvents: SmokingEvent[] = [],
    cravingEvents: CravingEvent[] = [],
    experiments: PersonalExperiment[] = [],
    quitSupport: QuitSupportPlan,
    recoveryRecords: LapseRecoveryRecord[] = [],
    now: Date = new Date(),
  ): GoalFocusDecision {
    const activeExperiment = experiments.find((experiment) => experiment.status === 'active') || null;
    const missionDe = JourneyEngine.getMissionForDay(
      progress.dayInLab || 1, profile, progress, smokingEvents, cravingEvents, 'de',
    );
    const missionEn = JourneyEngine.getMissionForDay(
      progress.dayInLab || 1, profile, progress, smokingEvents, cravingEvents, 'en',
    );

    // A dismissed post-quit recovery flow remains reachable later. Nothing is
    // silently treated as "resolved" until a recovery record exists.
    if (profile.goal === 'quit' && quitSupport.enabled && quitSupport.quitDate) {
      const pending = [...smokingEvents]
        .filter((event) => PostSmokingFlowEngine.afterSavedSmokingEvent(profile, event, quitSupport, recoveryRecords).action === 'open_recovery')
        .sort((a, b) => eventTime(b.timestamp) - eventTime(a.timestamp))[0];
      if (pending) {
        return {
          source: 'recovery', priority: 100,
          titleDe: 'Eine Situation ist noch offen.',
          titleEn: 'One situation is still open.',
          bodyDe: 'Du musst nichts zurücksetzen. Ordne die letzte Zigarette kurz ein und entscheide nur, was beim nächsten ähnlichen Moment helfen könnte.',
          bodyEn: 'Nothing needs to reset. Briefly review the last cigarette and choose only what might help in the next similar moment.',
          ctaDe: 'Situation einordnen', ctaEn: 'Review situation', action: 'open_recovery',
          pendingRecoverySmokingEventId: pending.id,
          suppressGenericNextBestAction: true,
          deferJourneyIntervention: true,
          reasonCodes: ['pending_post_quit_recovery'],
        };
      }
    }

    if (activeExperiment) {
      return {
        source: 'active_experiment', priority: 90,
        titleDe: 'Dein laufender Test hat heute Vorrang.',
        titleEn: 'Your active test takes priority today.',
        bodyDe: `Sammle die nächsten vergleichbaren Situationen für „${activeExperiment.hypothesisDe}“. Smoke Lab legt keine zweite Verhaltensaufgabe darüber.`,
        bodyEn: `Collect the next comparable situations for “${activeExperiment.hypothesisEn}”. Smoke Lab will not layer a second behavior task on top.`,
        ctaDe: 'Test ansehen', ctaEn: 'View test', action: 'open_experiment',
        suppressGenericNextBestAction: true,
        deferJourneyIntervention: Boolean(missionDe.interventionId && missionDe.interventionId !== activeExperiment.interventionId),
        reasonCodes: ['active_personal_experiment', 'avoid_competing_task'],
      };
    }

    // A post-quit protection plan is moment-specific and therefore outranks
    // the broader weekly Maintenance focus. Recovery still remains first, and
    // a deliberately active personal experiment still remains second.
    if (profile.goal === 'quit' && quitSupport.enabled) {
      const quitStatus = QuitRecoveryEngine.status(quitSupport, now);
      const prepared = quitSupport.highRiskPlans[0];
      if ((quitStatus === 'quit_day' || quitStatus === 'post_quit') && prepared) {
        return {
          source: 'quit_protection', priority: 85,
          titleDe: quitStatus === 'quit_day' ? 'Heute schützt du den nächsten Moment.' : 'Dein Schutzplan bleibt aktiv.',
          titleEn: quitStatus === 'quit_day' ? 'Protect the next moment today.' : 'Your protection plan stays active.',
          bodyDe: prepared.planText,
          bodyEn: prepared.planText,
          ctaDe: 'Bei Drang öffnen', ctaEn: 'Open when urge hits', action: 'open_craving',
          suppressGenericNextBestAction: true,
          deferJourneyIntervention: Boolean(missionDe.interventionId),
          reasonCodes: ['quit_date_active', 'prepared_protection_plan', 'moment_specific_over_maintenance'],
        };
      }
    }

    const maintenance = MaintenanceEngine.build(profile, progress, smokingEvents, cravingEvents, experiments, now);
    if (maintenance.active) {
      return {
        source: 'maintenance', priority: 80,
        titleDe: maintenance.titleDe,
        titleEn: maintenance.titleEn,
        bodyDe: maintenance.focusDe,
        bodyEn: maintenance.focusEn,
        ctaDe: 'Wochenplan ansehen', ctaEn: 'View weekly plan', action: 'open_lab',
        suppressGenericNextBestAction: true,
        deferJourneyIntervention: true,
        reasonCodes: ['journey_complete', 'maintenance_mode'],
      };
    }

    if (profile.goal === 'quit') {
      const signals = QuitRecoveryEngine.identifyHighRiskSignals(smokingEvents, cravingEvents);
      const protectedSignatures = new Set(quitSupport.highRiskPlans.map((plan) => plan.signature));
      const unprotected = signals.find((signal) => !protectedSignatures.has(signal.signature));
      if (unprotected) {
        const triggerDe = formatSituation(unprotected.trigger, 'de');
        const triggerEn = formatSituation(unprotected.trigger, 'en');
        const placeDe = unprotected.place ? ` · ${formatPlace(unprotected.place, 'de')}` : '';
        const placeEn = unprotected.place ? ` · ${formatPlace(unprotected.place, 'en')}` : '';
        return {
          source: 'quit_preparation', priority: 70,
          titleDe: 'Eine schwierige Schleife braucht noch einen Schutzplan.',
          titleEn: 'One difficult loop still needs a protection plan.',
          bodyDe: `${triggerDe}${placeDe} ist wiederholt in deinen Daten aufgetaucht. Plane eine konkrete Antwort dafür, bevor du dich auf Willenskraft verlässt.`,
          bodyEn: `${triggerEn}${placeEn} has appeared repeatedly in your data. Prepare one concrete response for it rather than relying on willpower alone.`,
          ctaDe: 'Im Lab vorbereiten', ctaEn: 'Prepare in Lab', action: 'open_lab',
          suppressGenericNextBestAction: true,
          deferJourneyIntervention: false,
          reasonCodes: ['unprotected_high_risk_signal'],
        };
      }

      const model = PersonalControlModelEngine.build(profile, smokingEvents, cravingEvents, experiments);
      const prep = GoalSupportEngine.quitPreparation(model, progress, cravingEvents);
      const open = prep.items.find((item) => !item.complete);
      if (open) {
        return {
          source: 'quit_preparation', priority: 65,
          titleDe: open.titleDe,
          titleEn: open.titleEn,
          bodyDe: open.detailDe,
          bodyEn: open.detailEn,
          ctaDe: 'Vorbereitung ansehen', ctaEn: 'View preparation', action: 'open_lab',
          suppressGenericNextBestAction: true,
          deferJourneyIntervention: false,
          reasonCodes: ['next_quit_preparation_gap', open.id],
        };
      }
    }

    if (profile.goal === 'reduce') {
      const opportunity = GoalSupportEngine.reductionOpportunity(smokingEvents);
      if (opportunity) {
        return {
          source: 'reduction', priority: 60,
          titleDe: opportunity.titleDe,
          titleEn: opportunity.titleEn,
          bodyDe: opportunity.bodyDe,
          bodyEn: opportunity.bodyEn,
          ctaDe: 'Im Lab als Fokus nutzen', ctaEn: 'Use as Lab focus', action: 'open_lab',
          suppressGenericNextBestAction: true,
          deferJourneyIntervention: false,
          reasonCodes: ['repeated_low_intensity_automatic_loop'],
        };
      }
    }

    const sequence = ExperimentSequencingEngine.next(profile, smokingEvents, cravingEvents, experiments);
    if (sequence) {
      return {
        source: 'pattern', priority: 50,
        titleDe: sequence.questionDe,
        titleEn: sequence.questionEn,
        bodyDe: sequence.whyNowDe,
        bodyEn: sequence.whyNowEn,
        ctaDe: 'Offene Frage testen', ctaEn: 'Test open question', action: 'open_experiment',
        suppressGenericNextBestAction: true,
        deferJourneyIntervention: false,
        reasonCodes: ['sequenced_personal_question'],
      };
    }

    if (!missionDe.completed) {
      return {
        source: 'journey', priority: 40,
        titleDe: missionDe.title,
        titleEn: missionEn.title,
        bodyDe: missionDe.objective,
        bodyEn: missionEn.objective,
        ctaDe: 'Heutige Mission öffnen', ctaEn: 'Open today’s mission', action: 'open_lab',
        suppressGenericNextBestAction: true,
        deferJourneyIntervention: false,
        reasonCodes: ['current_journey_mission'],
      };
    }

    const nextDe = NextBestActionEngine.generate(profile, smokingEvents, cravingEvents, 'de');
    const nextEn = NextBestActionEngine.generate(profile, smokingEvents, cravingEvents, 'en');
    return {
      source: 'pattern', priority: 20,
      titleDe: nextDe.title,
      titleEn: nextEn.title,
      bodyDe: nextDe.body,
      bodyEn: nextEn.body,
      ctaDe: nextDe.cta,
      ctaEn: nextEn.cta,
      action: 'none',
      suppressGenericNextBestAction: false,
      deferJourneyIntervention: false,
      reasonCodes: ['generic_next_best_action'],
    };
  }
}
