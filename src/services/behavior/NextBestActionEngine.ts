import { CravingEvent, NextBestAction, SmokingEvent, UserProfile } from '../../types';
import { formatPlace, formatSituation } from '../../i18n/translations';
import { BehaviorInterventionEngine } from './BehaviorInterventionEngine';
import { PatternEngine } from './PatternEngine';
import { getInterventionById } from './interventionLibrary';

/**
 * Converts real on-device observations into one small, testable next action.
 *
 * Important: this is a deterministic product recommendation engine, not a
 * clinical prediction model. It deliberately prefers cautious wording and
 * minimum evidence thresholds over impressive-looking guesses.
 */
export class NextBestActionEngine {
  private static actionForIntervention(
    interventionId: string,
    trigger: string,
    locale: 'en' | 'de',
    place?: string
  ): { title: string; body: string } {
    const triggerLabel = formatSituation(trigger, locale);
    const placeLabel = place ? formatPlace(place, locale) : undefined;

    const de = locale === 'de';
    switch (interventionId) {
      case 'COFFEE_SEPARATION':
        return {
          title: de ? 'Der nächste Kaffee wird zum Test.' : 'Turn your next coffee into a test.',
          body: de
            ? `Behalte den Kaffee. Öffne Smoke Lab vor der Zigarette und trenne nur die beiden Momente voneinander${placeLabel ? ` – besonders ${placeLabel}` : ''}.`
            : `Keep the coffee. Open Smoke Lab before the cigarette and separate only those two moments${placeLabel ? ` — especially at ${placeLabel}` : ''}.`,
        };
      case 'AFTER_MEAL_RESET':
        return {
          title: de ? 'Ändere nur den Abschluss.' : 'Change only the ending.',
          body: de
            ? 'Nach der nächsten Mahlzeit: steh auf, wechsle Raum oder Tätigkeit und entscheide erst danach über die Zigarette.'
            : 'After your next meal, stand up, change room or activity, and only then decide about the cigarette.',
        };
      case 'HANDS_BUSY':
        return {
          title: de ? 'Gib dem Autopiloten Konkurrenz.' : 'Give autopilot some competition.',
          body: de
            ? `Beim nächsten ${triggerLabel}-Moment: beschäftige deine Hände drei Minuten und prüfe danach den Drang erneut.`
            : `At your next ${triggerLabel.toLowerCase()} moment, keep your hands busy for three minutes and reassess the urge afterward.`,
        };
      case 'CHANGE_LOCATION':
        return {
          title: de ? 'Verändere den Ort, nicht die Entscheidung.' : 'Change the place, not the decision.',
          body: de
            ? `Wenn ${triggerLabel} wieder auftaucht${placeLabel ? ` (${placeLabel})` : ''}, wechsle kurz den Ort, bevor du entscheidest.`
            : `When ${triggerLabel.toLowerCase()} appears again${placeLabel ? ` (${placeLabel})` : ''}, briefly change location before deciding.`,
        };
      case 'BREAK_ROUTINE':
        return {
          title: de ? 'Behalte die Pause. Ändere den Ablauf.' : 'Keep the break. Change the routine.',
          body: de
            ? 'Nimm die nächste Arbeitspause wie gewohnt – aber ändere für ein paar Minuten Ort oder Tätigkeit, bevor du über die Zigarette entscheidest.'
            : 'Take your next work break as usual, but change the place or activity for a few minutes before deciding about the cigarette.',
        };
      case 'CONSCIOUS_CHOICE':
        return {
          title: de ? 'Mach die nächste Entscheidung sichtbar.' : 'Make the next decision visible.',
          body: de
            ? `Beim nächsten ${triggerLabel}-Moment: verbiete nichts. Verschiebe die Entscheidung drei Minuten und entscheide danach bewusst neu.`
            : `At your next ${triggerLabel.toLowerCase()} moment, forbid nothing. Delay the decision for three minutes, then decide consciously again.`,
        };
      case 'MORNING_DELAY':
        return {
          title: de ? 'Teste den ersten Abstand des Tages.' : 'Test the first gap of the day.',
          body: de
            ? 'Öffne Smoke Lab vor der ersten Zigarette und verschiebe nur den Zeitpunkt um ein paar realistische Minuten.'
            : 'Open Smoke Lab before the first cigarette and shift only the timing by a few realistic minutes.',
        };
      case 'THREE_MINUTE_DELAY':
      default:
        return {
          title: de ? 'Teste drei Minuten Abstand.' : 'Test a three-minute gap.',
          body: de
            ? `Beim nächsten ${triggerLabel}-Moment: verschiebe nur die Entscheidung. Danach bewertest du den Drang neu.`
            : `At your next ${triggerLabel.toLowerCase()} moment, delay only the decision. Then reassess the urge.`,
        };
    }
  }

