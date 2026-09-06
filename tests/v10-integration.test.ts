import { GoalModeCoordinator } from '../src/services/behavior/GoalModeCoordinator';
import { InterventionPriorityEngine } from '../src/services/behavior/InterventionPriorityEngine';
import type {
  JourneyProgress,
  LapseRecoveryRecord,
  PersonalExperiment,
  QuitSupportPlan,
  SmokingEvent,
  UserProfile,
} from '../src/types';

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };

const profile = (goal: UserProfile['goal']): UserProfile => ({
  id: `v10-${goal}`,
  version: 1,
  baseline: { typicalCigarettesPerDay: 12, yearsSmoking: 8 },
  goal,
  automaticSituations: ['Coffee', 'Stress'],
  onboardingCompleted: true,
  onboardingCompletedAt: '2026-08-01T08:00:00.000Z',
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-01T08:00:00.000Z',
  preferredLanguage: 'de',
});

const progress = (completed = false): JourneyProgress => ({
  phase: completed ? 'own' : 'disrupt',
  phaseName: completed ? 'PHASE 5 · OWN IT' : 'PHASE 2 · DISRUPT',
  dayInLab: completed ? 30 : 8,
  currentDayStartedAt: '2026-09-05T07:00:00.000Z',
  completedDays: completed ? Array.from({ length: 30 }, (_, i) => i + 1) : [1,2,3,4,5,6,7],
  missionCompletions: {}, missionResponses: {},
  journeyCompletedAt: completed ? '2026-09-01T12:00:00.000Z' : undefined,
  controlScore: 55, totalCigarettesLogged: 0, totalCravingsLogged: 0,
  totalInterruptedLoops: 0, lastBaselineComparison: 'learning',
});

const smoke = (id: string, iso: string, trigger = 'Stress', intensity = 4): SmokingEvent => ({
  id, timestamp: iso, trigger, place: 'Work', cravingIntensity: intensity,
  decisionType: 'automatic', behavior: 'smoking', action: 'cigarette',
});

const quitPlan = (withProtection = false): QuitSupportPlan => ({
  enabled: true,
  quitDate: '2026-09-05',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  highRiskPlans: withProtection ? [{
    id: 'risk-1', signature: 'Stress|Work|afternoon', trigger: 'Stress', place: 'Work', timeWindow: 'afternoon',
    interventionId: 'THREE_MINUTE_DELAY', planText: 'Wenn Stress bei Arbeit auftaucht, unterbreche ich zuerst die Routine.',
    createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', source: 'user',
  }] : [],
});

const experiment: PersonalExperiment = {
  id: 'exp-active', signature: 'test|coffee', kind: 'cue_separation', status: 'active',
  createdAt: '2026-09-01T00:00:00.000Z', activatedAt: '2026-09-01T00:00:00.000Z',
  targetTrigger: 'Coffee', interventionId: 'COFFEE_SEPARATION', targetAttempts: 3, attemptCravingIds: [],
  sourceEvidence: 'emerging', sourceCount: 5,
  hypothesisDe: 'Kaffee und Zigarette könnten eng gekoppelt sein.',
  hypothesisEn: 'Coffee and cigarettes may be closely paired.',
  testDe: 'Kaffee behalten, Zigarette zeitlich trennen.', testEn: 'Keep coffee, separate the cigarette in time.',
  keepConstantDe: 'Kaffee', keepConstantEn: 'Coffee', changeDe: 'Abstand', changeEn: 'Gap',
  rationaleDe: 'Persönlicher Test.', rationaleEn: 'Personal test.',
};

// Recovery must survive dismissal and outrank every other task until recorded.
const postQuitSmoke = smoke('post', '2026-09-06T15:00:00.000Z', 'Stress', 8);
let decision = GoalModeCoordinator.build(
  profile('quit'), progress(false), [postQuitSmoke], [], [experiment], quitPlan(true), [], new Date('2026-09-06T18:00:00.000Z')
);
assert(decision.source === 'recovery', 'pending post-quit recovery must outrank an active experiment');
assert(decision.pendingRecoverySmokingEventId === 'post', 'recovery decision must point to the unresolved smoking event');

