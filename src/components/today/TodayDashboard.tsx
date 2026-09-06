import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowRight, Info } from 'lucide-react';
import { UserProfile, JourneyProgress, SmokingEvent, CravingEvent, PersonalExperiment } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { ModalSheet } from '../common/ModalSheet';
import {
  SmokingEventRepository,
  CravingEventRepository,
  JourneyRepository,
  ExperimentRepository,
  QuitSupportRepository,
  LapseRecoveryRepository,
} from '../../storage/repositories';
import { PatternEngine } from '../../services/behavior/PatternEngine';
import { NextBestActionEngine } from '../../services/behavior/NextBestActionEngine';
import { ControlScoreEngine } from '../../services/behavior/ControlScoreEngine';
import { JourneyEngine } from '../../services/behavior/JourneyEngine';
import { HypothesisEngine } from '../../services/behavior/HypothesisEngine';
import { ExperimentSequencingEngine } from '../../services/behavior/ExperimentSequencingEngine';
import { CravingMode } from '../craving/CravingMode';
import { QuickSmokingLogModal } from '../smoking/QuickSmokingLogModal';
import { LapseRecoveryModal } from '../quit/LapseRecoveryModal';
import { GoalModeCoordinator } from '../../services/behavior/GoalModeCoordinator';
import { PostSmokingFlowEngine } from '../../services/behavior/PostSmokingFlowEngine';

interface TodayDashboardProps {
  userProfile: UserProfile;
  progress: JourneyProgress;
  todaySmokingCount: number;
  onDataChanged?: () => void;
  onOpenLab?: () => void;
}

