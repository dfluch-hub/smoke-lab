import React, { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SmokingEvent, DecisionType, EnjoymentRating } from '../../types';
import { SmokingEventRepository, CravingEventRepository, JourneyRepository } from '../../storage/repositories';
import { ControlScoreEngine } from '../../services/behavior/ControlScoreEngine';
import { ModalSheet } from '../common/ModalSheet';

interface QuickSmokingLogModalProps {
  isOpen: boolean;
  onClose: (savedEvent?: SmokingEvent) => void;
}

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

export const QuickSmokingLogModal: React.FC<QuickSmokingLogModalProps> = ({ isOpen, onClose }) => {
  const { t, locale } = useLanguage();

  const triggerOptions = locale === 'de' ? TRIGGER_OPTIONS_DE : TRIGGER_OPTIONS_EN;
  const contextOptions = locale === 'de' ? CONTEXT_OPTIONS_DE : CONTEXT_OPTIONS_EN;

  const [selectedTrigger, setSelectedTrigger] = useState<string>('');
  const [selectedPlace, setSelectedPlace] = useState<string>('');
  const [intensity, setIntensity] = useState<number | null>(null);
  const [decisionType, setDecisionType] = useState<DecisionType | null>(null);
  const [enjoyment, setEnjoyment] = useState<EnjoymentRating | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const savingRef = useRef(false);
  const savedEventRef = useRef<SmokingEvent | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setSelectedTrigger('');
      setSelectedPlace('');
      setIntensity(null);
      setDecisionType(null);
      setEnjoyment(null);
      setIsSaved(false);
      savingRef.current = false;
      savedEventRef.current = null;
    }
  }, [isOpen, locale]);

  if (!isOpen) return null;

  const canSave = Boolean(selectedTrigger && intensity && decisionType);

  const handleSave = () => {
    if (savingRef.current || !selectedTrigger || !intensity || !decisionType) return;
    savingRef.current = true;

    const newEvent: SmokingEvent = {
      id: `smoke_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      trigger: selectedTrigger,
      place: selectedPlace || undefined,
      cravingIntensity: intensity,
      decisionType: decisionType,
      enjoyment: enjoyment || undefined,
      behavior: 'smoking',
      action: 'cigarette',
    };

    // 1. Save to repository
    SmokingEventRepository.save(newEvent);
    savedEventRef.current = newEvent;

    // 2. Update Control Score
    const allSmokes = SmokingEventRepository.getAll();
    const allCravings = CravingEventRepository.getAll();
    const newScore = ControlScoreEngine.calculateScore(allCravings, allSmokes);
    JourneyRepository.update({ controlScore: newScore });

    setIsSaved(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose(newEvent);
    }, 450);
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={() => onClose(savedEventRef.current || undefined)}
      closeDisabled={isSaved}
      title={t('smokedLogTitle')}
      badge={locale === 'de' ? 'Wertungsfrei' : 'Objective log'}
    >
      <div className="space-y-5 py-2 text-[#191B1C]">
        {/* Intro philosophy */}
        <p className="text-xs sm:text-[13px] text-[#747779] leading-relaxed">
          {t('smokedLogIntro')}
        </p>

        {/* 1. Trigger Cue */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#747779] block">
            {t('smokedLogTriggerLabel')}
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
            {triggerOptions.map((trig) => {
              const isSelected = selectedTrigger === trig;
              return (
                <button
                  key={trig}
                  type="button"
                  onClick={() => setSelectedTrigger(trig)}
                  className={`btn-tactile px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    isSelected
                      ? 'bg-[#191B1C] text-[#F2F1ED]'
                      : 'bg-[#E7E7E3] text-[#191B1C] hover:bg-[#D9D9D4]'
                  }`}
                >
                  {trig}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Context / Place */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#747779] block">
            {t('smokedLogPlaceLabel')}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {contextOptions.map((ctx) => {
              const isSelected = selectedPlace === ctx;
              return (
                <button
                  key={ctx}
                  type="button"
                  onClick={() => setSelectedPlace(ctx)}
                  className={`btn-tactile px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    isSelected
                      ? 'bg-[#191B1C] text-[#F2F1ED]'
                      : 'bg-[#E7E7E3] text-[#191B1C] hover:bg-[#D9D9D4]'
                  }`}
                >
                  {ctx}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Craving Intensity (1-10) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#747779]">
              {t('smokedLogIntensityLabel')}
            </label>
            <span className="text-xs font-mono font-semibold text-[#191B1C]">
              {intensity ? `${intensity} / 10` : '—'}
            </span>
          </div>
          <div className="grid grid-cols-10 gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setIntensity(num)}
                className={`h-8 rounded-md text-xs font-mono font-medium transition ${
                  intensity === num
                    ? 'bg-[#191B1C] text-[#F2F1ED]'
                    : 'bg-[#E7E7E3] text-[#747779] hover:bg-[#D9D9D4] hover:text-[#191B1C]'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Decision: Automatic vs Conscious */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#747779] block">
            {t('smokedLogDecisionLabel')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDecisionType('automatic')}
              className={`btn-tactile p-3 rounded-xl text-xs font-medium border text-center transition ${
                decisionType === 'automatic'
                  ? 'border-[#191B1C] bg-[#191B1C] text-[#F2F1ED]'
                  : 'border-[#D9D9D4] bg-[#E7E7E3]/60 text-[#191B1C] hover:bg-[#E7E7E3]'
              }`}
            >
              {t('decisionAutomatic')}
            </button>
            <button
              type="button"
              onClick={() => setDecisionType('intentional')}
              className={`btn-tactile p-3 rounded-xl text-xs font-medium border text-center transition ${
                decisionType === 'intentional'
                  ? 'border-[#191B1C] bg-[#191B1C] text-[#F2F1ED]'
                  : 'border-[#D9D9D4] bg-[#E7E7E3]/60 text-[#191B1C] hover:bg-[#E7E7E3]'
              }`}
            >
              {t('decisionIntentional')}
            </button>
          </div>
        </div>

        {/* 5. Enjoyment */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#747779] block">
            {t('smokedLogEnjoymentLabel')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['yes', 'partially', 'no'] as EnjoymentRating[]).map((rating) => {
              const isSelected = enjoyment === rating;
              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setEnjoyment(rating)}
                  className={`btn-tactile py-2.5 rounded-xl text-xs font-medium border text-center transition ${
                    isSelected
                      ? 'border-[#191B1C] bg-[#191B1C] text-[#F2F1ED]'
                      : 'border-[#D9D9D4] bg-[#E7E7E3]/60 text-[#191B1C] hover:bg-[#E7E7E3]'
                  }`}
                >
                  {rating === 'yes'
                    ? t('enjoymentYes')
                    : rating === 'partially'
                    ? t('enjoymentPartially')
                    : t('enjoymentNo')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="button"
            id="btn-save-smoking-event"
            onClick={handleSave}
            disabled={isSaved || !canSave}
            className={`btn-tactile w-full rounded-xl py-3.5 text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-2 ${
              canSave && !isSaved
                ? 'bg-[#191B1C] text-[#F2F1ED] hover:bg-[#232627]'
                : 'bg-[#D9D9D4] text-[#747779] cursor-not-allowed'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4 text-[#F2F1ED]" />
                <span>{t('smokedLogSavedToast')}</span>
              </>
            ) : (
              <span>{t('saveEntry')}</span>
            )}
          </button>
        </div>
      </div>
    </ModalSheet>
  );
};
