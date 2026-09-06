import React from 'react';
import { ArrowRight, Brain, CheckCircle2, Cigarette, Sparkles } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SmokingEventRepository } from '../../storage/repositories';

interface SmokingDashboardProps {
  dataVersion?: number;
  onLogSmoking: () => void;
}

export const SmokingDashboard: React.FC<SmokingDashboardProps> = ({ dataVersion: _dataVersion, onLogSmoking }) => {
  const { locale } = useLanguage();
  const de = locale === 'de';
  const events = SmokingEventRepository.getAll();
  const todayCount = SmokingEventRepository.getToday().length;
  const learningStage = events.length < 3 ? 1 : events.length < 7 ? 2 : 3;
  const learningCopy = learningStage === 1
    ? (de ? 'Was passiert direkt vor einer Zigarette?' : 'What happens right before a cigarette?')
    : learningStage === 2
      ? (de ? 'Wie stark ist das Verlangen in verschiedenen Situationen?' : 'How strong is the urge in different situations?')
      : (de ? 'Wo und wann wiederholt sich dein Rauchen?' : 'Where and when does your smoking repeat?');

  return (
    <div className="v19-screen">
      <header className="v19-header">
        <div>
          <p className="v19-eyebrow">SMOKE LAB</p>
          <h1>{de ? 'Rauchen erfassen' : 'Track smoking'}</h1>
        </div>
        <div className="v19-icon-tile" aria-hidden="true"><Cigarette /></div>
      </header>

      <section className="v19-card v19-card-accent space-y-4" aria-label={de ? 'Zigarette erfassen' : 'Log a cigarette'}>
        <div className="space-y-1">
          <p className="v19-eyebrow text-[#7B4B36]">{de ? 'SCHNELL & WERTUNGSFREI' : 'QUICK & JUDGEMENT-FREE'}</p>
          <h2 className="text-xl font-bold text-[#2A2521]">{de ? 'Gerade geraucht?' : 'Just smoked?'}</h2>
          <p className="v19-body">{de ? 'Eine Frage nach der anderen. Meist dauert es weniger als 30 Sekunden.' : 'One question at a time. It usually takes less than 30 seconds.'}</p>
        </div>
        <button type="button" id="btn-start-smoking-log" onClick={onLogSmoking} className="v19-primary-button">
          <span>{de ? 'Zigarette erfassen' : 'Log cigarette'}</span>
          <ArrowRight aria-hidden="true" />
        </button>
      </section>

      <section className="v19-card space-y-4" aria-label={de ? 'So lernt Smoke Lab' : 'How Smoke Lab learns'}>
        <div className="flex items-start gap-3">
          <div className="v19-small-icon bg-[#E1EFE7] text-[#24584A]"><Brain /></div>
          <div className="min-w-0">
            <p className="v19-eyebrow">{de ? `LERNPHASE ${learningStage}` : `LEARNING STAGE ${learningStage}`}</p>
            <h2 className="mt-1 text-base font-bold">{de ? 'Das lernen wir gerade' : 'What we are learning now'}</h2>
            <p className="v19-body mt-1">{learningCopy}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-[#ECE3D8] pt-4">
          <div><strong className="block text-xl">{todayCount}</strong><span className="v19-caption">{de ? 'heute' : 'today'}</span></div>
          <div><strong className="block text-xl">{events.length}</strong><span className="v19-caption">{de ? 'gesamt' : 'total'}</span></div>
          <div className="flex items-center gap-1 text-[#24584A]"><CheckCircle2 className="h-4 w-4" /><span className="v19-caption text-[#24584A]">{de ? 'lokal' : 'on device'}</span></div>
        </div>
      </section>

      <section className="flex items-start gap-3 rounded-2xl bg-[#F1EADF] p-4">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#B85C3F]" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-[#5F5851]">
          {de ? 'Jeder echte Eintrag hilft: Erst vergleichen wir Situationen, dann schlagen wir eine passende Veränderung vor.' : 'Every real entry helps: first we compare situations, then we suggest a fitting change.'}
        </p>
      </section>
    </div>
  );
};
