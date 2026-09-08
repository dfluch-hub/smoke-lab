import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock, Gauge, MapPin, MousePointerClick, Smile } from 'lucide-react';
import { DecisionType, EnjoymentRating, SmokingEvent } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { CravingEventRepository, JourneyRepository, SmokingEventRepository } from '../../storage/repositories';
import { ControlScoreEngine } from '../../services/behavior/ControlScoreEngine';
import { ModalSheet } from '../common/ModalSheet';

interface QuickSmokingLogModalProps {
  isOpen: boolean;
  onClose: (savedEvent?: SmokingEvent) => void;
}

type QuestionId = 'trigger' | 'intensity' | 'place' | 'decision' | 'enjoyment';
type TimeMode = 'now' | 'minus15' | 'minus30' | 'custom';

const TRIGGERS = {
  de: ['Kaffee', 'Stress', 'Nach dem Essen', 'Alkohol', 'Langeweile', 'Sozial', 'Autofahren', 'Gewohnheit', 'Arbeitspause', 'Morgenroutine', 'Abendroutine', 'Sonstiges'],
  en: ['Coffee', 'Stress', 'After meals', 'Alcohol', 'Boredom', 'Social', 'Driving', 'Habit', 'Work breaks', 'Morning routine', 'Evening routine', 'Other'],
};

const PLACES = {
  de: ['Zuhause', 'Arbeit', 'Auto', 'Draußen', 'Restaurant / Bar', 'Bei anderen', 'Soziales Treffen', 'Sonstiges'],
  en: ['Home', 'Work', 'Car', 'Outside', 'Restaurant / Bar', "At someone else's", 'Social gathering', 'Other'],
};

