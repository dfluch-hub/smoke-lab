import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { SmokingEvent, LapseRecoveryRecord } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatPlace, formatSituation } from '../../i18n/translations';
import { LapseRecoveryRepository } from '../../storage/repositories';
import { QuitRecoveryEngine } from '../../services/behavior/QuitRecoveryEngine';
import { ModalSheet } from '../common/ModalSheet';

interface Props {
  isOpen: boolean;
  smokingEvent: SmokingEvent | null;
  onClose: () => void;
}

export const LapseRecoveryModal: React.FC<Props> = ({ isOpen, smokingEvent, onClose }) => {
  const { locale } = useLanguage();
  const [alcohol, setAlcohol] = useState<boolean | null>(null);
  const [help, setHelp] = useState<LapseRecoveryRecord['whatWouldHelp']>();
  const [nextStep, setNextStep] = useState<LapseRecoveryRecord['nextStep']>();
  const [saved, setSaved] = useState(false);
  const savingRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const existing = useMemo(() => smokingEvent ? LapseRecoveryRepository.getBySmokingEventId(smokingEvent.id) : null, [smokingEvent]);
  useEffect(() => {
    if (!isOpen || !smokingEvent) return;
    const prior = LapseRecoveryRepository.getBySmokingEventId(smokingEvent.id);
    setAlcohol(prior?.alcoholInvolved ?? null);
    setHelp(prior?.whatWouldHelp);
    setNextStep(prior?.nextStep);
    setSaved(false);
    savingRef.current = false;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [isOpen, smokingEvent?.id]);

  if (!isOpen || !smokingEvent) return null;

  const de = locale === 'de';
  const trigger = formatSituation(smokingEvent.trigger, locale);
  const place = smokingEvent.place ? formatPlace(smokingEvent.place, locale) : null;

  const save = () => {
    if (savingRef.current) return;
    savingRef.current = true;
    const record: LapseRecoveryRecord = {
      id: existing?.id || `recovery_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      smokingEventId: smokingEvent.id,
      createdAt: existing?.createdAt || new Date().toISOString(),
      trigger: smokingEvent.trigger,
      place: smokingEvent.place,
      cravingIntensity: smokingEvent.cravingIntensity,
      alcoholInvolved: alcohol ?? (smokingEvent.trigger.toLowerCase() === 'alcohol' || smokingEvent.trigger.toLowerCase() === 'alkohol'),
      whatWouldHelp: help,
      nextStep: nextStep || 'observe_next',
    };
    LapseRecoveryRepository.save(record);
    setSaved(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, 650);
  };

  const helpOptions: Array<[NonNullable<LapseRecoveryRecord['whatWouldHelp']>, string, string]> = [
    ['pause', 'Kurze Pause vorher', 'A short pause first'],
    ['location', 'Ort wechseln', 'Change location'],
    ['plan', 'Meinen Plan vorher öffnen', 'Open my plan first'],
    ['support', 'Unterstützung holen', 'Get support'],
    ['unsure', 'Noch unklar', 'Not sure yet'],
  ];
  const nextOptions: Array<[NonNullable<LapseRecoveryRecord['nextStep']>, string, string]> = [
    ['observe_next', 'Nächsten ähnlichen Moment nur beobachten', 'Observe the next similar moment'],
    ['repeat_with_plan', 'Ähnliche Situation mit Plan erneut testen', 'Retry a similar situation with a plan'],
    ['review_plan', 'Schutzplan anpassen', 'Adjust the protection plan'],
    ['professional_support', 'Zusätzliche Unterstützung erwägen', 'Consider additional support'],
  ];

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} closeDisabled={saved} title={de ? 'Dein Fortschritt bleibt' : 'Your progress remains'} badge={de ? 'Ausrutscher verstehen' : 'Understand the lapse'}>
      <div className="space-y-5 py-2 text-[#191B1C]">
        <div className="rounded-xl bg-[#191B1C] p-4 text-[#F2F1ED] space-y-1.5">
          <p className="font-display text-2xl leading-tight">{de ? 'Eine Zigarette löscht nichts.' : 'One cigarette erases nothing.'}</p>
          <p className="font-ui text-xs text-[#B9BCBE] leading-relaxed">
            {de ? 'Wir nutzen nur diese konkrete Situation, um den nächsten Schutzschritt besser vorzubereiten.' : 'We only use this specific situation to prepare the next protective step more clearly.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-[#E7E7E3]/70 p-3">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#747779]">{de ? 'Auslöser' : 'Trigger'}</span>
            <div className="text-xs font-medium mt-1">{trigger}</div>
          </div>
          <div className="rounded-xl bg-[#E7E7E3]/70 p-3">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#747779]">{de ? 'Ort' : 'Place'}</span>
            <div className="text-xs font-medium mt-1">{place || '—'}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-ui text-xs font-medium">{de ? 'War Alkohol beteiligt?' : 'Was alcohol involved?'}</div>
          <div className="grid grid-cols-3 gap-2">
            {[[true, de?'Ja':'Yes'], [false, de?'Nein':'No'], [null, de?'Unklar':'Unsure']].map(([value,label]) => (
              <button key={String(value)} onClick={() => setAlcohol(value as boolean|null)} className={`rounded-xl border py-2.5 text-xs ${alcohol===value ? 'bg-[#191B1C] text-[#F2F1ED] border-[#191B1C]' : 'border-[#D9D9D4] bg-[#E7E7E3]/50'}`}>{String(label)}</button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-ui text-xs font-medium">{de ? 'Was hätte in diesem Moment eher geholfen?' : 'What might have helped more in that moment?'}</div>
          <div className="flex flex-wrap gap-1.5">
            {helpOptions.map(([value,deLabel,enLabel]) => (
              <button key={value} onClick={() => setHelp(value)} className={`rounded-lg px-3 py-2 text-xs ${help===value ? 'bg-[#191B1C] text-[#F2F1ED]' : 'bg-[#E7E7E3] text-[#191B1C]'}`}>{de ? deLabel : enLabel}</button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-ui text-xs font-medium">{de ? 'Was ist jetzt der sinnvollste nächste Schritt?' : 'What is the most useful next step now?'}</div>
          <div className="space-y-1.5">
            {nextOptions.map(([value,deLabel,enLabel]) => (
              <button key={value} onClick={() => setNextStep(value)} className={`w-full text-left rounded-xl border px-3 py-2.5 text-xs ${nextStep===value ? 'border-[#191B1C] bg-[#191B1C] text-[#F2F1ED]' : 'border-[#D9D9D4] bg-[#F8F7F3]'}`}>{de ? deLabel : enLabel}</button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-[#747779] leading-relaxed">
          {nextStep ? QuitRecoveryEngine.recoveryMessage({ id:'preview', smokingEventId:smokingEvent.id, createdAt:'', trigger:smokingEvent.trigger, nextStep }, locale) : (de ? 'Kein Reset. Keine verlorenen Tage. Nur ein weiterer Datenpunkt für deinen Plan.' : 'No reset. No lost days. Just another data point for your plan.')}
        </p>

        <button type="button" onClick={save} disabled={saved} className="w-full rounded-xl bg-[#191B1C] py-3.5 text-xs font-semibold text-[#F2F1ED] disabled:opacity-60 flex items-center justify-center gap-2">
          {saved && <Check className="w-4 h-4" />}{saved ? (de ? 'Gespeichert' : 'Saved') : (de ? 'Nächsten Schritt speichern' : 'Save next step')}
        </button>
      </div>
    </ModalSheet>
  );
};
