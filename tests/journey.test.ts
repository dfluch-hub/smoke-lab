import { JourneyEngine } from '../src/services/behavior/JourneyEngine';
import { BehaviorInterventionEngine } from '../src/services/behavior/BehaviorInterventionEngine';
import type { CravingEvent, JourneyProgress, SmokingEvent, UserProfile } from '../src/types';

const assert = (cond: unknown, msg: string) => { if (!cond) throw new Error(msg); };

const profile: UserProfile = {
  id: 'u-journey',
  version: 1,
  baseline: { typicalCigarettesPerDay: 12, yearsSmoking: 8 },
  goal: 'pattern',
  automaticSituations: ['Coffee', 'Stress'],
  onboardingCompleted: true,
  onboardingCompletedAt: '2026-09-01T07:00:00.000Z',
  createdAt: '2026-09-01T07:00:00.000Z',
  updatedAt: '2026-09-01T07:00:00.000Z',
  preferredLanguage: 'de',
};

const progress = (day: number): JourneyProgress => ({
  phase: JourneyEngine.phaseForDay(day, 'en').id,
  phaseName: JourneyEngine.phaseNameForStorage(day),
  dayInLab: day,
  currentDayStartedAt: '2026-09-01T07:00:00.000Z',
  completedDays: Array.from({ length: Math.max(0, day - 1) }, (_, i) => i + 1),
  missionCompletions: {},
  missionResponses: {},
  controlScore: 50,
  totalCigarettesLogged: 0,
  totalCravingsLogged: 0,
  totalInterruptedLoops: 0,
  lastBaselineComparison: 'learning',
});

assert(JourneyEngine.phaseForDay(1, 'en').id === 'discover', 'day 1 phase');
assert(JourneyEngine.phaseForDay(5, 'en').id === 'discover', 'day 5 phase');
assert(JourneyEngine.phaseForDay(6, 'en').id === 'disrupt', 'day 6 phase');
assert(JourneyEngine.phaseForDay(13, 'en').id === 'control', 'day 13 phase');
assert(JourneyEngine.phaseForDay(21, 'en').id === 'break', 'day 21 phase');
assert(JourneyEngine.phaseForDay(28, 'en').id === 'own', 'day 28 phase');

const day1Empty = JourneyEngine.getMissionForDay(1, profile, progress(1), [], [], 'de');
assert(!day1Empty.completionReady, 'day 1 should wait for a real smoking event');

const smoke: SmokingEvent = {
  id: 's1',
  timestamp: '2026-09-01T08:00:00.000Z',
  trigger: 'Kaffee',
  place: 'Arbeit',
  cravingIntensity: 6,
  decisionType: 'automatic',
};
const day1WithSmoke = JourneyEngine.getMissionForDay(1, profile, progress(1), [smoke], [], 'de');
assert(day1WithSmoke.completionReady, 'day 1 should complete from a real smoking event');

const day13 = JourneyEngine.getMissionForDay(13, profile, progress(13), [smoke], [], 'de');
assert(day13.inputType === 'goal', 'day 13 should let user choose focus');

const reduceProfile: UserProfile = { ...profile, goal: 'reduce' };
const day14Reduce = JourneyEngine.getMissionForDay(14, reduceProfile, progress(14), [smoke], [], 'de');
assert(day14Reduce.inputType === 'number', 'reduce mode day 14 should use a gentle ceiling');

const quitProfile: UserProfile = { ...profile, goal: 'quit' };
const day14Quit = JourneyEngine.getMissionForDay(14, quitProfile, progress(14), [smoke], [], 'de');
assert(day14Quit.inputType === 'choice', 'quit mode day 14 should use a protected window');

const day30 = JourneyEngine.getMissionForDay(30, profile, progress(30), [smoke], [], 'de');
assert(day30.inputType === 'text' && day30.responseKey === 'control_plan', 'day 30 should build Control Plan');

const preferred = BehaviorInterventionEngine.selectIntervention('Kaffee', 'Arbeit', [], 'THREE_MINUTE_DELAY');
assert(preferred.intervention.id === 'THREE_MINUTE_DELAY', 'journey intervention override should be respected');
assert(preferred.isJourneyExperiment === true && preferred.isAdaptiveRecommendation === false, 'journey experiment should not masquerade as adaptive best choice');

const historical: CravingEvent[] = [
  { id:'c1', timestamp:'2026-09-01T08:00:00.000Z', trigger:'Kaffee', place:'Arbeit', initialIntensity:7, interventionId:'THREE_MINUTE_DELAY', interventionStartedAt:'2026-09-01T08:00:00.000Z', outcome:'weaker' },
  { id:'c2', timestamp:'2026-09-02T08:00:00.000Z', trigger:'Coffee', place:'Work', initialIntensity:7, interventionId:'THREE_MINUTE_DELAY', interventionStartedAt:'2026-09-02T08:00:00.000Z', outcome:'gone' },
  { id:'c3', timestamp:'2026-09-03T08:00:00.000Z', trigger:'Kaffee', place:'Arbeit', initialIntensity:7, interventionId:'THREE_MINUTE_DELAY', interventionStartedAt:'2026-09-03T08:00:00.000Z', outcome:'weaker' },
];
const adaptive = BehaviorInterventionEngine.selectIntervention('Coffee', 'Work', historical);
assert(adaptive.intervention.id === 'THREE_MINUTE_DELAY' && adaptive.isAdaptiveRecommendation, 'adaptive history should still work without a journey override');

console.log('Smoke Lab journey tests: OK');
