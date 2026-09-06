import { CravingEvent, JourneyProgress, PersonalExperiment, SmokingEvent, UserProfile } from '../../types';
import { PersonalControlModelEngine } from './PersonalControlModelEngine';
import { PatternEngine } from './PatternEngine';
import { formatPlace, formatSituation } from '../../i18n/translations';
import { JourneyLifecycleEngine } from './JourneyLifecycleEngine';

export interface MaintenancePlan {
  active: boolean;
  weekNumber: number;
  titleDe: string;
  titleEn: string;
  focusDe: string;
  focusEn: string;
  actionsDe: string[];
  actionsEn: string[];
  checkInDe: string;
  checkInEn: string;
}

export class MaintenanceEngine {
  static build(
    profile: UserProfile,
    progress: JourneyProgress,
    smokingEvents: SmokingEvent[] = [],
    cravingEvents: CravingEvent[] = [],
    experiments: PersonalExperiment[] = [],
    now: Date = new Date(),
  ): MaintenancePlan {
    const completed = JourneyLifecycleEngine.isComplete(progress);
    if (!completed) {
      return {
        active: false,
        weekNumber: 0,
        titleDe: 'Maintenance beginnt nach Tag 30',
        titleEn: 'Maintenance begins after Day 30',
        focusDe: 'Dein 30-Tage-Labor läuft noch.',
        focusEn: 'Your 30-day Lab is still in progress.',
        actionsDe: [], actionsEn: [], checkInDe: '', checkInEn: '',
      };
    }

    const completedTimestamp = JourneyLifecycleEngine.completionTimestamp(progress);
    const completedAt = new Date(completedTimestamp || now.toISOString()).getTime();
    const elapsedWeeks = Math.max(0, Math.floor((now.getTime() - completedAt) / (7 * 86400000)));
    const weekNumber = elapsedWeeks + 1;
    const model = PersonalControlModelEngine.build(profile, smokingEvents, cravingEvents, experiments);
    const loop = model.primaryLoop;
    const strategy = model.strategies[0];
    const rawTrigger = loop ? loop.trigger : model.strongestTrigger;
    const triggerDe = rawTrigger ? formatSituation(rawTrigger, 'de') : null;
    const triggerEn = rawTrigger ? formatSituation(rawTrigger, 'en') : null;

    const actionsDe: string[] = [];
    const actionsEn: string[] = [];
    if (triggerDe) {
      actionsDe.push(`Beobachte diese Woche mindestens eine echte ${triggerDe}-Situation bewusst.`);
      actionsEn.push(`Deliberately observe at least one real ${triggerEn} situation this week.`);
    } else {
      actionsDe.push('Erfasse diese Woche mindestens zwei echte Drang-Momente.');
      actionsEn.push('Capture at least two real urge moments this week.');
    }
    if (strategy && strategy.attempts >= 3) {
      actionsDe.push('Nutze deine bisher hilfreichste Strategie einmal in einer passenden Situation und bewerte danach neu.');
      actionsEn.push('Use your most helpful strategy so far once in a matching situation, then reassess.');
    } else {
      actionsDe.push('Teste bei einem Drang bewusst eine kurze Unterbrechung und bewerte den Drang danach neu.');
      actionsEn.push('Deliberately test one brief interruption during an urge and reassess afterward.');
    }
    if (profile.goal === 'reduce') {
      actionsDe.push('Bewerte Reduktion über mehrere erfasste Tage, nicht über einen einzelnen „guten“ oder „schlechten“ Tag.');
      actionsEn.push('Evaluate reduction across several logged days, not through one “good” or “bad” day.');
    } else if (profile.goal === 'quit') {
      actionsDe.push('Wenn eine ungeplante Zigarette passiert, ordne die Situation ein und kehre zum Schutzplan zurück – ohne Reset.');
      actionsEn.push('If an unplanned cigarette happens, review the situation and return to the protection plan — without a reset.');
    } else {
      actionsDe.push('Passe deinen Control Plan nur an, wenn neue Daten ein wiederkehrendes Signal zeigen.');
      actionsEn.push('Only adjust your Control Plan when new data shows a recurring signal.');
    }

    const analysis = PatternEngine.analyze(smokingEvents, cravingEvents);
    const focusDe = loop
      ? `Diese Woche schützt du vor allem deine aktuell klarste Schleife: ${formatSituation(loop.trigger, 'de')}${loop.place ? ` · ${formatPlace(loop.place, 'de')}` : ''}.`
      : 'Diese Woche geht es nicht um mehr Aufgaben, sondern darum, dein persönliches Muster aktuell zu halten.';
    const focusEn = loop
      ? `This week you mainly protect your clearest current loop: ${formatSituation(loop.trigger, 'en')}${loop.place ? ` · ${formatPlace(loop.place, 'en')}` : ''}.`
      : 'This week is not about more tasks; it is about keeping your personal pattern map current.';

    return {
      active: true,
      weekNumber,
      titleDe: `Maintenance · Woche ${weekNumber}`,
      titleEn: `Maintenance · Week ${weekNumber}`,
      focusDe,
      focusEn,
      actionsDe,
      actionsEn,
      checkInDe: analysis.totalObservations >= 5
        ? 'Einmal pro Woche reicht: Was hat sich wiederholt, was hat geholfen, was ist noch offen?'
        : 'Ein kurzer Wochencheck genügt. Smoke Lab braucht keine tägliche Perfektion.',
      checkInEn: analysis.totalObservations >= 5
        ? 'Once a week is enough: what repeated, what helped, and what remains open?'
        : 'A short weekly check-in is enough. Smoke Lab does not require daily perfection.',
    };
  }
}