export const TodayDashboard: React.FC<TodayDashboardProps> = ({
  userProfile,
  progress: initialProgress,
  onDataChanged,
  onOpenLab,
}) => {
  const { t, locale } = useLanguage();

  // Active Data State
  const [smokingEvents, setSmokingEvents] = useState<SmokingEvent[]>([]);
  const [cravingEvents, setCravingEvents] = useState<CravingEvent[]>([]);
  const [experiments, setExperiments] = useState<PersonalExperiment[]>([]);
  const [todaySmokingCount, setTodaySmokingCount] = useState<number>(0);
  const [controlScore, setControlScore] = useState<number>(initialProgress.controlScore || 50);

  // Flow Modals State
  const [showControlInfo, setShowControlInfo] = useState(false);
  const [showCravingMode, setShowCravingMode] = useState(false);
  const [showQuickSmokedModal, setShowQuickSmokedModal] = useState(false);
  const [showExperimentSheet, setShowExperimentSheet] = useState(false);
  const [showHypothesisSheet, setShowHypothesisSheet] = useState(false);
  const [recoverySmokingEvent, setRecoverySmokingEvent] = useState<SmokingEvent | null>(null);

  // Reload local state from repositories
  const reloadState = () => {
    const smokes = SmokingEventRepository.getAll();
    const cravings = CravingEventRepository.getAll();
    const todaySmokes = SmokingEventRepository.getToday();
    const storedExperiments = ExperimentRepository.getAll();
    const computedScore = ControlScoreEngine.calculateScore(cravings, smokes);

    setSmokingEvents(smokes);
    setCravingEvents(cravings);
    setExperiments(storedExperiments);
    setTodaySmokingCount(todaySmokes.length);
    setControlScore(computedScore);

    // Sync to Journey progress
    JourneyRepository.update({
      controlScore: computedScore,
      totalCigarettesLogged: smokes.length,
      totalCravingsLogged: cravings.length,
    });

    if (onDataChanged) {
      onDataChanged();
    }
  };

  useEffect(() => {
    reloadState();
  }, []);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greetingMorning');
    if (hour < 17) return t('greetingAfternoon');
    return t('greetingEvening');
  };

  const baselineCpd = userProfile.baseline.typicalCigarettesPerDay || 14;
  const hasBehaviorData = smokingEvents.length + cravingEvents.length > 0;

  // Real-time live insight + one cautious, data-grounded next action.
  const liveInsight = PatternEngine.getLiveInsight(smokingEvents, cravingEvents, locale);
  const nextBestAction = NextBestActionEngine.generate(userProfile, smokingEvents, cravingEvents, locale);
  const currentJourney = JourneyRepository.get();
  const currentPhase = JourneyEngine.phaseForDay(currentJourney.dayInLab || 1, locale);
  const currentMission = JourneyEngine.getMissionForDay(
    currentJourney.dayInLab || 1,
    userProfile,
    currentJourney,
    smokingEvents,
    cravingEvents,
    locale
  );
  const activeExperiment = experiments.find((experiment) => experiment.status === 'active') || null;
  const quitSupportPlan = QuitSupportRepository.get();
  const goalFocusDecision = GoalModeCoordinator.build(
    userProfile,
    currentJourney,
    smokingEvents,
    cravingEvents,
    experiments,
    quitSupportPlan,
    LapseRecoveryRepository.getAll(),
  );
  // Only expose a suggested experiment when the central coordinator has
  // actually selected that question as the current focus. This prevents a
  // recovery, quit-protection or maintenance card from competing with a
  // second suggestion lower on Today.
  const sequencingDecision = !activeExperiment && goalFocusDecision.reasonCodes.includes('sequenced_personal_question')
    ? ExperimentSequencingEngine.next(userProfile, smokingEvents, cravingEvents, experiments)
    : null;
  const suggestedExperiment = sequencingDecision?.experiment || null;
  const experimentToShow = goalFocusDecision.source === 'active_experiment'
    ? activeExperiment
    : goalFocusDecision.reasonCodes.includes('sequenced_personal_question')
      ? suggestedExperiment
      : null;
  const experimentEvaluation = activeExperiment
    ? HypothesisEngine.evaluate(activeExperiment, cravingEvents)
    : null;
  const pendingRecoveryEvent = goalFocusDecision.pendingRecoverySmokingEventId
    ? smokingEvents.find((event) => event.id === goalFocusDecision.pendingRecoverySmokingEventId) || null
    : null;
  const showGoalFocusCard = ['recovery', 'maintenance', 'quit_protection', 'quit_preparation', 'reduction'].includes(goalFocusDecision.source);
  // Today presents one behavioral focus at a time. The Journey is still fully
  // available in Lab, but its card only appears when the coordinator has
  // selected the Journey itself as today's primary task.
  const showJourneyMission = goalFocusDecision.source === 'journey';

  const handleGoalFocusAction = () => {
    if (goalFocusDecision.action === 'open_recovery' && pendingRecoveryEvent) {
      setRecoverySmokingEvent(pendingRecoveryEvent);
      return;
    }
    if (goalFocusDecision.action === 'open_experiment') {
      setShowHypothesisSheet(true);
      return;
    }
    if (goalFocusDecision.action === 'open_craving') {
      setShowCravingMode(true);
      return;
    }
    if (goalFocusDecision.action === 'open_lab') {
      onOpenLab?.();
    }
  };

  const routeSavedSmokingEvent = (savedEvent?: SmokingEvent) => {
    if (!savedEvent) return;
    const decision = PostSmokingFlowEngine.afterSavedSmokingEvent(
      userProfile,
      savedEvent,
      QuitSupportRepository.get(),
      LapseRecoveryRepository.getAll(),
    );
    if (decision.action === 'open_recovery') {
      setRecoverySmokingEvent(savedEvent);
    }
  };

  const activateSuggestedExperiment = () => {
    if (!suggestedExperiment) return;
    ExperimentRepository.activate(suggestedExperiment);
    setShowHypothesisSheet(false);
    reloadState();
  };

  const journeyHeader = locale === 'de'
    ? `Tag ${String(currentJourney.dayInLab || 1).padStart(2, '0')} · ${currentPhase.title}`
    : `Day ${String(currentJourney.dayInLab || 1).padStart(2, '0')} · ${currentPhase.title}`;

  const evidenceLabel =
    nextBestAction.evidence === 'established'
      ? t('evidenceEstablished')
      : nextBestAction.evidence === 'emerging'
      ? t('evidenceEmerging')
      : t('evidenceInsufficient');

  return (
    <div className="w-full max-w-md mx-auto px-6 pt-3 pb-24 text-[#191B1C] space-y-7">
      {/* 1. Brand and Phase Header */}
      <header className="flex items-center justify-between border-b border-[#D9D9D4] pb-3 pt-1 select-none">
        <span className="text-[11px] font-semibold tracking-[0.24em] uppercase text-[#191B1C]">
          {t('brandName')}
        </span>
        <span className="text-[11px] text-[#747779] font-normal tracking-wide">
          {journeyHeader}
        </span>
      </header>

      {/* 2. Editorial Greeting & Supporting State */}
      <div className="space-y-1.5 pt-1">
        <h1 className="font-display text-4xl sm:text-[46px] font-normal tracking-[-0.03em] text-[#191B1C] leading-[1.04]">
          {getGreeting()}
        </h1>
        <p className="font-ui text-[13px] text-[#747779] font-normal leading-relaxed max-w-[320px]">
          {t('todaySubheading')}
        </p>
      </div>

      {/* 3. Guided orientation — v18: tell the user what to do before showing analytics */}
      <section aria-label={locale === 'de' ? 'Nächster Schritt' : 'Next step'} className="rounded-2xl border border-[#D9D9D4] bg-[#F8F7F3] p-4 space-y-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#747779]">
          {locale === 'de' ? 'JETZT' : 'NOW'}
        </span>
        <h2 className="font-ui text-[15px] font-semibold tracking-tight text-[#191B1C]">
          {hasBehaviorData
            ? (locale === 'de' ? 'Nur den nächsten echten Moment erfassen.' : 'Capture only the next real moment.')
            : (locale === 'de' ? 'Du musst heute nichts perfekt machen.' : 'You do not need to do anything perfectly today.')}
        </h2>
        <p className="font-ui text-xs sm:text-[13px] text-[#747779] leading-relaxed">
          {locale === 'de'
            ? 'Wenn du gerade rauchen willst, starte den Drang-Flow. Wenn du schon geraucht hast, protokolliere es. Smoke Lab führt dich danach weiter.'
            : 'If you want to smoke right now, start the urge flow. If you already smoked, log it. Smoke Lab will guide you from there.'}
        </p>
      </section>

      {/* 4. Dominant Dark Graphite Action & Understated Secondary */}
      <section aria-label={locale === 'de' ? 'Drang und Protokoll-Aktionen' : 'Urge and log actions'} className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-0.5">
          <span className="font-ui text-xs font-medium text-[#747779]">
            {locale === 'de' ? 'Was ist gerade der Fall?' : 'What is happening right now?'}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#747779]">
            {locale === 'de' ? '1 Schritt' : '1 step'}
          </span>
        </div>
        {/* DOMINANT DARK GRAPHITE ACTION: I WANT TO SMOKE */}
        <button
          type="button"
          id="btn-want-to-smoke"
          onClick={() => setShowCravingMode(true)}
          className="btn-tactile group w-full rounded-2xl bg-[#191B1C] border border-[#2E3234]/60 px-6 py-5 text-left text-[#F2F1ED] shadow-[0_6px_24px_rgba(25,27,28,0.12)] hover:bg-[#232627] transition relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#17372E]" />
                <h2 className="font-ui text-[15px] sm:text-[16px] font-semibold tracking-[0.08em] text-[#F2F1ED] uppercase leading-none">
                  {t('actionWantToSmoke')}
                </h2>
              </div>
              <p className="font-ui text-xs text-[#B9BCBE] font-normal pl-3.5">
                {t('actionWantToSmokeSubtitle')}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#B9BCBE] group-hover:translate-x-1 transition-transform stroke-[1.6] shrink-0" />
          </div>
        </button>

        {/* UNDERSTATED SECONDARY ACTION: I SMOKED — Calm, non-judgmental text action */}
        <div className="pt-0.5">
          <button
            type="button"
            id="btn-i-smoked"
            onClick={() => setShowQuickSmokedModal(true)}
            className="btn-tactile w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition group hover:bg-[#E7E7E3]/60"
          >
            <div className="space-y-0.5">
              <span className="font-ui text-xs sm:text-[13px] font-medium text-[#191B1C] block">
                {t('actionSmoked')}
              </span>
              <span className="font-ui text-[11px] text-[#747779] block">
                {t('actionSmokedSubtitle')}
              </span>
            </div>
            <span className="text-xs font-mono font-medium text-[#747779] px-2 py-0.5 rounded bg-[#E7E7E3]/70 group-hover:bg-[#E7E7E3] group-hover:text-[#191B1C] transition">
              +1
            </span>
          </button>
        </div>
      </section>

      {/* 3. Striking Data Composition — Direct on canvas, no heavy cards */}
      <section aria-label={locale === 'de' ? 'Tägliche Signale' : 'Daily signals'} className="pt-2">
        <div className="grid grid-cols-2 items-start gap-8">
          {/* Left: Cigarettes Today */}
          <div className="space-y-1">
            <div className="text-6xl sm:text-[70px] font-light tracking-tight text-[#191B1C] tabular-nums leading-none">
              {todaySmokingCount}
            </div>
            <div className="font-ui text-xs text-[#747779] font-normal tracking-tight pt-1">
              {t('metricCigarettesToday')}
            </div>
          </div>

          {/* Right: CONTROL Score & Baseline */}
          <div className="space-y-1 text-left sm:pl-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-[#747779]">
                {t('metricControlScore')}
              </span>
              <button
                type="button"
                onClick={() => setShowControlInfo(true)}
                className="h-11 w-11 -m-3 inline-flex items-center justify-center rounded-lg text-[#747779] hover:text-[#191B1C] hover:bg-[#E7E7E3] transition"
                aria-label={locale === 'de' ? 'Über den Control Score' : 'About Control Score'}
              >
                <Info aria-hidden="true" className="w-3.5 h-3.5 stroke-[1.6]" />
              </button>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl sm:text-[46px] font-light text-[#191B1C] tabular-nums leading-none">
                {hasBehaviorData ? controlScore : '—'}
              </span>
              {hasBehaviorData && (
                <span className="text-xs font-mono text-[#747779]">
                  {t('controlScoreUnit')}
                </span>
              )}
            </div>
            <div className="font-ui text-xs text-[#747779] tracking-tight pt-1">
              {t('metricBaselineLabel')} ~{baselineCpd}{locale === 'de' ? ' / Tag' : ' / day'}
            </div>
          </div>
        </div>
      </section>

      {/* 5. One Refined Live Insight — Natural typography & organic spacing (Real data from PatternEngine) */}
      <section aria-label={locale === 'de' ? 'Aktuelles Signal' : 'Insight signal'} className="pt-2 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#747779]">
            {t('insightLabel')}
          </span>
        </div>
        <h3 className="font-ui text-[15px] font-semibold tracking-tight text-[#191B1C]">
          {liveInsight.title}
        </h3>
        <p className="font-ui text-xs sm:text-[13px] text-[#747779] leading-relaxed font-normal">
          {liveInsight.text}
        </p>
      </section>

      {showGoalFocusCard && (
        <section aria-label={locale === 'de' ? 'Aktueller Zielfokus' : 'Goal mode focus'} className="pt-1 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[#747779]">
              {locale === 'de' ? 'Dein aktueller Fokus' : 'Your current focus'}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#747779]">
              {goalFocusDecision.source === 'recovery'
                ? (locale === 'de' ? 'Recovery' : 'Recovery')
                : goalFocusDecision.source === 'maintenance'
                  ? 'Maintenance'
                  : userProfile.goal === 'quit'
                    ? (locale === 'de' ? 'Aufhören' : 'Quit')
                    : (locale === 'de' ? 'Reduzieren' : 'Reduce')}
            </span>
          </div>
          <div className={`rounded-2xl p-4 space-y-2.5 ${goalFocusDecision.source === 'recovery' || goalFocusDecision.source === 'quit_protection' ? 'bg-[#191B1C] text-[#F2F1ED]' : 'bg-[#E7E7E3]/70 text-[#191B1C]'}`}>
            <div className="space-y-1">
              <h3 className="font-ui text-[14px] font-semibold leading-snug">
                {locale === 'de' ? goalFocusDecision.titleDe : goalFocusDecision.titleEn}
              </h3>
              <p className={`font-ui text-xs leading-relaxed ${goalFocusDecision.source === 'recovery' || goalFocusDecision.source === 'quit_protection' ? 'text-[#B9BCBE]' : 'text-[#747779]'}`}>
                {locale === 'de' ? goalFocusDecision.bodyDe : goalFocusDecision.bodyEn}
              </p>
            </div>
            {goalFocusDecision.action !== 'none' && (
              <button
                type="button"
                onClick={handleGoalFocusAction}
                className={`inline-flex items-center gap-1 text-xs font-semibold ${goalFocusDecision.source === 'recovery' || goalFocusDecision.source === 'quit_protection' ? 'text-[#F2F1ED]' : 'text-[#191B1C]'}`}
              >
                <span>{locale === 'de' ? goalFocusDecision.ctaDe : goalFocusDecision.ctaEn}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </section>
      )}

      {/* 6. TODAY'S ADAPTIVE LAB MISSION — grounded in the 30-day program */}
      {showJourneyMission && (
      <section aria-label={locale === 'de' ? 'Heutige Lab-Aufgabe' : "Today's Lab mission"} className="pt-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#747779]">
            {locale === 'de' ? 'Heute im Lab' : 'Today in the Lab'}
          </span>
          <span className="text-[10px] font-mono text-[#747779] tabular-nums">
            {locale === 'de' ? `TAG ${String(currentMission.day).padStart(2, '0')}` : `DAY ${String(currentMission.day).padStart(2, '0')}`}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenLab}
          className="w-full rounded-2xl bg-[#191B1C] text-[#F2F1ED] p-4 text-left shadow-[0_6px_20px_rgba(25,27,28,0.08)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-ui text-[15px] font-semibold tracking-tight">{currentMission.title}</h3>
                {currentMission.personalized && (
                  <span className="rounded-full border border-[#3A3E40] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#B9BCBE]">
                    {locale === 'de' ? 'für dich' : 'for you'}
                  </span>
                )}
              </div>
              <p className="font-ui text-xs text-[#B9BCBE] leading-relaxed">{currentMission.objective}</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#B9BCBE] shrink-0 mt-0.5" />
          </div>
          {currentMission.completionTarget > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-[#B9BCBE]">
                <span className="truncate">{currentMission.completionHint}</span>
                <span className="shrink-0">{Math.min(currentMission.completionProgress, currentMission.completionTarget)}/{currentMission.completionTarget}</span>
              </div>
              <div className="h-1 rounded-full bg-[#2E3234] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#17372E] transition-all"
                  style={{ width: `${Math.min(100, Math.round((currentMission.completionProgress / currentMission.completionTarget) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </button>
        {goalFocusDecision.deferJourneyIntervention && (
          <p className="font-ui text-[10.5px] text-[#747779] leading-relaxed px-1">
            {locale === 'de'
              ? 'Eine höher priorisierte persönliche Aufgabe ist gerade aktiv. Die Journey wird nicht gelöscht – ihre Intervention wartet, bis sie wieder passt.'
              : 'A higher-priority personal task is active right now. The Journey is not removed — its intervention waits until it fits again.'}
          </p>
        )}
      </section>
      )}

      {/* PERSONAL HYPOTHESIS — only appears once enough real observations support a test */}
      {experimentToShow && (
        <section aria-label={locale === 'de' ? 'Persönliche Hypothese' : 'Personal hypothesis'} className="pt-2 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[#747779]">
              {activeExperiment
                ? (locale === 'de' ? 'Persönlicher Test' : 'Personal test')
                : (locale === 'de' ? 'Nächste offene Frage' : 'Next open question')}
            </span>
            <span className="text-[10px] font-mono text-[#747779] tabular-nums">
              {activeExperiment
                ? `${Math.min(experimentEvaluation?.attempts || 0, activeExperiment.targetAttempts)}/${activeExperiment.targetAttempts}`
                : (locale === 'de' ? `${suggestedExperiment?.targetAttempts || 3} Situationen testen` : `test ${suggestedExperiment?.targetAttempts || 3} situations`)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowHypothesisSheet(true)}
            className="w-full rounded-2xl border border-[#D9D9D4] bg-[#F8F7F3] p-4 text-left transition hover:border-[#B9BCBE]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <h3 className="font-ui text-[14px] font-semibold leading-snug text-[#191B1C]">
                  {!activeExperiment && sequencingDecision
                    ? (locale === 'de' ? sequencingDecision.questionDe : sequencingDecision.questionEn)
                    : (locale === 'de' ? experimentToShow.hypothesisDe : experimentToShow.hypothesisEn)}
                </h3>
                <p className="font-ui text-xs text-[#747779] leading-relaxed">
                  {locale === 'de' ? experimentToShow.testDe : experimentToShow.testEn}
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#747779] shrink-0 mt-0.5" />
            </div>
            {activeExperiment && (
              <div className="mt-3 h-1 rounded-full bg-[#E1E1DC] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#17372E] transition-all"
                  style={{ width: `${Math.min(100, Math.round(((experimentEvaluation?.attempts || 0) / activeExperiment.targetAttempts) * 100))}%` }}
                />
              </div>
            )}
          </button>
        </section>
      )}

      {/* 7. NEXT BEST ACTION — shown only after a personal signal has started to emerge */}
      {!activeExperiment && !suggestedExperiment && !goalFocusDecision.suppressGenericNextBestAction && nextBestAction.evidence !== 'insufficient' && (
      <section aria-label={locale === 'de' ? 'Nächste sinnvolle Aktion' : 'Next best action'} className="pt-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#747779]">
            {locale === 'de' ? 'Nächster sinnvoller Schritt' : 'Next best action'}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#747779]">
            <span className={`h-1.5 w-1.5 rounded-full ${nextBestAction.evidence === 'established' ? 'bg-[#17372E]' : 'bg-[#B9BCBE]'}`} />
            {evidenceLabel}
          </span>
        </div>

        <div className="rounded-xl bg-[#E7E7E3]/60 p-4 space-y-2.5">
          <div className="space-y-1">
            <h3 className="font-ui text-[15px] font-semibold tracking-tight text-[#191B1C]">
              {nextBestAction.title}
            </h3>
            <p className="font-ui text-xs sm:text-[13px] text-[#191B1C] leading-relaxed font-normal">
              {nextBestAction.body}
            </p>
          </div>

          <button
            type="button"
            id="btn-view-next-action"
            onClick={() => setShowExperimentSheet(true)}
            className="btn-tactile inline-flex items-center gap-1 text-xs font-semibold text-[#191B1C] hover:text-[#17372E] transition"
          >
            <span>{locale === 'de' ? 'Warum genau das?' : 'Why this one?'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>
      </section>
      )}

      {/* MODAL SHEET: CONTROL SCORE INFO */}
      <ModalSheet
        isOpen={showControlInfo}
        onClose={() => setShowControlInfo(false)}
        title={t('controlScoreInfoTitle')}
        badge={t('behaviorMetricBadge')}
      >
        <div className="space-y-4 py-2">
          <div className="rounded-xl bg-[#E7E7E3] p-4 text-xs sm:text-[13px] font-medium text-[#191B1C] leading-relaxed">
            {ControlScoreEngine.getExplanation(locale)}
          </div>

          <div className="space-y-2 text-xs text-[#747779] leading-relaxed">
            <p>{t('controlScoreModalText1')}</p>
            <p>{t('controlScoreModalText2')}</p>
          </div>

          <p className="text-[11px] text-[#747779] border-t border-[#D9D9D4] pt-3">
            {t('controlScoreDisclaimer')}
          </p>

          <button
            type="button"
            onClick={() => setShowControlInfo(false)}
            className="w-full rounded-xl bg-[#191B1C] py-3 text-xs font-semibold text-[#F2F1ED] hover:bg-[#232627] transition"
          >
            {t('understood')}
          </button>
        </div>
      </ModalSheet>

      {/* FLOW A: FULL CRAVING MODE */}
      <CravingMode
        isOpen={showCravingMode}
        onClose={(_updatedControlScore, savedSmokingEvent) => {
          setShowCravingMode(false);
          reloadState();
          routeSavedSmokingEvent(savedSmokingEvent);
        }}
      />

      {/* FLOW B: QUICK SMOKING LOG MODAL */}
      <QuickSmokingLogModal
        isOpen={showQuickSmokedModal}
        onClose={(savedEvent) => {
          setShowQuickSmokedModal(false);
          reloadState();
          routeSavedSmokingEvent(savedEvent);
        }}
      />

      <LapseRecoveryModal
        isOpen={Boolean(recoverySmokingEvent)}
        smokingEvent={recoverySmokingEvent}
        onClose={() => {
          setRecoverySmokingEvent(null);
          reloadState();
        }}
      />

      {/* MODAL SHEET: PERSONAL HYPOTHESIS */}
      <ModalSheet
        isOpen={showHypothesisSheet}
        onClose={() => setShowHypothesisSheet(false)}
        title={locale === 'de' ? 'Persönlicher Lab-Test' : 'Personal Lab test'}
        badge={activeExperiment ? (locale === 'de' ? 'Aktiv' : 'Active') : (locale === 'de' ? 'Arbeitshypothese' : 'Working hypothesis')}
      >
        {experimentToShow && (
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-[#191B1C] p-4 text-[#F2F1ED] space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#B9BCBE]">
                {locale === 'de' ? 'Was wir testen' : 'What we are testing'}
              </span>
              <p className="font-ui text-sm font-medium leading-relaxed">
                {locale === 'de' ? experimentToShow.hypothesisDe : experimentToShow.hypothesisEn}
              </p>
            </div>

            {!activeExperiment && sequencingDecision && (
              <div className="rounded-xl bg-[#E7E7E3]/70 p-4 space-y-2">
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#747779]">
                  {locale === 'de' ? 'Warum jetzt diese Frage?' : 'Why this question now?'}
                </span>
                <p className="font-ui text-xs text-[#191B1C] leading-relaxed">
                  {locale === 'de' ? sequencingDecision.whyNowDe : sequencingDecision.whyNowEn}
                </p>
                <p className="font-ui text-[11px] text-[#747779] leading-relaxed">
                  {locale === 'de' ? sequencingDecision.expectedLearningDe : sequencingDecision.expectedLearningEn}
                </p>
              </div>
            )}

            <p className="font-ui text-xs text-[#747779] leading-relaxed">
              {locale === 'de' ? experimentToShow.rationaleDe : experimentToShow.rationaleEn}
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-[#E7E7E3]/70 p-3.5 space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#747779]">
                  {locale === 'de' ? 'Bleibt gleich' : 'Keep constant'}
                </span>
                <p className="font-ui text-xs font-medium text-[#191B1C] leading-snug">
                  {locale === 'de' ? experimentToShow.keepConstantDe : experimentToShow.keepConstantEn}
                </p>
              </div>
              <div className="rounded-xl bg-[#E7E7E3]/70 p-3.5 space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#747779]">
                  {locale === 'de' ? 'Verändern wir' : 'We change'}
                </span>
                <p className="font-ui text-xs font-medium text-[#191B1C] leading-snug">
                  {locale === 'de' ? experimentToShow.changeDe : experimentToShow.changeEn}
                </p>
              </div>
            </div>

            {activeExperiment && experimentEvaluation && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#747779]">
                  <span>{locale === 'de' ? 'Vergleichbare Versuche' : 'Comparable attempts'}</span>
                  <span>{experimentEvaluation.attempts}/{activeExperiment.targetAttempts}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#E1E1DC] overflow-hidden">
                  <div className="h-full rounded-full bg-[#17372E]" style={{ width: `${Math.min(100, (experimentEvaluation.attempts / activeExperiment.targetAttempts) * 100)}%` }} />
                </div>
                {experimentEvaluation.attempts > 0 && (
                  <p className="font-ui text-xs text-[#747779] leading-relaxed">
                    {locale === 'de' ? experimentEvaluation.summaryDe : experimentEvaluation.summaryEn}
                  </p>
                )}
              </div>
            )}

            <p className="font-ui text-[11px] text-[#747779] leading-relaxed border-t border-[#D9D9D4] pt-3">
              {locale === 'de'
                ? `Das ist ein persönlicher Verhaltenstest. ${experimentToShow.targetAttempts} vergleichbare Situationen können ein nützliches Arbeitssignal liefern, aber keine Ursache beweisen und keine medizinische Wirksamkeit feststellen.`
                : `This is a personal behavioral test. ${experimentToShow.targetAttempts} comparable situations can provide a useful working signal, but they cannot prove causality or establish medical effectiveness.`}
            </p>

            {!activeExperiment ? (
              <button
                type="button"
                onClick={activateSuggestedExperiment}
                className="w-full rounded-xl bg-[#191B1C] py-3.5 text-xs font-semibold text-[#F2F1ED] hover:bg-[#232627] transition"
              >
                {locale === 'de' ? 'Diesen Test starten' : 'Start this test'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowHypothesisSheet(false)}
                className="w-full rounded-xl bg-[#191B1C] py-3.5 text-xs font-semibold text-[#F2F1ED] hover:bg-[#232627] transition"
              >
                {locale === 'de' ? 'Beim passenden Drang weitertesten' : 'Continue at the next matching urge'}
              </button>
            )}
          </div>
        )}
      </ModalSheet>

      {/* MODAL SHEET: WHY THIS NEXT ACTION */}
      <ModalSheet
        isOpen={showExperimentSheet}
        onClose={() => setShowExperimentSheet(false)}
        title={nextBestAction.title}
        badge={locale === 'de' ? 'Persönlicher Test' : 'Personal test'}
      >
        <div className="space-y-4 py-2">
          <div className="rounded-xl bg-[#E7E7E3] p-4 text-xs sm:text-[13px] font-medium text-[#191B1C] leading-relaxed">
            {nextBestAction.body}
          </div>

          <div className="space-y-1.5">
            <span className="font-ui text-xs font-semibold text-[#191B1C] block">
              {locale === 'de' ? 'Warum jetzt?' : 'Why now?'}
            </span>
            <p className="font-ui text-xs text-[#747779] leading-relaxed">
              {nextBestAction.why}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#D9D9D4] px-3 py-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#747779]">
              {locale === 'de' ? 'Evidenz im Lab' : 'Lab evidence'}
            </span>
            <span className="text-[11px] font-medium text-[#191B1C]">{evidenceLabel}</span>
          </div>

          <p className="text-[11px] text-[#747779] leading-relaxed">
            {locale === 'de'
              ? 'Diese Empfehlung entsteht aus deinen lokal gespeicherten Einträgen und einfachen Verhaltensregeln. Sie ist keine medizinische Vorhersage.'
              : 'This recommendation is generated from your on-device logs and simple behavioral rules. It is not a medical prediction.'}
          </p>

          <button
            type="button"
            onClick={() => setShowExperimentSheet(false)}
            className="w-full rounded-xl bg-[#191B1C] py-3 text-xs font-semibold text-[#F2F1ED] hover:bg-[#232627] transition"
          >
            {nextBestAction.cta}
          </button>
        </div>
      </ModalSheet>
    </div>
  );
};
