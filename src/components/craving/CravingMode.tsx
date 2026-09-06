import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft, ArrowRight, ShieldAlert, Check, Clock, Sparkles } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatElapsedHuman } from '../../i18n/translations';
import {
  CravingEvent,
  SmokingEvent,
  CravingOutcome,
  DecisionType,
  EnjoymentRating,
  PersonalExperiment,
} from '../../types';
import {
  CravingEventRepository,
  SmokingEventRepository,
  JourneyRepository,
  ProfileRepository,
  ExperimentRepository,
  QuitSupportRepository,
} from '../../storage/repositories';
import {
  BehaviorInterventionEngine,
  InterventionSelectionResult,
} from '../../services/behavior/BehaviorInterventionEngine';
import { ControlScoreEngine } from '../../services/behavior/ControlScoreEngine';
import { JourneyEngine } from '../../services/behavior/JourneyEngine';
import { PatternEngine } from '../../services/behavior/PatternEngine';
import { HypothesisEngine } from '../../services/behavior/HypothesisEngine';
import { InterventionPriorityEngine } from '../../services/behavior/InterventionPriorityEngine';

interface CravingModeProps {
  isOpen: boolean;
  onClose: (updatedControlScore?: number, savedSmokingEvent?: SmokingEvent) => void;
}

type CravingStep =
  | 'intensity'
  | 'trigger'
  | 'context'
  | 'driving_safety'
  | 'intervention'
  | 'reassessment'
  | 'smoked_fallback'
  | 'completed';

const TRIGGER_OPTIONS_DE = [
  'Kaffee',
  'Stress',
  'Nach dem Essen',
  'Alkohol',
  'Langeweile',
  'Sozial',
  'Autofahren',
  'Gewohnheit',
  'Arbeitspause',
  'Morgenroutine',
  'Abendroutine',
  'Sonstiges',
];

const TRIGGER_OPTIONS_EN = [
  'Coffee',
  'Stress',
  'After meals',
  'Alcohol',
  'Boredom',
  'Social',
  'Driving',
  'Habit',
  'Work breaks',
  'Morning routine',
  'Evening routine',
  'Other',
];

const CONTEXT_OPTIONS_DE = [
  'Zuhause',
  'Arbeit',
  'Auto',
  'Draußen',
  'Restaurant / Bar',
  'Bei anderen',
  'Soziales Treffen',
  'Sonstiges',
];

