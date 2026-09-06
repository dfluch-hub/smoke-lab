import { CravingEvent, SmokingEvent, UserProfile } from '../../types';
import { ControlScoreEngine } from './ControlScoreEngine';
import { PatternEngine } from './PatternEngine';
import { formatSituation } from '../../i18n/translations';

export interface WeeklyReviewMetric {
  id: string;
  value: string;
  labelDe: string;
  labelEn: string;
  detailDe?: string;
  detailEn?: string;
}

export interface WeeklyReview {
  ready: boolean;
  currentWindowStart: string;
  currentWindowEnd: string;
  activeDays: number;
  observationCount: number;
  headlineDe: string;
  headlineEn: string;
  summaryDe: string;
  summaryEn: string;
  metrics: WeeklyReviewMetric[];
  signalDe?: string;
  signalEn?: string;
  nextFocusDe: string;
  nextFocusEn: string;
  comparisonAvailable: boolean;
}

const DAY_MS = 86400000;
const validTime = (timestamp: string): number => {
  const n = new Date(timestamp).getTime();
  return Number.isFinite(n) ? n : 0;
};
const dayKey = (timestamp: string): string => {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return timestamp.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const formatDate = (timestamp: number, locale: 'de' | 'en') =>
  new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: 'short' }).format(new Date(timestamp));

/**
 * A descriptive seven-day reflection based only on locally recorded data.
 * It deliberately avoids claiming treatment effects or causal change.
 */
