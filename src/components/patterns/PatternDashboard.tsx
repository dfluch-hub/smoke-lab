import React from 'react';
import { ArrowDown, ArrowRight, CircleDot, Lightbulb, Route } from 'lucide-react';
import { UserProfile } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatPlace, formatSituation } from '../../i18n/translations';
import { CravingEventRepository, SmokingEventRepository } from '../../storage/repositories';
import { NextBestActionEngine } from '../../services/behavior/NextBestActionEngine';
import { PatternEngine } from '../../services/behavior/PatternEngine';

interface PatternDashboardProps {
  userProfile: UserProfile;
  dataVersion?: number;
  onOpenCraving: () => void;
  onOpenSmoking: () => void;
}

export const PatternDashboard: React.FC<PatternDashboardProps> = ({ userProfile, dataVersion: _dataVersion, onOpenCraving, onOpenSmoking }) => {
  const { locale } = useLanguage();
  const de = locale === 'de';
  const smokes = SmokingEventRepository.getAll();
  const cravings = CravingEventRepository.getAll();
  const analysis = PatternEngine.analyze(smokes, cravings);
  const insight = PatternEngine.getLiveInsight(smokes, cravings, locale);
  const nextAction = NextBestActionEngine.generate(userProfile, smokes, cravings, locale);
  const hasData = analysis.totalObservations > 0;
  const topTrigger = analysis.topTriggers[0] || null;
  const topPlace = analysis.topPlaces[0] || null;
  const evidence = insight.evidence === 'established'
    ? (de ? 'Wiederholt beobachtet' : 'Repeatedly observed')
    : insight.evidence === 'emerging'
      ? (de ? 'Erstes Signal' : 'Early signal')
      : (de ? 'Wir sammeln noch' : 'Still learning');

  return (
    <div className="v19-screen">
      <header className="v19-header">
        <div>
          <p className="v19-eyebrow">SMOKE LAB</p>
          <h1>{de ? 'Mein Muster' : 'My pattern'}</h1>
        </div>
        <div className="v19-icon-tile" aria-hidden="true"><Lightbulb /></div>
      </header>

      <section className="v19-card space-y-3" aria-label={de ? 'Das haben wir gelernt' : 'What we learned'}>
        <div className="flex items-center justify-between gap-3">
          <p className="v19-eyebrow">{de ? 'DAS HABEN WIR GELERNT' : 'WHAT WE LEARNED'}</p>
          <span className="rounded-full bg-[#F1EADF] px-2.5 py-1 text-[10px] font-semibold text-[#6F655D]">{evidence}</span>
        </div>
        <h2 className="text-lg font-bold leading-snug">{insight.title}</h2>
        <p className="v19-body">{insight.text}</p>
        {topTrigger && (
          <div className="flex items-center gap-3 rounded-xl bg-[#FFF7ED] p-3">
            <CircleDot className="h-5 w-5 shrink-0 text-[#B85C3F]" aria-hidden="true" />
            <div>
              <strong className="block text-sm">{formatSituation(topTrigger.name, locale)}</strong>
              <span className="v19-caption">
                {de
                  ? `${topTrigger.count} ${topTrigger.count === 1 ? 'echter Eintrag' : 'echte Einträge'}`
                  : `${topTrigger.count} real ${topTrigger.count === 1 ? 'entry' : 'entries'}`}
              </span>
            </div>
          </div>
        )}
      </section>

      <div className="flex justify-center text-[#B7A99A]" aria-hidden="true"><ArrowDown className="h-5 w-5" /></div>

      <section className="v19-card v19-card-green space-y-4" aria-label={de ? 'Was daraus folgt' : 'What follows'}>
        <div className="flex items-start gap-3">
          <div className="v19-small-icon bg-white/70 text-[#24584A]"><Route /></div>
          <div>
            <p className="v19-eyebrow text-[#24584A]">{de ? 'DESHALB ALS NÄCHSTES' : 'THEREFORE, NEXT'}</p>
            <h2 className="mt-1 text-lg font-bold">{nextAction.title}</h2>
          </div>
        </div>
        <p className="v19-body">{nextAction.body}</p>
        <button type="button" onClick={hasData ? onOpenCraving : onOpenSmoking} className="v19-primary-button">
          <span>{hasData ? (de ? 'Beim nächsten Drang starten' : 'Start at the next urge') : (de ? 'Ersten Moment erfassen' : 'Track the first moment')}</span>
          <ArrowRight aria-hidden="true" />
        </button>
      </section>

      {(topPlace || analysis.uniqueDaysRecorded > 0) && (
        <details className="v19-details">
          <summary>{de ? 'Mehr zu deinen Einträgen' : 'More about your entries'}</summary>
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="v19-stat"><strong>{analysis.uniqueDaysRecorded}</strong><span>{de ? 'erfasste Tage' : 'days tracked'}</span></div>
            <div className="v19-stat"><strong>{topPlace ? formatPlace(topPlace.name, locale) : '—'}</strong><span>{de ? 'häufigster Ort' : 'top place'}</span></div>
          </div>
        </details>
      )}
    </div>
  );
};