const CONTEXT_OPTIONS_EN = [
  'Home',
  'Work',
  'Car',
  'Outside',
  'Restaurant / Bar',
  "At someone else's",
  'Social gathering',
  'Other',
];

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const CravingMode: React.FC<CravingModeProps> = ({ isOpen, onClose }) => {
  const { t, locale } = useLanguage();

  // Navigation and State
  const [step, setStep] = useState<CravingStep>('intensity');
  const [intensity, setIntensity] = useState<number>(7);
  const [selectedTrigger, setSelectedTrigger] = useState<string>('');
  const [selectedContext, setSelectedContext] = useState<string>('');
  const [activeIntervention, setActiveIntervention] = useState<InterventionSelectionResult | null>(null);
  const [matchedExperiment, setMatchedExperiment] = useState<PersonalExperiment | null>(null);
  const [experimentFeedback, setExperimentFeedback] = useState<string>('');

  // Timer state
  const [secondsRemaining, setSecondsRemaining] = useState<number>(180);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const timerStartTimeRef = useRef<number>(Date.now());
  const timerDurationTotalRef = useRef<number>(180);
  const elapsedAtInterventionExitRef = useRef<number>(0);

  // Reassessment outcome
  const [outcome, setOutcome] = useState<CravingOutcome | null>(null);
  const [createdCravingId, setCreatedCravingId] = useState<string>('');
  const [savedElapsedSeconds, setSavedElapsedSeconds] = useState<number>(0);

  // Smoked fallback state
  const [smokedDecision, setSmokedDecision] = useState<DecisionType>('intentional');
  const [smokedEnjoyment, setSmokedEnjoyment] = useState<EnjoymentRating>('partially');
  const [savedSmokingEvent, setSavedSmokingEvent] = useState<SmokingEvent | null>(null);
  const submissionRef = useRef(false);
  const closeNotifiedRef = useRef(false);
  const savedSmokingEventRef = useRef<SmokingEvent | null>(null);
  const createdCravingIdRef = useRef('');
  const dialogRef = useRef<HTMLDivElement>(null);

  // Triggers & Contexts by locale
  const triggerOptions = locale === 'de' ? TRIGGER_OPTIONS_DE : TRIGGER_OPTIONS_EN;
  const contextOptions = locale === 'de' ? CONTEXT_OPTIONS_DE : CONTEXT_OPTIONS_EN;

  // Initialize flow when opened
  useEffect(() => {
    if (isOpen) {
      setStep('intensity');
      setIntensity(7);
      setSelectedTrigger('');
      setSelectedContext('');
      setActiveIntervention(null);
      setMatchedExperiment(null);
      setExperimentFeedback('');
      setOutcome(null);
      setTimerActive(false);
      setSecondsRemaining(180);
      setSavedElapsedSeconds(0);
      setSavedSmokingEvent(null);
      submissionRef.current = false;
      closeNotifiedRef.current = false;
      savedSmokingEventRef.current = null;
      elapsedAtInterventionExitRef.current = 0;
      const nextCravingId = `craving_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      createdCravingIdRef.current = nextCravingId;
      setCreatedCravingId(nextCravingId);
    }
  }, [isOpen]);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, secondsRemaining]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());

    const closeFromKeyboard = () => {
      if (closeNotifiedRef.current) return;
      closeNotifiedRef.current = true;
      setTimerActive(false);
      const cravingId = createdCravingIdRef.current;
      const draft = cravingId ? CravingEventRepository.getById(cravingId) : null;
      if (draft && !draft.outcome) CravingEventRepository.remove(cravingId);
      onClose(undefined, savedSmokingEventRef.current || undefined);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeFromKeyboard();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = priorOverflow;
      previous?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Pre-intervention backward navigation check
  const canGoBack = step === 'trigger' || step === 'context' || step === 'driving_safety';

  const handleBack = () => {
    if (step === 'trigger') {
      setStep('intensity');
    } else if (step === 'context') {
      setStep('trigger');
    } else if (step === 'driving_safety') {
      setStep('context');
    }
  };

  // Step 1: Intensity submit
  const handleIntensitySubmit = () => {
    setStep('trigger');
  };

  // Step 2: Trigger single-select and continue
  const handleTriggerSelect = (trig: string) => {
    if (selectedTrigger === trig) {
      setSelectedTrigger('');
    } else {
      setSelectedTrigger(trig);
    }
  };

  const handleTriggerContinue = () => {
    if (!selectedTrigger) return;
    setStep('context');
  };

  // Step 3: Context single-select and continue
  const handleContextSelect = (place: string) => {
    if (selectedContext === place) {
      setSelectedContext('');
    } else {
      setSelectedContext(place);
    }
  };

  const getMatchingPersonalExperiment = (trig: string, place?: string): PersonalExperiment | null => {
    const active = ExperimentRepository.getActive();
    if (!active) return null;
    return HypothesisEngine.matches(active, trig, place, new Date().toISOString()) ? active : null;
  };

  const getJourneyInterventionOverride = (trig: string, place?: string): { id: string; durationSeconds?: number } | undefined => {
    const profile = ProfileRepository.get();
    if (!profile) return undefined;

    const progress = JourneyRepository.get();
    const mission = JourneyEngine.getMissionForDay(
      progress.dayInLab || 1,
      profile,
      progress,
      SmokingEventRepository.getAll(),
      CravingEventRepository.getAll(),
      locale
    );

    if (!mission.interventionId || mission.completed) return undefined;
    if (mission.targetTrigger) {
      const selected = PatternEngine.normalizeTriggerKey(trig);
      const target = PatternEngine.normalizeTriggerKey(mission.targetTrigger);
      if (selected !== target) return undefined;
    }
    if (mission.targetPlace) {
      if (!place) return undefined;
      const selectedPlace = PatternEngine.normalizePlaceKey(place);
      const targetPlace = PatternEngine.normalizePlaceKey(mission.targetPlace);
      if (selectedPlace !== targetPlace) return undefined;
    }
    return { id: mission.interventionId, durationSeconds: mission.interventionDurationSeconds };
  };

  const getQuitPlanInterventionOverride = (trig: string, place: string): string | undefined => {
    const profile = ProfileRepository.get();
    if (!profile || profile.goal !== 'quit') return undefined;
    const quitPlan = QuitSupportRepository.get();
    if (!quitPlan.enabled || quitPlan.highRiskPlans.length === 0) return undefined;
    const trigger = PatternEngine.normalizeTriggerKey(trig);
    const context = place ? PatternEngine.normalizePlaceKey(place) : undefined;
    const currentWindow = PatternEngine.getTimeWindow(new Date().getHours()).id;
    const match = quitPlan.highRiskPlans.find((plan) =>
      PatternEngine.normalizeTriggerKey(plan.trigger) === trigger &&
      (!plan.place || (context && PatternEngine.normalizePlaceKey(plan.place) === context)) &&
      (!plan.timeWindow || plan.timeWindow === currentWindow)
    );
    return match?.interventionId;
  };

  const startInterventionStep = (trig: string, place: string) => {
    // 1. Safety check for driving
    if (BehaviorInterventionEngine.isDrivingContext(trig, place)) {
      setStep('driving_safety');
      return;
    }

    // 2. Resolve competing intervention sources explicitly. A deliberately
    // activated personal experiment comes first. For Quit mode, an exact
    // prepared protection plan then outranks a generic Journey intervention.
    // This avoids showing one plan while executing another in the craving flow.
    const pastCravings = CravingEventRepository.getAll();
    const personalExperiment = getMatchingPersonalExperiment(trig, place);
    const quitPlanOverride = getQuitPlanInterventionOverride(trig, place);
    const journeyOverride = getJourneyInterventionOverride(trig, place);
    const priority = InterventionPriorityEngine.resolve(
      personalExperiment ? { id: personalExperiment.interventionId } : undefined,
      quitPlanOverride ? { id: quitPlanOverride } : undefined,
      journeyOverride,
    );
    const rawSelection = BehaviorInterventionEngine.selectIntervention(trig, place, pastCravings, priority.id);
    const selection: InterventionSelectionResult = {
      ...rawSelection,
      intervention: priority.durationSeconds
        ? { ...rawSelection.intervention, durationSeconds: priority.durationSeconds }
        : rawSelection.intervention,
      isPersonalExperiment: priority.source === 'personal_experiment',
      personalExperimentId: priority.source === 'personal_experiment' ? personalExperiment?.id : undefined,
      isJourneyExperiment: priority.source === 'journey',
      isQuitPlan: priority.source === 'quit_protection',
    };
    setMatchedExperiment(personalExperiment);
    setActiveIntervention(selection);

    const dur = selection.intervention.durationSeconds || 180;
    timerDurationTotalRef.current = dur;
    setSecondsRemaining(dur);
    timerStartTimeRef.current = Date.now();
    setTimerActive(true);

    // Record initial craving entry
    const newCraving: CravingEvent = {
      id: createdCravingId,
      timestamp: new Date().toISOString(),
      trigger: trig,
      place: place || undefined,
      initialIntensity: intensity,
      interventionId: selection.intervention.id,
      interventionStartedAt: new Date().toISOString(),
      experimentId: personalExperiment?.id,
    };
    CravingEventRepository.save(newCraving);

    setStep('intervention');
  };

  const handleContextContinue = () => {
    if (!selectedContext) return;
    startInterventionStep(selectedTrigger, selectedContext);
  };

  const handleDrivingSafetyAcknowledged = () => {
    const pastCravings = CravingEventRepository.getAll();
    const personalExperiment = getMatchingPersonalExperiment(selectedTrigger, selectedContext);
    const journeyOverride = getJourneyInterventionOverride(selectedTrigger, selectedContext);
    const quitPlanOverride = getQuitPlanInterventionOverride(selectedTrigger, selectedContext);
    // After the user explicitly confirms they are safely parked, use the exact
    // same priority resolver as the normal craving path. Previously this branch
    // accidentally let Journey outrank a matching Quit protection plan.
    const priority = InterventionPriorityEngine.resolve(
      personalExperiment ? { id: personalExperiment.interventionId } : undefined,
      quitPlanOverride ? { id: quitPlanOverride } : undefined,
      journeyOverride,
    );
    const rawSelection = BehaviorInterventionEngine.selectIntervention(selectedTrigger, selectedContext, pastCravings, priority.id);
    const selection: InterventionSelectionResult = {
      ...rawSelection,
      intervention: priority.durationSeconds
        ? { ...rawSelection.intervention, durationSeconds: priority.durationSeconds }
        : rawSelection.intervention,
      isPersonalExperiment: priority.source === 'personal_experiment',
      personalExperimentId: priority.source === 'personal_experiment' ? personalExperiment?.id : undefined,
      isJourneyExperiment: priority.source === 'journey',
      isQuitPlan: priority.source === 'quit_protection',
    };
    setMatchedExperiment(personalExperiment);
    setActiveIntervention(selection);

    const dur = selection.intervention.durationSeconds || 180;
    timerDurationTotalRef.current = dur;
    setSecondsRemaining(dur);
    timerStartTimeRef.current = Date.now();
    setTimerActive(true);

    const newCraving: CravingEvent = {
      id: createdCravingId,
      timestamp: new Date().toISOString(),
      trigger: selectedTrigger,
      place: selectedContext || undefined,
      initialIntensity: intensity,
      interventionId: selection.intervention.id,
      interventionStartedAt: new Date().toISOString(),
      experimentId: personalExperiment?.id,
    };
    CravingEventRepository.save(newCraving);

    setStep('intervention');
  };

  const captureElapsedSeconds = (): number => {
    const rawElapsed = Math.max(1, Math.round((Date.now() - timerStartTimeRef.current) / 1000));
    const cappedElapsed = Math.min(timerDurationTotalRef.current, rawElapsed);
    elapsedAtInterventionExitRef.current = cappedElapsed;
    setSavedElapsedSeconds(cappedElapsed);
    return cappedElapsed;
  };

  const handleClose = () => {
    if (closeNotifiedRef.current) return;
    closeNotifiedRef.current = true;
    setTimerActive(false);
    const cravingId = createdCravingIdRef.current || createdCravingId;
    const draft = cravingId ? CravingEventRepository.getById(cravingId) : null;
    if (draft && !draft.outcome) {
      CravingEventRepository.remove(cravingId);
    }
    onClose(undefined, savedSmokingEventRef.current || savedSmokingEvent || undefined);
  };

  const handleReassessEarly = () => {
    setTimerActive(false);
    captureElapsedSeconds();
    setStep('reassessment');
  };

  const handleTimerFinished = () => {
    setTimerActive(false);
    elapsedAtInterventionExitRef.current = timerDurationTotalRef.current;
    setSavedElapsedSeconds(timerDurationTotalRef.current);
    setStep('reassessment');
  };

  const handleSmokedAnyway = () => {
    setTimerActive(false);
    captureElapsedSeconds();
    setStep('smoked_fallback');
  };

  const refreshExperimentAfterOutcome = (cravingId: string): void => {
    const craving = CravingEventRepository.getById(cravingId);
    if (!craving?.experimentId) return;
    let experiment = ExperimentRepository.recordAttempt(craving.experimentId, cravingId);
    if (!experiment) return;

    const evaluation = HypothesisEngine.evaluate(experiment, CravingEventRepository.getAll());
    if (evaluation.complete) {
      experiment = ExperimentRepository.update(experiment.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        result: evaluation.result,
        resultSummaryDe: evaluation.summaryDe,
        resultSummaryEn: evaluation.summaryEn,
      }) || experiment;
    }
    setMatchedExperiment(experiment);
    setExperimentFeedback(locale === 'de' ? evaluation.summaryDe : evaluation.summaryEn);
  };

  // Reassessment outcome submission
  const handleSaveOutcome = (selectedOutcome: CravingOutcome) => {
    if (submissionRef.current) return;
    submissionRef.current = true;
    setOutcome(selectedOutcome);
    const elapsed = elapsedAtInterventionExitRef.current || captureElapsedSeconds();

    // Update the CravingEvent
    CravingEventRepository.update(createdCravingId, {
      interventionEndedAt: new Date().toISOString(),
      elapsedSeconds: elapsed,
      outcome: selectedOutcome,
      interrupted: selectedOutcome !== 'smoked',
    });
    refreshExperimentAfterOutcome(createdCravingId);

    // Update Control Score
    const allCravings = CravingEventRepository.getAll();
    const allSmokes = SmokingEventRepository.getAll();
    const newScore = ControlScoreEngine.calculateScore(allCravings, allSmokes);
    JourneyRepository.update({ controlScore: newScore });

    setStep('completed');
  };

  // Smoked Fallback submission
  const handleSaveSmokedFallback = () => {
    if (submissionRef.current) return;
    submissionRef.current = true;
    const elapsed = elapsedAtInterventionExitRef.current || captureElapsedSeconds();
    setOutcome('smoked');
    const smokeEventId = `smoke_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // 1. Update craving event as outcome = 'smoked'
    CravingEventRepository.update(createdCravingId, {
      interventionEndedAt: new Date().toISOString(),
      elapsedSeconds: elapsed,
      outcome: 'smoked',
      finalIntensity: intensity,
      linkedSmokingEventId: smokeEventId,
      interrupted: false,
    });

    // 2. Create linked smoking event
    const smokeEvent: SmokingEvent = {
      id: smokeEventId,
      timestamp: new Date().toISOString(),
      trigger: selectedTrigger,
      place: selectedContext || undefined,
      cravingIntensity: intensity,
      decisionType: smokedDecision,
      enjoyment: smokedEnjoyment,
      linkedCravingEventId: createdCravingId,
      experimentId: matchedExperiment?.id,
    };
    SmokingEventRepository.save(smokeEvent);
    setSavedSmokingEvent(smokeEvent);
    savedSmokingEventRef.current = smokeEvent;
    refreshExperimentAfterOutcome(createdCravingId);

    // Update Control Score (awareness still gives points)
    const allCravings = CravingEventRepository.getAll();
    const allSmokes = SmokingEventRepository.getAll();
    const newScore = ControlScoreEngine.calculateScore(allCravings, allSmokes);
    JourneyRepository.update({ controlScore: newScore });

    setStep('completed');
  };

  const handleFinish = () => {
    if (closeNotifiedRef.current) return;
    closeNotifiedRef.current = true;
    const allCravings = CravingEventRepository.getAll();
    const allSmokes = SmokingEventRepository.getAll();
    const newScore = ControlScoreEngine.calculateScore(allCravings, allSmokes);
    onClose(newScore, savedSmokingEventRef.current || savedSmokingEvent || undefined);
  };

  // Formatting time display
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={locale === 'de' ? 'Drang unterbrechen' : 'Interrupt urge'} className="fixed inset-0 z-50 bg-[#191B1C] text-[#F2F1ED] flex flex-col justify-between overflow-y-auto antialiased focus:outline-none">
      {/* Top Bar */}
      <header className="w-full max-w-md mx-auto px-6 pt-5 pb-3 flex items-center justify-between border-b border-[#2E3234]">
        <div className="flex items-center gap-2 min-w-0">
          {canGoBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="-ml-1 h-11 w-11 inline-flex items-center justify-center rounded-lg text-[#B9BCBE] hover:text-[#F2F1ED] hover:bg-[#232627] transition"
              aria-label={locale === 'de' ? 'Zurück' : 'Back'}
            >
              <ArrowLeft aria-hidden="true" className="w-5 h-5 stroke-[1.6]" />
            </button>
          ) : (
            <span className="h-2 w-2 rounded-full bg-[#17372E] border border-[#2E3234] shrink-0" />
          )}
          <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#B9BCBE] truncate">
            {t('actionWantToSmoke')}
          </span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="h-11 w-11 inline-flex items-center justify-center rounded-lg text-[#B9BCBE] hover:text-[#F2F1ED] hover:bg-[#232627] transition"
          aria-label={locale === 'de' ? 'Schließen' : 'Close'}
        >
          <X aria-hidden="true" className="w-5 h-5 stroke-[1.6]" />
        </button>
      </header>

      {/* Dynamic Step Content */}
      <main className="w-full max-w-md mx-auto px-6 py-6 flex-1 flex flex-col justify-center">
        {/* ========================================================== */}
        {/* STEP 1: CRAVING INTENSITY (1-10) */}
        {/* ========================================================== */}
        {step === 'intensity' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="space-y-2 text-center">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#747779]">
                01 · {locale === 'de' ? 'Wahrnehmung' : 'Awareness'}
              </span>
              <h2 className="font-display text-3xl sm:text-4xl text-[#F2F1ED] font-normal leading-tight">
                {t('cravingIntensityTitle')}
              </h2>
              <p className="font-ui text-xs text-[#B9BCBE] max-w-[280px] mx-auto">
                {t('cravingIntensityNotice')}
              </p>
            </div>

            {/* Giant Number Display */}
            <div className="text-center py-2">
              <div className="text-7xl sm:text-8xl font-light tracking-tight text-[#F2F1ED] tabular-nums">
                {intensity}
              </div>
              <span className="text-xs font-mono tracking-widest uppercase text-[#747779] block mt-1">
                {intensity <= 3
                  ? locale === 'de' ? 'Mild' : 'Mild'
                  : intensity <= 6
                  ? locale === 'de' ? 'Präsent' : 'Present'
                  : intensity <= 8
                  ? locale === 'de' ? 'Stark' : 'Strong'
                  : locale === 'de' ? 'Sehr intensiv' : 'Intense'}
              </span>
            </div>

            {/* Tactile 1-10 Buttons */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setIntensity(val)}
                  className={`h-11 rounded-xl text-sm font-mono font-medium transition ${
                    intensity === val
                      ? 'bg-[#F2F1ED] text-[#191B1C] shadow-sm font-semibold'
                      : 'bg-[#232627] text-[#B9BCBE] hover:bg-[#2E3234] hover:text-[#F2F1ED]'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>

            <button
              type="button"
              id="btn-intensity-continue"
              onClick={handleIntensitySubmit}
              className="btn-tactile w-full py-4 rounded-xl bg-[#F2F1ED] text-[#191B1C] font-semibold text-sm tracking-wide uppercase flex items-center justify-center gap-2 hover:bg-[#E7E7E3] transition mt-4 shadow-sm"
            >
              <span>{t('continueBtn')}</span>
              <ArrowRight className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        )}

        {/* ========================================================== */}
        {/* STEP 2: TRIGGER SELECTION */}
        {/* ========================================================== */}
        {step === 'trigger' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#747779]">
                02 · {locale === 'de' ? 'Auslöser' : 'Trigger'}
              </span>
              <h2 className="font-display text-3xl sm:text-4xl text-[#F2F1ED] font-normal leading-tight">
                {t('cravingTriggerTitle')}
              </h2>
              <p className="font-ui text-xs text-[#B9BCBE]">
                {t('cravingTriggerSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2 max-h-[380px] overflow-y-auto pr-1">
              {triggerOptions.map((trig) => {
                const isSelected = selectedTrigger === trig;
                return (
                  <button
                    key={trig}
                    type="button"
                    onClick={() => handleTriggerSelect(trig)}
                    className={`btn-tactile p-3.5 rounded-xl text-left border transition text-xs sm:text-sm font-medium flex items-center justify-between ${
                      isSelected
                        ? 'border-[#F2F1ED] bg-[#232627] text-[#F2F1ED]'
                        : 'border-[#2E3234] bg-[#202223] text-[#B9BCBE] hover:border-[#747779] hover:text-[#F2F1ED]'
                    }`}
                  >
                    <span>{trig}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#F2F1ED] shrink-0" />}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleTriggerContinue}
              disabled={!selectedTrigger}
              className={`btn-tactile w-full py-4 rounded-xl font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition ${
                selectedTrigger
                  ? 'bg-[#F2F1ED] text-[#191B1C] hover:bg-[#E7E7E3]'
                  : 'bg-[#232627] text-[#747779] cursor-not-allowed'
              }`}
            >
              <span>{t('continueBtn')}</span>
              <ArrowRight className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        )}

        {/* ========================================================== */}
        {/* STEP 3: CONTEXT / LOCATION */}
        {/* ========================================================== */}
        {step === 'context' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#747779]">
                03 · {locale === 'de' ? 'Kontext' : 'Context'}
              </span>
              <h2 className="font-display text-3xl sm:text-4xl text-[#F2F1ED] font-normal leading-tight">
                {t('cravingContextTitle')}
              </h2>
              <p className="font-ui text-xs text-[#B9BCBE] pt-1">
                {t('cravingContextSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {contextOptions.map((ctx) => {
                const isSelected = selectedContext === ctx;
                return (
                  <button
                    key={ctx}
                    type="button"
                    onClick={() => handleContextSelect(ctx)}
                    className={`btn-tactile p-4 rounded-xl text-left border transition text-xs sm:text-sm font-medium flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-[#F2F1ED] bg-[#232627] text-[#F2F1ED]'
                        : 'border-[#2E3234] bg-[#202223] text-[#B9BCBE] hover:border-[#747779] hover:text-[#F2F1ED]'
                    }`}
                  >
                    <span>{ctx}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#F2F1ED] shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleContextContinue}
                disabled={!selectedContext}
                className={`btn-tactile w-full py-4 rounded-xl font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition ${
                  selectedContext
                    ? 'bg-[#F2F1ED] text-[#191B1C] hover:bg-[#E7E7E3]'
                    : 'bg-[#232627] text-[#747779] cursor-not-allowed'
                }`}
              >
                <span>{t('continueBtn')}</span>
                <ArrowRight className="w-4 h-4 stroke-[2]" />
              </button>
              <button
                type="button"
                onClick={() => startInterventionStep(selectedTrigger, '')}
                className="w-full py-2.5 text-center text-xs text-[#747779] hover:text-[#B9BCBE] transition font-medium"
              >
                {t('skipStep')}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* DRIVING SAFETY INTERCEPT */}
        {/* ========================================================== */}
        {step === 'driving_safety' && (
          <div className="space-y-6 animate-fadeIn text-center max-w-sm mx-auto">
            <div className="h-14 w-14 rounded-2xl bg-[#232627] border border-[#2E3234] flex items-center justify-center mx-auto text-[#B9BCBE]">
              <ShieldAlert className="w-7 h-7 stroke-[1.5]" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-3xl text-[#F2F1ED] font-normal">
                {t('safetyDrivingTitle')}
              </h2>
              <p className="font-ui text-xs text-[#B9BCBE] leading-relaxed">
                {t('safetyDrivingBody')}
              </p>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleDrivingSafetyAcknowledged}
                className="btn-tactile w-full py-4 rounded-xl bg-[#F2F1ED] text-[#191B1C] font-semibold text-xs tracking-wider uppercase hover:bg-[#E7E7E3] transition"
              >
                {t('safetyDrivingCta')}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* STEP 4 & 5: INTERVENTION EXPERIENCE (COUNTDOWN & PROTOCOL) */}
        {/* ========================================================== */}
        {step === 'intervention' && activeIntervention && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header with Protocol indicator */}
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#232627] border border-[#2E3234] text-[11px] font-mono text-[#B9BCBE]">
                <Clock className="w-3 h-3 text-[#17372E]" />
                <span>{t('interventionActiveProtocol')}</span>
              </div>

              <h2 className="font-display text-3xl sm:text-4xl text-[#F2F1ED] font-normal leading-tight">
                {t(activeIntervention.intervention.titleKey as any)}
              </h2>

              {activeIntervention.isPersonalExperiment && matchedExperiment && (
                <div className="inline-flex items-center gap-1.5 text-xs text-[#B9BCBE] pt-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#17372E]" />
                  <span>
                    {locale === 'de' ? 'Persönlicher Test' : 'Personal test'} · {Math.min(matchedExperiment.targetAttempts, matchedExperiment.attemptCravingIds.length + 1)}/{matchedExperiment.targetAttempts}
                  </span>
                </div>
              )}

              {activeIntervention.isJourneyExperiment && (
                <div className="inline-flex items-center gap-1.5 text-xs text-[#B9BCBE] pt-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#17372E]" />
                  <span>{locale === 'de' ? 'Heutige Übung' : "Today's practice"}</span>
                </div>
              )}

              {activeIntervention.isQuitPlan && (
                <div className="inline-flex items-center gap-1.5 text-xs text-[#B9BCBE] pt-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#17372E]" />
                  <span>{locale === 'de' ? 'Dein vorbereiteter Schutzplan' : 'Your prepared protection plan'}</span>
                </div>
              )}

              {!activeIntervention.isJourneyExperiment && activeIntervention.isAdaptiveRecommendation && (
                <div className="inline-flex items-center gap-1.5 text-xs text-[#B9BCBE] pt-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#17372E]" />
                  <span>{t('adaptiveInterventionNote')}</span>
                </div>
              )}
            </div>

            {/* Instruction Card */}
            <div className="rounded-2xl bg-[#232627] border border-[#2E3234] p-5 text-center space-y-2">
              <p className="font-ui text-sm sm:text-[15px] text-[#F2F1ED] leading-relaxed">
                {t(activeIntervention.intervention.instructionKey as any)}
              </p>
            </div>

            {/* Timer Ring / Digits */}
            {activeIntervention.intervention.durationSeconds && (
              <div className="text-center py-3">
                <div className="text-6xl sm:text-7xl font-light font-mono tracking-tight text-[#F2F1ED] tabular-nums">
                  {formatTimer(secondsRemaining)}
                </div>
                <div className="w-36 h-1 bg-[#2E3234] rounded-full mx-auto mt-3 overflow-hidden">
                  <div
                    className="h-full bg-[#17372E] transition-all duration-1000"
                    style={{
                      width: `${Math.max(0, Math.min(100, ((timerDurationTotalRef.current - secondsRemaining) / timerDurationTotalRef.current) * 100))}%`,
                    }}
                  />
                </div>
                {secondsRemaining === 0 && (
                  <p className="text-xs text-[#B9BCBE] font-mono mt-3">
                    {t('interventionPauseCompleted')}
                  </p>
                )}
              </div>
            )}

            {/* Key Action Controls — Never trapped */}
            <div className="space-y-3 pt-2">
              {secondsRemaining === 0 ? (
                <button
                  type="button"
                  onClick={handleTimerFinished}
                  className="btn-tactile w-full py-4 rounded-xl bg-[#F2F1ED] text-[#191B1C] font-semibold text-xs tracking-wider uppercase hover:bg-[#E7E7E3] transition"
                >
                  {t('continueBtn')}
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-reassess-early"
                  onClick={handleReassessEarly}
                  className="btn-tactile w-full py-3.5 rounded-xl bg-[#232627] border border-[#2E3234] text-[#F2F1ED] font-semibold text-xs tracking-wider uppercase hover:bg-[#2E3234] transition"
                >
                  {t('interventionReassessEarly')}
                </button>
              )}

              <button
                type="button"
                id="btn-smoked-anyway"
                onClick={handleSmokedAnyway}
                className="w-full py-2.5 text-center text-xs text-[#747779] hover:text-[#B9BCBE] transition font-medium"
              >
                {t('interventionSmokedAnyway')}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* STEP 6: REASSESSMENT */}
        {/* ========================================================== */}
        {step === 'reassessment' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-1.5 text-center">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#747779]">
                04 · {locale === 'de' ? 'Neubewertung' : 'Reassessment'}
              </span>
              <h2 className="font-display text-3xl sm:text-4xl text-[#F2F1ED] font-normal leading-tight">
                {t('reassessmentTitle')}
              </h2>
            </div>

            {/* 4 Discrete Choices */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleSaveOutcome('gone')}
                className="btn-tactile w-full p-4 rounded-xl border border-[#2E3234] bg-[#202223] text-left hover:border-[#F2F1ED] hover:bg-[#232627] transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-[#F2F1ED]">
                    {t('outcomeGone')}
                  </span>
                  <span className="text-xs text-[#747779] font-mono">{locale === 'de' ? 'weg' : 'gone'}</span>
                </div>
                <p className="text-xs text-[#B9BCBE] mt-0.5">
                  {locale === 'de' ? 'Der Impuls hat sich vollständig aufgelöst.' : 'The urge has completely dissipated.'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSaveOutcome('weaker')}
                className="btn-tactile w-full p-4 rounded-xl border border-[#2E3234] bg-[#202223] text-left hover:border-[#F2F1ED] hover:bg-[#232627] transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-[#F2F1ED]">
                    {t('outcomeWeaker')}
                  </span>
                  <span className="text-xs text-[#747779] font-mono">{locale === 'de' ? 'weniger' : 'lower'}</span>
                </div>
                <p className="text-xs text-[#B9BCBE] mt-0.5">
                  {locale === 'de' ? 'Spürbar schwächer als zu Beginn.' : 'Noticeably weaker than at the start.'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSaveOutcome('unchanged')}
                className="btn-tactile w-full p-4 rounded-xl border border-[#2E3234] bg-[#202223] text-left hover:border-[#F2F1ED] hover:bg-[#232627] transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-[#F2F1ED]">
                    {t('outcomeUnchanged')}
                  </span>
                  <span className="text-xs text-[#747779] font-mono">{locale === 'de' ? 'gleich' : 'same'}</span>
                </div>
                <p className="text-xs text-[#B9BCBE] mt-0.5">
                  {locale === 'de' ? 'Kaum Veränderung wahrgenommen.' : 'Little to no change noticed.'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSaveOutcome('stronger')}
                className="btn-tactile w-full p-4 rounded-xl border border-[#2E3234] bg-[#202223] text-left hover:border-[#F2F1ED] hover:bg-[#232627] transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-[#F2F1ED]">
                    {t('outcomeStronger')}
                  </span>
                  <span className="text-xs text-[#747779] font-mono">{locale === 'de' ? 'mehr' : 'higher'}</span>
                </div>
                <p className="text-xs text-[#B9BCBE] mt-0.5">
                  {locale === 'de' ? 'Der Drang hat zugenommen.' : 'The urge has intensified.'}
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* BRANCH: SMOKED FALLBACK (SHORTENED LOGGING) */}
        {/* ========================================================== */}
        {step === 'smoked_fallback' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#747779]">
                {locale === 'de' ? 'Reflexion' : 'Reflection'}
              </span>
              <h2 className="font-display text-3xl text-[#F2F1ED] font-normal leading-tight">
                {locale === 'de' ? 'In Ordnung. Wir lernen daraus.' : 'Understood. We learn from this.'}
              </h2>
              <p className="font-ui text-xs text-[#B9BCBE]">
                {locale === 'de'
                  ? 'Du hast die Pause versucht. Das allein stärkt deine Wahrnehmung.'
                  : 'You attempted the pause. That alone trains your awareness.'}
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-[#747779] block mb-2">
                  {t('smokedLogDecisionLabel')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSmokedDecision('automatic')}
                    className={`p-3 rounded-xl text-xs font-medium border transition ${
                      smokedDecision === 'automatic'
                        ? 'border-[#F2F1ED] bg-[#232627] text-[#F2F1ED]'
                        : 'border-[#2E3234] bg-[#202223] text-[#B9BCBE]'
                    }`}
                  >
                    {t('decisionAutomatic')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSmokedDecision('intentional')}
                    className={`p-3 rounded-xl text-xs font-medium border transition ${
                      smokedDecision === 'intentional'
                        ? 'border-[#F2F1ED] bg-[#232627] text-[#F2F1ED]'
                        : 'border-[#2E3234] bg-[#202223] text-[#B9BCBE]'
                    }`}
                  >
                    {t('decisionIntentional')}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-[#747779] block mb-2">
                  {t('smokedLogEnjoymentLabel')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['yes', 'partially', 'no'] as EnjoymentRating[]).map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setSmokedEnjoyment(e)}
                      className={`p-2.5 rounded-xl text-xs font-medium border transition ${
                        smokedEnjoyment === e
                          ? 'border-[#F2F1ED] bg-[#232627] text-[#F2F1ED]'
                          : 'border-[#2E3234] bg-[#202223] text-[#B9BCBE]'
                      }`}
                    >
                      {e === 'yes' ? t('enjoymentYes') : e === 'partially' ? t('enjoymentPartially') : t('enjoymentNo')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              id="btn-smoked-fallback-save"
              onClick={handleSaveSmokedFallback}
              className="btn-tactile w-full py-4 rounded-xl bg-[#F2F1ED] text-[#191B1C] font-semibold text-xs tracking-wider uppercase hover:bg-[#E7E7E3] transition mt-4"
            >
              {t('saveEntry')}
            </button>
          </div>
        )}

        {/* ========================================================== */}
        {/* COMPLETED FEEDBACK SCREEN */}
        {/* ========================================================== */}
        {step === 'completed' && (
          <div className="space-y-6 animate-fadeIn text-center max-w-sm mx-auto">
            <div className="h-12 w-12 rounded-full bg-[#17372E] text-[#F2F1ED] flex items-center justify-center mx-auto">
              {outcome === 'smoked' ? (
                <Clock className="w-6 h-6 stroke-[2]" />
              ) : (
                <Check className="w-6 h-6 stroke-[2]" />
              )}
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-3xl text-[#F2F1ED] font-normal">
                {outcome === 'gone'
                  ? locale === 'de' ? 'Drang aufgelöst.' : 'Urge dissolved.'
                  : outcome === 'weaker'
                  ? locale === 'de' ? 'Welle abgeflacht.' : 'Wave flattened.'
                  : outcome === 'smoked'
                  ? locale === 'de' ? 'Zigarette erfasst.' : 'Cigarette recorded.'
                  : locale === 'de' ? 'Signal dokumentiert.' : 'Signal recorded.'}
              </h2>
              <p className="font-ui text-xs text-[#B9BCBE] leading-relaxed">
                {outcome === 'gone'
                  ? t('cravingResolvedFeedbackGone')
                  : outcome === 'weaker'
                  ? t('cravingResolvedFeedbackWeaker')
                  : outcome === 'unchanged'
                  ? t('cravingResolvedFeedbackUnchanged')
                  : outcome === 'smoked'
                  ? t('cravingResolvedFeedbackSmoked')
                  : t('cravingResolvedFeedbackStronger')}
              </p>
            </div>

            {matchedExperiment && experimentFeedback && (
              <div className="rounded-2xl bg-[#232627] border border-[#2E3234] p-4 text-left space-y-1.5">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#747779]">
                  {matchedExperiment.status === 'completed'
                    ? (locale === 'de' ? 'Auswertung des Tests' : 'Test result')
                    : (locale === 'de' ? `Persönlicher Test · ${matchedExperiment.attemptCravingIds.length}/${matchedExperiment.targetAttempts}` : `Personal test · ${matchedExperiment.attemptCravingIds.length}/${matchedExperiment.targetAttempts}`)}
                </div>
                <p className="font-ui text-xs text-[#B9BCBE] leading-relaxed">{experimentFeedback}</p>
              </div>
            )}

            {savedElapsedSeconds > 0 && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#232627] border border-[#2E3234] text-xs font-mono text-[#B9BCBE]">
                <Clock className="w-3.5 h-3.5 text-[#747779]" />
                <span>
                  {locale === 'de' ? 'Eingefügte Pause' : 'Pause inserted'}: {formatElapsedHuman(savedElapsedSeconds, locale)}
                </span>
              </div>
            )}

            <div className="pt-4">
              <button
                type="button"
                id="btn-craving-finish"
                onClick={handleFinish}
                className="btn-tactile w-full py-4 rounded-xl bg-[#F2F1ED] text-[#191B1C] font-semibold text-xs tracking-wider uppercase hover:bg-[#E7E7E3] transition"
              >
                {t('finishCravingFlow')}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom info note */}
      <footer className="w-full max-w-md mx-auto px-6 py-4 text-center">
        <span className="text-[10px] font-mono text-[#747779] tracking-wider uppercase">
          SMOKE LAB · {t('privacyNotice')}
        </span>
      </footer>
    </div>
  );
};
