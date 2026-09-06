import React, { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Eye, Target } from 'lucide-react';
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
    <div className="v19-screen">
      <header className="v19-header">
        <div>
          <p className="v19-eyebrow">{t('brandName')}</p>
          <h1>{de ? 'Heute' : 'Today'}</h1>
        </div>
        <div className="rounded-full bg-[#FFFDF8] px-3 py-2 text-xs font-bold text-[#5F5851] shadow-sm">{de ? `Tag ${day}` : `Day ${day}`}</div>
      </header>

      <section className="grid grid-cols-2 gap-3" aria-label={de ? 'Dein Stand' : 'Your status'}>
        <div className="v19-card flex items-start gap-3 p-3">
          <div className="v19-small-icon bg-[#E1EFE7] text-[#24584A]"><CalendarDays /></div>
          <div><span className="v19-caption">{de ? 'Phase' : 'Phase'}</span><strong className="mt-0.5 block text-sm">{phase.title}</strong></div>
        </div>
        <div className="v19-card flex items-start gap-3 p-3">
          <div className="v19-small-icon bg-[#FFF0E8] text-[#B85C3F]"><Target /></div>
          <div><span className="v19-caption">{de ? 'Ziel' : 'Goal'}</span><strong className="mt-0.5 block text-sm">{goalLabel}</strong></div>
        </div>
      </section>

      <section className="v19-card v19-card-accent space-y-4" aria-label={de ? 'Deine Aufgabe heute' : 'Your task today'}>
        <div className="flex items-start gap-3">
          <div className="v19-small-icon bg-white/75 text-[#B85C3F]"><CheckCircle2 /></div>
          <div>
            <p className="v19-eyebrow text-[#7B4B36]">{de ? 'HEUTE WICHTIG' : 'IMPORTANT TODAY'}</p>
            <h2 className="mt-1 text-xl font-bold leading-snug">{taskTitle}</h2>
          </div>
        </div>
        <p className="v19-body">{taskBody}</p>
        <div className="rounded-xl bg-white/65 px-3 py-2.5">
          <span className="v19-caption">{de ? 'Dein nächster Schritt' : 'Your next step'}</span>
          <p className="mt-0.5 text-sm font-bold">{nextStepLabel}</p>
        </div>
          <button
            type="button"
            id="btn-open-todays-step"
            onClick={openNextStep}
            className="v19-primary-button"
          >
            <span>{nextStepLabel}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
      </section>

      <section className="v19-card space-y-3" aria-label={de ? 'So funktioniert Smoke Lab' : 'How Smoke Lab works'}>
        <div className="flex items-center gap-2"><Eye className="h-5 w-5 text-[#24584A]" /><h2 className="text-sm font-bold">{de ? 'So hilft dir dein Tracking' : 'How tracking helps you'}</h2></div>
        <div className="flex items-center justify-between gap-2 text-center text-[11px] font-bold text-[#5F5851]">
          <span className="rounded-lg bg-[#F1EADF] px-2.5 py-2">{de ? 'Tracken' : 'Track'}</span><ArrowRight className="h-3.5 w-3.5 text-[#B7A99A]" />
          <span className="rounded-lg bg-[#F1EADF] px-2.5 py-2">{de ? 'Verstehen' : 'Understand'}</span><ArrowRight className="h-3.5 w-3.5 text-[#B7A99A]" />
          <span className="rounded-lg bg-[#E1EFE7] px-2.5 py-2 text-[#24584A]">{de ? 'Verändern' : 'Change'}</span>
        </div>
        <p className="v19-caption">
          {de
            ? `${todaySmokingCount} ${todaySmokingCount === 1 ? 'echte Zigarette' : 'echte Zigaretten'} heute erfasst.`
            : `${todaySmokingCount} real ${todaySmokingCount === 1 ? 'cigarette' : 'cigarettes'} tracked today.`}
        </p>
      </section>

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
