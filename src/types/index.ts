/**
 * SMOKE LAB - Behavioral Health Core Types
 * Generic enough for behavioral science and habit loops:
 * Behavior = Smoking, Action = Cigarette
 */

export type BehaviorType = 'smoking';
export type ActionType = 'cigarette';

export type GoalChoice = 'pattern' | 'reduce' | 'quit';

export type CravingOutcome = 'gone' | 'weaker' | 'unchanged' | 'stronger' | 'smoked';
export type DecisionType = 'automatic' | 'intentional';
export type EnjoymentRating = 'yes' | 'partially' | 'no';
export type InterventionType = 'delay' | 'location' | 'separation' | 'reset' | 'friction' | 'mindset';

export interface UserBaseline {
  typicalCigarettesPerDay: number;
  yearsSmoking: number;
  pricePerPack?: number;
  cigarettesPerPack?: number;
}

export interface UserProfile {
  id: string;
  version: number;
  baseline: UserBaseline;
  goal: GoalChoice;
  automaticSituations: string[];
  onboardingCompleted: boolean;
  onboardingCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
  preferredLanguage: 'en' | 'de';
}

export interface SmokingEvent {
  id: string;
  timestamp: string; // ISO 8601
  trigger: string;
  secondaryTrigger?: string;
  place?: string;
  cravingIntensity?: number; // 1 - 10
  enjoyment?: EnjoymentRating;
  decisionType: DecisionType; // automatic | intentional
  linkedCravingEventId?: string;
  notes?: string;
  experimentId?: string;
  behavior?: BehaviorType;
  action?: ActionType;
}

export interface CravingEvent {
  id: string;
  timestamp: string; // ISO 8601
  trigger: string;
  secondaryTrigger?: string;
  place?: string;
  initialIntensity: number; // 1 - 10
  interventionId: string;
  interventionStartedAt: string;
  interventionEndedAt?: string;
  elapsedSeconds?: number;
  outcome?: CravingOutcome; // gone | weaker | unchanged | stronger | smoked
  finalIntensity?: number; // 1 - 10
  linkedSmokingEventId?: string;
  notes?: string;
  experimentId?: string;
  behavior?: BehaviorType;
  interrupted?: boolean;
}

export interface Trigger {
  id: string;
  name: string;
  category: 'emotional' | 'situational' | 'social' | 'physiological';
  frequencyCount: number;
  lastOccurredAt?: string;
}

export interface Place {
  id: string;
  name: string;
  frequencyCount: number;
}

