import { CravingEvent, HighRiskPlan, LapseRecoveryRecord, QuitSupportPlan, SmokingEvent } from '../../types';
import { formatPlace, formatSituation } from '../../i18n/translations';
import { PatternEngine } from './PatternEngine';

export type QuitPlanStatus = 'not_set' | 'preparing' | 'quit_day' | 'post_quit';

export interface HighRiskSignal {
  signature: string;
  trigger: string;
  place?: string;
  timeWindow?: string;
  observations: number;
  uniqueDays: number;
  averageCraving: number;
  automaticShare: number;
  smokedOutcomes: number;
  score: number;
}

const dateKey = (timestamp: string): string => {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return timestamp.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const localDate = (date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export class QuitRecoveryEngine {
  static status(plan: QuitSupportPlan, now = new Date()): QuitPlanStatus {
    if (!plan.enabled || !plan.quitDate) return 'not_set';
    const today = localDate(now);
    if (plan.quitDate > today) return 'preparing';
    if (plan.quitDate === today) return 'quit_day';
    return 'post_quit';
  }

  static eventIsAfterQuitDate(event: SmokingEvent, plan: QuitSupportPlan): boolean {
    if (!plan.quitDate) return false;
    return dateKey(event.timestamp) >= plan.quitDate;
  }

  static shouldOfferRecovery(event: SmokingEvent, plan: QuitSupportPlan): boolean {
    return Boolean(plan.enabled && plan.quitDate && this.eventIsAfterQuitDate(event, plan));
  }

  static identifyHighRiskSignals(smokes: SmokingEvent[], cravings: CravingEvent[]): HighRiskSignal[] {
    const map = new Map<string, { trigger:string; place?:string; timeWindow?:string; obs:number; days:Set<string>; intensitySum:number; intensityN:number; automatic:number; smokedOutcomes:number }>();
    const add = (triggerRaw:string, placeRaw:string|undefined, timestamp:string, intensity:number|undefined, automatic:boolean, smoked:boolean) => {
      if (!triggerRaw) return;
      const trigger = PatternEngine.normalizeTriggerKey(triggerRaw);
      const place = placeRaw ? PatternEngine.normalizePlaceKey(placeRaw) : undefined;
      const d = new Date(timestamp);
      const timeWindow = Number.isNaN(d.getTime()) ? undefined : PatternEngine.getTimeWindow(d.getHours()).id;
      const signature = `${trigger}|${place||''}|${timeWindow||''}`;
      const item = map.get(signature) || { trigger, place, timeWindow, obs:0, days:new Set<string>(), intensitySum:0, intensityN:0, automatic:0, smokedOutcomes:0 };
      item.obs += 1; item.days.add(dateKey(timestamp));
      if (typeof intensity === 'number') { item.intensitySum += intensity; item.intensityN += 1; }
      if (automatic) item.automatic += 1;
      if (smoked) item.smokedOutcomes += 1;
      map.set(signature, item);
    };
    const smokesById = new Map(smokes.map((event) => [event.id, event]));
    const linkedSmokingIds = new Set(cravings.map((event) => event.linkedSmokingEventId).filter(Boolean) as string[]);
    smokes.filter((event) => !linkedSmokingIds.has(event.id)).forEach(e => add(e.trigger, e.place, e.timestamp, e.cravingIntensity, e.decisionType==='automatic', true));
    cravings.forEach(e => {
      const linkedSmoke = e.linkedSmokingEventId ? smokesById.get(e.linkedSmokingEventId) : undefined;
      add(e.trigger, e.place, e.timestamp, e.initialIntensity, linkedSmoke?.decisionType === 'automatic', e.outcome==='smoked' || Boolean(linkedSmoke));
    });

    return [...map.entries()].map(([signature,item]) => {
      const avg = item.intensityN ? item.intensitySum/item.intensityN : 0;
      const auto = item.obs ? item.automatic/item.obs : 0;
      const score = item.obs + item.days.size*1.5 + Math.max(0, avg-5)*1.2 + auto*2 + item.smokedOutcomes*0.7;
      return { signature, trigger:item.trigger, place:item.place, timeWindow:item.timeWindow, observations:item.obs, uniqueDays:item.days.size, averageCraving:Math.round(avg*10)/10, automaticShare:Math.round(auto*100), smokedOutcomes:item.smokedOutcomes, score };
    })
      .filter(x => x.observations >= 3 && x.uniqueDays >= 2 && (x.averageCraving >= 6 || x.automaticShare >= 40))
      .sort((a,b) => b.score-a.score)
      .slice(0,3);
  }

  static suggestedPlan(signal: HighRiskSignal, locale:'de'|'en'): HighRiskPlan {
    const de = locale==='de';
    const trigger = formatSituation(signal.trigger, locale);
    const place = signal.place ? formatPlace(signal.place, locale) : null;
    let interventionId = 'THREE_MINUTE_DELAY';
    if (signal.trigger === 'Coffee') interventionId = 'COFFEE_SEPARATION';
    else if (signal.trigger === 'After meals') interventionId = 'AFTER_MEAL_RESET';
    else if (signal.trigger === 'Work breaks') interventionId = 'BREAK_ROUTINE';
    else if (signal.trigger === 'Habit') interventionId = 'CHANGE_LOCATION';
    const context = place ? `${trigger} · ${place}` : trigger;
    const planText = de
      ? `Wenn ${context} auftaucht, unterbreche ich zuerst bewusst die Routine und entscheide danach neu.`
      : `When ${context} appears, I will interrupt the routine first and then decide again.`;
    const now = new Date().toISOString();
    return { id:`risk_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, signature:signal.signature, trigger:signal.trigger, place:signal.place, timeWindow:signal.timeWindow, interventionId, planText, createdAt:now, updatedAt:now, source:'suggested' };
  }

  static recoveryMessage(record: LapseRecoveryRecord, locale:'de'|'en'): string {
    if (locale==='de') {
      if (record.nextStep==='repeat_with_plan') return 'Beim nächsten ähnlichen Moment liegt der Fokus auf dem vorbereiteten Plan – nicht auf Perfektion.';
      if (record.nextStep==='review_plan') return 'Wir passen den Plan an diese konkrete Situation an. Dein bisheriger Fortschritt bleibt bestehen.';
      if (record.nextStep==='professional_support') return 'Zusätzliche Unterstützung kann sinnvoll sein. Smoke Lab bleibt ein Selbstmanagement-Tool und ersetzt keine professionelle Behandlung.';
      return 'Die Situation ist erfasst. Eine einzelne Zigarette setzt dein Lernen nicht zurück.';
    }
    if (record.nextStep==='repeat_with_plan') return 'For the next similar moment, the focus is the prepared plan — not perfection.';
    if (record.nextStep==='review_plan') return 'We will adapt the plan to this specific situation. Your previous progress remains.';
    if (record.nextStep==='professional_support') return 'Additional support may be useful. Smoke Lab is a self-management tool and does not replace professional care.';
    return 'The situation is logged. One cigarette does not reset what you have learned.';
  }
}
