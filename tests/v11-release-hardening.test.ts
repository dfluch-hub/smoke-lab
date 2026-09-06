import { StateIntegrityEngine, SmokeLabStateSnapshot } from '../src/services/behavior/StateIntegrityEngine';
import { GoalModeCoordinator } from '../src/services/behavior/GoalModeCoordinator';
import type {
  CravingEvent,
  JourneyProgress,
  PersonalExperiment,
  QuitSupportPlan,
  SmokingEvent,
  UserProfile,
} from '../src/types';

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };

const baseJourney: JourneyProgress = {
  phase: 'disrupt',
  phaseName: 'BROKEN PHASE',
  dayInLab: 12,
  currentDayStartedAt: '2026-09-01T08:00:00.000Z',
  completedDays: [1, 2, 4, 4, 99] as number[],
  missionCompletions: {
    '1': { day: 1, completedAt: '2026-09-01T09:00:00.000Z' },
    '2': { day: 2, completedAt: '2026-09-02T09:00:00.000Z' },
    '99': { day: 99, completedAt: '2026-09-03T09:00:00.000Z' },
  },
  missionResponses: {},
  controlScore: 140,
  totalCigarettesLogged: 999,
  totalCravingsLogged: 999,
  totalInterruptedLoops: 999,
  lastBaselineComparison: 'learning',
};

const smoke = (id: string, timestamp: string, intensity = 5): SmokingEvent => ({
  id,
  timestamp,
  trigger: 'Stress',
  place: 'Work',
  cravingIntensity: intensity,
  decisionType: 'automatic',
});

const craving = (id: string, timestamp: string): CravingEvent => ({
  id,
  timestamp,
  trigger: 'Stress',
  place: 'Work',
  initialIntensity: 8,
  interventionId: 'THREE_MINUTE_DELAY',
  interventionStartedAt: timestamp,
  outcome: 'weaker',
  interrupted: true,
});

const experiment = (id: string, activatedAt: string): PersonalExperiment => ({
  id,
  signature: `sig-${id}`,
  kind: 'delay_test',
  status: 'active',
  createdAt: '2026-09-01T00:00:00.000Z',
  activatedAt,
  targetTrigger: 'Stress',
  interventionId: 'THREE_MINUTE_DELAY',
  targetAttempts: 3,
  attemptCravingIds: ['c1', 'missing-craving'],
  sourceEvidence: 'emerging',
  sourceCount: 5,
  hypothesisDe: 'Test', hypothesisEn: 'Test',
  testDe: 'Test', testEn: 'Test',
  keepConstantDe: 'gleich', keepConstantEn: 'same',
  changeDe: 'Pause', changeEn: 'Pause',
  rationaleDe: 'Test', rationaleEn: 'Test',
});

const plan: QuitSupportPlan = {
  enabled: true,
  quitDate: 'not-a-date',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  highRiskPlans: [
    {
      id: 'old', signature: 'Stress|Work|afternoon', trigger: 'Stress', place: 'Work', timeWindow: 'afternoon',
      interventionId: 'THREE_MINUTE_DELAY', planText: 'old', source: 'user',
      createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'new', signature: 'Stress|Work|afternoon', trigger: 'Stress', place: 'Work', timeWindow: 'afternoon',
      interventionId: 'CHANGE_LOCATION', planText: 'new', source: 'user',
      createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-03T00:00:00.000Z',
    },
  ],
};

const s1 = smoke('s1', '2026-09-05T12:00:00.000Z', 14);
s1.linkedCravingEventId = 'orphan-craving';
const duplicateOlder = smoke('s1', '2026-09-04T12:00:00.000Z', 4);
const invalidSmoke = { ...smoke('bad', '2026-09-05T12:00:00.000Z'), timestamp: 'not-a-date' } as SmokingEvent;
const c1 = craving('c1', '2026-09-05T11:55:00.000Z');
c1.linkedSmokingEventId = 'orphan-smoke';

