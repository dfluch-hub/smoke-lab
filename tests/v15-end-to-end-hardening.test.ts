import { OnboardingBaselineEngine } from '../src/services/behavior/OnboardingBaselineEngine';
import { PostSmokingFlowEngine } from '../src/services/behavior/PostSmokingFlowEngine';
import { GoalModeCoordinator } from '../src/services/behavior/GoalModeCoordinator';
import { defaultJourneyProgress } from '../src/storage/repositories';
import type {
  LapseRecoveryRecord,
  QuitSupportPlan,
  SmokingEvent,
  UserProfile,
} from '../src/types';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const profile = (goal: UserProfile['goal']): UserProfile => ({
  id: `user-${goal}`,
  version: 2,
  baseline: { typicalCigarettesPerDay: 12, yearsSmoking: 8, cigarettesPerPack: 20 },
  goal,
  automaticSituations: ['Stress'],
  onboardingCompleted: true,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  preferredLanguage: 'de',
});

const quitPlan = (input: Partial<QuitSupportPlan> = {}): QuitSupportPlan => ({
  enabled: true,
  quitDate: '2026-09-06',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  highRiskPlans: [],
  ...input,
});

const smoke = (id: string, timestamp: string): SmokingEvent => ({
  id,
  timestamp,
  trigger: 'Stress',
  place: 'Work',
  cravingIntensity: 8,
  decisionType: 'automatic',
  behavior: 'smoking',
  action: 'cigarette',
});

const recovery = (eventId: string): LapseRecoveryRecord => ({
  id: `recovery-${eventId}`,
  smokingEventId: eventId,
  createdAt: '2026-09-06T10:10:00.000Z',
  trigger: 'Stress',
  nextStep: 'observe_next',
});

// Onboarding numeric fields must never persist malformed baseline values.
const sanitized = OnboardingBaselineEngine.normalize({
  typicalCigarettesPerDay: 500,
  yearsSmoking: -8,
  pricePerPack: '-4',
  cigarettesPerPack: '0',
});
assert(sanitized.typicalCigarettesPerDay === 80, 'CPD should be bounded to the supported onboarding range');
assert(sanitized.yearsSmoking === 0, 'years smoking should never persist below zero');
assert(sanitized.pricePerPack === undefined, 'non-positive pack price should remain unset rather than poison cost calculations');
assert(sanitized.cigarettesPerPack === 1, 'pack size must never be zero because later per-cigarette calculations divide by it');

const normalizedDecimal = OnboardingBaselineEngine.normalize({
  typicalCigarettesPerDay: 13.6,
  yearsSmoking: 7.7,
  pricePerPack: '11.239',
  cigarettesPerPack: '19.6',
});
assert(normalizedDecimal.typicalCigarettesPerDay === 14, 'CPD should normalize to an integer');
assert(normalizedDecimal.yearsSmoking === 8, 'years should normalize to an integer');
assert(normalizedDecimal.pricePerPack === 11.24, 'price should normalize to currency precision');
assert(normalizedDecimal.cigarettesPerPack === 20, 'pack size should normalize to an integer');

// Every cigarette-save entry point must use the same post-save recovery rule.
const beforeQuit = smoke('before', '2026-09-05T23:30:00.000Z');
const afterQuit = smoke('after', '2026-09-06T09:00:00.000Z');
assert(PostSmokingFlowEngine.afterSavedSmokingEvent(profile('pattern'), afterQuit, quitPlan()).action === 'none', 'non-Quit goals must not open post-quit recovery');
assert(PostSmokingFlowEngine.afterSavedSmokingEvent(profile('quit'), afterQuit, quitPlan({ enabled: false })).action === 'none', 'suspended Quit support must not open recovery');
assert(PostSmokingFlowEngine.afterSavedSmokingEvent(profile('quit'), afterQuit, quitPlan({ quitDate: undefined })).action === 'none', 'Quit mode without a chosen date must not classify ordinary smoking as a lapse');
assert(PostSmokingFlowEngine.afterSavedSmokingEvent(profile('quit'), beforeQuit, quitPlan()).action === 'none', 'events before the chosen quit date must not open recovery');
assert(PostSmokingFlowEngine.afterSavedSmokingEvent(profile('quit'), afterQuit, quitPlan()).action === 'open_recovery', 'a new event on/after the chosen quit date should open recovery');
assert(PostSmokingFlowEngine.afterSavedSmokingEvent(profile('quit'), afterQuit, quitPlan(), [recovery(afterQuit.id)]).action === 'none', 'an already reviewed event must never reopen as pending recovery');

// The Today coordinator must use the same rule and pick the newest unresolved event.
const older = smoke('older', '2026-09-06T08:00:00.000Z');
const newer = smoke('newer', '2026-09-06T10:00:00.000Z');
const coordinator = GoalModeCoordinator.build(
  profile('quit'),
  defaultJourneyProgress,
  [older, newer],
  [],
  [],
  quitPlan(),
  [recovery(older.id)],
  new Date('2026-09-06T12:00:00.000Z'),
);
assert(coordinator.source === 'recovery', 'an unresolved post-quit event should outrank other Today tasks');
assert(coordinator.pendingRecoverySmokingEventId === newer.id, 'the newest unresolved smoking event should be surfaced');

const allReviewed = GoalModeCoordinator.build(
  profile('quit'),
  defaultJourneyProgress,
  [older, newer],
  [],
  [],
  quitPlan(),
  [recovery(older.id), recovery(newer.id)],
  new Date('2026-09-06T12:00:00.000Z'),
);
assert(allReviewed.source !== 'recovery', 'reviewed post-quit events should not keep Today stuck in recovery');

console.log('Smoke Lab v15 end-to-end hardening tests: OK');
