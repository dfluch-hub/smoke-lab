import { WeeklyReviewEngine } from '../src/services/behavior/WeeklyReviewEngine';
import { MaintenanceEngine } from '../src/services/behavior/MaintenanceEngine';
import { ExperimentLibraryEngine } from '../src/services/behavior/ExperimentLibraryEngine';
import { ControlPlanEngine } from '../src/services/behavior/ControlPlanEngine';
import type { CravingEvent, JourneyProgress, QuitSupportPlan, SmokingEvent, UserProfile } from '../src/types';

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const profile: UserProfile = {
  id:'v9-user', version:1, baseline:{ typicalCigarettesPerDay:12, yearsSmoking:8 }, goal:'pattern',
  automaticSituations:['Coffee','Stress'], onboardingCompleted:true, createdAt:'2026-08-01T08:00:00.000Z',
  updatedAt:'2026-08-01T08:00:00.000Z', preferredLanguage:'de'
};
const smoke = (id:string, iso:string, trigger='Coffee'): SmokingEvent => ({
  id, timestamp:iso, trigger, place:'Work', cravingIntensity:5, decisionType:'automatic', behavior:'smoking', action:'cigarette'
});
const crave = (id:string, iso:string, outcome:CravingEvent['outcome']='weaker'): CravingEvent => ({
  id, timestamp:iso, trigger:'Coffee', place:'Work', initialIntensity:7, finalIntensity:5,
  interventionId:'COFFEE_SEPARATION', interventionStartedAt:iso, outcome, elapsedSeconds:120, interrupted:true
});
const smokes = [
  smoke('s1','2026-09-01T08:00:00.000Z'), smoke('s2','2026-09-02T08:00:00.000Z'), smoke('s3','2026-09-03T08:00:00.000Z'),
  smoke('s4','2026-08-26T08:00:00.000Z'), smoke('s5','2026-08-27T08:00:00.000Z'), smoke('s6','2026-08-28T08:00:00.000Z'), smoke('s7','2026-08-29T08:00:00.000Z')
];
const cravings = [
  crave('c1','2026-09-01T09:00:00.000Z'), crave('c2','2026-09-02T09:00:00.000Z'), crave('c3','2026-09-03T09:00:00.000Z')
];

const weekly = WeeklyReviewEngine.build(profile, smokes, cravings, new Date('2026-09-05T12:00:00.000Z'));
assert(weekly.ready, 'weekly review should become ready with repeated observations');
assert(weekly.observationCount >= 6, 'weekly review must count current-window observations');
assert(weekly.metrics.some((m) => m.id === 'interruptions' && m.value !== '0'), 'weekly review should expose interrupted loops');

const library = ExperimentLibraryEngine.list();
assert(library.length === 8, 'experiment library should contain the eight core experiments');
const recommended = ExperimentLibraryEngine.recommended(profile, 'Coffee');
assert(recommended[0].recommendedTriggers.includes('Coffee'), 'coffee-relevant library test should rank first');
const personal = ExperimentLibraryEngine.createPersonal(recommended[0], profile, 'Coffee');
assert(personal.targetTrigger === 'Coffee' && personal.targetAttempts === 3, 'library test should become a cautious personal experiment');

const progress: JourneyProgress = {
  phase:'own', phaseName:'PHASE 5 · OWN IT', dayInLab:30, currentDayStartedAt:'2026-08-30T08:00:00.000Z',
  completedDays:Array.from({length:30},(_,i)=>i+1), missionCompletions:{}, missionResponses:{}, journeyCompletedAt:'2026-08-31T12:00:00.000Z',
  controlScore:60, totalCigarettesLogged:7, totalCravingsLogged:3, totalInterruptedLoops:3, lastBaselineComparison:'learning'
};
const maintenance = MaintenanceEngine.build(profile, progress, smokes, cravings, [], new Date('2026-09-08T12:00:00.000Z'));
assert(maintenance.active && maintenance.weekNumber >= 2, 'maintenance should activate after Day 30 and advance by week');
assert(maintenance.actionsDe.length >= 3, 'maintenance should provide a compact weekly protection plan');

const quitSupport: QuitSupportPlan = { enabled:true, createdAt:'2026-08-01T00:00:00.000Z', updatedAt:'2026-08-01T00:00:00.000Z', highRiskPlans:[] };
const controlPlan = ControlPlanEngine.build(profile, progress, smokes, cravings, [], quitSupport);
assert(controlPlan.steps.length >= 1, 'Control Plan 2.0 must always provide at least one grounded step');
assert(controlPlan.steps.length <= 5, 'Control Plan 2.0 should remain concise');

console.log('Smoke Lab v9 integration tests: OK');