const formatTimeInput = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export const QuickSmokingLogModal: React.FC<QuickSmokingLogModalProps> = ({ isOpen, onClose }) => {
  const { locale } = useLanguage();
  const de = locale === 'de';
  const existingCount = SmokingEventRepository.getAll().length;
  const questions = useMemo<QuestionId[]>(() => {
    const next: QuestionId[] = ['trigger'];
    if (existingCount >= 3) next.push('intensity');
    if (existingCount >= 7) next.push('place');
    next.push('decision');
    if (existingCount >= 12) next.push('enjoyment');
    return next;
  }, [existingCount]);
  const [step, setStep] = useState(0);
  const [trigger, setTrigger] = useState('');
  const [place, setPlace] = useState('');
  const [intensity, setIntensity] = useState<number | null>(null);
  const [decision, setDecision] = useState<DecisionType | null>(null);
  const [enjoyment, setEnjoyment] = useState<EnjoymentRating | null>(null);
  const [saved, setSaved] = useState(false);
  const [timeMode, setTimeMode] = useState<TimeMode>('now');
  const [customTime, setCustomTime] = useState(formatTimeInput(new Date()));
  const [timeOpen, setTimeOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const savedEventRef = useRef<SmokingEvent | null>(null);
  const savingRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setTrigger('');
    setPlace('');
    setIntensity(null);
    setDecision(null);
    setEnjoyment(null);
    setSaved(false);
    setTimeMode('now');
    setCustomTime(formatTimeInput(new Date()));
    setTimeOpen(false);
    setCustomOpen(false);
    savedEventRef.current = null;
    savingRef.current = false;
  }, [isOpen, locale]);

  if (!isOpen) return null;
  const question = questions[step];
  const isLast = step === questions.length - 1;
  const canContinue = question === 'trigger' ? Boolean(trigger)
    : question === 'intensity' ? Boolean(intensity)
      : question === 'place' ? Boolean(place)
        : question === 'decision' ? Boolean(decision)
          : Boolean(enjoyment);

  const eventTimestamp = () => {
    const now = new Date();
    if (timeMode === 'minus15') return new Date(now.getTime() - 15 * 60_000).toISOString();
    if (timeMode === 'minus30') return new Date(now.getTime() - 30 * 60_000).toISOString();
    if (timeMode === 'custom') {
      const [hours, minutes] = customTime.split(':').map(Number);
      if (Number.isFinite(hours) && Number.isFinite(minutes)) {
        const selected = new Date(now);
        selected.setSeconds(0, 0);
        selected.setHours(hours, minutes, 0, 0);
        if (selected.getTime() > now.getTime()) selected.setDate(selected.getDate() - 1);
        return selected.toISOString();
      }
    }
    return now.toISOString();
  };

  const timeLabel = timeMode === 'now'
    ? (de ? 'Jetzt' : 'Now')
    : timeMode === 'minus15'
      ? '-15 Min'
      : timeMode === 'minus30'
        ? '-30 Min'
        : customTime;

  const chooseTime = (mode: TimeMode) => {
    setTimeMode(mode);
    if (mode === 'custom') {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    setTimeOpen(false);
  };

  const save = () => {
    if (savingRef.current || !trigger || !decision) return;
    savingRef.current = true;
    const event: SmokingEvent = {
      id: `smoke_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: eventTimestamp(),
      trigger,
      place: place || undefined,
      cravingIntensity: intensity || undefined,
      decisionType: decision,
      enjoyment: enjoyment || undefined,
      behavior: 'smoking',
      action: 'cigarette',
    };
    SmokingEventRepository.save(event);
    savedEventRef.current = event;
    JourneyRepository.update({
      controlScore: ControlScoreEngine.calculateScore(CravingEventRepository.getAll(), SmokingEventRepository.getAll()),
    });
    setSaved(true);
    closeTimerRef.current = setTimeout(() => onClose(event), 650);
  };

  const continueFlow = () => {
    if (!canContinue) return;
    if (isLast) save();
    else setStep((current) => current + 1);
  };

  const choices = (values: string[], selected: string, select: (value: string) => void) => (
    <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
      {values.map((value) => (
        <button key={value} type="button" onClick={() => select(value)} aria-pressed={selected === value} className={`min-h-12 rounded-xl border px-3 text-left text-sm font-semibold ${selected === value ? 'border-[#24584A] bg-[#E1EFE7] text-[#24584A]' : 'border-[#E5DACB] bg-[#FFFDF8] text-[#514B45]'}`}>
          {value}
        </button>
      ))}
    </div>
  );

  const headerTime = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setTimeOpen((open) => !open)}
        aria-expanded={timeOpen}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#D8D0C7] bg-[#FFFDF8] px-3 text-[11px] font-semibold text-[#514B45] shadow-[0_2px_8px_rgba(42,37,33,.04)] transition hover:border-[#BDB2A5]"
      >
        <Clock className="h-3.5 w-3.5 text-[#24584A]" />
        <span>{timeLabel}</span>
      </button>
      {timeOpen && (
        <div className="absolute right-0 top-11 z-30 w-48 rounded-2xl border border-[#E5DACB] bg-[#FFFDF8] p-2 shadow-[0_18px_36px_rgba(42,37,33,.16)]">
          <div className="grid gap-1">
            {([
              ['now', de ? 'Jetzt' : 'Now'],
              ['minus15', '-15 Min'],
              ['minus30', '-30 Min'],
              ['custom', de ? 'Freie Zeit' : 'Custom time'],
            ] as [TimeMode, string][]).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => chooseTime(mode)}
                className={`min-h-9 rounded-xl px-3 text-left text-xs font-semibold transition ${timeMode === mode ? 'bg-[#E1EFE7] text-[#24584A]' : 'text-[#514B45] hover:bg-[#F1EADF]'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {customOpen && (
            <div className="mt-2 border-t border-[#EEE5DA] pt-2">
              <input
                type="time"
                value={customTime}
                onChange={(event) => setCustomTime(event.target.value)}
                onBlur={() => {
                  setTimeMode('custom');
                  setTimeOpen(false);
                }}
                className="h-10 w-full rounded-xl border border-[#D8D0C7] bg-white px-3 text-sm font-semibold text-[#2A2521] outline-none focus:border-[#24584A]"
                aria-label={de ? 'Freie Uhrzeit' : 'Custom time'}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={() => onClose(savedEventRef.current || undefined)}
      closeDisabled={saved}
      title={de ? 'Zigarette erfassen' : 'Log cigarette'}
      badge={`${step + 1} / ${questions.length}`}
      headerAction={saved ? undefined : headerTime}
    >
      <div className="space-y-5 py-2 text-[#2A2521]">
        <div className="h-1.5 overflow-hidden rounded-full bg-[#EEE5DA]"><div className="h-full rounded-full bg-[#24584A] transition-all" style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>

        {saved ? (
          <div role="status" className="flex min-h-64 flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E1EFE7] text-[#24584A]"><Check className="h-7 w-7" /></div>
            <h2 className="text-xl font-bold">{de ? 'Erfasst.' : 'Logged.'}</h2>
            <p className="v19-body mt-2">{de ? 'Dieser echte Moment hilft Smoke Lab beim Lernen.' : 'This real moment helps Smoke Lab learn.'}</p>
          </div>
        ) : (
          <>
            {question === 'trigger' && <div className="space-y-4"><Question icon={<MousePointerClick />} title={de ? 'Was war direkt davor?' : 'What happened right before?'} hint={de ? 'Das hilft, mögliche Auslöser zu erkennen.' : 'This helps identify possible triggers.'} />{choices(TRIGGERS[locale], trigger, setTrigger)}</div>}
            {question === 'intensity' && <div className="space-y-4"><Question icon={<Gauge />} title={de ? 'Wie stark war der Drang?' : 'How strong was the urge?'} hint={de ? 'Eine grobe Einschätzung reicht.' : 'A rough estimate is enough.'} /><div className="grid grid-cols-5 gap-2">{[1,2,3,4,5,6,7,8,9,10].map((value) => <button key={value} type="button" onClick={() => setIntensity(value)} className={`min-h-12 rounded-xl text-sm font-bold ${intensity === value ? 'bg-[#24584A] text-white' : 'bg-[#F1EADF] text-[#5F5851]'}`}>{value}</button>)}</div><div className="flex justify-between v19-caption"><span>{de ? 'leicht' : 'mild'}</span><span>{de ? 'sehr stark' : 'very strong'}</span></div></div>}
            {question === 'place' && <div className="space-y-4"><Question icon={<MapPin />} title={de ? 'Wo warst du?' : 'Where were you?'} hint={de ? 'Wir fragen das erst, wenn genug erste Einträge da sind.' : 'We ask this only after enough early entries.'} />{choices(PLACES[locale], place, setPlace)}</div>}
            {question === 'decision' && <div className="space-y-4"><Question icon={<MousePointerClick />} title={de ? 'War die Zigarette eher automatisch?' : 'Was the cigarette mostly automatic?'} hint={de ? 'Es gibt keine richtige Antwort.' : 'There is no right answer.'} /><div className="grid grid-cols-2 gap-2"><Choice selected={decision === 'automatic'} onClick={() => setDecision('automatic')} label={de ? 'Ja, automatisch' : 'Yes, automatic'} /><Choice selected={decision === 'intentional'} onClick={() => setDecision('intentional')} label={de ? 'Nein, bewusst' : 'No, intentional'} /></div></div>}
            {question === 'enjoyment' && <div className="space-y-4"><Question icon={<Smile />} title={de ? 'Hast du sie genossen?' : 'Did you enjoy it?'} hint={de ? 'Diese Frage erscheint erst in einer späteren Lernphase.' : 'This question appears only in a later learning stage.'} /><div className="grid grid-cols-3 gap-2"><Choice selected={enjoyment === 'yes'} onClick={() => setEnjoyment('yes')} label={de ? 'Ja' : 'Yes'} /><Choice selected={enjoyment === 'partially'} onClick={() => setEnjoyment('partially')} label={de ? 'Teilweise' : 'Partly'} /><Choice selected={enjoyment === 'no'} onClick={() => setEnjoyment('no')} label={de ? 'Nein' : 'No'} /></div></div>}

            <div className="flex items-center gap-2 pt-1">
              {step > 0 && <button type="button" onClick={() => setStep((current) => current - 1)} className="flex min-h-[52px] w-[52px] items-center justify-center rounded-xl border border-[#E5DACB]" aria-label={de ? 'Zurück' : 'Back'}><ArrowLeft className="h-4 w-4" /></button>}
              <button type="button" id={isLast ? 'btn-save-smoking-event' : 'btn-next-smoking-question'} onClick={continueFlow} disabled={!canContinue} className="v19-primary-button disabled:cursor-not-allowed disabled:bg-[#D8D0C7] disabled:shadow-none">
                <span>{isLast ? (de ? 'Speichern' : 'Save') : (de ? 'Weiter' : 'Continue')}</span><ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </ModalSheet>
  );
};

const Question: React.FC<{ icon: React.ReactNode; title: string; hint: string }> = ({ icon, title, hint }) => (
  <div className="flex items-start gap-3"><div className="v19-small-icon bg-[#E1EFE7] text-[#24584A]">{icon}</div><div><h2 className="text-xl font-bold leading-tight">{title}</h2><p className="v19-body mt-1">{hint}</p></div></div>
);

const Choice: React.FC<{ selected: boolean; onClick: () => void; label: string }> = ({ selected, onClick, label }) => (
  <button type="button" onClick={onClick} aria-pressed={selected} className={`min-h-[52px] rounded-xl border px-3 text-sm font-semibold ${selected ? 'border-[#24584A] bg-[#E1EFE7] text-[#24584A]' : 'border-[#E5DACB] bg-[#FFFDF8] text-[#514B45]'}`}>{label}</button>
);
