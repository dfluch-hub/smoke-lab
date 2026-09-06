import { GoalModeCoordinator } from '../src/services/behavior/GoalModeCoordinator';
import { GoalTransitionEngine } from '../src/services/behavior/GoalTransitionEngine';
import { JourneyEngine } from '../src/services/behavior/JourneyEngine';
import { JourneyLifecycleEngine } from '../src/services/behavior/JourneyLifecycleEngine';
import { LifecycleReleaseGateEngine } from '../src/services/behavior/LifecycleReleaseGateEngine';
import { MaintenanceEngine } from '../src/services/behavior/MaintenanceEngine';
import { StateIntegrityEngine, SmokeLabStateSnapshot } from '../src/services/behavior/StateIntegrityEngine';
import {
  JourneyRepository,
  STORAGE_KEYS,
  defaultJourneyProgress,
} from '../src/storage/repositories';
import type {
  CravingEvent,
  GoalChoice,
  JourneyProgress,
  LapseRecoveryRecord,
  PersonalExperiment,
  QuitSupportPlan,
  SmokingEvent,
  UserProfile,
} from '../src/types';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.has(key) ? this.data.get(key)! : null; }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  get length() { return this.data.size; }
}

(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();

const NOW = new Date('2026-09-06T12:00:00.000Z');
const iso = (day: number, hour = 10) => `2026-09-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`;

const profile = (goal: GoalChoice): UserProfile => ({
  id: `user-${goal}`,
  version: 2,
  baseline: { typicalCigarettesPerDay: 12, yearsSmoking: 8 },
  goal,
  automaticSituations: ['Stress', 'Coffee'],
  onboardingCompleted: true,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  preferredLanguage: 'de',
});

const progressAt = (day: number): JourneyProgress => ({
  ...defaultJourneyProgress,
  phase: JourneyLifecycleEngine.phaseForDay(day),
  phaseName: JourneyLifecycleEngine.phaseNameForDay(day),
  dayInLab: day,
  completedDays: Array.from({ length: Math.max(0, day - 1) }, (_, index) => index + 1),
  missionCompletions: {},
  missionResponses: {},
});

const completedProgress = (): JourneyProgress => ({
  ...defaultJourneyProgress,
  phase: 'own',
  phaseName: 'PHASE 5 · OWN IT',
  dayInLab: 30,
  completedDays: Array.from({ length: 30 }, (_, index) => index + 1),
  missionCompletions: {
    '30': { day: 30, completedAt: '2026-09-01T12:00:00.000Z' },
  },
  missionResponses: {},
  journeyCompletedAt: '2026-09-01T12:00:00.000Z',
});

const quitPlan = (input: Partial<QuitSupportPlan> = {}): QuitSupportPlan => ({
  enabled: true,
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  highRiskPlans: [],
  ...input,
});

const protection = {
  id: 'plan-stress',
  signature: 'Stress|Work|afternoon',
  trigger: 'Stress',
  place: 'Work',
  timeWindow: 'afternoon',
  interventionId: 'THREE_MINUTE_DELAY',
  planText: 'Pause first, then decide again.',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  source: 'user' as const,
};

const smoke = (
  id: string,
  day: number,
  trigger = 'Stress',
  intensity = 8,
  hour = 14,
): SmokingEvent => ({
  id,
  timestamp: iso(day, hour),
  trigger,
  place: trigger === 'Stress' ? 'Work' : 'Home',
  cravingIntensity: intensity,
  decisionType: 'automatic',
  behavior: 'smoking',
  action: 'cigarette',
});

const craving = (id: string, day: number, trigger = 'Stress'): CravingEvent => ({
  id,
  timestamp: iso(day, 14),
  trigger,
  place: trigger === 'Stress' ? 'Work' : 'Home',
  initialIntensity: 8,
  interventionId: 'THREE_MINUTE_DELAY',
  interventionStartedAt: iso(day, 14),
  outcome: 'weaker',
  interrupted: true,
});

const experiment = (id: string, status: PersonalExperiment['status'] = 'active'): PersonalExperiment => ({
  id,
  signature: `sig-${id}`,
  kind: 'delay_test',
  status,
  createdAt: '2026-09-01T00:00:00.000Z',
  activatedAt: status === 'active' ? '2026-09-02T00:00:00.000Z' : undefined,
  targetTrigger: 'Stress',
  interventionId: 'THREE_MINUTE_DELAY',
  targetAttempts: 3,
  attemptCravingIds: [],
  sourceEvidence: 'emerging',
  sourceCount: 5,
  hypothesisDe: 'Stress-Test', hypothesisEn: 'Stress test',
  testDe: 'Test', testEn: 'Test',
  keepConstantDe: 'gleich', keepConstantEn: 'same',
  changeDe: 'Pause', changeEn: 'Pause',
  rationaleDe: 'Test', rationaleEn: 'Test',
});

// ---------------------------------------------------------------------------
// 1) Journey lifecycle invariants: Day 30 alone never means complete.
// ---------------------------------------------------------------------------
const oddDays = JourneyLifecycleEngine.normalizeCompletedDays([30, 1, 1, 0, 31, 4.5, '2']);
assert(oddDays.join(',') === '1,30', 'Journey day normalization must keep unique valid integer days only');
assert(!JourneyLifecycleEngine.isCompleteDays(oddDays), 'Day 30 with earlier gaps must not mark the Journey complete');
assert(JourneyLifecycleEngine.firstIncompleteDay(oddDays) === 2, 'first open chronological day should be recovered');
assert(JourneyLifecycleEngine.isCompleteDays(Array.from({ length: 30 }, (_, i) => i + 1)), 'all 30 days should be complete');

const corruptedProgress: JourneyProgress = {
  ...progressAt(30),
  completedDays: [1, 30],
  dayInLab: 30,
  phase: 'own',
  phaseName: 'PHASE 5 · OWN IT',
  journeyCompletedAt: '2026-09-05T12:00:00.000Z',
};
const lifecycleIssues = JourneyLifecycleEngine.issueCodes(corruptedProgress);
assert(lifecycleIssues.includes('day_30_present_with_earlier_gaps'), 'release audit should detect isolated Day 30');
assert(lifecycleIssues.includes('journey_completion_marker_without_all_days'), 'completion marker with gaps must be invalid');

const corruptedSnapshot: SmokeLabStateSnapshot = {
  smokingEvents: [], cravingEvents: [], journey: corruptedProgress, experiments: [],
  quitSupport: quitPlan({ quitDate: undefined }), recoveries: [],
};
const repairedGap = StateIntegrityEngine.repair(corruptedSnapshot);
assert(repairedGap.state.journey.dayInLab === 2, 'integrity repair must resume at the first missing day even if Day 30 is present');
assert(!repairedGap.state.journey.journeyCompletedAt, 'false completion timestamp must be removed when days are missing');
assert(!MaintenanceEngine.build(profile('pattern'), repairedGap.state.journey, [], [], [], NOW).active, 'Maintenance must not activate from an isolated Day 30 record');
const repairedJourneyState = JourneyEngine.getState(profile('pattern'), repairedGap.state.journey, [], [], 'de');
assert(repairedJourneyState.day === 2 && !repairedJourneyState.journeyCompleted, 'Journey UI state must follow canonical first-open-day semantics');

// ---------------------------------------------------------------------------
// 2) Completing a missing day must skip already completed later days.
// ---------------------------------------------------------------------------
localStorage.clear();
localStorage.setItem(STORAGE_KEYS.JOURNEY_PROGRESS, JSON.stringify({
  ...progressAt(2), completedDays: [1, 3], dayInLab: 2,
}));
const advanced = JourneyRepository.completeDay(2, 'discover', 'discover');
assert(advanced.completedDays.join(',') === '1,2,3', 'completion should preserve legitimate later completion records');
assert(advanced.dayInLab === 4, 'Journey must advance to the first truly open day instead of getting stuck on pre-completed Day 3');
assert(advanced.phase === JourneyLifecycleEngine.phaseForDay(4), 'phase must follow canonical next open day');

localStorage.setItem(STORAGE_KEYS.JOURNEY_PROGRESS, JSON.stringify({
  ...progressAt(30),
  completedDays: Array.from({ length: 29 }, (_, i) => i + 1),
  dayInLab: 30,
}));
const completed = JourneyRepository.completeDay(30, 'own', 'own');
assert(JourneyLifecycleEngine.isComplete(completed), 'completing the final missing day should make the Journey complete');
assert(Boolean(completed.journeyCompletedAt), 'real Day-30 completion should persist a completion timestamp');

// ---------------------------------------------------------------------------
// 3) Goal transitions preserve learning but prevent stale quit recovery.
// ---------------------------------------------------------------------------
const oldQuit = quitPlan({ quitDate: '2026-09-01', highRiskPlans: [protection] });
const leaveQuit = GoalTransitionEngine.transition('quit', 'reduce', oldQuit, NOW);
assert(!leaveQuit.quitSupport.enabled, 'leaving Quit mode should suspend quit support');
assert(leaveQuit.quitSupport.quitDate === '2026-09-01', 'leaving Quit mode should preserve the prior date as history, not erase it');
assert(leaveQuit.quitSupport.highRiskPlans.length === 1, 'protection plans should survive a goal change');

const returnToQuit = GoalTransitionEngine.transition('reduce', 'quit', leaveQuit.quitSupport, NOW);
assert(returnToQuit.quitSupport.enabled, 'returning to Quit mode should reactivate quit support');
assert(!returnToQuit.quitSupport.quitDate, 'a past quit date must require explicit reconfirmation after returning to Quit mode');
assert(returnToQuit.reasonCodes.includes('stale_quit_date_requires_reconfirmation'), 'stale date decision should be explainable');
assert(returnToQuit.quitSupport.highRiskPlans.length === 1, 'returning to Quit mode must keep learned protection plans');

const futureQuit = GoalTransitionEngine.transition('pattern', 'quit', quitPlan({ enabled: false, quitDate: '2026-09-10', highRiskPlans: [protection] }), NOW);
assert(futureQuit.quitSupport.quitDate === '2026-09-10', 'a still-future quit date can safely survive a goal transition');
assert(futureQuit.quitSupport.enabled, 'entering Quit mode should activate its support layer');

// ---------------------------------------------------------------------------
// 4) Cross-mode orchestration matrix.
// ---------------------------------------------------------------------------
const highRiskSmokes = [smoke('h1', 1), smoke('h2', 2), smoke('h3', 3), smoke('h4', 4)];
const reduceSmokes = [smoke('r1', 1, 'Coffee', 4, 10), smoke('r2', 2, 'Coffee', 4, 10), smoke('r3', 3, 'Coffee', 5, 10), smoke('r4', 4, 'Coffee', 4, 10)];
const postQuitSmoke = smoke('post-quit', 6, 'Stress', 8, 14);
const resolvedRecovery: LapseRecoveryRecord = {
  id: 'recovery-1', smokingEventId: postQuitSmoke.id, createdAt: '2026-09-06T15:00:00.000Z', trigger: 'Stress',
};

const scenarios: Array<{
  name: string;
  goal: GoalChoice;
  progress: JourneyProgress;
  smokes?: SmokingEvent[];
  cravings?: CravingEvent[];
  experiments?: PersonalExperiment[];
  plan?: QuitSupportPlan;
  recoveries?: LapseRecoveryRecord[];
  expected: string;
  notExpected?: string;
}> = [
  { name: 'pattern normal journey', goal: 'pattern', progress: progressAt(7), expected: 'journey' },
  { name: 'reduce no evidence continues journey', goal: 'reduce', progress: progressAt(7), expected: 'journey' },
  { name: 'reduce grounded opportunity', goal: 'reduce', progress: progressAt(7), smokes: reduceSmokes, expected: 'reduction' },
  { name: 'quit preparation without data', goal: 'quit', progress: progressAt(7), expected: 'quit_preparation' },
  { name: 'quit high-risk preparation', goal: 'quit', progress: progressAt(7), smokes: highRiskSmokes, expected: 'quit_preparation' },
  { name: 'active experiment beats ordinary journey', goal: 'pattern', progress: progressAt(7), experiments: [experiment('active')], expected: 'active_experiment' },
  { name: 'quit day protection', goal: 'quit', progress: progressAt(7), plan: quitPlan({ quitDate: '2026-09-06', highRiskPlans: [protection] }), expected: 'quit_protection' },
  { name: 'post quit protection without lapse', goal: 'quit', progress: progressAt(7), plan: quitPlan({ quitDate: '2026-09-05', highRiskPlans: [protection] }), expected: 'quit_protection' },
  { name: 'post quit lapse opens recovery', goal: 'quit', progress: progressAt(7), smokes: [postQuitSmoke], plan: quitPlan({ quitDate: '2026-09-05', highRiskPlans: [protection] }), expected: 'recovery' },
  { name: 'recovery outranks active experiment', goal: 'quit', progress: progressAt(7), smokes: [postQuitSmoke], experiments: [experiment('active-quit')], plan: quitPlan({ quitDate: '2026-09-05', highRiskPlans: [protection] }), expected: 'recovery' },
  { name: 'resolved lapse returns to protection', goal: 'quit', progress: progressAt(7), smokes: [postQuitSmoke], plan: quitPlan({ quitDate: '2026-09-05', highRiskPlans: [protection] }), recoveries: [resolvedRecovery], expected: 'quit_protection' },
  { name: 'pattern maintenance after real completion', goal: 'pattern', progress: completedProgress(), expected: 'maintenance' },
  { name: 'reduce maintenance after real completion', goal: 'reduce', progress: completedProgress(), smokes: reduceSmokes, expected: 'maintenance' },
  { name: 'quit protection outranks maintenance', goal: 'quit', progress: completedProgress(), plan: quitPlan({ quitDate: '2026-09-05', highRiskPlans: [protection] }), expected: 'quit_protection' },
  { name: 'quit maintenance without immediate protection', goal: 'quit', progress: completedProgress(), plan: quitPlan({ quitDate: undefined, highRiskPlans: [] }), expected: 'maintenance' },
  { name: 'non-quit mode ignores historical quit date', goal: 'pattern', progress: progressAt(7), smokes: [postQuitSmoke], plan: oldQuit, expected: 'journey', notExpected: 'recovery' },
  { name: 'suspended quit plan cannot trigger quit protection', goal: 'quit', progress: progressAt(7), plan: quitPlan({ enabled: false, quitDate: '2026-09-06', highRiskPlans: [protection] }), expected: 'quit_preparation', notExpected: 'quit_protection' },
];

for (const scenario of scenarios) {
  const decision = GoalModeCoordinator.build(
    profile(scenario.goal),
    scenario.progress,
    scenario.smokes || [],
    scenario.cravings || [],
    scenario.experiments || [],
    scenario.plan || quitPlan({ enabled: scenario.goal === 'quit', quitDate: undefined }),
    scenario.recoveries || [],
    NOW,
  );
  assert(decision.source === scenario.expected, `${scenario.name}: expected ${scenario.expected}, got ${decision.source}`);
  if (scenario.notExpected) assert(decision.source !== scenario.notExpected, `${scenario.name}: must not produce ${scenario.notExpected}`);
}

// ---------------------------------------------------------------------------
// 5) Release gate: contradictions fail before and pass after deterministic repair.
// ---------------------------------------------------------------------------
const c1 = craving('c1', 5);
const gateCorruptSnapshot: SmokeLabStateSnapshot = {
  smokingEvents: [postQuitSmoke],
  cravingEvents: [c1],
  journey: corruptedProgress,
  experiments: [
    { ...experiment('a'), attemptCravingIds: ['c1', 'missing'] },
    { ...experiment('b'), activatedAt: '2026-09-03T00:00:00.000Z' },
  ],
  quitSupport: quitPlan({ highRiskPlans: [protection, { ...protection, id: 'duplicate', updatedAt: '2026-09-02T00:00:00.000Z' }] }),
  recoveries: [resolvedRecovery, { ...resolvedRecovery, id: 'orphan', smokingEventId: 'missing-smoke' }],
};

const beforeGate = LifecycleReleaseGateEngine.audit(
  profile('quit'), gateCorruptSnapshot.journey, gateCorruptSnapshot.smokingEvents,
  gateCorruptSnapshot.cravingEvents, gateCorruptSnapshot.experiments,
  gateCorruptSnapshot.quitSupport, gateCorruptSnapshot.recoveries,
);
assert(!beforeGate.runtimeConsistent && beforeGate.blocking.length >= 4, 'release gate should fail contradictory cross-module state');

const repairedGate = StateIntegrityEngine.repair(gateCorruptSnapshot).state;
const afterGate = LifecycleReleaseGateEngine.audit(
  profile('quit'), repairedGate.journey, repairedGate.smokingEvents,
  repairedGate.cravingEvents, repairedGate.experiments,
  repairedGate.quitSupport, repairedGate.recoveries,
);
assert(afterGate.runtimeConsistent, `deterministically repaired state should pass runtime release gate: ${afterGate.blocking.join(',')}`);

console.log(`Smoke Lab v14 lifecycle scenario tests: OK (${scenarios.length + 8} grouped scenarios/invariants)`);
