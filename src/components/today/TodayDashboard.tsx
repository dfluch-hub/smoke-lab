import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { CravingEvent, JourneyProgress, PersonalExperiment, SmokingEvent, UserProfile } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { ModalSheet } from '../common/ModalSheet';
import { LapseRecoveryModal } from '../quit/LapseRecoveryModal';
import {
  CravingEventRepository,
  ExperimentRepository,
  JourneyRepository,
  LapseRecoveryRepository,
  QuitSupportRepository,
  SmokingEventRepository,
} from '../../storage/repositories';
import { ExperimentSequencingEngine } from '../../services/behavior/ExperimentSequencingEngine';
import { GoalModeCoordinator } from '../../services/behavior/GoalModeCoordinator';
import { JourneyEngine } from '../../services/behavior/JourneyEngine';

interface TodayDashboardProps {
  userProfile: UserProfile;
  progress: JourneyProgress;
  todaySmokingCount: number;
  dataVersion?: number;
  onDataChanged?: () => void;
  onOpenLab?: () => void;
  onOpenCraving?: () => void;
}

export const TodayDashboard: React.FC<TodayDashboardProps> = ({
  userProfile,
  todaySmokingCount,
  dataVersion = 0,
  onDataChanged,
  onOpenLab,
  onOpenCraving,
}) => {
  const { t, locale } = useLanguage();
  const de = locale === 'de';
  const [smokingEvents, setSmokingEvents] = useState<SmokingEvent[]>([]);
  const [cravingEvents, setCravingEvents] = useState<CravingEvent[]>([]);
  const [experiments, setExperiments] = useState<PersonalExperiment[]>([]);
  const [showPersonalTest, setShowPersonalTest] = useState(false);
  const [recoverySmokingEvent, setRecoverySmokingEvent] = useState<SmokingEvent | null>(null);

  const reloadState = () => {
    setSmokingEvents(SmokingEventRepository.getAll());
    setCravingEvents(CravingEventRepository.getAll());
    setExperiments(ExperimentRepository.getAll());
  };

  useEffect(() => {
    reloadState();
  }, [dataVersion]);

  const journey = JourneyRepository.get();
  const day = journey.dayInLab || 1;
  const phase = JourneyEngine.phaseForDay(day, locale);
  const mission = JourneyEngine.getMissionForDay(day, userProfile, journey, smokingEvents, cravingEvents, locale);
  const activeExperiment = experiments.find((experiment) => experiment.status === 'active') || null;
  const focus = GoalModeCoordinator.build(
    userProfile,
    journey,
    smokingEvents,
    cravingEvents,
    experiments,
    QuitSupportRepository.get(),
    LapseRecoveryRepository.getAll(),
  );
  const sequencingDecision = !activeExperiment && focus.reasonCodes.includes('sequenced_personal_question')
    ? ExperimentSequencingEngine.next(userProfile, smokingEvents, cravingEvents, experiments)
    : null;
  const personalTest = focus.source === 'active_experiment'
    ? activeExperiment
    : focus.reasonCodes.includes('sequenced_personal_question')
      ? sequencingDecision?.experiment || null
      : null;
  const pendingRecoveryEvent = focus.pendingRecoverySmokingEventId
    ? smokingEvents.find((event) => event.id === focus.pendingRecoverySmokingEventId) || null
    : null;

  const goalLabel = userProfile.goal === 'quit'
    ? (de ? 'Rauchfrei werden' : 'Quit smoking')
    : userProfile.goal === 'reduce'
      ? (de ? 'Weniger rauchen' : 'Smoke less')
      : (de ? 'Auslöser verstehen' : 'Understand triggers');
  const taskTitle = focus.source === 'journey' ? mission.title : (de ? focus.titleDe : focus.titleEn);
  const taskBody = focus.source === 'journey' ? mission.objective : (de ? focus.bodyDe : focus.bodyEn);
  const nextStepLabel = focus.source === 'journey'
    ? (de ? 'Heutige Aufgabe öffnen' : "Open today's task")
    : focus.action !== 'none'
    ? (de ? focus.ctaDe : focus.ctaEn)
    : (de ? 'Heutige Aufgabe öffnen' : "Open today's task");

  const openNextStep = () => {
    if (focus.action === 'open_recovery' && pendingRecoveryEvent) {
      setRecoverySmokingEvent(pendingRecoveryEvent);
      return;
    }
    if (focus.action === 'open_experiment' && personalTest) {
      setShowPersonalTest(true);
      return;
    }
    if (focus.action === 'open_craving') {
      onOpenCraving?.();
      return;
    }
    onOpenLab?.();
  };

  const activatePersonalTest = () => {
    if (!sequencingDecision?.experiment) return;
    ExperimentRepository.activate(sequencingDecision.experiment);
    setShowPersonalTest(false);
    reloadState();
    onDataChanged?.();
  };

  return (
    <div className="w-full max-w-md mx-auto px-5 pt-3 pb-8 text-[#191B1C]">
      <header className="flex items-center justify-between border-b border-[#D9D9D4] pb-3 pt-1">
        <span className="text-[11px] font-semibold tracking-[0.22em] uppercase">{t('brandName')}</span>
        <span className="text-[11px] text-[#747779]">{de ? `Tag ${day} von 30` : `Day ${day} of 30`}</span>
      </header>

      <div className="pt-6 space-y-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#747779]">{de ? 'DEIN HEUTE' : 'YOUR TODAY'}</p>
          <h1 className="font-display text-4xl tracking-[-0.03em] leading-none">
            {de ? 'Ein Schritt reicht.' : 'One step is enough.'}
          </h1>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#D9D9D4] bg-[#F8F7F3]" aria-label={de ? 'Deine Orientierung für heute' : 'Your orientation for today'}>
          <div className="grid grid-cols-[5.5rem_1fr] gap-3 border-b border-[#D9D9D4] px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#747779]">{de ? 'Du bist' : 'You are'}</span>
            <span className="text-sm font-semibold">{de ? `Tag ${day} · ${phase.title}` : `Day ${day} · ${phase.title}`}</span>
          </div>
          <div className="grid grid-cols-[5.5rem_1fr] gap-3 border-b border-[#D9D9D4] px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#747779]">{de ? 'Dein Ziel' : 'Your goal'}</span>
            <span className="text-sm font-semibold">{goalLabel}</span>
          </div>
          <div className="px-4 py-4 space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#747779]">{de ? 'Heute' : 'Today'}</span>
            <h2 className="text-lg font-semibold leading-snug">{taskTitle}</h2>
            <p className="text-xs leading-relaxed text-[#747779]">{taskBody}</p>
          </div>
        </section>

        <section className="rounded-2xl bg-[#E7E7E3] p-4 space-y-3" aria-label={de ? 'Nächster Schritt' : 'Next step'}>
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#747779]">{de ? 'Jetzt' : 'Now'}</span>
            <p className="text-sm font-semibold">{nextStepLabel}</p>
          </div>
          <button
            type="button"
            id="btn-open-todays-step"
            onClick={openNextStep}
            className="btn-tactile flex min-h-12 w-full items-center justify-between rounded-xl bg-[#191B1C] px-4 text-sm font-semibold text-[#F2F1ED]"
          >
            <span>{nextStepLabel}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>

        <details className="group border-t border-[#D9D9D4] pt-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-semibold text-[#747779]">
            <span>{de ? 'Heutiges Protokoll' : "Today's log"}</span>
            <span className="flex items-center gap-2">
              {todaySmokingCount} {de ? 'Zigaretten' : 'cigarettes'}
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden="true" />
            </span>
          </summary>
          <p className="pb-2 text-xs leading-relaxed text-[#747779]">
            {de ? 'Nur deine echten Einträge werden gezählt. Auswertungen findest du unter Mehr.' : 'Only your real entries are counted. Find analysis under More.'}
          </p>
        </details>
      </div>

      <ModalSheet
        isOpen={showPersonalTest}
        onClose={() => setShowPersonalTest(false)}
        title={de ? 'Persönlicher Test' : 'Personal test'}
        badge={activeExperiment ? (de ? 'Aktiv' : 'Active') : (de ? 'Vorschlag' : 'Suggestion')}
      >
        {personalTest && (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#747779]">{de ? 'Die Frage' : 'The question'}</span>
              <p className="text-sm font-semibold leading-relaxed">{de ? personalTest.hypothesisDe : personalTest.hypothesisEn}</p>
            </div>
            <div className="rounded-xl bg-[#E7E7E3] p-4 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#747779]">{de ? 'So geht es' : 'What to do'}</span>
              <p className="text-xs leading-relaxed">{de ? personalTest.testDe : personalTest.testEn}</p>
            </div>
            <p className="text-[11px] leading-relaxed text-[#747779]">
              {de ? 'Der Test nutzt nur deine Einträge als persönliches Arbeitssignal. Er beweist keine Ursache und ersetzt keine medizinische Beratung.' : 'This test uses only your entries as a personal working signal. It does not prove causality or replace medical advice.'}
            </p>
            <button
              type="button"
              onClick={activeExperiment ? () => setShowPersonalTest(false) : activatePersonalTest}
              className="min-h-12 w-full rounded-xl bg-[#191B1C] px-4 text-sm font-semibold text-[#F2F1ED]"
            >
              {activeExperiment ? (de ? 'Verstanden' : 'Got it') : (de ? 'Test starten' : 'Start test')}
            </button>
          </div>
        )}
      </ModalSheet>

      <LapseRecoveryModal
        isOpen={Boolean(recoverySmokingEvent)}
        smokingEvent={recoverySmokingEvent}
        onClose={() => {
          setRecoverySmokingEvent(null);
          reloadState();
          onDataChanged?.();
        }}
      />
    </div>
  );
};
