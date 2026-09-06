import { HypothesisEngine } from '../src/services/behavior/HypothesisEngine';
import type { CravingEvent, PersonalExperiment, UserProfile } from '../src/types';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const profile: UserProfile = {
  id: 'hypothesis-user',
  version: 1,
  baseline: { typicalCigarettesPerDay: 12, yearsSmoking: 9 },
  goal: 'pattern',
  automaticSituations: ['Coffee'],
  onboardingCompleted: true,
  onboardingCompletedAt: '2026-09-01T07:00:00.000Z',
  createdAt: '2026-09-01T07:00:00.000Z',
  updatedAt: '2026-09-01T07:00:00.000Z',
  preferredLanguage: 'de',
};

const craving = (
  id: string,
  trigger = 'Coffee',
  place = 'Work',
  outcome: CravingEvent['outcome'] = undefined,
  experimentId?: string,
): CravingEvent => ({
  id,
  timestamp: `2026-09-0${Math.min(9, Number(id.replace(/\D/g, '')) || 1)}T08:15:00.000Z`,
  trigger,
  place,
  initialIntensity: 7,
  interventionId: 'CHANGE_LOCATION',
  interventionStartedAt: '2026-09-01T08:15:00.000Z',
  outcome,
  elapsedSeconds: outcome ? 60 : undefined,
  experimentId,
});

assert(HypothesisEngine.suggest(profile, [], [], []) === null, 'sparse data must not manufacture a personal hypothesis');

const repeatedContext = [
  craving('1', 'Kaffee', 'Arbeit'),
  craving('2', 'Coffee', 'Work'),
  craving('3', 'Kaffee', 'Arbeit'),
];
const suggestion = HypothesisEngine.suggest(profile, [], repeatedContext, []);
assert(Boolean(suggestion), 'repeated trigger + place should generate a hypothesis');
assert(suggestion?.kind === 'context_shift', 'repeated context should prioritize a context-shift experiment');
assert(suggestion?.targetTrigger === 'Coffee', 'trigger should be normalized');
assert(suggestion?.targetPlace === 'Work', 'place should be normalized');
assert(suggestion?.interventionId === 'CHANGE_LOCATION', 'context hypothesis should change location');
assert(suggestion?.targetAttempts === 3, 'personal experiment should use three comparable attempts initially');

const active: PersonalExperiment = { ...suggestion!, status: 'active', activatedAt: '2026-09-05T08:00:00.000Z' };
assert(HypothesisEngine.matches(active, 'Coffee', 'Work'), 'matching trigger and place should enter the active experiment');
assert(!HypothesisEngine.matches(active, 'Coffee', 'Home'), 'different place must not be counted as a comparable context attempt');
assert(!HypothesisEngine.matches(active, 'Stress', 'Work'), 'different trigger must not be counted');

const attempts = [
  { ...craving('4', 'Coffee', 'Work', 'weaker', active.id), interventionId: active.interventionId },
  { ...craving('5', 'Kaffee', 'Arbeit', 'gone', active.id), interventionId: active.interventionId },
  { ...craving('6', 'Coffee', 'Work', 'unchanged', active.id), interventionId: active.interventionId },
];
const evaluation = HypothesisEngine.evaluate(active, attempts);
assert(evaluation.complete, 'three completed attempts should complete the initial experiment');
assert(evaluation.result === 'signal_supports', 'two helpful outcomes out of three should create a supportive working signal');
assert(evaluation.summaryDe.includes('kein Beweis'), 'context result must explicitly avoid causal proof');

const oneAttempt = HypothesisEngine.evaluate(active, attempts.slice(0, 1));
assert(oneAttempt.result === 'collecting' && !oneAttempt.complete, 'one attempt must remain collecting');

const completed: PersonalExperiment = {
  ...active,
  status: 'completed',
  completedAt: '2026-09-05T09:00:00.000Z',
  result: evaluation.result,
  resultSummaryDe: evaluation.summaryDe,
  resultSummaryEn: evaluation.summaryEn,
};
const noRepeat = HypothesisEngine.suggest(profile, [], repeatedContext, [completed]);
assert(noRepeat === null || noRepeat.signature !== completed.signature, 'completed hypothesis should not be immediately suggested again');


const sequenceExperiment: PersonalExperiment = {
  ...completed,
  id: 'sequence-exp',
  signature: 'cue_separation|Coffee|COFFEE_SEPARATION',
  kind: 'cue_separation',
  interventionId: 'COFFEE_SEPARATION',
  targetPlace: undefined,
  result: 'signal_not_seen',
};
const comparison = HypothesisEngine.compareCompleted([completed, sequenceExperiment]);
assert(comparison?.signal === 'context_stronger', 'context should be the clearer working signal when only context experiment is supportive');
assert(comparison?.summaryDe.includes('ohne Ursache'), 'comparison must avoid causal language');

console.log('Smoke Lab hypothesis tests: OK');
