import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Check, LockKeyhole, RotateCcw, Sparkles } from 'lucide-react';
import { TabId, UserProfile } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatSituation, formatPlace, formatElapsedHuman } from '../../i18n/translations';
import { PWAInstallBanner } from '../common/PWAInstallBanner';
import { ModalSheet } from '../common/ModalSheet';
import { EmptyState } from '../common/EmptyState';
import {
  SmokingEventRepository,
  CravingEventRepository,
  JourneyRepository,
  ProfileRepository,
  ExperimentRepository,
  QuitSupportRepository,
} from '../../storage/repositories';
import { PatternEngine } from '../../services/behavior/PatternEngine';
import { NextBestActionEngine } from '../../services/behavior/NextBestActionEngine';
import { ControlScoreEngine } from '../../services/behavior/ControlScoreEngine';
import { JourneyEngine } from '../../services/behavior/JourneyEngine';
import { HypothesisEngine } from '../../services/behavior/HypothesisEngine';
import { ExperimentSequencingEngine } from '../../services/behavior/ExperimentSequencingEngine';
import { PersonalControlModelEngine } from '../../services/behavior/PersonalControlModelEngine';
import { GoalSupportEngine } from '../../services/behavior/GoalSupportEngine';
import { GoalTransitionEngine } from '../../services/behavior/GoalTransitionEngine';
import { WeeklyReviewEngine } from '../../services/behavior/WeeklyReviewEngine';
import { MaintenanceEngine } from '../../services/behavior/MaintenanceEngine';
import { ControlPlanEngine } from '../../services/behavior/ControlPlanEngine';
import { ExperimentLibraryEngine } from '../../services/behavior/ExperimentLibraryEngine';
import { JourneyMissionSheet } from '../journey/JourneyMissionSheet';
import { QuitSupportCard } from '../quit/QuitSupportCard';
import { DataPortabilityPanel } from '../settings/DataPortabilityPanel';

interface TabViewsProps {
  currentTab: TabId;
  userProfile: UserProfile;
  onResetData: () => void;
  onProfileChanged?: (profile: UserProfile) => void;
  onNavigate?: (tab: TabId) => void;
}