  static generate(
    profile: UserProfile,
    smokingEvents: SmokingEvent[] = [],
    cravingEvents: CravingEvent[] = [],
    locale: 'en' | 'de' = profile.preferredLanguage || 'en'
  ): NextBestAction {
    const de = locale === 'de';
    const analysis = PatternEngine.analyze(smokingEvents, cravingEvents);

    // 1. Strongest personal evidence: repeat an intervention that has already
    // helped in at least 3 comparable situations.
    let bestPersonal:
      | { trigger: string; interventionId: string; successRate: number; totalAttempts: number }
      | null = null;

    for (const [trigger, stats] of Object.entries(analysis.interventionsByTrigger)) {
      for (const stat of stats) {
        if (stat.totalAttempts < PatternEngine.MIN_USES_FOR_INTERVENTION_EFFECTIVENESS) continue;
        if (stat.successRate < 50) continue;
        if (
          !bestPersonal ||
          stat.successRate > bestPersonal.successRate ||
          (stat.successRate === bestPersonal.successRate && stat.totalAttempts > bestPersonal.totalAttempts)
        ) {
          bestPersonal = {
            trigger,
            interventionId: stat.interventionId,
            successRate: stat.successRate,
            totalAttempts: stat.totalAttempts,
          };
        }
      }
    }

    if (bestPersonal) {
      const action = this.actionForIntervention(bestPersonal.interventionId, bestPersonal.trigger, locale);
      const intervention = getInterventionById(bestPersonal.interventionId);
      return {
        id: `repeat:${bestPersonal.trigger}:${bestPersonal.interventionId}`,
        kind: 'repeat_effective',
        title: action.title,
        body: action.body,
        why: de
          ? `Bei ${bestPersonal.totalAttempts} vergleichbaren ${formatSituation(bestPersonal.trigger, locale)}-Situationen wurde dein Drang nach „${intervention.id === 'THREE_MINUTE_DELAY' ? '3 Minuten Abstand' : 'dieser Strategie'}“ bisher in ${bestPersonal.successRate}% der abgeschlossenen Versuche schwächer oder ging weg.`
          : `Across ${bestPersonal.totalAttempts} comparable ${formatSituation(bestPersonal.trigger, locale).toLowerCase()} situations, your urge became weaker or disappeared in ${bestPersonal.successRate}% of completed attempts with this strategy.`,
        cta: de ? 'Beim nächsten Mal wiederholen' : 'Repeat next time',
        evidence: bestPersonal.totalAttempts >= 6 && analysis.uniqueDaysRecorded >= 3 ? 'established' : 'emerging',
        basisCount: bestPersonal.totalAttempts,
        targetTrigger: bestPersonal.trigger,
        interventionId: bestPersonal.interventionId,
      };
    }

    // 2. Context combination: useful because it is more specific than a raw trigger.
    const combo = analysis.combinations[0];
    if (combo) {
      const selection = BehaviorInterventionEngine.selectIntervention(combo.trigger, combo.place, cravingEvents);
      const action = this.actionForIntervention(selection.intervention.id, combo.trigger, locale, combo.place);
      return {
        id: `combo:${combo.key}`,
        kind: 'context_experiment',
        title: action.title,
        body: action.body,
        why: de
          ? `${formatSituation(combo.trigger, locale)}${combo.place ? ` bei ${formatPlace(combo.place, locale)}` : ''}${combo.timeWindow ? ` am ${PatternEngine.getTimeWindowLabel(combo.timeWindow, locale)}` : ''} ist in deinen bisherigen Daten ${combo.count}-mal gemeinsam aufgetaucht. Wir testen genau diese Schleife – nicht dein gesamtes Rauchverhalten auf einmal.`
          : `${formatSituation(combo.trigger, locale)}${combo.place ? ` at ${formatPlace(combo.place, locale)}` : ''}${combo.timeWindow ? ` in the ${PatternEngine.getTimeWindowLabel(combo.timeWindow, locale)}` : ''} has appeared together ${combo.count} times in your data. We will test that specific loop rather than your whole smoking behavior at once.`,
        cta: de ? 'Als nächsten Test merken' : 'Use as next test',
        evidence: combo.strength,
        basisCount: combo.count,
        targetTrigger: combo.trigger,
        targetPlace: combo.place,
        targetTimeWindow: combo.timeWindow,
        interventionId: selection.intervention.id,
      };
    }

    // 3. Strongest trigger once the trigger threshold is met.
    if (analysis.strongestTrigger) {
      const trigger = analysis.strongestTrigger.name;
      const selection = BehaviorInterventionEngine.selectIntervention(trigger, undefined, cravingEvents);
      const action = this.actionForIntervention(selection.intervention.id, trigger, locale);
      return {
        id: `trigger:${trigger}`,
        kind: 'trigger_experiment',
        title: action.title,
        body: action.body,
        why: de
          ? `${formatSituation(trigger, locale)} ist mit ${analysis.strongestTrigger.count} von ${analysis.topTriggers.reduce((sum, item) => sum + item.count, 0)} erfassten Auslösern aktuell dein häufigster Hinweis. Das ist ein Arbeitssignal, keine Diagnose.`
          : `${formatSituation(trigger, locale)} is currently your most frequent cue, appearing in ${analysis.strongestTrigger.count} logged situations. This is a working signal, not a diagnosis.`,
        cta: de ? 'Beim nächsten Auftreten testen' : 'Test when it appears next',
        evidence: analysis.triggerConfidence,
        basisCount: analysis.strongestTrigger.count,
        targetTrigger: trigger,
        interventionId: selection.intervention.id,
      };
    }

    // 4. If automaticity is visible before a trigger becomes dominant, train awareness.
    if (smokingEvents.length >= 5 && analysis.automaticRatio >= 60) {
      return {
        id: 'autopilot:conscious-cigarette',
        kind: 'autopilot_awareness',
        title: de ? 'Finde die nächste Autopilot-Zigarette.' : 'Catch the next autopilot cigarette.',
        body: de
          ? 'Wenn du die nächste Zigarette schon fast automatisch anzündest: stopp nur kurz und entscheide bewusst, ob du sie jetzt wirklich willst. Rauchen bleibt erlaubt.'
          : 'When you are about to light the next cigarette automatically, pause briefly and consciously decide whether you want it now. Smoking remains allowed.',
        why: de
          ? `${analysis.automaticRatio}% deiner bisher klassifizierten Zigaretten wurden als automatisch erfasst.`
          : `${analysis.automaticRatio}% of your classified cigarettes so far were logged as automatic.`,
        cta: de ? 'Nur beobachten' : 'Just observe',
        evidence: smokingEvents.length >= 10 && analysis.uniqueDaysRecorded >= 3 ? 'established' : 'emerging',
        basisCount: smokingEvents.length,
      };
    }

    // 5. Early signal: do not call it a pattern yet, but make the app feel responsive.
    const earlyTrigger = analysis.topTriggers[0];
    if (analysis.totalObservations >= 3 && earlyTrigger) {
      const selection = BehaviorInterventionEngine.selectIntervention(earlyTrigger.name, undefined, cravingEvents);
      const action = this.actionForIntervention(selection.intervention.id, earlyTrigger.name, locale);
      return {
        id: `early:${earlyTrigger.name}`,
        kind: 'trigger_experiment',
        title: action.title,
        body: action.body,
        why: de
          ? `${formatSituation(earlyTrigger.name, locale)} taucht bisher am häufigsten auf (${earlyTrigger.count}×). Dafür sind es noch zu wenige Daten für ein stabiles Muster – genau deshalb ist es ein guter nächster Test.`
          : `${formatSituation(earlyTrigger.name, locale)} has appeared most often so far (${earlyTrigger.count}×). There is not enough data to call it a stable pattern yet, which makes it a useful next test.`,
        cta: de ? 'Nächste Situation beobachten' : 'Watch the next situation',
        evidence: 'insufficient',
        basisCount: earlyTrigger.count,
        targetTrigger: earlyTrigger.name,
        interventionId: selection.intervention.id,
      };
    }

    // 6. New-user state: observation itself is the next best action.
    return {
      id: 'observe:first-loop',
      kind: 'observe',
      title: de ? 'Fang eine Schleife ab, bevor sie automatisch wird.' : 'Catch one loop before it goes automatic.',
      body: de
        ? 'Öffne „Ich will rauchen“ beim nächsten echten Drang – noch bevor du entscheidest. Direkt erfasste Situationen geben Smoke Lab präzisere Kontextdaten als spätere Schätzungen.'
        : 'Open “I want to smoke” at the next real urge, before you decide. Logging the situation in the moment gives Smoke Lab more precise context than a later estimate.',
      why: de
        ? 'Smoke Lab braucht zunächst echte Situationen, um deine persönlichen Muster von Zufall zu unterscheiden.'
        : 'Smoke Lab first needs real situations to separate your personal patterns from chance.',
      cta: de ? 'Beim nächsten Drang starten' : 'Start at the next urge',
      evidence: 'insufficient',
      basisCount: analysis.totalObservations,
    };
  }
}