// Once the recovery is recorded, the deliberately active experiment becomes primary.
const recovery: LapseRecoveryRecord = {
  id: 'rec-1', smokingEventId: 'post', createdAt: '2026-09-06T18:05:00.000Z', trigger: 'Stress', nextStep: 'observe_next',
};
decision = GoalModeCoordinator.build(
  profile('quit'), progress(false), [postQuitSmoke], [], [experiment], quitPlan(true), [recovery], new Date('2026-09-06T18:10:00.000Z')
);
assert(decision.source === 'active_experiment', 'resolved recovery should allow the active experiment to regain priority');
assert(decision.suppressGenericNextBestAction, 'active experiment should suppress competing generic next action');

// A prepared protection plan is the primary Quit focus after the quit date when no recovery/experiment is pending.
decision = GoalModeCoordinator.build(
  profile('quit'), progress(false), [], [], [], quitPlan(true), [], new Date('2026-09-06T12:00:00.000Z')
);
assert(decision.source === 'quit_protection', 'prepared quit protection should become the main post-quit focus');

// Repeated low-intensity automatic smoking should produce a Reduce-mode focus, not a forced target.
const reduceSmokes = [
  smoke('r1','2026-09-01T10:00:00.000Z','Coffee',4),
  smoke('r2','2026-09-02T10:00:00.000Z','Coffee',5),
  smoke('r3','2026-09-03T10:00:00.000Z','Coffee',4),
  smoke('r4','2026-09-04T10:00:00.000Z','Coffee',5),
];
decision = GoalModeCoordinator.build(
  profile('reduce'), progress(false), reduceSmokes, [], [], { ...quitPlan(false), quitDate: undefined }, [], new Date('2026-09-05T12:00:00.000Z')
);
assert(decision.source === 'reduction', 'Reduce mode should prioritize a grounded reduction opportunity when one exists');
assert(decision.reasonCodes.includes('repeated_low_intensity_automatic_loop'), 'Reduce focus should expose its descriptive reason');

// After Day 30, Maintenance replaces the old daily-program priority.
decision = GoalModeCoordinator.build(
  profile('pattern'), progress(true), reduceSmokes, [], [], { ...quitPlan(false), quitDate: undefined }, [], new Date('2026-09-10T12:00:00.000Z')
);
assert(decision.source === 'maintenance', 'Maintenance must become the primary mode after the 30-day Journey');
assert(decision.deferJourneyIntervention, 'Maintenance should defer the old daily Journey intervention');

// Intervention resolver: active personal test > exact quit plan > Journey > adaptive selection.
let priority = InterventionPriorityEngine.resolve(
  { id: 'COFFEE_SEPARATION' }, { id: 'THREE_MINUTE_DELAY' }, { id: 'CHANGE_LOCATION', durationSeconds: 180 }
);
assert(priority.source === 'personal_experiment' && priority.id === 'COFFEE_SEPARATION', 'personal experiment must outrank other intervention sources');
priority = InterventionPriorityEngine.resolve(undefined, { id: 'THREE_MINUTE_DELAY' }, { id: 'CHANGE_LOCATION' });
assert(priority.source === 'quit_protection', 'matching quit protection must outrank a Journey suggestion');
priority = InterventionPriorityEngine.resolve(undefined, undefined, { id: 'CHANGE_LOCATION', durationSeconds: 240 });
assert(priority.source === 'journey' && priority.durationSeconds === 240, 'Journey override should retain its configured duration');
priority = InterventionPriorityEngine.resolve();
assert(priority.source === 'adaptive' && !priority.id, 'no override should fall back to the adaptive engine');

console.log('Smoke Lab v10 integration tests: OK');
