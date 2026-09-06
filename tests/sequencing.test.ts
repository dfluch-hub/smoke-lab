import { ExperimentSequencingEngine } from '../src/services/behavior/ExperimentSequencingEngine';
import { HypothesisEngine } from '../src/services/behavior/HypothesisEngine';
import type { CravingEvent, PersonalExperiment, UserProfile } from '../src/types';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const profile: UserProfile = {
  id: 'sequence-user',
  version: 1,
  baseline: { typicalCigarettesPerDay: 12, yearsSmoking: 10 },
  goal: 'pattern',
  automaticSituations: ['Coffee', 'Stress'],
  onboardingCompleted: true,
  onboardingCompletedAt: '2026-09-01T07:00:00.000Z',
  createdAt: '2026-09-01T07:00:00.000Z',
  updatedAt: '2026-09-01T07:00:00.000Z',
  preferredLanguage: 'de',
};

const craving = (
  id: string,
  trigger: string,
  place: string,
  timestamp: string,
): CravingEvent => ({
  id,
  timestamp,
  trigger,
  place,
  initialIntensity: 7,
  interventionId: 'THREE_MINUTE_DELAY',
  interventionStartedAt: timestamp,
});

assert(
  ExperimentSequencingEngine.next(profile, [], [craving('s1', 'Coffee', 'Work', '2026-09-01T08:10:00.000Z')], []) === null,
  'sparse data must not create an experiment sequence'
);

const coffeeEvents: CravingEvent[] = [
  craving('c1', 'Coffee', 'Work', '2026-09-01T08:10:00.000Z'),
  craving('c2', 'Kaffee', 'Arbeit', '2026-09-01T08:40:00.000Z'),
  craving('c3', 'Coffee', 'Work', '2026-09-02T08:20:00.000Z'),
  craving('c4', 'Kaffee', 'Arbeit', '2026-09-03T08:35:00.000Z'),
  craving('c5', 'Coffee', 'Work', '2026-09-03T09:00:00.000Z'),
];

const first = ExperimentSequencingEngine.next(profile, [], coffeeEvents, []);
assert(Boolean(first), 'repeated data should produce a next open question');
assert(first?.experiment.kind === 'context_shift', 'initial repeated trigger+place should prioritize the context question');
assert(first?.questionDe.includes('Ort'), 'context question should be framed as an open question about place');
assert(first?.alternativesConsidered && first.alternativesConsidered >= 3, 'sequencer should consider multiple defensible candidates');

const contextCompleted: PersonalExperiment = {
  ...first!.experiment,
  status: 'completed',
  completedAt: '2026-09-04T08:00:00.000Z',
  result: 'signal_supports',
  resultSummaryDe: 'support',
  resultSummaryEn: 'support',
};

const second = ExperimentSequencingEngine.next(profile, [], coffeeEvents, [contextCompleted]);
assert(Boolean(second), 'a completed context test should lead to another open question');
assert(
  ['cue_separation', 'routine_break', 'delay_test'].includes(second!.experiment.kind),
  'after context, an orthogonal sequence/cue question should beat immediate replication'
);
assert(second?.reasonCodes.includes('comparison_opportunity'), 'second test should recognize a within-person comparison opportunity');
assert(second?.whyNowDe.includes('anderen Teil der Schleife'), 'UI explanation should say why a different component is tested next');

const sequenceCompleted: PersonalExperiment = {
  ...second!.experiment,
  status: 'completed',
  completedAt: '2026-09-04T10:00:00.000Z',
  result: 'mixed',
  resultSummaryDe: 'mixed',
  resultSummaryEn: 'mixed',
};

const third = ExperimentSequencingEngine.next(profile, [], coffeeEvents, [contextCompleted, sequenceCompleted]);
assert(Boolean(third), 'a third defensible question should remain after two dimensions');
assert(third?.experiment.kind === 'time_window_test', 'time-window question should be used after context and sequence have been explored');
assert(third?.experiment.targetTimeWindow === 'morning', 'time-window experiment should target the observed morning cluster');

assert(
  HypothesisEngine.matches({ ...third!.experiment, status: 'active' }, 'Coffee', 'Home', '2026-09-05T08:30:00.000Z'),
  'time-window experiment should match the target trigger inside the target time window regardless of place'
);
assert(
  !HypothesisEngine.matches({ ...third!.experiment, status: 'active' }, 'Coffee', 'Home', '2026-09-05T15:30:00.000Z'),
  'time-window experiment should not match outside its target time window'
);

const timeCompleted: PersonalExperiment = {
  ...third!.experiment,
  status: 'completed',
  completedAt: '2026-09-05T10:00:00.000Z',
  result: 'signal_not_seen',
  resultSummaryDe: 'no signal',
  resultSummaryEn: 'no signal',
};

const fourth = ExperimentSequencingEngine.next(profile, [], coffeeEvents, [contextCompleted, sequenceCompleted, timeCompleted]);
assert(Boolean(fourth), 'supportive signal should eventually generate a replication question');
assert(fourth?.experiment.kind === 'repeat_strategy', 'replication should come after higher-information orthogonal questions are exhausted');
assert(fourth?.experiment.targetAttempts === 2, 'replication should be a small two-attempt confirmation rather than another full first test');

// Diversification: after two Coffee experiments, a second sufficiently repeated cue
// should be allowed to outrank tunnel vision on Coffee.
const stressEvents: CravingEvent[] = [
  craving('t1', 'Stress', 'Home', '2026-09-01T14:00:00.000Z'),
  craving('t2', 'Stress', 'Home', '2026-09-01T14:30:00.000Z'),
  craving('t3', 'Stress', 'Home', '2026-09-02T15:00:00.000Z'),
  craving('t4', 'Stress', 'Home', '2026-09-03T15:30:00.000Z'),
  craving('t5', 'Stress', 'Home', '2026-09-04T16:00:00.000Z'),
];
const diversified = ExperimentSequencingEngine.next(
  profile,
  [],
  [...coffeeEvents, ...stressEvents],
  [contextCompleted, sequenceCompleted]
);
assert(Boolean(diversified), 'multiple repeated triggers should still produce a decision');
assert(diversified?.experiment.targetTrigger === 'Stress', 'after repeated Coffee testing, the sequencer should diversify to an untested repeated trigger when justified');

console.log('Smoke Lab experiment sequencing tests: OK');
