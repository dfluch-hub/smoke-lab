import { QuitRecoveryEngine } from '../src/services/behavior/QuitRecoveryEngine';
import type { CravingEvent, QuitSupportPlan, SmokingEvent } from '../src/types';

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };

const plan: QuitSupportPlan = {
  enabled: true,
  quitDate: '2026-09-05',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  highRiskPlans: [],
};
assert(QuitRecoveryEngine.status(plan, new Date('2026-09-04T12:00:00')) === 'preparing', 'date before quit day should be preparation');
assert(QuitRecoveryEngine.status(plan, new Date('2026-09-05T12:00:00')) === 'quit_day', 'same local date should be quit day');
assert(QuitRecoveryEngine.status(plan, new Date('2026-09-06T12:00:00')) === 'post_quit', 'date after quit day should be post quit');

const smoke = (id:string, day:number, trigger='Stress', craving=8): SmokingEvent => ({
  id, timestamp:`2026-09-0${day}T15:00:00.000Z`, trigger, place:'Work', cravingIntensity:craving,
  decisionType:'automatic', behavior:'smoking', action:'cigarette',
});
const smokes = [smoke('s1',1), smoke('s2',2), smoke('s3',3), smoke('s4',3, 'Coffee', 5)];
const signals = QuitRecoveryEngine.identifyHighRiskSignals(smokes, []);
assert(signals.length >= 1, 'repeated strong automatic context across days should create a risk signal');
assert(signals[0].trigger === 'Stress', 'strong repeated stress signal should lead');
assert(signals[0].uniqueDays >= 2, 'signal must preserve multi-day evidence');
const suggested = QuitRecoveryEngine.suggestedPlan(signals[0], 'de');
assert(suggested.planText.includes('Stress') && suggested.planText.includes('Arbeit'), 'suggested plan should preserve cue and context');

const linkedSmoke: SmokingEvent = { ...smoke('linked', 4, 'Coffee', 7), linkedCravingEventId:'c-linked' };
const linkedCraving: CravingEvent = {
  id:'c-linked', timestamp:linkedSmoke.timestamp, trigger:'Coffee', place:'Work', initialIntensity:7,
  interventionId:'COFFEE_SEPARATION', interventionStartedAt:linkedSmoke.timestamp, outcome:'smoked', linkedSmokingEventId:'linked',
};
const linkedSignals = QuitRecoveryEngine.identifyHighRiskSignals([linkedSmoke], [linkedCraving]);
assert(linkedSignals.length === 0, 'one linked craving/smoking situation must not be double counted into a repeated signal');

assert(QuitRecoveryEngine.shouldOfferRecovery(smoke('after', 6), plan), 'smoking after the optional quit date should offer recovery');
assert(!QuitRecoveryEngine.shouldOfferRecovery(smoke('before', 4), plan), 'smoking before the optional quit date should not trigger lapse recovery');

console.log('Smoke Lab quit/recovery tests: OK');
