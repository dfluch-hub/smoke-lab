import { JourneyAdaptationEngine } from '../src/services/behavior/JourneyAdaptationEngine';
import { JourneyEngine } from '../src/services/behavior/JourneyEngine';
import type { CravingEvent, JourneyProgress, UserProfile } from '../src/types';

const assert = (cond: unknown, msg: string) => { if (!cond) throw new Error(msg); };

const profile: UserProfile = {
  id: 'u-adaptive',
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

const event = (
  id: string,
  trigger: string,
  intensity: number,
  outcome: CravingEvent['outcome'],
  interventionId = 'THREE_MINUTE_DELAY',
  place = 'Work'
): CravingEvent => ({
  id,
  timestamp: `2026-09-0${Math.min(9, Number(id.replace(/\D/g, '')) || 1)}T08:00:00.000Z`,
  trigger,
  place,
  initialIntensity: intensity,
  interventionId,
  interventionStartedAt: '2026-09-01T08:00:00.000Z',
  outcome,
});

const hardRecent = [
  event('1', 'Stress', 9, 'smoked'),
  event('2', 'Stress', 9, 'stronger'),
  event('3', 'Stress', 8, 'unchanged'),
];
const gentle = JourneyAdaptationEngine.build(profile, [], hardRecent);
assert(gentle.challengeLevel === 'gentle', 'hard recent situations should keep challenge gentle');
const gentleDay6 = JourneyEngine.getMissionForDay(6, profile, progress(6), [], hardRecent, 'de');
assert(gentleDay6.interventionDurationSeconds === 60, 'gentle day 6 should use a shorter delay experiment');

const manageable = [
  event('1', 'Coffee', 5, 'weaker', 'COFFEE_SEPARATION'),
  event('2', 'Coffee', 5, 'gone', 'COFFEE_SEPARATION'),
  event('3', 'Coffee', 4, 'weaker', 'COFFEE_SEPARATION'),
  event('4', 'Coffee', 5, 'weaker', 'COFFEE_SEPARATION'),
  event('5', 'Coffee', 4, 'gone', 'COFFEE_SEPARATION'),
  event('6', 'Coffee', 5, 'weaker', 'COFFEE_SEPARATION'),
];
const stretch = JourneyAdaptationEngine.build(profile, [], manageable);
assert(stretch.challengeLevel === 'stretch', 'repeated manageable attempts should permit a small stretch');
assert(stretch.preferredInterventionId === 'COFFEE_SEPARATION', 'repeated helpful personal intervention should become preferred');
const stretchDay6 = JourneyEngine.getMissionForDay(6, profile, progress(6), [], manageable, 'de');
assert(stretchDay6.interventionDurationSeconds === 300, 'stretch day 6 should use a longer but bounded delay experiment');

const coffeeDay8 = JourneyEngine.getMissionForDay(8, profile, progress(8), [], manageable, 'de');
assert(coffeeDay8.targetTrigger === 'Coffee', 'coffee-pattern user should receive a coffee-targeted day 8');
assert(coffeeDay8.interventionId === 'COFFEE_SEPARATION', 'coffee-pattern user should receive coffee separation');
assert(coffeeDay8.personalized === true, 'data-grounded day 8 should be marked personalized');

const stressHistory = [
  event('1', 'Stress', 6, 'weaker', 'THREE_MINUTE_DELAY', 'Home'),
  event('2', 'Stress', 6, 'weaker', 'THREE_MINUTE_DELAY', 'Home'),
  event('3', 'Stress', 6, 'gone', 'THREE_MINUTE_DELAY', 'Home'),
  event('4', 'Stress', 7, 'weaker', 'THREE_MINUTE_DELAY', 'Home'),
  event('5', 'Stress', 6, 'unchanged', 'THREE_MINUTE_DELAY', 'Home'),
];
const stressDay8 = JourneyEngine.getMissionForDay(8, profile, progress(8), [], stressHistory, 'de');
assert(stressDay8.targetTrigger === 'Stress', 'stress-pattern user should receive a stress-targeted day 8');
assert(stressDay8.targetPlace === 'Home', 'repeated trigger+place context should personalize the target context');
assert(stressDay8.interventionId === 'THREE_MINUTE_DELAY', 'personal outcome history should be able to select a different day 8 intervention');

const gentleDay18 = JourneyEngine.getMissionForDay(18, profile, progress(18), [], hardRecent, 'de');
const stretchDay18 = JourneyEngine.getMissionForDay(18, profile, progress(18), [], manageable, 'de');
assert(gentleDay18.completionTarget === 1, 'gentle users should not be forced into two repetitions on day 18');
assert(stretchDay18.completionTarget === 2, 'manageable recent attempts can keep two repetitions on day 18');

const gentleDay26 = JourneyEngine.getMissionForDay(26, profile, progress(26), [], hardRecent, 'de');
const stretchDay26 = JourneyEngine.getMissionForDay(26, profile, progress(26), [], manageable, 'de');
assert(gentleDay26.options?.[0]?.value === '15', 'gentle day 26 should offer a smaller first window');
assert(stretchDay26.options?.[0]?.value === '60', 'stretch day 26 can begin with a larger window');

console.log('Smoke Lab adaptation tests: OK');