export class WeeklyReviewEngine {
  static build(
    profile: UserProfile,
    smokingEvents: SmokingEvent[] = [],
    cravingEvents: CravingEvent[] = [],
    now: Date = new Date(),
  ): WeeklyReview {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    const start = end - 7 * DAY_MS + 1;
    const previousStart = start - 7 * DAY_MS;
    const previousEnd = start - 1;

    const currentSmokes = smokingEvents.filter((e) => {
      const t = validTime(e.timestamp); return t >= start && t <= end;
    });
    const currentCravings = cravingEvents.filter((e) => {
      const t = validTime(e.timestamp); return t >= start && t <= end;
    });
    const previousSmokes = smokingEvents.filter((e) => {
      const t = validTime(e.timestamp); return t >= previousStart && t <= previousEnd;
    });
    const previousCravings = cravingEvents.filter((e) => {
      const t = validTime(e.timestamp); return t >= previousStart && t <= previousEnd;
    });

    const linkedSmokingIds = new Set(currentCravings.map((e) => e.linkedSmokingEventId).filter(Boolean) as string[]);
    const observationCount = currentCravings.length + currentSmokes.filter((e) => !linkedSmokingIds.has(e.id)).length;
    const activeDays = new Set([...currentSmokes.map((e) => dayKey(e.timestamp)), ...currentCravings.map((e) => dayKey(e.timestamp))]).size;
    const ready = observationCount >= 5 || activeDays >= 3;

    const reassessed = currentCravings.filter((e) => Boolean(e.outcome));
    const helpful = reassessed.filter((e) => e.outcome === 'gone' || e.outcome === 'weaker');
    const interrupted = currentCravings.filter((e) => Boolean(e.interrupted) || (e.outcome && e.outcome !== 'smoked'));
    const intensityValues = currentCravings.map((e) => e.initialIntensity).filter((v) => typeof v === 'number');
    const avgUrge = intensityValues.length
      ? Math.round((intensityValues.reduce((a, b) => a + b, 0) / intensityValues.length) * 10) / 10
      : null;
    const intentional = currentSmokes.filter((e) => e.decisionType === 'intentional').length;
    const intentionalRate = currentSmokes.length ? Math.round((intentional / currentSmokes.length) * 100) : null;
    const helpfulRate = reassessed.length ? Math.round((helpful.length / reassessed.length) * 100) : null;
    const controlScore = ControlScoreEngine.calculateScore(currentCravings, currentSmokes);

    const currentAnalysis = PatternEngine.analyze(currentSmokes, currentCravings);
    const previousAnalysis = PatternEngine.analyze(previousSmokes, previousCravings);
    const comparisonAvailable = previousSmokes.length + previousCravings.length >= 3;

    let signalDe: string | undefined;
    let signalEn: string | undefined;
    if (currentAnalysis.strongestTrigger) {
      const trigger = currentAnalysis.strongestTrigger.name;
      signalDe = `${formatSituation(trigger, 'de')} war in deinen Einträgen dieser Woche der häufigste erfasste Auslöser (${currentAnalysis.strongestTrigger.count}×).`;
      signalEn = `${formatSituation(trigger, 'en')} was the most frequently logged cue in your entries this week (${currentAnalysis.strongestTrigger.count}×).`;
    } else if (helpfulRate !== null && reassessed.length >= 3) {
      signalDe = `${helpful.length} von ${reassessed.length} Neubewertungen endeten mit schwächerem oder verschwundenem Drang.`;
      signalEn = `${helpful.length} of ${reassessed.length} reassessments ended with a weaker or gone urge.`;
    }

    if (comparisonAvailable && currentSmokes.length && previousSmokes.length) {
      const diff = currentSmokes.length - previousSmokes.length;
      if (diff < 0) {
        signalDe = `Du hast ${Math.abs(diff)} weniger Zigaretten protokolliert als im vorherigen 7-Tage-Fenster. Das beschreibt deine Logs, nicht automatisch eine stabile Veränderung.`;
        signalEn = `You logged ${Math.abs(diff)} fewer cigarettes than in the previous 7-day window. This describes your logs, not necessarily a stable change.`;
      } else if (diff > 0) {
        signalDe = `Du hast ${diff} mehr Zigaretten protokolliert als im vorherigen 7-Tage-Fenster. Smoke Lab nutzt das als Kontext, nicht als Bewertung.`;
        signalEn = `You logged ${diff} more cigarettes than in the previous 7-day window. Smoke Lab uses that as context, not judgement.`;
      }
    }

    let nextFocusDe = 'Erfasse weiter echte Situationen. Wiederholung macht Muster besser vergleichbar.';
    let nextFocusEn = 'Keep capturing real situations. Repetition makes patterns easier to compare.';
    if (currentAnalysis.strongestTrigger) {
      nextFocusDe = `Beobachte in der nächsten Woche besonders Situationen mit ${formatSituation(currentAnalysis.strongestTrigger.name, 'de')}. Teste dort bewusst nur eine Veränderung auf einmal.`;
      nextFocusEn = `Next week, pay particular attention to situations involving ${formatSituation(currentAnalysis.strongestTrigger.name, 'en')}. Test only one change at a time there.`;
    }
    if (previousAnalysis.strongestTrigger && currentAnalysis.strongestTrigger && previousAnalysis.strongestTrigger.name === currentAnalysis.strongestTrigger.name) {
      nextFocusDe = `${formatSituation(currentAnalysis.strongestTrigger.name, 'de')} taucht über zwei Zeitfenster wiederholt auf. Das ist ein guter Kandidat für einen gezielten persönlichen Test.`;
      nextFocusEn = `${formatSituation(currentAnalysis.strongestTrigger.name, 'en')} appears repeatedly across two time windows. It is a good candidate for a targeted personal test.`;
    }

    return {
      ready,
      currentWindowStart: formatDate(start, profile.preferredLanguage),
      currentWindowEnd: formatDate(end, profile.preferredLanguage),
      activeDays,
      observationCount,
      headlineDe: ready ? 'Was diese Woche sichtbar wurde' : 'Deine Woche nimmt Form an',
      headlineEn: ready ? 'What became visible this week' : 'Your week is taking shape',
      summaryDe: ready
        ? 'Ein kurzer Rückblick auf deine eigenen Einträge – ohne Streak, Urteil oder erfundene Trends.'
        : 'Noch fehlen ein paar echte Situationen für einen sinnvollen Wochenvergleich.',
      summaryEn: ready
        ? 'A short reflection on your own entries — without streaks, judgement, or invented trends.'
        : 'A few more real situations are needed for a useful weekly comparison.',
      metrics: [
        { id: 'smokes', value: String(currentSmokes.length), labelDe: 'Zigaretten geloggt', labelEn: 'Cigarettes logged' },
        { id: 'interruptions', value: String(interrupted.length), labelDe: 'Schleifen unterbrochen', labelEn: 'Loops interrupted' },
        { id: 'urge', value: avgUrge === null ? '—' : `${avgUrge}/10`, labelDe: 'Ø Drang', labelEn: 'Avg urge' },
        { id: 'intentional', value: intentionalRate === null ? '—' : `${intentionalRate}%`, labelDe: 'bewusst entschieden', labelEn: 'intentional' },
        { id: 'helpful', value: helpfulRate === null ? '—' : `${helpfulRate}%`, labelDe: 'Neubewertung schwächer/weg', labelEn: 'reassessed weaker/gone' },
        { id: 'control', value: String(controlScore), labelDe: 'Control Score im Fenster', labelEn: 'Control Score in window' },
      ],
      signalDe,
      signalEn,
      nextFocusDe,
      nextFocusEn,
      comparisonAvailable,
    };
  }
}
