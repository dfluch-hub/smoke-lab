import { PersonalControlModelEngine } from '../src/services/behavior/PersonalControlModelEngine';
import type { CravingEvent, SmokingEvent, UserProfile } from '../src/types';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const profile: UserProfile = {
  id: 'control-model-user',
  version: 1,
  baseline: { typicalCigarettesPerDay: 12, yearsSmoking: 10 },
  goal: 'pattern',
  automaticSituations: ['Coffee'],
  onboardingCompleted: true,
  onboardingCompletedAt: '2026-09-01T07:00:00.000Z',
  createdAt: '2026-09-01T07:00:00.000Z',
  updatedAt: '2026-09-01T07:00:00.000Z',
  preferredLanguage: 'de',
};

const craving = (i: number, day: number, outcome: CravingEvent['outcome'] = 'weaker'): CravingEvent => ({
  id: `c${i}`,
  timestamp: `2026-09-0${day}T08:${String(10 + i).padStart(2, '0')}:00.000Z`,
  trigger: i % 2 === 0 ? 'Kaffee' : 'Coffee',
  place: i % 2 === 0 ? 'Arbeit' : 'Work',
  initialIntensity: 8,
  finalIntensity: outcome === 'gone' ? 2 : outcome === 'weaker' ? 5 : 8,
  interventionId: 'COFFEE_SEPARATION',
  interventionStartedAt: `2026-09-0${day}T08:00:00.000Z`,
  outcome,
  elapsedSeconds: 120,
});

const smoking = (i: number, day: number, automatic = true): SmokingEvent => ({
  id: `s${i}`,
  timestamp: `2026-09-0${day}T09:${String(10 + i).padStart(2, '0')}:00.000Z`,
  trigger: 'Coffee',
  place: 'Work',
  cravingIntensity: 7,
  decisionType: automatic ? 'automatic' : 'intentional',
  behavior: 'smoking',
  action: 'cigarette',
});

const sparse = PersonalControlModelEngine.build(profile, [], [craving(1, 1), craving(2, 1)], []);
assert(sparse.maturity === 'learning', 'sparse data must remain learning');
assert(sparse.primaryLoop === null, 'single-day sparse data must not create a stable loop');
assert(sparse.controlPlan.length >= 1, 'even sparse state should provide a cautious observation plan');

const repeatedCravings = [
  craving(1, 1), craving(2, 1), craving(3, 2), craving(4, 2),
  craving(5, 3, 'gone'), craving(6, 3), craving(7, 3), craving(8, 3),
];
const repeatedSmokes = [
  smoking(1, 1, true), smoking(2, 2, true), smoking(3, 3, true),
  smoking(4, 3, true), smoking(5, 3, false),
];
const forming = PersonalControlModelEngine.build(profile, repeatedSmokes, repeatedCravings, []);
assert(forming.maturity === 'forming', '8+ observations across days should form a model without overstating maturity');
assert(Boolean(forming.primaryLoop), 'repeated Coffee + Work loop should be surfaced');
assert(forming.primaryLoop?.trigger === 'Coffee', 'DE/EN trigger values must normalize into one loop');
assert(forming.primaryLoop?.place === 'Work', 'DE/EN places must normalize into one loop');
assert(forming.primaryLoop?.uniqueDays === 3, 'loop stability must count its own unique days');
assert(forming.strategies[0]?.helpfulRate === 100, 'repeated weaker/gone outcomes should produce a descriptive strategy signal');
assert(forming.strategies[0]?.averageIntensityChange === 3.4, 'scaled reassessments should preserve average observed intensity change');
assert(forming.automaticRatio === 80, 'automaticity should be calculated only after enough smoking decisions');
assert(forming.controlPlan.some((step) => step.id === 'primary_loop'), 'control plan should act on the strongest observed loop');
assert(forming.limitationsDe.includes('keine Diagnose'), 'model must carry a non-diagnostic limitation');

const extraCravings = [
  craving(9, 4), craving(10, 4), craving(11, 5), craving(12, 5), craving(13, 5),
];
const extraSmokes = [
  smoking(6, 4, true), smoking(7, 4, false), smoking(8, 5, true), smoking(9, 5, true),
];
const mapped = PersonalControlModelEngine.build(profile, [...repeatedSmokes, ...extraSmokes], [...repeatedCravings, ...extraCravings], []);
assert(mapped.totalObservations >= 20, 'mapped fixture must meet observation volume');
assert(mapped.uniqueDays >= 5, 'mapped fixture must span multiple days');
assert(mapped.maturity === 'mapped', 'multi-day repeated evidence should allow mapped maturity');

console.log('Smoke Lab personal control model tests: OK');
