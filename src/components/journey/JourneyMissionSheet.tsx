import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import type { GoalChoice } from '../../types';
import type { JourneyMissionView } from '../../services/behavior/JourneyEngine';

interface JourneyMissionSheetProps {
  isOpen: boolean;
  mission: JourneyMissionView | null;
  locale: 'en' | 'de';
  existingResponse?: string | number | string[];
  onClose: () => void;
  onComplete: (response?: string | number | string[], goal?: GoalChoice) => void;
  onPractice?: () => void;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');


export const JourneyMissionSheet: React.FC<JourneyMissionSheetProps> = ({
  isOpen,
  mission,
  locale,
  existingResponse,
  onClose,
  onComplete,
  onPractice,
}) => {
  const de = locale === 'de';
  const [textValue, setTextValue] = useState('');
  const [choiceValue, setChoiceValue] = useState('');
  const [numberValue, setNumberValue] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const submissionRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    submissionRef.current = false;
    setSubmitting(false);
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!submissionRef.current) onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
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

  useEffect(() => {
    if (!mission) return;
    setTextValue(
      typeof existingResponse === 'string'
        ? existingResponse
        : mission.suggestedResponse || ''
    );
    setChoiceValue(typeof existingResponse === 'string' ? existingResponse : '');
    setNumberValue(
      typeof existingResponse === 'number'
        ? existingResponse
        : mission.numberDefault || mission.numberMin || 1
    );
  }, [mission?.day, existingResponse, mission?.suggestedResponse, mission?.numberDefault, mission?.numberMin]);

  const progressPercent = useMemo(() => {
    if (!mission || mission.completionTarget <= 0) return 0;
    return Math.min(100, Math.round((mission.completionProgress / mission.completionTarget) * 100));
  }, [mission]);

  if (!isOpen || !mission) return null;

  const isInteractiveManual = ['goal', 'number', 'choice', 'text'].includes(mission.inputType);
  const canComplete = mission.completed
    ? false
    : mission.inputType === 'none' || mission.inputType === 'confirm'
      ? mission.completionReady
      : mission.inputType === 'text'
        ? textValue.trim().length >= 3
        : mission.inputType === 'choice' || mission.inputType === 'goal'
          ? Boolean(choiceValue)
          : mission.inputType === 'number';

