import { GoalSupportEngine } from '../src/services/behavior/GoalSupportEngine';
import { PersonalControlModelEngine } from '../src/services/behavior/PersonalControlModelEngine';
import type { CravingEvent, JourneyProgress, SmokingEvent, UserProfile } from '../src/types';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const profile: UserProfile = {
  id: 'goal-user', version: 1,
  baseline: { typicalCigarettesPerDay: 12, yearsSmoking: 10 },
  goal: 'reduce', automaticSituations: ['Work breaks'], onboardingCompleted: true,
  createdAt: '2026-09-01T07:00:00.000Z', updatedAt: '2026-09-01T07:00:00.000Z', preferredLanguage: 'de',
};

const smoke = (id: string, day: number, craving: number, trigger = 'Work breaks'): SmokingEvent => ({
  id,
  timestamp: `2026-09-0${day}T15:00:00.000Z`,
  trigger,
  place: 'Work',
  cravingIntensity: craving,
  decisionType: 'automatic',
  behavior: 'smoking', action: 'cigarette',
});

const sparse = [smoke('s1', 1, 4), smoke('s2', 2, 4)];
assert(GoalSupportEngine.baselineComparison(profile, sparse).recentAverage === null, 'two days must not create a baseline comparison');
assert(GoalSupportEngine.reductionOpportunity(sparse) === null, 'two repetitions must not create a reduction candidate');

const reductionEvents = [...sparse, smoke('s3', 2, 5), smoke('s4', 3, 4)];
const comparison = GoalSupportEngine.baselineComparison(profile, reductionEvents);
assert(comparison.recentAverage !== null && comparison.daysObserved === 3, 'three logged days should allow a cautious average');
const opportunity = GoalSupportEngine.reductionOpportunity(reductionEvents);
assert(Boolean(opportunity), 'repeated low-intensity automatic loop should become a reduction test candidate');
assert(opportunity?.trigger === 'Work breaks' && opportunity.place === 'Work', 'candidate should preserve normalized cue and context');
assert(opportunity?.bodyDe.includes('nicht automatisch'), 'copy must avoid calling the candidate an objectively easy cigarette');

const highUrge = [smoke('h1', 1, 8, 'Stress'), smoke('h2', 2, 9, 'Stress'), smoke('h3', 3, 8, 'Stress')];
assert(GoalSupportEngine.reductionOpportunity(highUrge) === null, 'high-intensity automatic loop should not be labeled a gentle reduction candidate');

const cravings: CravingEvent[] = Array.from({ length: 8 }, (_, index) => ({
  id: `c${index}`,
  timestamp: `2026-09-0${1 + (index % 3)}T08:${10 + index}:00.000Z`,
  trigger: 'Coffee', place: 'Work', initialIntensity: index < 4 ? 8 : 7, finalIntensity: 5,
  interventionId: 'COFFEE_SEPARATION', interventionStartedAt: '2026-09-01T08:00:00.000Z', outcome: 'weaker',
}));
const quitProfile = { ...profile, goal: 'quit' as const };
const model = PersonalControlModelEngine.build(quitProfile, reductionEvents, cravings, []);
const journey: JourneyProgress = {
  phase: 'break', phaseName: 'BREAK', dayInLab: 25, completedDays: [], missionCompletions: {},
  missionResponses: { if_then_plan: 'Wenn Kaffee, dann erst Ort wechseln.', lapse_plan: 'Kurz analysieren und weiter.' },
  controlScore: 55, totalCigarettesLogged: 4, totalCravingsLogged: 8, totalInterruptedLoops: 4,
  lastBaselineComparison: 'learning',
};
const prep = GoalSupportEngine.quitPreparation(model, journey, cravings);
assert(prep.items.find((item) => item.id === 'if_then')?.complete, 'if-then plan should count as quit preparation');
assert(prep.items.find((item) => item.id === 'lapse')?.complete, 'lapse plan should count as quit preparation');
assert(prep.completed >= 4, 'repeated multi-day data plus plans should complete most preparation elements');

console.log('Smoke Lab goal support tests: OK');
