import React from 'react';
import { BarChart3, ChevronRight, Clock3, Settings, TrendingDown } from 'lucide-react';
import { UserProfile } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { CravingEventRepository, SmokingEventRepository } from '../../storage/repositories';
import { GoalSupportEngine } from '../../services/behavior/GoalSupportEngine';

interface ProgressDashboardProps {
  userProfile: UserProfile;
  dataVersion?: number;
  onOpenSettings: () => void;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ userProfile, dataVersion: _dataVersion, onOpenSettings }) => {
  const { locale } = useLanguage();
  const de = locale === 'de';
  const smokes = SmokingEventRepository.getAll();
  const cravings = CravingEventRepository.getAll();
  const todayCount = SmokingEventRepository.getToday().length;
  const comparison = GoalSupportEngine.baselineComparison(userProfile, smokes);
  const measuredPauses = cravings.filter((event) => typeof event.elapsedSeconds === 'number' && event.elapsedSeconds > 0);
  const averagePause = measuredPauses.length
    ? Math.round(measuredPauses.reduce((sum, event) => sum + (event.elapsedSeconds || 0), 0) / measuredPauses.length)
    : null;
  const comparisonLabel = comparison.recentAverage === null
    ? (de ? `Noch ${Math.max(0, 3 - comparison.daysObserved)} erfasste Tage bis zum Vergleich` : `${Math.max(0, 3 - comparison.daysObserved)} more tracked days until comparison`)
    : comparison.percentDifference === null
      ? (de ? 'Vergleich verfügbar' : 'Comparison available')
      : comparison.percentDifference <= 0
        ? (de ? `${Math.abs(comparison.percentDifference)} % unter deinem Startwert` : `${Math.abs(comparison.percentDifference)}% below your starting point`)
        : (de ? `${comparison.percentDifference} % über deinem Startwert` : `${comparison.percentDifference}% above your starting point`);

  return (
    <div className="v19-screen">
      <header className="v19-header">
        <div>
          <p className="v19-eyebrow">SMOKE LAB</p>
          <h1>{de ? 'Fortschritt' : 'Progress'}</h1>
        </div>
        <button type="button" onClick={onOpenSettings} className="v19-icon-tile" aria-label={de ? 'Profil und Einstellungen' : 'Profile and settings'}><Settings /></button>
      </header>

      <section className="v19-card space-y-4" aria-label={de ? 'Rückblick' : 'Review'}>
        <div className="flex items-start gap-3">
          <div className="v19-small-icon bg-[#E1EFE7] text-[#24584A]"><TrendingDown /></div>
          <div>
            <p className="v19-eyebrow">{de ? 'DEIN RÜCKBLICK' : 'YOUR REVIEW'}</p>
            <h2 className="mt-1 text-lg font-bold">{comparisonLabel}</h2>
          </div>
        </div>
        {comparison.recentAverage !== null && (
          <p className="v19-body">
            {de ? `Zuletzt Ø ${comparison.recentAverage} Zigaretten an erfassten Tagen; dein Startwert war ${comparison.baseline}.` : `Recently ${comparison.recentAverage} cigarettes on average per tracked day; your starting point was ${comparison.baseline}.`}
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3" aria-label={de ? 'Echte Kennzahlen' : 'Real metrics'}>
        <div className="v19-stat"><strong>{todayCount}</strong><span>{de ? 'Zigaretten heute' : 'cigarettes today'}</span></div>
        <div className="v19-stat"><strong>{smokes.length}</strong><span>{de ? 'Zigaretten erfasst' : 'cigarettes tracked'}</span></div>
        <div className="v19-stat"><strong>{cravings.length}</strong><span>{de ? 'Drangpausen' : 'urge pauses'}</span></div>
        <div className="v19-stat"><strong>{averagePause === null ? '—' : `${averagePause}s`}</strong><span>{de ? 'Ø Pause' : 'avg pause'}</span></div>
      </section>

      <section className="v19-card space-y-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-[#B85C3F]" aria-hidden="true" />
          <h2 className="text-base font-bold">{de ? 'Was diese Zahlen bedeuten' : 'What these numbers mean'}</h2>
        </div>
        <p className="v19-body">
          {comparison.recentAverage === null
            ? (de ? 'Smoke Lab wartet auf mindestens drei erfasste Tage, bevor es eine Entwicklung zeigt.' : 'Smoke Lab waits for at least three tracked days before showing a trend.')
            : (de ? 'Der Vergleich nutzt nur Tage mit echten Einträgen. Fehlende Tage werden nicht als rauchfrei gezählt.' : 'The comparison uses only days with real entries. Missing days are not counted as smoke-free.')}
        </p>
      </section>

      <button type="button" onClick={onOpenSettings} className="flex min-h-12 w-full items-center justify-between rounded-2xl px-4 text-sm font-semibold text-[#5F5851]">
        <span className="flex items-center gap-2"><Clock3 className="h-4 w-4" />{de ? 'Profil, Ziel und Daten' : 'Profile, goal and data'}</span>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};
