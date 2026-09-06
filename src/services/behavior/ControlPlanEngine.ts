import { CravingEvent, JourneyProgress, PersonalExperiment, QuitSupportPlan, SmokingEvent, UserProfile } from '../../types';
import { PersonalControlModelEngine, ControlPlanStep } from './PersonalControlModelEngine';
import { GoalSupportEngine } from './GoalSupportEngine';

export interface ControlPlanV2 {
  maturity: 'learning' | 'forming' | 'ready';
  titleDe: string;
  titleEn: string;
  summaryDe: string;
  summaryEn: string;
  steps: ControlPlanStep[];
}

export class ControlPlanEngine {
  static build(
    profile: UserProfile,
    progress: JourneyProgress,
    smokingEvents: SmokingEvent[] = [],
    cravingEvents: CravingEvent[] = [],
    experiments: PersonalExperiment[] = [],
    quitSupport?: QuitSupportPlan,
  ): ControlPlanV2 {
    const model = PersonalControlModelEngine.build(profile, smokingEvents, cravingEvents, experiments);
    const steps: ControlPlanStep[] = [...model.controlPlan];

    if (quitSupport?.highRiskPlans?.length) {
      const first = quitSupport.highRiskPlans[0];
      steps.push({
        id: 'prepared_high_risk',
        titleDe: 'Für schwierige Situationen vorbereitet',
        titleEn: 'Prepared for difficult situations',
        bodyDe: first.planText,
        bodyEn: first.planText,
        evidence: 'emerging',
      });
    }

    if (profile.goal === 'reduce') {
      const opportunity = GoalSupportEngine.reductionOpportunity(smokingEvents);
      if (opportunity) {
        steps.push({
          id: 'reduce_opportunity',
          titleDe: 'Sanfter Reduktionstest',
          titleEn: 'Gentle reduction test',
          bodyDe: opportunity.bodyDe,
          bodyEn: opportunity.bodyEn,
          evidence: opportunity.observations >= 6 && opportunity.uniqueDays >= 3 ? 'established' : 'emerging',
        });
      }
    }

    if (profile.goal === 'quit') {
      const prep = GoalSupportEngine.quitPreparation(model, progress, cravingEvents);
      const open = prep.items.find((item) => !item.complete);
      if (open) {
        steps.push({
          id: `quit_${open.id}`,
          titleDe: 'Nächster Vorbereitungsschritt',
          titleEn: 'Next preparation step',
          bodyDe: `${open.titleDe}. ${open.detailDe}`,
          bodyEn: `${open.titleEn}. ${open.detailEn}`,
          evidence: 'emerging',
        });
      }
    }

    const unique = steps.filter((step, index, arr) => arr.findIndex((s) => s.id === step.id) === index).slice(0, 5);
    const maturity = model.maturity === 'mapped' && unique.length >= 3 ? 'ready' : model.maturity === 'forming' ? 'forming' : 'learning';

    return {
      maturity,
      titleDe: 'Dein persönlicher Control Plan',
      titleEn: 'Your personal Control Plan',
      summaryDe: maturity === 'ready'
        ? 'Eine lebende Arbeitskarte aus deinen wiederkehrenden Situationen, getesteten Strategien und offenen Fragen.'
        : 'Der Plan wächst mit echten Situationen. Smoke Lab ergänzt nur, was deine Daten tatsächlich tragen.',
      summaryEn: maturity === 'ready'
        ? 'A living working map built from your recurring situations, tested strategies, and open questions.'
        : 'The plan grows with real situations. Smoke Lab only adds what your data actually supports.',
      steps: unique,
    };
  }
}