export const TabViews: React.FC<TabViewsProps> = ({
  currentTab,
  userProfile,
  onResetData,
  onProfileChanged,
  onNavigate,
}) => {
  const { t, locale, setLocale } = useLanguage();
  const [confirmReset, setConfirmReset] = useState(false);
  const [journeyProgress, setJourneyProgress] = useState(() => JourneyRepository.get());
  const [journeySheetOpen, setJourneySheetOpen] = useState(false);
  const [selectedJourneyDay, setSelectedJourneyDay] = useState<number | null>(null);
  const [experimentLibraryOpen, setExperimentLibraryOpen] = useState(false);
  const [goalTransitionNotice, setGoalTransitionNotice] = useState<string | null>(null);

  // Load real data from repositories
  const smokingEvents = SmokingEventRepository.getAll();
  const cravingEvents = CravingEventRepository.getAll();
  const hasBehaviorData = smokingEvents.length + cravingEvents.length > 0;
  const todaySmokes = SmokingEventRepository.getToday();
  const personalExperiments = ExperimentRepository.getAll();
  const activeExperiment = personalExperiments.find((experiment) => experiment.status === 'active') || null;
  const latestCompletedExperiment = personalExperiments.find((experiment) => experiment.status === 'completed') || null;
  const activeExperimentEvaluation = activeExperiment ? HypothesisEngine.evaluate(activeExperiment, cravingEvents) : null;
  const experimentComparison = HypothesisEngine.compareCompleted(personalExperiments);
  const nextExperimentDecision = activeExperiment
    ? null
    : ExperimentSequencingEngine.next(userProfile, smokingEvents, cravingEvents, personalExperiments);
  const controlModel = PersonalControlModelEngine.build(
    userProfile,
    smokingEvents,
    cravingEvents,
    personalExperiments
  );
  const quitSupportPlan = QuitSupportRepository.get();
  const weeklyReview = WeeklyReviewEngine.build(userProfile, smokingEvents, cravingEvents);
  const maintenancePlan = MaintenanceEngine.build(userProfile, journeyProgress, smokingEvents, cravingEvents, personalExperiments);
  const controlPlanV2 = ControlPlanEngine.build(userProfile, journeyProgress, smokingEvents, cravingEvents, personalExperiments, quitSupportPlan);
  const experimentLibrary = ExperimentLibraryEngine.recommended(userProfile, controlModel.strongestTrigger);

  const patternAnalysis = PatternEngine.analyze(smokingEvents, cravingEvents);
  const realControlScore = ControlScoreEngine.calculateScore(cravingEvents, smokingEvents);
  const baselineComparison = GoalSupportEngine.baselineComparison(userProfile, smokingEvents);
  const reductionOpportunity = userProfile.goal === 'reduce'
    ? GoalSupportEngine.reductionOpportunity(smokingEvents)
    : null;
  const quitPreparation = userProfile.goal === 'quit'
    ? GoalSupportEngine.quitPreparation(controlModel, journeyProgress, cravingEvents)
    : null;
  const liveInsight = PatternEngine.getLiveInsight(smokingEvents, cravingEvents, locale);
  const nextBestAction = NextBestActionEngine.generate(userProfile, smokingEvents, cravingEvents, locale);

  useEffect(() => {
    let stored = JourneyRepository.get();
    if (!stored.currentDayStartedAt) {
      const currentPhase = JourneyEngine.phaseForDay(stored.dayInLab || 1, 'en');
      stored = JourneyRepository.update({
        currentDayStartedAt: userProfile.onboardingCompletedAt || userProfile.createdAt,
        phase: currentPhase.id,
        phaseName: JourneyEngine.phaseNameForStorage(stored.dayInLab || 1),
      });
    }
    setJourneyProgress(stored);
  }, [userProfile.id, userProfile.createdAt, userProfile.onboardingCompletedAt]);

  const journeyState = JourneyEngine.getState(
    userProfile,
    journeyProgress,
    smokingEvents,
    cravingEvents,
    locale
  );

  const transitionNoticeFor = (reasonCodes: string[]): string => {
    if (reasonCodes.includes('stale_quit_date_requires_reconfirmation')) {
      return locale === 'de'
        ? 'Dein früheres Aufhördatum liegt in der Vergangenheit und wurde nicht automatisch reaktiviert. Deine Schutzpläne und bisherigen Daten bleiben erhalten.'
        : 'Your previous quit date is in the past and was not reactivated automatically. Your protection plans and existing data are preserved.';
    }
    if (reasonCodes.includes('quit_support_suspended')) {
      return locale === 'de'
        ? 'Der Aufhörmodus ist pausiert. Schutzpläne und bisheriges Lernen bleiben gespeichert.'
        : 'Quit mode is paused. Protection plans and previous learning remain saved.';
    }
    return locale === 'de'
      ? 'Fokus geändert – Journey, Logs, Tests und bisheriges Lernen bleiben erhalten.'
      : 'Focus changed — Journey, logs, tests and previous learning are preserved.';
  };

  const handleJourneyComplete = (response?: string | number | string[], goal?: UserProfile['goal']) => {
    const currentDay = journeyState.day;
    let effectiveProfile = userProfile;

    if (goal && goal !== userProfile.goal) {
      const transition = GoalTransitionEngine.transition(
        userProfile.goal,
        goal,
        QuitSupportRepository.get(),
      );
      QuitSupportRepository.save(transition.quitSupport);
      const updatedProfile = ProfileRepository.update({ goal: transition.nextGoal });
      if (updatedProfile) {
        effectiveProfile = updatedProfile;
        onProfileChanged?.(updatedProfile);
      }
      setGoalTransitionNotice(transitionNoticeFor(transition.reasonCodes));
    }

    const currentStored = JourneyRepository.get();
    const freshState = JourneyEngine.getState(
      effectiveProfile,
      currentStored,
      SmokingEventRepository.getAll(),
      CravingEventRepository.getAll(),
      locale
    );

    // Keep both the chronological day response and a semantic key (e.g. control_plan)
    // so later phases can reuse what the user actually chose without parsing UI text.
    if (response !== undefined && freshState.mission.responseKey) {
      JourneyRepository.setResponse(freshState.mission.responseKey, response);
    }

    let updated = JourneyRepository.completeDay(
      currentDay,
      freshState.phase.id,
      JourneyEngine.nextPhaseId(currentDay),
      response,
      freshState.mission.evidenceIds
    );
    updated = JourneyRepository.update({
      phaseName: JourneyEngine.phaseNameForStorage(updated.dayInLab),
    });
    setJourneyProgress(updated);
    setSelectedJourneyDay(updated.dayInLab);
    setJourneySheetOpen(false);
  };

  const handleGoalChange = (goal: UserProfile['goal']) => {
    if (goal === userProfile.goal) return;
    const transition = GoalTransitionEngine.transition(
      userProfile.goal,
      goal,
      QuitSupportRepository.get(),
    );
    QuitSupportRepository.save(transition.quitSupport);
    const updated = ProfileRepository.update({ goal: transition.nextGoal });
    setGoalTransitionNotice(transitionNoticeFor(transition.reasonCodes));
    if (updated) onProfileChanged?.(updated);
  };

  const handleLanguageChange = (nextLocale: 'de' | 'en') => {
    if (nextLocale === locale) return;
    setLocale(nextLocale);
    const updated = ProfileRepository.update({ preferredLanguage: nextLocale });
    if (updated) onProfileChanged?.(updated);
  };

  const evidenceLabel = (strength: 'insufficient' | 'emerging' | 'established') =>
    strength === 'established'
      ? t('evidenceEstablished')
      : strength === 'emerging'
      ? t('evidenceEmerging')
      : t('evidenceInsufficient');

  const interventionTitle = (id: string): string => {
    const de = locale === 'de';
    const titles: Record<string, [string, string]> = {
      THREE_MINUTE_DELAY: ['Drei Minuten Abstand', 'Three-minute gap'],
      CHANGE_LOCATION: ['Ort wechseln', 'Change location'],
      COFFEE_SEPARATION: ['Kaffee und Zigarette trennen', 'Separate coffee and cigarette'],
      AFTER_MEAL_RESET: ['Abschluss unterbrechen', 'Interrupt the ending'],
      HANDS_BUSY: ['Hände beschäftigen', 'Keep hands busy'],
      CONSCIOUS_CHOICE: ['Bewusst neu entscheiden', 'Decide consciously again'],
      MORNING_DELAY: ['Erste Zigarette verschieben', 'Delay the first cigarette'],
      BREAK_ROUTINE: ['Pausenroutine verändern', 'Change the break routine'],
    };
    const pair = titles[id];
    return pair ? (de ? pair[0] : pair[1]) : id;
  };

  const bestIntervention = Object.entries(patternAnalysis.interventionsByTrigger)
    .flatMap(([trigger, stats]) => stats.map((stat) => ({ trigger, ...stat })))
    .filter((stat) => stat.totalAttempts >= PatternEngine.MIN_USES_FOR_INTERVENTION_EFFECTIVENESS)
    .sort((a, b) => b.successRate - a.successRate || b.totalAttempts - a.totalAttempts)[0] || null;

  // Average intervention pause based only on real recorded elapsed time.
  const cravingsWithElapsed = cravingEvents.filter((c) => typeof c.elapsedSeconds === 'number' && c.elapsedSeconds > 0);
  const avgDelaySecs =
    cravingsWithElapsed.length > 0
      ? Math.round(
          cravingsWithElapsed.reduce((acc, c) => acc + (c.elapsedSeconds || 0), 0) /
            cravingsWithElapsed.length
        )
      : null;
  const avgDelayLabel = avgDelaySecs ? formatElapsedHuman(avgDelaySecs, locale) : '—';

  const localDateKey = (timestamp: string): string => {
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return timestamp.slice(0, 10);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Build a real historical Control Score series. Never draw future values.
  const recordedDays = Array.from(
    new Set([
      ...smokingEvents.map((event) => localDateKey(event.timestamp)),
      ...cravingEvents.map((event) => localDateKey(event.timestamp)),
    ])
  ).filter(Boolean).sort();

  const controlTrend = recordedDays.map((dateKey) => {
    const cravingsThroughDay = cravingEvents.filter((event) => localDateKey(event.timestamp) <= dateKey);
    const smokesThroughDay = smokingEvents.filter((event) => localDateKey(event.timestamp) <= dateKey);
    return {
      dateKey,
      score: ControlScoreEngine.calculateScore(cravingsThroughDay, smokesThroughDay),
    };
  });

  const journeyDayForDate = (dateKey: string): number => {
    const start = new Date(userProfile.createdAt);
    const current = new Date(`${dateKey}T12:00:00`);
    const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const currentMidnight = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
    return Math.max(1, Math.floor((currentMidnight - startMidnight) / 86400000) + 1);
  };

  const trendScores = controlTrend.map((point) => point.score);
  const trendMin = trendScores.length ? Math.min(50, ...trendScores) - 1 : 49;
  const trendMax = trendScores.length ? Math.max(50, ...trendScores) + 1 : 51;
  const trendRange = Math.max(1, trendMax - trendMin);
  const trendPolyline = controlTrend
    .map((point, index) => {
      const x = controlTrend.length <= 1 ? 0 : (index / (controlTrend.length - 1)) * 280;
      const y = 54 - ((point.score - trendMin) / trendRange) * 44;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // ==========================================
  // LAB TAB — Adaptive 30-Day Journey
  // ==========================================
  if (currentTab === 'LAB') {
    const currentMission = JourneyEngine.getMissionForDay(
      journeyState.day,
      userProfile,
      journeyProgress,
      smokingEvents,
      cravingEvents,
      locale
    );
    const selectedDay = selectedJourneyDay || journeyState.day;
    const selectedMission = JourneyEngine.getMissionForDay(
      selectedDay,
      userProfile,
      journeyProgress,
      smokingEvents,
      cravingEvents,
      locale
    );
    const selectedResponse = journeyProgress.missionResponses?.[`day_${selectedDay}`];
    const de = locale === 'de';

    const openDay = (day: number) => {
      const accessible = day === journeyState.day || journeyState.completedDays.includes(day);
      if (!accessible) return;
      setSelectedJourneyDay(day);
      setJourneySheetOpen(true);
    };

    return (
      <>
        <div className="w-full max-w-md mx-auto px-6 pt-3 pb-24 text-[#191B1C] space-y-7">
          <header className="flex items-center justify-between border-b border-[#D9D9D4] pb-3 pt-1 select-none">
            <span className="text-[11px] font-semibold tracking-[0.24em] uppercase text-[#191B1C]">
              {t('brandName')}
            </span>
            <span className="text-[11px] text-[#747779] font-normal tracking-wide tabular-nums">
              {journeyState.journeyCompleted
                ? (de ? '30 / 30 · Maintenance' : '30 / 30 · Maintenance')
                : (de ? `Tag ${String(journeyState.day).padStart(2, '0')} / 30` : `Day ${String(journeyState.day).padStart(2, '0')} / 30`)}
            </span>
          </header>

          <div className="space-y-1.5 pt-1">
            <h1 className="font-display text-4xl sm:text-[44px] font-normal tracking-[-0.03em] text-[#191B1C] leading-[1.05]">
              {de ? 'Dein 30-Tage-Labor' : 'Your 30-day Lab'}
            </h1>
            <p className="font-ui text-[13px] text-[#747779] leading-relaxed">
              {de
                ? 'Kein Streak. Kein Zurücksetzen. Jeder Lab-Tag wartet, bis du bereit bist.'
                : 'No streak. No reset. Each Lab day waits until you are ready.'}
            </p>
          </div>

          {goalTransitionNotice && (
            <p role="status" aria-live="polite" className="rounded-xl bg-[#E7E7E3] px-3.5 py-3 font-ui text-[11px] text-[#4E5253] leading-relaxed">
              {goalTransitionNotice}
            </p>
          )}

          <section className="rounded-2xl bg-[#191B1C] text-[#F2F1ED] p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#B9BCBE]">
                {`Phase ${String(journeyState.phase.number).padStart(2, '0')}`}
              </span>
              <span className="font-mono text-[10px] text-[#B9BCBE] tabular-nums">
                {journeyState.completedCount}/30
              </span>
            </div>
            <div>
              <h2 className="font-ui text-lg font-semibold tracking-tight">{journeyState.phase.title}</h2>
              <p className="font-ui text-xs text-[#B9BCBE] mt-1 leading-relaxed">{journeyState.phase.description}</p>
            </div>
            <div className="h-1 rounded-full bg-[#2D3031] overflow-hidden">
              <div className="h-full rounded-full bg-[#B9BCBE] transition-all duration-500" style={{ width: `${journeyState.percentComplete}%` }} />
            </div>
          </section>

          {journeyState.journeyCompleted ? (
            <section className="rounded-2xl border border-[#D9D9D4] bg-[#F8F7F3] p-5 space-y-2" aria-label={de ? '30-Tage-Labor abgeschlossen' : '30-day Lab completed'}>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#17372E] stroke-[2]" />
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#747779]">30 / 30</span>
              </div>
              <h3 className="font-ui text-[17px] font-semibold tracking-tight text-[#191B1C]">
                {de ? 'Dein 30-Tage-Labor ist abgeschlossen.' : 'Your 30-day Lab is complete.'}
              </h3>
              <p className="font-ui text-xs sm:text-[13px] text-[#747779] leading-relaxed">
                {de
                  ? 'Nichts startet neu. Deine bisherigen Daten, Tests und Schutzpläne bleiben die Basis für den wöchentlichen Maintenance-Modus.'
                  : 'Nothing restarts. Your existing data, tests and protection plans remain the basis for weekly maintenance.'}
              </p>
            </section>
          ) : (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-ui text-xs font-medium text-[#747779]">
                  {de ? 'Heute im Lab' : 'Today in the Lab'}
                </span>
                <span className="font-mono text-[10px] text-[#747779]">
                  {de ? `TAG ${String(journeyState.day).padStart(2, '0')}` : `DAY ${String(journeyState.day).padStart(2, '0')}`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedJourneyDay(journeyState.day);
                  setJourneySheetOpen(true);
                }}
                className="w-full text-left rounded-2xl border border-[#D9D9D4] bg-[#F8F7F3] p-5 space-y-4 shadow-[0_8px_28px_rgba(25,27,28,0.04)]"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-ui text-[17px] font-semibold tracking-tight text-[#191B1C]">
                      {currentMission.title}
                    </h3>
                    {currentMission.personalized && (
                      <span className="rounded-full bg-[#E7E7E3] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#747779]">
                        {de ? 'für dich angepasst' : 'adapted for you'}
                      </span>
                    )}
                  </div>
                  <p className="font-ui text-xs sm:text-[13px] text-[#747779] leading-relaxed">
                    {currentMission.objective}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${currentMission.completionReady ? 'bg-[#17372E]' : 'bg-[#B9BCBE]'}`} />
                    <span className="font-ui text-[11px] text-[#747779] truncate">
                      {currentMission.completionReady
                        ? (de ? 'Bereit zum Abschließen' : 'Ready to complete')
                        : currentMission.completionHint}
                    </span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#191B1C] shrink-0" />
                </div>
              </button>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-ui text-xs font-medium text-[#747779]">{de ? '30 Lab-Tage' : '30 Lab days'}</span>
              <span className="font-ui text-[11px] text-[#747779]">{journeyState.percentComplete}%</span>
            </div>
            <div className="grid grid-cols-6 gap-2" aria-label={de ? '30-Tage-Labor' : '30-day Lab'}>
              {Array.from({ length: 30 }, (_, index) => index + 1).map((day) => {
                const completed = journeyState.completedDays.includes(day);
                const current = day === journeyState.day;
                const future = day > journeyState.day && !completed;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => openDay(day)}
                    disabled={future}
                    aria-label={de ? `Tag ${day}` : `Day ${day}`}
                    className={`aspect-square rounded-xl border flex items-center justify-center relative transition ${
                      completed
                        ? 'bg-[#191B1C] border-[#191B1C] text-[#F2F1ED]'
                        : current
                          ? 'bg-[#F8F7F3] border-[#191B1C] text-[#191B1C] shadow-[inset_0_0_0_1px_#191B1C]'
                          : 'bg-transparent border-[#D9D9D4] text-[#A4A6A5]'
                    }`}
                  >
                    {completed ? <Check className="w-3.5 h-3.5 stroke-[2]" /> : <span className="font-mono text-[11px] tabular-nums">{String(day).padStart(2, '0')}</span>}
                    {current && <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[#17372E]" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4 pt-1">
            <span className="font-ui text-xs font-medium text-[#747779] block">{de ? 'Programmstruktur' : 'Program structure'}</span>
            {journeyState.phases.map((phase) => {
              const active = phase.id === journeyState.phase.id;
              const phaseDone = journeyState.completedDays.filter((day) => day >= phase.startDay && day <= phase.endDay).length;
              const phaseTotal = phase.endDay - phase.startDay + 1;
              return (
                <div key={phase.id} className={`border-l-2 pl-4 py-0.5 space-y-1 ${active ? 'border-[#17372E]' : 'border-[#D9D9D4]'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-ui text-xs font-semibold text-[#191B1C]">
                      {`Phase ${phase.number} · ${phase.title}`}
                    </div>
                    <span className="font-mono text-[10px] text-[#747779]">{phaseDone}/{phaseTotal}</span>
                  </div>
                  <p className="font-ui text-[11.5px] text-[#747779] leading-relaxed">{phase.shortTitle}</p>
                </div>
              );
            })}
          </section>

          <section className="space-y-3 pt-1" aria-label={locale === 'de' ? 'Experiment-Bibliothek' : 'Experiment library'}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-ui text-xs font-medium text-[#747779] block">{de ? 'Experiment-Bibliothek' : 'Experiment library'}</span>
                <p className="font-ui text-[11px] text-[#747779] mt-0.5">
                  {de ? 'Acht kurze Tests. Smoke Lab sortiert passende zuerst.' : 'Eight short tests. Smoke Lab puts the most relevant first.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExperimentLibraryOpen(true)}
                className="rounded-lg border border-[#D9D9D4] bg-[#F8F7F3] px-3 py-2 text-[11px] font-semibold text-[#191B1C] hover:bg-[#E7E7E3] transition"
              >
                {de ? 'Öffnen' : 'Open'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {experimentLibrary.slice(0, 2).map((item) => (
                <div key={item.id} className="rounded-xl bg-[#E7E7E3]/60 p-3">
                  <div className="font-ui text-[11.5px] font-semibold text-[#191B1C]">{de ? item.titleDe : item.titleEn}</div>
                  <div className="font-ui text-[10.5px] text-[#747779] mt-1 leading-relaxed">{de ? item.descriptionDe : item.descriptionEn}</div>
                </div>
              ))}
            </div>
          </section>

          {maintenancePlan.active && (
            <section className="rounded-2xl bg-[#191B1C] text-[#F2F1ED] p-5 space-y-3" aria-label={locale === 'de' ? 'Maintenance' : 'Maintenance'}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-[#B9BCBE]">{de ? 'Nach Tag 30' : 'After Day 30'}</span>
                <span className="font-mono text-[10px] text-[#B9BCBE]">{de ? `Woche ${maintenancePlan.weekNumber}` : `Week ${maintenancePlan.weekNumber}`}</span>
              </div>
              <div>
                <h3 className="font-ui text-[16px] font-semibold">{de ? maintenancePlan.titleDe : maintenancePlan.titleEn}</h3>
                <p className="font-ui text-xs text-[#B9BCBE] mt-1 leading-relaxed">{de ? maintenancePlan.focusDe : maintenancePlan.focusEn}</p>
              </div>
              <div className="space-y-2 pt-1">
                {(de ? maintenancePlan.actionsDe : maintenancePlan.actionsEn).map((action, index) => (
                  <div key={index} className="flex items-start gap-2 text-[11px] text-[#D5D5D0]">
                    <span className="font-mono text-[#8E9491]">0{index + 1}</span>
                    <span className="leading-relaxed">{action}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-xl bg-[#E7E7E3] px-4 py-3.5 flex items-start gap-3">
            <LockKeyhole className="w-4 h-4 text-[#747779] mt-0.5 shrink-0 stroke-[1.5]" />
            <p className="font-ui text-[11.5px] text-[#747779] leading-relaxed">
              {de
                ? 'Ein Lab-Tag zählt durch Beobachten, Testen oder Planen – nicht durch Abstinenz. Eine Pause setzt nichts zurück.'
                : 'A Lab day counts through observing, testing, or planning — not through abstinence. Taking a break resets nothing.'}
            </p>
          </section>
        </div>

        <JourneyMissionSheet
          isOpen={journeySheetOpen}
          mission={selectedMission}
          locale={locale}
          existingResponse={selectedResponse}
          onClose={() => setJourneySheetOpen(false)}
          onComplete={handleJourneyComplete}
          onPractice={() => {
            setJourneySheetOpen(false);
            onNavigate?.('TODAY');
          }}
        />

        <ModalSheet
          isOpen={experimentLibraryOpen}
          onClose={() => setExperimentLibraryOpen(false)}
          title={de ? 'Experiment-Bibliothek' : 'Experiment library'}
          badge={de ? 'LAB TESTS' : 'LAB TESTS'}
        >
          <div className="space-y-4">
            <p className="font-ui text-xs text-[#747779] leading-relaxed">
              {de
                ? 'Wähle bewusst einen Test. Smoke Lab misst nur deine eigenen Situationen und macht daraus keine Wirksamkeitsbehauptung.'
                : 'Deliberately choose one test. Smoke Lab measures only your own situations and makes no efficacy claim.'}
            </p>
            {activeExperiment && (
              <div className="rounded-xl bg-[#E7E7E3] p-3 text-[11px] text-[#747779] leading-relaxed">
                {de
                  ? 'Gerade läuft bereits ein persönlicher Test. Beende oder pausiere ihn, bevor du einen neuen Bibliotheks-Test startest.'
                  : 'A personal test is already active. Finish or pause it before starting a new library test.'}
              </div>
            )}
            <div className="space-y-2">
              {experimentLibrary.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-[#D9D9D4] bg-[#F8F7F3] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {index < 2 && <span className="h-1.5 w-1.5 rounded-full bg-[#17372E] shrink-0" />}
                        <h4 className="font-ui text-[13px] font-semibold text-[#191B1C]">{de ? item.titleDe : item.titleEn}</h4>
                      </div>
                      <p className="font-ui text-[11px] text-[#747779] leading-relaxed mt-1">{de ? item.descriptionDe : item.descriptionEn}</p>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(activeExperiment)}
                      onClick={() => {
                        const draft = ExperimentLibraryEngine.createPersonal(item, userProfile, controlModel.strongestTrigger);
                        ExperimentRepository.activate(draft);
                        setExperimentLibraryOpen(false);
                      }}
                      className="shrink-0 rounded-lg bg-[#191B1C] px-3 py-2 text-[10.5px] font-semibold text-[#F2F1ED] disabled:opacity-35 disabled:cursor-not-allowed"
                    >
                      {de ? 'Testen' : 'Test'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ModalSheet>
      </>
    );
  }
  // ==========================================
  // PATTERNS TAB — High-end trigger intelligence (Real Data)
  // ==========================================
  if (currentTab === 'PATTERNS') {
    const totalObs = patternAnalysis.totalObservations;
    const hasEnoughPatterns = patternAnalysis.hasEnoughDataForPatterns;

    // Hourly distribution bars for 24h cycle (sample 12 two-hour windows)
    const twoHourBins = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map((h) => {
      const c1 = patternAnalysis.hourlyDistribution[h]?.count || 0;
      const c2 = patternAnalysis.hourlyDistribution[h + 1]?.count || 0;
      return c1 + c2;
    });
    const maxBinCount = Math.max(1, ...twoHourBins);

    return (
      <div className="w-full max-w-md mx-auto px-6 pt-3 pb-24 text-[#191B1C] space-y-7">
        <header className="flex items-center justify-between border-b border-[#D9D9D4] pb-3 pt-1 select-none">
          <span className="text-[11px] font-semibold tracking-[0.24em] uppercase text-[#191B1C]">
            {t('brandName')}
          </span>
          <span className="text-[11px] text-[#747779] font-normal tracking-wide">
            {t('patternsTabBadge')}
          </span>
        </header>

        <div className="space-y-1.5 pt-1">
          <h1 className="font-display text-4xl sm:text-[44px] font-normal tracking-[-0.03em] text-[#191B1C] leading-[1.05]">
            {t('patternsTabTitle')}
          </h1>
          <p className="font-ui text-[13px] text-[#747779] font-normal leading-relaxed">
            {t('patternsTabSubtitle')}
          </p>
        </div>

        {!hasBehaviorData && (
          <EmptyState
            title={t('emptyPatternsTitle')}
            body={t('emptyPatternsBody')}
            actionLabel={t('emptyStateAction')}
            onAction={() => onNavigate?.('TODAY')}
          />
        )}

        {/* What the Lab can responsibly say right now */}
        <section aria-label={locale === 'de' ? 'Aktuelle Muster-Intelligenz' : 'Current pattern intelligence'} className="rounded-xl bg-[#191B1C] text-[#F2F1ED] p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#B9BCBE]">
              {locale === 'de' ? 'Was wir gerade lernen' : 'What we are learning'}
            </span>
            <span className="text-[10px] font-mono text-[#B9BCBE]">
              {evidenceLabel(liveInsight.evidence)}
            </span>
          </div>
          <h2 className="font-ui text-[15px] font-semibold leading-snug">{liveInsight.title}</h2>
          <p className="font-ui text-xs text-[#B9BCBE] leading-relaxed">{liveInsight.text}</p>
        </section>

        {/* Personal Control Model — a cautious working map, not a diagnosis */}
        <section aria-label={locale === 'de' ? 'Persönliches Control Model' : 'Personal Control Model'} className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-3">
            <span className="font-ui text-xs font-medium text-[#747779]">
              {locale === 'de' ? 'Dein Control Model' : 'Your Control Model'}
            </span>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[#747779]">
              {controlModel.maturity === 'mapped'
                ? (locale === 'de' ? 'kartiert' : 'mapped')
                : controlModel.maturity === 'forming'
                  ? (locale === 'de' ? 'formt sich' : 'forming')
                  : (locale === 'de' ? 'lernt' : 'learning')}
            </span>
          </div>

          <div className="space-y-1.5">
            <h2 className="font-ui text-[15px] font-semibold tracking-tight text-[#191B1C]">
              {locale === 'de' ? controlModel.headlineDe : controlModel.headlineEn}
            </h2>
            <p className="font-ui text-xs text-[#747779] leading-relaxed">
              {locale === 'de' ? controlModel.summaryDe : controlModel.summaryEn}
            </p>
          </div>

          {controlModel.primaryLoop && (
            <div className="rounded-xl bg-[#E7E7E3]/70 p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-ui text-[11px] text-[#747779]">
                  {locale === 'de' ? 'Klarste aktuelle Schleife' : 'Clearest current loop'}
                </span>
                <span className="font-mono text-[10px] text-[#747779] tabular-nums">
                  {controlModel.primaryLoop.count}× · {controlModel.primaryLoop.uniqueDays} {locale === 'de' ? 'Tage' : 'days'}
                </span>
              </div>
              <div className="font-ui text-[13px] font-medium text-[#191B1C] leading-snug">
                {formatSituation(controlModel.primaryLoop.trigger, locale)}
                {controlModel.primaryLoop.place ? ` · ${formatPlace(controlModel.primaryLoop.place, locale)}` : ''}
                {controlModel.primaryLoop.timeWindow
                  ? ` · ${PatternEngine.getTimeWindowLabel(controlModel.primaryLoop.timeWindow, locale) || controlModel.primaryLoop.timeWindow}`
                  : ''}
              </div>
              {typeof controlModel.primaryLoop.averageCraving === 'number' && (
                <div className="font-ui text-[11px] text-[#747779]">
                  {locale === 'de' ? 'Ø Drang in diesen Situationen' : 'Avg urge in these situations'}: {controlModel.primaryLoop.averageCraving}/10
                </div>
              )}
            </div>
          )}

          {(controlModel.automaticRatio !== null || controlModel.cravingDynamics[0] || controlModel.strategies[0]) && (
            <div className="grid grid-cols-2 gap-x-5 gap-y-4 pt-1">
              {controlModel.automaticRatio !== null && (
                <div className="space-y-0.5">
                  <div className="text-2xl font-light tabular-nums text-[#191B1C]">{controlModel.automaticRatio}%</div>
                  <div className="font-ui text-[10.5px] text-[#747779]">{locale === 'de' ? 'automatisch geloggt' : 'logged as automatic'}</div>
                </div>
              )}
              {controlModel.cravingDynamics[0] && (
                <div className="space-y-0.5">
                  <div className="text-2xl font-light tabular-nums text-[#191B1C]">{controlModel.cravingDynamics[0].averageInitialIntensity}<span className="text-xs text-[#747779]">/10</span></div>
                  <div className="font-ui text-[10.5px] text-[#747779]">
                    {formatSituation(controlModel.cravingDynamics[0].trigger, locale)} · {locale === 'de' ? 'Ø Drang' : 'avg urge'}
                  </div>
                </div>
              )}
            </div>
          )}

          {controlModel.strategies[0] && controlModel.strategies[0].helpfulRate >= 50 && (
            <div className="border-l-2 border-[#17372E] pl-3 py-0.5">
              <div className="font-ui text-[11px] font-medium text-[#191B1C]">
                {locale === 'de' ? 'Bisher hilfreiches Arbeitssignal' : 'Helpful working signal so far'}
              </div>
              <p className="font-ui text-[11px] text-[#747779] leading-relaxed mt-0.5">
                {interventionTitle(controlModel.strategies[0].interventionId)} · {controlModel.strategies[0].helpfulCount}/{controlModel.strategies[0].attempts} {locale === 'de' ? 'Bewertungen mit schwächerem oder verschwundenem Drang.' : 'ratings with weaker or gone urge.'}
              </p>
            </div>
          )}
        </section>

        <section aria-label={locale === 'de' ? 'Control Plan' : 'Control Plan'} className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-3">
            <span className="font-ui text-xs font-medium text-[#747779]">{locale === 'de' ? controlPlanV2.titleDe : controlPlanV2.titleEn}</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#747779]">
              {controlPlanV2.maturity === 'ready' ? (locale === 'de' ? 'bereit' : 'ready') : controlPlanV2.maturity === 'forming' ? (locale === 'de' ? 'formt sich' : 'forming') : (locale === 'de' ? 'lernt' : 'learning')}
            </span>
          </div>
          <p className="font-ui text-[11.5px] text-[#747779] leading-relaxed">
            {locale === 'de' ? controlPlanV2.summaryDe : controlPlanV2.summaryEn}
          </p>
          <div className="space-y-2">
            {controlPlanV2.steps.map((step, index) => (
              <div key={step.id} className="flex gap-3 rounded-xl bg-[#E7E7E3]/55 p-3.5">
                <span className="font-mono text-[10px] text-[#747779] pt-0.5">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <div className="font-ui text-[12px] font-semibold text-[#191B1C]">{locale === 'de' ? step.titleDe : step.titleEn}</div>
                  <p className="font-ui text-[11px] text-[#747779] leading-relaxed mt-0.5">{locale === 'de' ? step.bodyDe : step.bodyEn}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {(activeExperiment || latestCompletedExperiment) && (
          <section aria-label={locale === 'de' ? 'Persönliches Experiment' : 'Personal experiment'} className="space-y-2.5">
            {activeExperiment ? (
              <div className="rounded-xl border border-[#D9D9D4] bg-[#F8F7F3] p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-ui text-xs font-semibold text-[#191B1C]">
                    {locale === 'de' ? 'Was du gerade testest' : 'What you are testing'}
                  </span>
                  <span className="font-mono text-[10px] text-[#747779] tabular-nums">
                    {activeExperimentEvaluation?.attempts || 0}/{activeExperiment.targetAttempts}
                  </span>
                </div>
                <p className="font-ui text-xs text-[#191B1C] leading-relaxed">
                  {locale === 'de' ? activeExperiment.hypothesisDe : activeExperiment.hypothesisEn}
                </p>
                <div className="h-1 rounded-full bg-[#E1E1DC] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#17372E]"
                    style={{ width: `${Math.min(100, ((activeExperimentEvaluation?.attempts || 0) / activeExperiment.targetAttempts) * 100)}%` }}
                  />
                </div>
                <p className="font-ui text-[11px] text-[#747779] leading-relaxed">
                  {locale === 'de' ? activeExperiment.testDe : activeExperiment.testEn}
                </p>
              </div>
            ) : latestCompletedExperiment ? (
              <div className="rounded-xl bg-[#E7E7E3]/60 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-ui text-xs font-semibold text-[#191B1C]">
                    {locale === 'de' ? 'Letzter persönlicher Test' : 'Latest personal test'}
                  </span>
                  <span className="font-mono text-[10px] text-[#17372E]">
                    {locale === 'de' ? '3 Situationen' : '3 situations'}
                  </span>
                </div>
                <p className="font-ui text-xs text-[#191B1C] leading-relaxed">
                  {locale === 'de' ? latestCompletedExperiment.hypothesisDe : latestCompletedExperiment.hypothesisEn}
                </p>
                <p className="font-ui text-[11px] text-[#747779] leading-relaxed border-t border-[#D9D9D4] pt-2">
                  {locale === 'de'
                    ? latestCompletedExperiment.resultSummaryDe
                    : latestCompletedExperiment.resultSummaryEn}
                </p>
              </div>
            ) : null}
          </section>
        )}

        {!activeExperiment && nextExperimentDecision && (
          <section aria-label={locale === 'de' ? 'Nächste offene Frage' : 'Next open question'} className="rounded-xl border border-[#D9D9D4] bg-[#F8F7F3] p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="font-ui text-xs font-semibold text-[#191B1C]">
                {locale === 'de' ? 'Nächste offene Frage' : 'Next open question'}
              </span>
              <span className="font-mono text-[10px] text-[#747779]">
                {nextExperimentDecision.experiment.targetAttempts}×
              </span>
            </div>
            <p className="font-ui text-xs text-[#191B1C] leading-relaxed">
              {locale === 'de' ? nextExperimentDecision.questionDe : nextExperimentDecision.questionEn}
            </p>
            <p className="font-ui text-[11px] text-[#747779] leading-relaxed">
              {locale === 'de' ? nextExperimentDecision.whyNowDe : nextExperimentDecision.whyNowEn}
            </p>
          </section>
        )}

        {experimentComparison && (
          <section aria-label={locale === 'de' ? 'Experiment-Vergleich' : 'Experiment comparison'} className="rounded-xl bg-[#191B1C] text-[#F2F1ED] p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#B9BCBE]">
                {locale === 'de' ? 'Was sich unterscheidet' : 'What differs'}
              </span>
              <span className="font-ui text-[10px] text-[#B9BCBE]">
                {formatSituation(experimentComparison.trigger, locale)}
              </span>
            </div>
            <p className="font-ui text-xs leading-relaxed text-[#D7D8D6]">
              {locale === 'de' ? experimentComparison.summaryDe : experimentComparison.summaryEn}
            </p>
            <p className="font-ui text-[10px] leading-relaxed text-[#747779]">
              {locale === 'de'
                ? 'Vergleich deiner eigenen Tests – keine kausale oder klinische Schlussfolgerung.'
                : 'Comparison of your own tests — not a causal or clinical conclusion.'}
            </p>
          </section>
        )}

        {/* If fewer than 8 observations, show authentic baseline learning state */}
        {!hasEnoughPatterns ? (
          <section aria-label={locale === 'de' ? 'Lernbasis' : 'Learning baseline'} className="pt-2 space-y-4">
            <div className="rounded-2xl bg-[#E7E7E3]/70 p-5 space-y-3 border border-[#D9D9D4]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#17372E]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#191B1C]">
                  {t('patternsGatheringTitle')}
                </span>
              </div>
              <p className="font-ui text-xs sm:text-[13px] text-[#747779] leading-relaxed">
                {t('patternsGatheringDesc')}
              </p>

              {/* Progress counter towards pattern emergence */}
              <div className="pt-2 space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-[#191B1C]">
                  <span>{totalObs} / 8 {t('observationsCollected')}</span>
                  <span className="text-[#747779]">{Math.round((totalObs / 8) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#D9D9D4] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#17372E] transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(8, (totalObs / 8) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* Asymmetric Real Personal Analytics Metrics */
          <section aria-label={locale === 'de' ? 'Mustersignale' : 'Pattern signals'} className="pt-1">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="text-5xl font-light tracking-tight text-[#191B1C] tabular-nums leading-none">
                  {smokingEvents.filter((event) => event.decisionType).length >= 5
                    ? `${patternAnalysis.automaticRatio}%`
                    : '—'}
                </div>
                <div className="font-ui text-xs text-[#747779]">
                  {t('patternsMetric1Label')}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-5xl font-light tracking-tight text-[#191B1C] tabular-nums leading-none">
                  {patternAnalysis.peakHourLabel || '—'}
                </div>
                <div className="font-ui text-xs text-[#747779]">
                  {t('patternsMetric2Label')}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Temporal distribution — rendered only when enough timestamped observations exist */}
        <section aria-label={locale === 'de' ? 'Zeitliche Verteilung' : 'Hourly distribution'} className="pt-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs font-medium text-[#747779]">
              {t('hourlyDistribution')}
            </span>
            <span className="text-[11px] text-[#747779] font-mono">
              {t('cycle24h')}
            </span>
          </div>

          {patternAnalysis.hasEnoughDataForTime ? (
            <>
              <div className="h-16 flex items-end justify-between gap-1.5 pt-2 pb-1 border-b border-[#D9D9D4]">
                {twoHourBins.map((val, i) => {
                  const heightPercent = val > 0 ? Math.max(8, Math.round((val / maxBinCount) * 100)) : 2;
                  const isHigh = val === maxBinCount && val > 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end gap-1">
                      <div
                        className={`w-full rounded-t-sm transition-all ${
                          isHigh ? 'bg-[#191B1C]' : val > 0 ? 'bg-[#747779]' : 'bg-[#D9D9D4]'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] font-mono text-[#747779]">
                <span>00:00</span>
                <span>08:00</span>
                <span>16:00</span>
                <span>24:00</span>
              </div>
            </>
          ) : (
            <p className="font-ui text-xs text-[#747779] leading-relaxed py-2">
              {locale === 'de'
                ? 'Noch nicht genug Zeitpunkte. Ab mehreren protokollierten Situationen wird die Tagesverteilung sichtbar.'
                : 'Not enough timestamps yet. Your daily distribution appears after several logged situations.'}
            </p>
          )}
        </section>

        {/* Active Cues & Top Triggers Chips */}
        <section aria-label={locale === 'de' ? 'Erfasste Situationsauslöser' : 'Tracked situational cues'} className="pt-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs font-medium text-[#747779] block">
              {patternAnalysis.topTriggers.length > 0
                ? t('trackedCues')
                : locale === 'de'
                ? 'Im Onboarding genannt'
                : 'Selected in onboarding'}
            </span>
            {patternAnalysis.strongestTrigger && (
              <span className="text-[11px] font-mono text-[#17372E]">
                {formatSituation(patternAnalysis.strongestTrigger.name, locale)} ({patternAnalysis.strongestTrigger.percentage}%)
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Show real top triggers if logged, merged with baseline choices */}
            {patternAnalysis.topTriggers.length > 0 ? (
              patternAnalysis.topTriggers.map((trig, index) => (
                <span
                  key={trig.name}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#E7E7E3] px-3 py-1.5 text-xs font-medium text-[#191B1C]"
                >
                  {index === 0 && <span className="h-1.5 w-1.5 rounded-full bg-[#17372E]" />}
                  <span>{formatSituation(trig.name, locale)}</span>
                  <span className="text-[10px] font-mono text-[#747779]">×{trig.count}</span>
                </span>
              ))
            ) : (
              userProfile.automaticSituations.map((sit) => (
                <span
                  key={sit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#E7E7E3] px-3 py-1.5 text-xs font-medium text-[#747779]"
                >
                  {formatSituation(sit, locale)}
                </span>
              ))
            )}
          </div>
        </section>

        {/* Personal evidence — only appears when each metric has enough real support */}
        {(patternAnalysis.strongestTrigger ||
          (patternAnalysis.topPlaces[0]?.count || 0) >= 5 ||
          patternAnalysis.averageCravingIntensity !== null ||
          bestIntervention ||
          patternAnalysis.combinations.length > 0) && (
          <section aria-label={locale === 'de' ? 'Persönliche Evidenz' : 'Personal evidence'} className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-ui text-xs font-medium text-[#747779]">
                {locale === 'de' ? 'Persönliche Signale' : 'Personal signals'}
              </span>
              <span className="text-[10px] font-mono text-[#747779]">
                {patternAnalysis.uniqueDaysRecorded} {locale === 'de' ? 'Tage' : 'days'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {patternAnalysis.strongestTrigger && (
                <div className="rounded-xl bg-[#E7E7E3]/60 p-3.5 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#747779] block">
                    {locale === 'de' ? 'Häufigster Auslöser' : 'Most frequent cue'}
                  </span>
                  <div className="font-ui text-[14px] font-semibold text-[#191B1C]">
                    {formatSituation(patternAnalysis.strongestTrigger.name, locale)}
                  </div>
                  <span className="text-[10px] text-[#747779]">
                    {patternAnalysis.strongestTrigger.count}× · {evidenceLabel(patternAnalysis.triggerConfidence)}
                  </span>
                </div>
              )}

              {(patternAnalysis.topPlaces[0]?.count || 0) >= 5 && (
                <div className="rounded-xl bg-[#E7E7E3]/60 p-3.5 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#747779] block">
                    {locale === 'de' ? 'Häufigster Ort' : 'Most common place'}
                  </span>
                  <div className="font-ui text-[14px] font-semibold text-[#191B1C]">
                    {formatPlace(patternAnalysis.topPlaces[0].name, locale)}
                  </div>
                  <span className="text-[10px] text-[#747779]">
                    {patternAnalysis.topPlaces[0].count}× {locale === 'de' ? 'erfasst' : 'logged'}
                  </span>
                </div>
              )}

              {patternAnalysis.averageCravingIntensity !== null && (
                <div className="rounded-xl bg-[#E7E7E3]/60 p-3.5 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#747779] block">
                    {locale === 'de' ? 'Ø Drang' : 'Avg urge'}
                  </span>
                  <div className="text-2xl font-light text-[#191B1C] tabular-nums">
                    {patternAnalysis.averageCravingIntensity}<span className="text-xs text-[#747779]">/10</span>
                  </div>
                  <span className="text-[10px] text-[#747779]">
                    {locale === 'de' ? 'aus erfassten Intensitäten' : 'from logged intensities'}
                  </span>
                </div>
              )}

              {bestIntervention && (
                <div className="rounded-xl bg-[#E7E7E3]/60 p-3.5 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#747779] block">
                    {locale === 'de' ? 'Bisher hilfreich' : 'Helpful so far'}
                  </span>
                  <div className="font-ui text-[13px] font-semibold text-[#191B1C] leading-snug">
                    {interventionTitle(bestIntervention.interventionId)}
                  </div>
                  <span className="text-[10px] text-[#747779]">
                    {bestIntervention.successRate}% {locale === 'de' ? 'schwächer/weg' : 'weaker/gone'} · {bestIntervention.totalAttempts}×
                  </span>
                </div>
              )}
            </div>

            {patternAnalysis.combinations[0] && (
              <div className="rounded-xl border border-[#D9D9D4] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-ui text-xs font-semibold text-[#191B1C]">
                    {locale === 'de' ? 'Wiederkehrende Schleife' : 'Recurring loop'}
                  </span>
                  <span className="text-[10px] font-mono text-[#17372E]">
                    {evidenceLabel(patternAnalysis.combinations[0].strength)}
                  </span>
                </div>
                <p className="font-ui text-xs text-[#747779] leading-relaxed">
                  {formatSituation(patternAnalysis.combinations[0].trigger, locale)}
                  {patternAnalysis.combinations[0].place
                    ? ` · ${formatPlace(patternAnalysis.combinations[0].place!, locale)}`
                    : ''}
                  {patternAnalysis.combinations[0].timeWindow
                    ? ` · ${PatternEngine.getTimeWindowLabel(patternAnalysis.combinations[0].timeWindow, locale)}`
                    : ''}
                  {' · '}×{patternAnalysis.combinations[0].count}
                </p>
              </div>
            )}
          </section>
        )}

        {/* One recommendation, generated from the same evidence used above */}
        <section aria-label={locale === 'de' ? 'Nächste sinnvolle Aktion' : 'Next best action'} className="pt-2">
          <div className="rounded-xl bg-[#E7E7E3]/60 p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#747779]">
                {locale === 'de' ? 'Nächster Test' : 'Next test'}
              </span>
              <span className="text-[10px] text-[#747779]">{evidenceLabel(nextBestAction.evidence)}</span>
            </div>
            <h3 className="font-ui text-[15px] font-semibold text-[#191B1C]">{nextBestAction.title}</h3>
            <p className="font-ui text-xs text-[#747779] leading-relaxed">{nextBestAction.body}</p>
            <p className="font-ui text-[11px] text-[#747779] leading-relaxed pt-1 border-t border-[#D9D9D4]">
              {nextBestAction.why}
            </p>
          </div>
        </section>
      </div>
    );
  }

  // ==========================================
  // PROGRESS TAB — High-end Personal Analytics (Real Data)
  // ==========================================
  if (currentTab === 'PROGRESS') {
    return (
      <div className="w-full max-w-md mx-auto px-6 pt-3 pb-24 text-[#191B1C] space-y-7">
        <header className="flex items-center justify-between border-b border-[#D9D9D4] pb-3 pt-1 select-none">
          <span className="text-[11px] font-semibold tracking-[0.24em] uppercase text-[#191B1C]">
            {t('brandName')}
          </span>
          <span className="text-[11px] text-[#747779] font-normal tracking-wide">
            {t('progressTabBadge')}
          </span>
        </header>

        <div className="space-y-1.5 pt-1">
          <h1 className="font-display text-4xl sm:text-[44px] font-normal tracking-[-0.03em] text-[#191B1C] leading-[1.05]">
            {t('progressTabTitle')}
          </h1>
          <p className="font-ui text-[13px] text-[#747779] font-normal leading-relaxed">
            {t('progressTabSubtitle')}
          </p>
        </div>

        {!hasBehaviorData && (
          <EmptyState
            title={t('emptyProgressTitle')}
            body={t('emptyProgressBody')}
            actionLabel={t('emptyStateAction')}
            onAction={() => onNavigate?.('TODAY')}
          />
        )}

        {/* Key Personal Metrics — Real Control Score and Average Delay */}
        <section aria-label={locale === 'de' ? 'Fortschrittsmetriken' : 'Progress metrics'} className="pt-1">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="text-5xl font-light tracking-tight text-[#191B1C] tabular-nums leading-none">
                {hasBehaviorData ? realControlScore : '—'}
              </div>
              <div className="font-ui text-xs text-[#747779]">
                {t('progressMetric1Label')}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-5xl font-light tracking-tight text-[#191B1C] tabular-nums leading-none">
                {avgDelayLabel}
              </div>
              <div className="font-ui text-xs text-[#747779]">
                {t('progressMetric3Label')}
              </div>
            </div>
          </div>
        </section>

        {/* Real Behavior Counters */}
        <section aria-label={locale === 'de' ? 'Verhaltenszähler' : 'Behavior counters'} className="pt-1 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#E7E7E3]/60 p-3.5 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#747779] block">
              {locale === 'de' ? 'Drangpausen erfasst' : 'Cravings observed'}
            </span>
            <div className="text-2xl font-light text-[#191B1C] tabular-nums">
              {cravingEvents.length}
            </div>
          </div>

          <div className="rounded-xl bg-[#E7E7E3]/60 p-3.5 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#747779] block">
              {locale === 'de' ? 'Zigaretten heute' : 'Cigarettes today'}
            </span>
            <div className="text-2xl font-light text-[#191B1C] tabular-nums">
              {todaySmokes.length}
              <span className="text-xs font-mono text-[#747779] ml-1.5">
                / ~{userProfile.baseline.typicalCigarettesPerDay}
              </span>
            </div>
          </div>
        </section>

        <section aria-label={locale === 'de' ? 'Wochenrückblick' : 'Weekly review'} className="rounded-2xl bg-[#F8F7F3] border border-[#D9D9D4] p-4 space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-ui text-xs font-medium text-[#747779]">{locale === 'de' ? 'Wochenrückblick' : 'Weekly review'}</span>
            <span className="font-mono text-[9.5px] text-[#747779]">{weeklyReview.currentWindowStart}–{weeklyReview.currentWindowEnd}</span>
          </div>
          <div className="space-y-1">
            <h3 className="font-ui text-[15px] font-semibold text-[#191B1C]">{locale === 'de' ? weeklyReview.headlineDe : weeklyReview.headlineEn}</h3>
            <p className="font-ui text-[11px] text-[#747779] leading-relaxed">{locale === 'de' ? weeklyReview.summaryDe : weeklyReview.summaryEn}</p>
          </div>
          <div className="grid grid-cols-3 gap-x-3 gap-y-4">
            {weeklyReview.metrics.slice(0, 6).map((metric) => (
              <div key={metric.id} className="space-y-0.5">
                <div className="text-xl font-light text-[#191B1C] tabular-nums">{metric.value}</div>
                <div className="font-ui text-[9.5px] text-[#747779] leading-tight">{locale === 'de' ? metric.labelDe : metric.labelEn}</div>
              </div>
            ))}
          </div>
          {weeklyReview.ready ? (
            <div className="border-t border-[#D9D9D4] pt-3 space-y-1.5">
              {weeklyReview.signalDe && (
                <p className="font-ui text-[11px] text-[#191B1C] leading-relaxed">{locale === 'de' ? weeklyReview.signalDe : weeklyReview.signalEn}</p>
              )}
              <p className="font-ui text-[10.5px] text-[#747779] leading-relaxed">
                <span className="font-medium text-[#191B1C]">{locale === 'de' ? 'Nächster Fokus: ' : 'Next focus: '}</span>
                {locale === 'de' ? weeklyReview.nextFocusDe : weeklyReview.nextFocusEn}
              </p>
            </div>
          ) : (
            <div className="border-t border-[#D9D9D4] pt-3 text-[10.5px] text-[#747779] leading-relaxed">
              {locale === 'de'
                ? `${weeklyReview.observationCount} Beobachtungen an ${weeklyReview.activeDays} Tagen. Noch ein paar echte Situationen, dann wird der Rückblick aussagekräftiger.`
                : `${weeklyReview.observationCount} observations across ${weeklyReview.activeDays} days. A few more real situations will make the review more useful.`}
            </div>
          )}
        </section>

        {personalExperiments.some((experiment) => experiment.status === 'completed') && (
          <section aria-label={locale === 'de' ? 'Abgeschlossene persönliche Experimente' : 'Completed personal experiments'} className="rounded-xl border border-[#D9D9D4] px-4 py-3.5 flex items-center justify-between gap-4">
            <div>
              <div className="font-ui text-xs font-medium text-[#191B1C]">
                {locale === 'de' ? 'Persönliche Tests ausgewertet' : 'Personal tests evaluated'}
              </div>
              <div className="font-ui text-[11px] text-[#747779] mt-0.5">
                {locale === 'de' ? 'Arbeitssignale statt Erfolgs-/Misserfolgslogik' : 'Working signals, not pass/fail logic'}
              </div>
            </div>
            <div className="text-2xl font-light text-[#191B1C] tabular-nums">
              {personalExperiments.filter((experiment) => experiment.status === 'completed').length}
            </div>
          </section>
        )}

        {userProfile.goal === 'reduce' && (
          <section aria-label={locale === 'de' ? 'Unterstützung beim Reduzieren' : 'Reduce mode support'} className="rounded-xl bg-[#E7E7E3]/65 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-ui text-xs font-medium text-[#191B1C]">
                {locale === 'de' ? 'Reduktion · ohne Druck' : 'Reduce · without pressure'}
              </span>
              {baselineComparison.recentAverage !== null && (
                <span className="font-mono text-[10px] text-[#747779] tabular-nums">
                  {baselineComparison.recentAverage}/{locale === 'de' ? 'Tag' : 'day'}
                </span>
              )}
            </div>
            {baselineComparison.recentAverage !== null ? (
              <p className="font-ui text-[11px] text-[#747779] leading-relaxed">
                {locale === 'de'
                  ? `Ø der letzten ${baselineComparison.daysObserved} erfassten Tage: ${baselineComparison.recentAverage} gegenüber Basis ${baselineComparison.baseline}. Keine einzelne Tageszahl wird als Erfolg oder Misserfolg bewertet.`
                  : `Average across the last ${baselineComparison.daysObserved} logged days: ${baselineComparison.recentAverage} versus baseline ${baselineComparison.baseline}. No single day is treated as success or failure.`}
              </p>
            ) : (
              <p className="font-ui text-[11px] text-[#747779] leading-relaxed">
                {locale === 'de'
                  ? 'Nach mindestens drei erfassten Tagen kann Smoke Lab den aktuellen Durchschnitt vorsichtig mit deiner Basis vergleichen.'
                  : 'After at least three logged days, Smoke Lab can cautiously compare your current average with your baseline.'}
              </p>
            )}
            {reductionOpportunity ? (
              <div className="border-t border-[#D9D9D4] pt-3 space-y-1">
                <div className="font-ui text-[11px] font-medium text-[#191B1C]">
                  {locale === 'de' ? reductionOpportunity.titleDe : reductionOpportunity.titleEn}
                </div>
                <p className="font-ui text-[11px] text-[#747779] leading-relaxed">
                  {locale === 'de' ? reductionOpportunity.bodyDe : reductionOpportunity.bodyEn}
                </p>
              </div>
            ) : (
              <div className="border-t border-[#D9D9D4] pt-3 font-ui text-[11px] text-[#747779] leading-relaxed">
                {locale === 'de'
                  ? 'Noch kein fairer Reduktionskandidat. Smoke Lab wartet auf wiederholte automatische Situationen mit erfasster Drangstärke, statt eine Zigarette willkürlich auszuwählen.'
                  : 'No fair reduction candidate yet. Smoke Lab waits for repeated automatic situations with recorded urge intensity rather than choosing a cigarette arbitrarily.'}
              </div>
            )}
          </section>
        )}

        {userProfile.goal === 'quit' && quitPreparation && (
          <section aria-label={locale === 'de' ? 'Vorbereitung auf das Aufhören' : 'Quit preparation'} className="rounded-xl bg-[#191B1C] text-[#F2F1ED] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-ui text-xs font-medium">
                {locale === 'de' ? 'Aufhören vorbereiten' : 'Prepare to quit'}
              </span>
              <span className="font-mono text-[10px] text-[#B9BCBE] tabular-nums">
                {quitPreparation.completed}/{quitPreparation.total}
              </span>
            </div>
            <p className="font-ui text-[11px] text-[#B9BCBE] leading-relaxed">
              {locale === 'de'
                ? 'Kein Streak und kein erzwungenes Datum. Smoke Lab baut zuerst konkrete Antworten für deine wiederkehrenden Situationen auf.'
                : 'No streak and no forced date. Smoke Lab first builds concrete responses for your recurring situations.'}
            </p>
            <div className="space-y-2.5 pt-1">
              {quitPreparation.items.map((item) => (
                <div key={item.id} className="flex gap-2.5 items-start">
                  <span className={`mt-0.5 h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${item.complete ? 'border-[#6F8D7E] bg-[#17372E]' : 'border-[#555A5C]'}`}>
                    {item.complete && <Check className="w-2.5 h-2.5 text-[#F2F1ED] stroke-[2]" />}
                  </span>
                  <div>
                    <div className="font-ui text-[11px] font-medium text-[#F2F1ED]">
                      {locale === 'de' ? item.titleDe : item.titleEn}
                    </div>
                    <div className="font-ui text-[10px] text-[#8F9394] leading-relaxed mt-0.5">
                      {locale === 'de' ? item.detailDe : item.detailEn}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#313536] pt-2 font-ui text-[10.5px] text-[#B9BCBE]">
              {locale === 'de' ? quitPreparation.nextStepDe : quitPreparation.nextStepEn}
            </div>
          </section>
        )}

        {userProfile.goal === 'quit' && <QuitSupportCard userProfile={userProfile} />}

        {/* Real historical Control Score trend — never projects future data */}
        <section aria-label={locale === 'de' ? 'Control-Score-Verlauf' : 'Control Score trend'} className="pt-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-ui text-xs font-medium text-[#747779]">
              {locale === 'de' ? 'Entwicklung deiner Kontrolle' : 'Your control trend'}
            </span>
            {controlTrend.length > 0 && (
              <span className="text-[10px] font-mono text-[#17372E]">
                {realControlScore >= 50 ? `+${realControlScore - 50}` : `${realControlScore - 50}`} {t('controlScoreUnit')}
              </span>
            )}
          </div>

          {controlTrend.length >= 2 ? (
            <>
              <div className="h-20 w-full pt-2">
                <svg viewBox="0 0 280 60" className="w-full h-full overflow-visible" fill="none">
                  <polyline
                    points={trendPolyline}
                    stroke="#191B1C"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {(() => {
                    const lastPoint = trendPolyline.split(' ').filter(Boolean).at(-1)?.split(',');
                    if (!lastPoint) return null;
                    return <circle cx={lastPoint[0]} cy={lastPoint[1]} r="3.5" fill="#17372E" />;
                  })()}
                  <line x1="0" y1="58" x2="280" y2="58" stroke="#D9D9D4" strokeWidth="1" strokeDasharray="3 3" />
                </svg>
              </div>
              <div className="flex justify-between text-[9px] font-mono text-[#747779]">
                <span>{locale === 'de' ? 'Tag' : 'Day'} {journeyDayForDate(controlTrend[0].dateKey)}</span>
                <span>{locale === 'de' ? 'Tag' : 'Day'} {journeyDayForDate(controlTrend[controlTrend.length - 1].dateKey)}</span>
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-[#E7E7E3]/60 p-4">
              <p className="font-ui text-xs text-[#747779] leading-relaxed">
                {locale === 'de'
                  ? 'Deine Entwicklung beginnt heute. Sobald Daten aus mehreren Tagen vorliegen, wird hier dein tatsächlicher Verlauf sichtbar.'
                  : 'Your trend begins today. Once data from multiple days exists, your actual history will appear here.'}
              </p>
            </div>
          )}
        </section>

        {/* Decoupling Philosophy Callout */}
        <section aria-label={locale === 'de' ? 'Grundhaltung' : 'Philosophy'} className="pt-2">
          <div className="rounded-xl bg-[#E7E7E3] p-4 text-xs sm:text-[13px] font-medium text-[#191B1C] leading-relaxed">
            &ldquo;
            {locale === 'de'
              ? 'Rauchen macht vorherigen Fortschritt nicht zunichte. Jedes bewusste Innehalten schafft Raum, anders auf einen Auslöser zu reagieren.'
              : 'Smoking does not erase previous progress. Every deliberate pause creates space to respond differently to a trigger.'}
            &rdquo;
          </div>
        </section>
      </div>
    );
  }

  // ==========================================
  // ME TAB — Quiet Luxury Profile & Settings
  // ==========================================
  return (
    <div className="w-full max-w-md mx-auto px-6 pt-3 pb-24 text-[#191B1C] space-y-7">
      <header className="flex items-center justify-between border-b border-[#D9D9D4] pb-3 pt-1 select-none">
        <span className="text-[11px] font-semibold tracking-[0.24em] uppercase text-[#191B1C]">
          {t('brandName')}
        </span>
        <span className="text-[11px] text-[#747779] font-normal tracking-wide">
          {t('meTabBadge')}
        </span>
      </header>

      <div className="space-y-1 pt-1">
        <h1 className="font-display text-4xl sm:text-[44px] font-normal tracking-[-0.03em] text-[#191B1C] leading-[1.05]">
          {t('meTabTitle')}
        </h1>
      </div>

      {/* Starting Baseline — Large values directly on page */}
      <section aria-label={locale === 'de' ? 'Ausgangsprofil' : 'Baseline profile'} className="pt-1 space-y-3.5">
        <span className="font-ui text-xs font-medium text-[#747779] block">
          {t('meBaselineSection')}
        </span>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <div className="text-5xl font-light text-[#191B1C] tabular-nums leading-none">
              {userProfile.baseline.typicalCigarettesPerDay}
            </div>
            <div className="font-ui text-xs text-[#747779]">
              {t('meCpdLabel')}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-5xl font-light text-[#191B1C] tabular-nums leading-none">
              {userProfile.baseline.yearsSmoking}
            </div>
            <div className="font-ui text-xs text-[#747779]">
              {t('meYearsLabel')}
            </div>
          </div>
        </div>

        <div className="pt-1 text-xs sm:text-[13px] text-[#191B1C]">
          <span className="text-[#747779]">{t('meGoalLabel')} </span>
          <span className="font-medium">
            {userProfile.goal === 'pattern'
              ? (locale === 'de' ? 'Muster verstehen' : 'Understand pattern')
              : userProfile.goal === 'reduce'
              ? (locale === 'de' ? 'Weniger rauchen' : 'Smoke less')
              : (locale === 'de' ? 'Mit dem Rauchen aufhören' : 'Quit smoking')}
          </span>
        </div>
      </section>

      <section aria-label={locale === 'de' ? 'Zielmodus' : 'Goal mode'} className="pt-3 border-t border-[#D9D9D4] space-y-3">
        <div className="space-y-1">
          <span className="font-ui text-xs font-medium text-[#191B1C] block">
            {locale === 'de' ? 'Aktuellen Fokus ändern' : 'Change current focus'}
          </span>
          <p className="font-ui text-[11px] text-[#747779] leading-relaxed">
            {locale === 'de'
              ? 'Du kannst zwischen Verstehen, Reduzieren und Aufhören wechseln. Deine bisherigen Logs, Tests und dein Control Model bleiben erhalten.'
              : 'You can switch between understanding, reducing, and quitting. Your existing logs, tests, and Control Model remain intact.'}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#E7E7E3] p-1.5">
          {([
            ['pattern', locale === 'de' ? 'Verstehen' : 'Understand'],
            ['reduce', locale === 'de' ? 'Reduzieren' : 'Reduce'],
            ['quit', locale === 'de' ? 'Aufhören' : 'Quit'],
          ] as Array<[UserProfile['goal'], string]>).map(([goal, label]) => (
            <button
              key={goal}
              type="button"
              onClick={() => handleGoalChange(goal)}
              aria-pressed={userProfile.goal === goal}
              className={`rounded-lg px-2 py-2.5 text-[10.5px] font-semibold transition ${
                userProfile.goal === goal
                  ? 'bg-[#191B1C] text-[#F2F1ED] shadow-sm'
                  : 'text-[#747779] hover:text-[#191B1C]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="font-ui text-[10.5px] text-[#747779] leading-relaxed">
          {locale === 'de'
            ? 'Ein Zielwechsel setzt weder die 30-Tage-Journey noch Daten oder Fortschritt zurück.'
            : 'Changing focus does not reset the 30-day Journey, your data, or your progress.'}
        </p>
        {goalTransitionNotice ? (
          <p role="status" aria-live="polite" className="rounded-lg bg-[#E7E7E3] px-3 py-2 font-ui text-[10.5px] text-[#4E5253] leading-relaxed">
            {goalTransitionNotice}
          </p>
        ) : null}
      </section>

      {/* Language & Device Integration */}
      <section aria-label={locale === 'de' ? 'Sprache und Gerät' : 'Language and device'} className="pt-3 space-y-3.5 border-t border-[#D9D9D4]">
        <div className="flex items-center justify-between">
          <span className="font-ui text-xs font-medium text-[#191B1C]">{t('meLanguageLabel')}</span>
          <div className="flex items-center rounded-lg bg-[#E7E7E3] p-1 gap-1">
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              aria-pressed={locale === 'en'}
              aria-label={locale === 'de' ? 'Sprache Englisch' : 'English language'}
              className={`min-h-[44px] rounded-md px-3 py-1 text-xs font-mono transition ${
                locale === 'en'
                  ? 'bg-[#191B1C] text-[#F2F1ED]'
                  : 'text-[#747779] hover:text-[#191B1C]'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('de')}
              aria-pressed={locale === 'de'}
              aria-label={locale === 'de' ? 'Sprache Deutsch' : 'German language'}
              className={`min-h-[44px] rounded-md px-3 py-1 text-xs font-mono transition ${
                locale === 'de'
                  ? 'bg-[#191B1C] text-[#F2F1ED]'
                  : 'text-[#747779] hover:text-[#191B1C]'
              }`}
            >
              DE
            </button>
          </div>
        </div>

        <div className="pt-1 flex items-center justify-between">
          <span className="font-ui text-xs text-[#747779]">
            {t('installToHomeScreen')}
          </span>
          <PWAInstallBanner compact />
        </div>
      </section>

      {/* Storage and Privacy */}
      <section aria-label={locale === 'de' ? 'Speicher und Datenschutz' : 'Storage and privacy'} className="pt-3 border-t border-[#D9D9D4] space-y-1">
        <span className="font-ui text-xs font-medium text-[#747779] block">
          {t('meStorageSection')}
        </span>
        <p className="font-ui text-xs sm:text-[13px] text-[#747779] leading-relaxed">
          {t('meStorageDesc')}
        </p>
      </section>

      <DataPortabilityPanel userProfile={userProfile} />

      {/* Medical safety — unobtrusive, clear, and non-claiming */}
      <section aria-label={locale === 'de' ? 'Medizinischer Hinweis' : 'Medical information'} className="pt-3 border-t border-[#D9D9D4] space-y-1.5">
        <span className="font-ui text-xs font-medium text-[#747779] block">
          {locale === 'de' ? 'Hinweis' : 'Important'}
        </span>
        <p className="font-ui text-[11.5px] text-[#747779] leading-relaxed">
          {locale === 'de'
            ? 'Smoke Lab ist ein Selbstmanagement-Tool und ersetzt keine professionelle medizinische Beratung oder evidenzbasierte Tabakentwöhnungsbehandlung. Wenn du aufhören möchtest, kann professionelle Unterstützung zusätzliche wirksame Optionen bieten.'
            : 'Smoke Lab is a self-management tool and does not replace professional medical advice or evidence-based tobacco cessation treatment. If you want to quit, professional support can provide additional effective options.'}
        </p>
      </section>

      {/* Understated Reset Action */}
      <section aria-label={locale === 'de' ? 'Daten zurücksetzen' : 'Reset profile'} className="pt-2">
        {!confirmReset ? (
          <button
            type="button"
            id="btn-reset-data"
            onClick={() => setConfirmReset(true)}
            className="btn-tactile text-xs font-mono text-[#747779] hover:text-[#191B1C] flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3 h-3 stroke-[1.8]" />
            <span>{t('meResetDataButton')}</span>
          </button>
        ) : (
          <div className="rounded-xl border border-[#D9D9D4] bg-[#E7E7E3] p-4 space-y-3">
            <p className="text-xs text-[#191B1C] leading-relaxed">
              {t('meResetConfirm')}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-lg border border-[#D9D9D4] px-3 py-1.5 text-xs text-[#191B1C] hover:bg-[#F4F3EF]"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                id="btn-confirm-reset"
                onClick={onResetData}
                className="rounded-lg bg-[#191B1C] px-3 py-1.5 text-xs font-semibold text-[#F2F1ED]"
              >
                {t('resetData')}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