export interface Experiment {
  id: string;
  code: string;
  title: string;
  description: string;
  hypothesis: string;
  status: 'queued' | 'active' | 'completed';
  delayGoalMinutes: number;
  cueTarget: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Intervention {
  id: string;
  titleKey: string;
  instructionKey: string;
  durationSeconds?: number;
  recommendedTriggers: string[];
  type: InterventionType;
  requiresSafeContext: boolean;
  rationaleInternal: string;
}



export type PersonalExperimentKind =
  | 'context_shift'
  | 'cue_separation'
  | 'routine_break'
  | 'delay_test'
  | 'repeat_strategy'
  | 'time_window_test';

export type PersonalExperimentStatus = 'suggested' | 'active' | 'completed' | 'paused';
export type PersonalExperimentResult = 'collecting' | 'signal_supports' | 'mixed' | 'signal_not_seen';

/**
 * A small on-device N-of-1 style behavioral experiment.
 * It is deliberately framed as a working hypothesis, never causal proof.
 */
export interface PersonalExperiment {
  id: string;
  signature: string;
  kind: PersonalExperimentKind;
  status: PersonalExperimentStatus;
  createdAt: string;
  activatedAt?: string;
  completedAt?: string;
  targetTrigger: string;
  targetPlace?: string;
  targetTimeWindow?: string;
  interventionId: string;
  targetAttempts: number;
  attemptCravingIds: string[];
  sourceEvidence: 'insufficient' | 'emerging' | 'established';
  sourceCount: number;
  hypothesisDe: string;
  hypothesisEn: string;
  testDe: string;
  testEn: string;
  keepConstantDe: string;
  keepConstantEn: string;
  changeDe: string;
  changeEn: string;
  rationaleDe: string;
  rationaleEn: string;
  result?: PersonalExperimentResult;
  resultSummaryDe?: string;
  resultSummaryEn?: string;
  /** Optional sequencing metadata. These explain why this exploratory test was chosen next. */
  sequenceQuestionDe?: string;
  sequenceQuestionEn?: string;
  sequenceWhyNowDe?: string;
  sequenceWhyNowEn?: string;
  sequenceLearningDe?: string;
  sequenceLearningEn?: string;
  sequenceScore?: number;
  sequenceReasonCodes?: string[];
}


export type JourneyPhaseId = 'discover' | 'disrupt' | 'control' | 'break' | 'own';

export type MissionInputType = 'none' | 'confirm' | 'goal' | 'number' | 'choice' | 'text';
export type JourneyChallengeLevel = 'gentle' | 'standard' | 'stretch';

export interface Mission {
  id: string;
  day: number;
  phase: JourneyPhaseId;
  title: string;
  objective: string;
  completed: boolean;
}

export interface MissionCompletionRecord {
  day: number;
  completedAt: string;
  response?: string | number | string[];
  evidenceIds?: string[];
}

export interface JourneyProgress {
  phase: JourneyPhaseId;
  phaseName: string;
  dayInLab: number;
  currentDayStartedAt?: string;
  completedDays: number[];
  missionCompletions: Record<string, MissionCompletionRecord>;
  missionResponses: Record<string, string | number | string[]>;
  journeyCompletedAt?: string;
  controlScore: number; // 0 - 100 internal non-clinical index
  totalCigarettesLogged: number;
  totalCravingsLogged: number;
  totalInterruptedLoops: number;
  lastBaselineComparison: 'learning' | 'lower' | 'stable' | 'higher';
}

export interface Insight {
  id: string;
  type: 'pattern' | 'trigger' | 'velocity' | 'milestone';
  title: string;
  body: string;
  confidence: number; // 0.0 - 1.0
  detectedAt: string;
}


export type RecommendationKind =
  | 'observe'
  | 'trigger_experiment'
  | 'context_experiment'
  | 'repeat_effective'
  | 'autopilot_awareness'
  | 'time_window';

export interface NextBestAction {
  id: string;
  kind: RecommendationKind;
  title: string;
  body: string;
  why: string;
  cta: string;
  evidence: 'insufficient' | 'emerging' | 'established';
  basisCount: number;
  targetTrigger?: string;
  targetPlace?: string;
  targetTimeWindow?: string;
  interventionId?: string;
}


export interface QuitSupportPlan {
  enabled: boolean;
  quitDate?: string; // local YYYY-MM-DD, optional by design
  createdAt: string;
  updatedAt: string;
  highRiskPlans: HighRiskPlan[];
}

export interface HighRiskPlan {
  id: string;
  signature: string;
  trigger: string;
  place?: string;
  timeWindow?: string;
  interventionId?: string;
  planText: string;
  createdAt: string;
  updatedAt: string;
  source: 'suggested' | 'user';
}

export interface LapseRecoveryRecord {
  id: string;
  smokingEventId: string;
  createdAt: string;
  trigger: string;
  place?: string;
  cravingIntensity?: number;
  alcoholInvolved?: boolean;
  whatWouldHelp?: 'pause' | 'location' | 'plan' | 'support' | 'unsure';
  nextStep?: 'observe_next' | 'repeat_with_plan' | 'review_plan' | 'professional_support';
  note?: string;
}

export type TabId = 'TODAY' | 'SMOKING' | 'LAB' | 'PATTERNS' | 'PROGRESS' | 'ME';

/**
 * Visual Foundation for Future Focused Craving Intervention Mode
 * (Preserved as architectural design tokens; UI not exposed yet)
 */
export interface CravingModeTheme {
  background: '#191B1C';
  surface: '#232627';
  textPrimary: '#F2F1ED';
  textSecondary: '#747779';
  accent: '#17372E';
  border: '#2E3234';
}