const snapshot: SmokeLabStateSnapshot = {
  smokingEvents: [duplicateOlder, invalidSmoke, s1],
  cravingEvents: [c1],
  journey: baseJourney,
  experiments: [experiment('exp-old', '2026-09-02T00:00:00.000Z'), experiment('exp-new', '2026-09-04T00:00:00.000Z')],
  quitSupport: plan,
  recoveries: [
    { id: 'r1', smokingEventId: 's1', createdAt: '2026-09-05T14:00:00.000Z', trigger: 'Stress' },
    { id: 'r2', smokingEventId: 's1', createdAt: '2026-09-05T15:00:00.000Z', trigger: 'Stress' },
    { id: 'orphan', smokingEventId: 'missing', createdAt: '2026-09-05T16:00:00.000Z', trigger: 'Stress' },
  ],
};

const repaired = StateIntegrityEngine.repair(snapshot);
assert(repaired.repairCodes.length >= 5, 'corrupted snapshot should report structural repairs');
assert(repaired.state.smokingEvents.length === 1, 'invalid and duplicate smoking records should not survive repair');
assert(repaired.state.smokingEvents[0].id === 's1', 'newest duplicate smoking event should win');
assert(repaired.state.smokingEvents[0].cravingIntensity === 10, 'out-of-range intensity should be clamped');
assert(!repaired.state.smokingEvents[0].linkedCravingEventId, 'orphan craving link should be removed');
assert(!repaired.state.cravingEvents[0].linkedSmokingEventId, 'orphan smoking link should be removed');
assert(repaired.state.journey.dayInLab === 3, 'journey should resume at the first missing chronological Lab day');
assert(repaired.state.journey.completedDays.join(',') === '1,2,4', 'journey repair should remove duplicates/out-of-range days without inventing completions');
assert(repaired.state.journey.controlScore === 100, 'non-clinical Control Score storage should remain bounded');
assert(repaired.state.journey.totalCigarettesLogged === 1 && repaired.state.journey.totalCravingsLogged === 1, 'stored totals should match real event counts');
assert(repaired.state.experiments.filter((item) => item.status === 'active').length === 1, 'only one personal experiment may remain active');
assert(repaired.state.experiments.find((item) => item.id === 'exp-new')?.status === 'active', 'most recently activated experiment should win deterministically');
assert(repaired.state.experiments.find((item) => item.id === 'exp-old')?.status === 'paused', 'older duplicate active state should be paused, not deleted');
assert(repaired.state.experiments.every((item) => item.attemptCravingIds.length === 1 && item.attemptCravingIds[0] === 'c1'), 'experiment attempts must reference existing craving events only');
assert(!repaired.state.quitSupport.quitDate, 'malformed quit dates should be removed rather than interpreted');
assert(repaired.state.quitSupport.highRiskPlans.length === 1 && repaired.state.quitSupport.highRiskPlans[0].id === 'new', 'duplicate protection signatures should keep the newest plan');
assert(repaired.state.recoveries.length === 1 && repaired.state.recoveries[0].id === 'r2', 'recovery records should be unique per real smoking event and keep the newest record');

const secondPass = StateIntegrityEngine.repair(repaired.state);
assert(secondPass.repairCodes.length === 0, 'state repair must be idempotent');

const quitProfile: UserProfile = {
  id: 'quit-user', version: 1,
  baseline: { typicalCigarettesPerDay: 12, yearsSmoking: 8 },
  goal: 'quit', automaticSituations: ['Stress'], onboardingCompleted: true,
  createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', preferredLanguage: 'de',
};
const completedJourney: JourneyProgress = {
  ...repaired.state.journey,
  phase: 'own', phaseName: 'PHASE 5 · OWN IT', dayInLab: 30,
  completedDays: Array.from({ length: 30 }, (_, index) => index + 1),
  journeyCompletedAt: '2026-09-01T12:00:00.000Z',
};
const activeQuitPlan: QuitSupportPlan = {
  ...repaired.state.quitSupport,
  enabled: true,
  quitDate: '2026-09-05',
  highRiskPlans: repaired.state.quitSupport.highRiskPlans,
};
const focus = GoalModeCoordinator.build(
  quitProfile, completedJourney, [], [], [], activeQuitPlan, [], new Date('2026-09-06T12:00:00.000Z'),
);
assert(focus.source === 'quit_protection', 'an active post-quit protection plan should outrank generic weekly Maintenance');
assert(focus.reasonCodes.includes('moment_specific_over_maintenance'), 'priority decision should expose why protection outranked Maintenance');

console.log('Smoke Lab v11 release-hardening tests: OK');