  const submit = () => {
    if (!canComplete || submissionRef.current) return;
    submissionRef.current = true;
    setSubmitting(true);
    if (mission.inputType === 'goal') {
      onComplete(choiceValue as GoalChoice, choiceValue as GoalChoice);
      return;
    }
    if (mission.inputType === 'number') {
      onComplete(numberValue);
      return;
    }
    if (mission.inputType === 'choice') {
      onComplete(choiceValue);
      return;
    }
    if (mission.inputType === 'text') {
      onComplete(textValue.trim());
      return;
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#111315]/35 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="journey-mission-title">
      <div ref={panelRef} tabIndex={-1} aria-busy={submitting || undefined} className="w-full max-w-md rounded-t-[28px] bg-[#F4F3EF] border border-[#D9D9D4] shadow-[0_-20px_60px_rgba(17,19,21,0.18)] max-h-[88dvh] overflow-y-auto pb-[max(24px,env(safe-area-inset-bottom))] focus:outline-none">
        <div className="sticky top-0 z-10 bg-[#F4F3EF]/95 backdrop-blur border-b border-[#D9D9D4] px-6 py-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#747779]">
              {de ? `Tag ${String(mission.day).padStart(2, '0')} · Phase ${mission.phaseNumber}` : `Day ${String(mission.day).padStart(2, '0')} · Phase ${mission.phaseNumber}`}
            </div>
            <div className="font-ui text-xs text-[#747779]">{mission.phaseTitle}</div>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} disabled={submitting} className="h-11 w-11 -mr-2 inline-flex items-center justify-center rounded-full text-[#747779] hover:text-[#191B1C] disabled:opacity-40 disabled:cursor-not-allowed" aria-label={de ? 'Schließen' : 'Close'}>
            <X aria-hidden="true" className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6 text-[#191B1C]">
          <div className="space-y-2">
            <h2 id="journey-mission-title" className="font-display text-[34px] leading-[1.02] tracking-[-0.03em]">{mission.title}</h2>
            <p className="font-ui text-[13px] leading-relaxed text-[#747779]">{mission.objective}</p>
          </div>

          <div className="rounded-2xl bg-[#191B1C] p-4 text-[#F2F1ED] space-y-2.5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#B9BCBE]">
              {mission.personalized
                ? (de ? 'Warum heute genau das?' : 'Why this today?')
                : (de ? 'Warum dieser Test?' : 'Why this test?')}
            </div>
            {mission.personalized && mission.personalizationReason && (
              <p className="font-ui text-xs leading-relaxed text-[#F2F1ED]">{mission.personalizationReason}</p>
            )}
            <p className={`font-ui text-xs leading-relaxed ${mission.personalized ? 'text-[#B9BCBE]' : 'text-[#D7D8D6]'}`}>{mission.why}</p>
          </div>

          {(mission.inputType === 'none' || mission.inputType === 'confirm') && !mission.completed && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="font-ui text-xs font-medium text-[#191B1C]">
                  {de ? 'Was heute zählt' : 'What counts today'}
                </span>
                <span className="font-mono text-[10px] text-[#747779] tabular-nums">
                  {mission.completionProgress}/{mission.completionTarget}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#E1E1DC] overflow-hidden">
                <div className="h-full rounded-full bg-[#17372E] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="font-ui text-xs leading-relaxed text-[#747779]">{mission.completionHint}</p>
            </div>
          )}

          {mission.inputType === 'goal' && (
            <div className="space-y-2">
              {mission.options?.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setChoiceValue(option.value)}
                  disabled={mission.completed}
                  aria-pressed={choiceValue === option.value}
                  className={`w-full rounded-xl border px-4 py-3.5 text-left transition disabled:cursor-default ${choiceValue === option.value ? 'border-[#191B1C] bg-[#191B1C] text-[#F2F1ED]' : 'border-[#D9D9D4] bg-[#F8F7F3] text-[#191B1C]'}`}
                >
                  <span className="font-ui text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          )}

          {mission.inputType === 'choice' && (
            <div className="grid grid-cols-1 gap-2">
              {mission.options?.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setChoiceValue(option.value)}
                  disabled={mission.completed}
                  aria-pressed={choiceValue === option.value}
                  className={`rounded-xl border px-4 py-3 text-left transition disabled:cursor-default ${choiceValue === option.value ? 'border-[#191B1C] bg-[#191B1C] text-[#F2F1ED]' : 'border-[#D9D9D4] bg-[#F8F7F3] text-[#191B1C]'}`}
                >
                  <span className="font-ui text-xs font-medium">{option.label}</span>
                  {option.description && <span className="font-ui text-[11px] text-[#747779] block mt-1">{option.description}</span>}
                </button>
              ))}
            </div>
          )}

          {mission.inputType === 'number' && (
            <div className="rounded-2xl bg-[#E7E7E3] p-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setNumberValue((value) => Math.max(mission.numberMin || 1, value - 1))}
                  disabled={mission.completed}
                  className="w-12 h-12 rounded-full border border-[#D0D0CA] bg-[#F4F3EF] flex items-center justify-center disabled:opacity-40 disabled:cursor-default"
                  aria-label={de ? 'Weniger' : 'Decrease'}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <div className="text-5xl font-light tabular-nums leading-none">{numberValue}</div>
                  <div className="font-ui text-xs text-[#747779] mt-1">{mission.numberUnit}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setNumberValue((value) => Math.min(mission.numberMax || 99, value + 1))}
                  disabled={mission.completed}
                  className="w-12 h-12 rounded-full border border-[#D0D0CA] bg-[#F4F3EF] flex items-center justify-center disabled:opacity-40 disabled:cursor-default"
                  aria-label={de ? 'Mehr' : 'Increase'}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {mission.inputType === 'text' && (
            <div className="space-y-2">
              <textarea
                value={textValue}
                onChange={(event) => setTextValue(event.target.value)}
                readOnly={mission.completed}
                placeholder={mission.placeholder}
                rows={mission.day >= 28 ? 6 : 4}
                className="w-full resize-none rounded-2xl border border-[#D9D9D4] bg-[#F8F7F3] px-4 py-3 font-ui text-sm leading-relaxed text-[#191B1C] placeholder:text-[#9A9D9D] focus:outline-none focus:ring-1 focus:ring-[#191B1C]"
              />
              <p className="font-ui text-[11px] text-[#747779]">{mission.completionHint}</p>
            </div>
          )}

          {mission.completed ? (
            <div className="rounded-2xl bg-[#E7E7E3] p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#17372E] text-[#F2F1ED] flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <div className="font-ui text-sm font-medium">{de ? 'Dieser Lab-Tag ist abgeschlossen.' : 'This Lab day is complete.'}</div>
                <div className="font-ui text-xs text-[#747779] mt-0.5">{de ? 'Pausen oder spätere Rückkehr setzen nichts zurück.' : 'Pauses or returning later never reset anything.'}</div>
              </div>
            </div>
          ) : !isInteractiveManual && !canComplete ? (
            <button
              type="button"
              onClick={onPractice || onClose}
              className="w-full rounded-2xl px-5 py-4 font-ui text-sm font-semibold transition bg-[#191B1C] text-[#F2F1ED] shadow-[0_6px_20px_rgba(25,27,28,0.12)]"
            >
              {de ? 'Zu HEUTE · Mission anwenden' : 'Go to TODAY · use mission'}
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canComplete || submitting}
              className={`w-full rounded-2xl px-5 py-4 font-ui text-sm font-semibold transition ${canComplete && !submitting ? 'bg-[#191B1C] text-[#F2F1ED] shadow-[0_6px_20px_rgba(25,27,28,0.12)]' : 'bg-[#E7E7E3] text-[#9A9D9D] cursor-not-allowed'}`}
            >
              {isInteractiveManual
                ? (de ? 'Speichern & Lab-Tag abschließen' : 'Save & complete Lab day')
                : (de ? 'Lab-Tag abschließen' : 'Complete Lab day')}
            </button>
          )}

          <p className="font-ui text-[10.5px] leading-relaxed text-[#8A8D8E]">
            {de
              ? 'Missionen werden durch deinen Versuch abgeschlossen – nicht dadurch, ob du danach geraucht hast oder nicht.'
              : 'Missions are completed by making the attempt — not by whether or not you smoked afterward.'}
          </p>
        </div>
      </div>
    </div>
  );
};
