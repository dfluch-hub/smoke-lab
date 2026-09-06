import {
  CravingEvent,
  GoalChoice,
  JourneyPhaseId,
  JourneyProgress,
  MissionInputType,
  NextBestAction,
  SmokingEvent,
  UserProfile,
} from '../../types';
import { formatPlace, formatSituation } from '../../i18n/translations';
import { PatternEngine } from './PatternEngine';
import { NextBestActionEngine } from './NextBestActionEngine';
import { JourneyAdaptationEngine, JourneyAdaptationProfile } from './JourneyAdaptationEngine';
import { JourneyLifecycleEngine } from './JourneyLifecycleEngine';

export interface JourneyPhaseDefinition {
  id: JourneyPhaseId;
  number: number;
  startDay: number;
  endDay: number;
  title: string;
  shortTitle: string;
  description: string;
}

export interface JourneyMissionOption {
  value: string;
  label: string;
  description?: string;
}

export interface JourneyMissionView {
  day: number;
  phase: JourneyPhaseId;
  phaseNumber: number;
  phaseTitle: string;
  title: string;
  objective: string;
  why: string;
  completionHint: string;
  inputType: MissionInputType;
  responseKey?: string;
  options?: JourneyMissionOption[];
  numberMin?: number;
  numberMax?: number;
  numberDefault?: number;
  numberUnit?: string;
  placeholder?: string;
  suggestedResponse?: string;
  targetTrigger?: string;
  targetPlace?: string;
  targetTimeWindow?: string;
  interventionId?: string;
  interventionDurationSeconds?: number;
  personalized?: boolean;
  personalizationReason?: string;
  challengeLevel?: 'gentle' | 'standard' | 'stretch';
  completionReady: boolean;
  completionProgress: number;
  completionTarget: number;
  evidenceIds: string[];
  completed: boolean;
  isCurrent: boolean;
}

export interface JourneyState {
  day: number;
  phase: JourneyPhaseDefinition;
  phases: JourneyPhaseDefinition[];
  mission: JourneyMissionView;
  completedDays: number[];
  completedCount: number;
  percentComplete: number;
  journeyCompleted: boolean;
  nextBestAction: NextBestAction;
}

interface MissionContext {
  profile: UserProfile;
  progress: JourneyProgress;
  smokingEvents: SmokingEvent[];
  cravingEvents: CravingEvent[];
  scopedSmokes: SmokingEvent[];
  scopedCravings: CravingEvent[];
  locale: 'en' | 'de';
  nextBestAction: NextBestAction;
  strongestTrigger?: string;
  strongestPlace?: string;
  targetTrigger: string;
  targetPlace?: string;
  bestInterventionId?: string;
  adaptation: JourneyAdaptationProfile;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class JourneyEngine {
  static phaseForDay(day: number, locale: 'en' | 'de'): JourneyPhaseDefinition {
    const de = locale === 'de';
    const definitions: JourneyPhaseDefinition[] = [
      {
        id: 'discover',
        number: 1,
        startDay: 1,
        endDay: 5,
        title: de ? 'Entdecken' : 'Discover',
        shortTitle: de ? 'Muster sichtbar machen' : 'Make the loop visible',
        description: de
          ? 'Zuerst beobachten. Noch nichts erzwingen.'
          : 'Observe first. Do not force change yet.',
      },
      {
        id: 'disrupt',
        number: 2,
        startDay: 6,
        endDay: 12,
        title: de ? 'Unterbrechen' : 'Disrupt',
        shortTitle: de ? 'Autopilot testen' : 'Test the autopilot',
        description: de
          ? 'Kleine Experimente trennen Auslöser von automatischer Handlung.'
          : 'Small experiments separate cues from automatic action.',
      },
      {
        id: 'control',
        number: 3,
        startDay: 13,
        endDay: 20,
        title: de ? 'Kontrolle' : 'Control',
        shortTitle: de ? 'Mehr bewusste Wahl' : 'More deliberate choice',
        description: de
          ? 'Aus hilfreichen Unterbrechungen werden verlässliche Strategien.'
          : 'Useful interruptions become repeatable strategies.',
      },
      {
        id: 'break',
        number: 4,
        startDay: 21,
        endDay: 27,
        title: de ? 'Durchbrechen' : 'Break',
        shortTitle: de ? 'Schwierige Situationen trainieren' : 'Train difficult situations',
        description: de
          ? 'Starke Schleifen werden gezielt vorbereitet statt vermieden.'
          : 'High-risk loops are prepared for deliberately rather than ignored.',
      },
      {
        id: 'own',
        number: 5,
        startDay: 28,
        endDay: 30,
        title: de ? 'Übernehmen' : 'Own it',
        shortTitle: de ? 'Dein persönlicher Kontrollplan' : 'Your personal control plan',
        description: de
          ? 'Du bündelst, was deine Daten und deine eigenen Tests ergeben haben.'
          : 'You consolidate what your data and your own experiments have shown.',
      },
    ];

    return definitions.find((phase) => day >= phase.startDay && day <= phase.endDay) || definitions[4];
  }

  static allPhases(locale: 'en' | 'de'): JourneyPhaseDefinition[] {
    return [1, 6, 13, 21, 28].map((day) => this.phaseForDay(day, locale));
  }

  static phaseNameForStorage(day: number): string {
    const phase = this.phaseForDay(day, 'en');
    return `PHASE ${phase.number} · ${phase.title.toUpperCase()}`;
  }

  private static eventTime(event: SmokingEvent | CravingEvent): number {
    const value = new Date(event.timestamp).getTime();
    return Number.isFinite(value) ? value : 0;
  }

  private static getScopeStart(profile: UserProfile, progress: JourneyProgress): number {
    const raw = progress.currentDayStartedAt || profile.onboardingCompletedAt || profile.createdAt;
    const parsed = new Date(raw).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private static bestIntervention(cravingEvents: CravingEvent[]): string | undefined {
    const analysis = PatternEngine.analyze([], cravingEvents);
    let best: { id: string; attempts: number; successRate: number } | undefined;
    Object.values(analysis.interventionsByTrigger).forEach((stats) => {
      stats.forEach((stat) => {
        if (stat.totalAttempts < PatternEngine.MIN_USES_FOR_INTERVENTION_EFFECTIVENESS) return;
        if (!best || stat.successRate > best.successRate || (stat.successRate === best.successRate && stat.totalAttempts > best.attempts)) {
          best = { id: stat.interventionId, attempts: stat.totalAttempts, successRate: stat.successRate };
        }
      });
    });
    return best?.id;
  }

  private static interventionLabel(id: string | undefined, locale: 'en' | 'de'): string {
    const de = locale === 'de';
    const labels: Record<string, [string, string]> = {
      THREE_MINUTE_DELAY: ['Drei Minuten Abstand', 'Three-minute gap'],
      CHANGE_LOCATION: ['Ort wechseln', 'Change location'],
      COFFEE_SEPARATION: ['Kaffee und Zigarette trennen', 'Separate coffee and cigarette'],
      AFTER_MEAL_RESET: ['Abschluss unterbrechen', 'Interrupt the ending'],
      HANDS_BUSY: ['Hände beschäftigen', 'Keep hands busy'],
      CONSCIOUS_CHOICE: ['Bewusst neu entscheiden', 'Decide consciously again'],
      MORNING_DELAY: ['Erste Zigarette verschieben', 'Delay the first cigarette'],
      BREAK_ROUTINE: ['Pausenroutine verändern', 'Change the break routine'],
    };
    if (!id) return de ? 'deine bisher hilfreichste Strategie' : 'your most helpful strategy so far';
    const pair = labels[id];
    return pair ? (de ? pair[0] : pair[1]) : id;
  }

  private static interventionOutcomeRecorded(event: CravingEvent): boolean {
    return Boolean(event.interventionId && event.outcome);
  }

  private static targetFromData(
    profile: UserProfile,
    smokingEvents: SmokingEvent[],
    cravingEvents: CravingEvent[],
    locale: 'en' | 'de'
  ): { trigger: string; place?: string; nextBestAction: NextBestAction; strongestTrigger?: string; strongestPlace?: string } {
    const analysis = PatternEngine.analyze(smokingEvents, cravingEvents);
    const nextBestAction = NextBestActionEngine.generate(profile, smokingEvents, cravingEvents, locale);
    const strongestTrigger = analysis.strongestTrigger?.name || analysis.topTriggers[0]?.name;
    const strongestPlace = analysis.topPlaces[0]?.name;
    const onboardingTrigger = profile.automaticSituations?.[0];
    const trigger = nextBestAction.targetTrigger || strongestTrigger || onboardingTrigger || 'Habit';
    return {
      trigger: PatternEngine.normalizeTriggerKey(trigger),
      place: nextBestAction.targetPlace || strongestPlace,
      nextBestAction,
      strongestTrigger,
      strongestPlace,
    };
  }

  static getState(
    profile: UserProfile,
    progress: JourneyProgress,
    smokingEvents: SmokingEvent[],
    cravingEvents: CravingEvent[],
    locale: 'en' | 'de'
  ): JourneyState {
    const canonicalDay = JourneyLifecycleEngine.canonicalDay(progress);
    const day = clamp(canonicalDay, 1, 30);
    const phase = this.phaseForDay(day, locale);
    const scopeStart = this.getScopeStart(profile, progress);
    const scopedSmokes = smokingEvents.filter((event) => this.eventTime(event) >= scopeStart);
    const scopedCravings = cravingEvents.filter((event) => this.eventTime(event) >= scopeStart);
    const targetData = this.targetFromData(profile, smokingEvents, cravingEvents, locale);
    const bestInterventionId = this.bestIntervention(cravingEvents);
    const adaptation = JourneyAdaptationEngine.build(profile, smokingEvents, cravingEvents);

    const ctx: MissionContext = {
      profile,
      progress,
      smokingEvents,
      cravingEvents,
      scopedSmokes,
      scopedCravings,
      locale,
      nextBestAction: targetData.nextBestAction,
      strongestTrigger: targetData.strongestTrigger,
      strongestPlace: targetData.strongestPlace,
      targetTrigger: targetData.trigger,
      targetPlace: targetData.place,
      bestInterventionId,
      adaptation,
    };

    const mission = this.buildMission(day, ctx);
    const completedDays = JourneyLifecycleEngine.normalizeCompletedDays(progress.completedDays);
    return {
      day,
      phase,
      phases: this.allPhases(locale),
      mission: {
        ...mission,
        completed: completedDays.includes(day),
        isCurrent: true,
      },
      completedDays,
      completedCount: completedDays.length,
      percentComplete: Math.round((completedDays.length / 30) * 100),
      journeyCompleted: JourneyLifecycleEngine.isCompleteDays(completedDays),
      nextBestAction: targetData.nextBestAction,
    };
  }

  static getMissionForDay(
    day: number,
    profile: UserProfile,
    progress: JourneyProgress,
    smokingEvents: SmokingEvent[],
    cravingEvents: CravingEvent[],
    locale: 'en' | 'de'
  ): JourneyMissionView {
    const state = this.getState(profile, { ...progress, dayInLab: day }, smokingEvents, cravingEvents, locale);
    const completed = (progress.completedDays || []).includes(day);
    return { ...state.mission, completed, isCurrent: day === progress.dayInLab };
  }

  private static buildMission(day: number, ctx: MissionContext): JourneyMissionView {
    const de = ctx.locale === 'de';
    const phase = this.phaseForDay(day, ctx.locale);
    const trigger = formatSituation(ctx.targetTrigger, ctx.locale);
    const place = ctx.targetPlace ? formatPlace(ctx.targetPlace, ctx.locale) : undefined;
    const scopedTriggered = [
      ...ctx.scopedCravings.filter((event) => Boolean(event.trigger)),
      ...ctx.scopedSmokes.filter((event) => Boolean(event.trigger) && !event.linkedCravingEventId),
    ];
    const scopedReassessed = ctx.scopedCravings.filter((event) => this.interventionOutcomeRecorded(event));
    const evidenceIds: string[] = [];

    const base = (input: Omit<JourneyMissionView, 'day' | 'phase' | 'phaseNumber' | 'phaseTitle' | 'completed' | 'isCurrent' | 'evidenceIds'> & { evidenceIds?: string[] }): JourneyMissionView => ({
      day,
      phase: phase.id,
      phaseNumber: phase.number,
      phaseTitle: phase.title,
      completed: false,
      isCurrent: true,
      evidenceIds: input.evidenceIds || evidenceIds,
      personalized: input.personalized ?? ctx.adaptation.personalized,
      personalizationReason: input.personalizationReason || (ctx.locale === 'de' ? ctx.adaptation.reasonDe : ctx.adaptation.reasonEn),
      challengeLevel: input.challengeLevel || ctx.adaptation.challengeLevel,
      ...input,
    });

    switch (day) {
      case 1: {
        const count = ctx.scopedSmokes.length;
        if (count) evidenceIds.push(ctx.scopedSmokes[0].id);
        return base({
          title: de ? 'Eine Zigarette beobachten.' : 'Observe one cigarette.',
          objective: de
            ? 'Heute änderst du nichts. Erfasse eine echte Zigarette so, wie sie ohnehin passiert.'
            : 'Change nothing today. Log one real cigarette exactly as it happens.',
          why: de
            ? 'Selbstbeobachtung liefert die Ausgangsdaten, aus denen spätere Tests gezielter werden.'
            : 'Self-monitoring creates the baseline that makes later experiments more targeted.',
          completionHint: de ? 'Eine erfasste Zigarette reicht.' : 'One logged cigarette is enough.',
          inputType: 'none',
          completionReady: count >= 1,
          completionProgress: Math.min(count, 1),
          completionTarget: 1,
        });
      }
      case 2: {
        const count = scopedTriggered.length;
        evidenceIds.push(...scopedTriggered.slice(0, 3).map((e) => e.id));
        return base({
          title: de ? 'Fang drei Auslöser ein.' : 'Catch three cues.',
          objective: de
            ? 'Erfasse bei drei Situationen, was direkt davor passiert. Noch nichts bekämpfen.'
            : 'In three situations, capture what happened immediately before. Do not fight anything yet.',
          why: de
            ? 'Wiederholte Kontextdaten helfen, Gewohnheitsschleifen von einzelnen Zufällen zu unterscheiden.'
            : 'Repeated context data helps distinguish recurring loops from one-off moments.',
          completionHint: de ? `${Math.min(count, 3)} / 3 Auslöser erfasst` : `${Math.min(count, 3)} / 3 cues logged`,
          inputType: 'none',
          completionReady: count >= 3,
          completionProgress: Math.min(count, 3),
          completionTarget: 3,
        });
      }
      case 3: {
        const classified = ctx.scopedSmokes.filter((event) => event.decisionType === 'automatic' || event.decisionType === 'intentional');
        const automatic = classified.filter((event) => event.decisionType === 'automatic');
        evidenceIds.push(...classified.slice(0, 2).map((e) => e.id));
        return base({
          title: de ? 'Finde deinen Autopiloten.' : 'Find your autopilot.',
          objective: de
            ? 'Ordne mindestens zwei Zigaretten ein: automatisch oder bewusst entschieden.'
            : 'Classify at least two cigarettes: automatic or consciously chosen.',
          why: de
            ? 'Nicht jede Zigarette erfüllt dieselbe Funktion. Die Unterscheidung macht spätere Experimente präziser.'
            : 'Not every cigarette serves the same role. This distinction makes later experiments more precise.',
          completionHint: de
            ? automatic.length > 0
              ? `Autopilot bereits ${automatic.length}× erkannt.`
              : `${classified.length} / 2 Entscheidungen eingeordnet.`
            : automatic.length > 0
              ? `Autopilot already noticed ${automatic.length}×.`
              : `${classified.length} / 2 decisions classified.`,
          inputType: 'none',
          completionReady: classified.length >= 2,
          completionProgress: Math.min(classified.length, 2),
          completionTarget: 2,
        });
      }
      case 4: {
        const rated = [
          ...ctx.scopedCravings.filter((event) => event.initialIntensity > 0),
          ...ctx.scopedSmokes.filter((event) => typeof event.cravingIntensity === 'number'),
        ];
        if (rated[0]) evidenceIds.push(rated[0].id);
        return base({
          title: de ? 'Miss einen echten Drang.' : 'Measure one real urge.',
          objective: de
            ? 'Öffne „Ich will rauchen“ bei einem echten Drang und gib ihm eine Stärke von 1–10.'
            : 'Open “I want to smoke” during a real urge and rate it from 1–10.',
          why: de
            ? 'Eine einfache Intensitätsskala macht Veränderungen innerhalb derselben Situation sichtbar, ohne sie zu bewerten.'
            : 'A simple intensity scale makes within-situation change visible without judging it.',
          completionHint: de ? 'Ein gemessener Drang genügt.' : 'One measured urge is enough.',
          inputType: 'none',
          completionReady: rated.length >= 1,
          completionProgress: Math.min(rated.length, 1),
          completionTarget: 1,
        });
      }
      case 5: {
        const analysis = PatternEngine.analyze(ctx.smokingEvents, ctx.cravingEvents);
        const signal = analysis.topTriggers[0];
        return base({
          title: de ? 'Lies dein erstes Signal.' : 'Read your first signal.',
          objective: signal
            ? de
              ? `${formatSituation(signal.name, ctx.locale)} taucht bisher am häufigsten auf. Heute geht es nur darum, dieses Signal einmal bewusst wiederzuerkennen.`
              : `${formatSituation(signal.name, ctx.locale)} appears most often so far. Today, simply notice it deliberately once.`
            : de
              ? 'Sammle noch ein paar echte Situationen, bis sich ein erstes wiederkehrendes Signal zeigt.'
              : 'Collect a few more real situations until an early recurring signal appears.',
          why: de
            ? 'Ein frühes Signal ist noch keine feste Schlussfolgerung. Es ist ein Kandidat für den nächsten Test.'
            : 'An early signal is not a firm conclusion. It is a candidate for the next experiment.',
          completionHint: signal
            ? de ? `${signal.count} Beobachtungen rund um ${formatSituation(signal.name, ctx.locale)}.` : `${signal.count} observations around ${formatSituation(signal.name, ctx.locale)}.`
            : de ? `${analysis.totalObservations} / 5 Beobachtungen gesammelt.` : `${analysis.totalObservations} / 5 observations collected.`,
          inputType: 'confirm',
          completionReady: analysis.totalObservations >= 5 && Boolean(signal),
          completionProgress: Math.min(analysis.totalObservations, 5),
          completionTarget: 5,
          targetTrigger: signal?.name,
        });
      }
      case 6: {
        const duration = ctx.adaptation.challengeLevel === 'gentle' ? 60 : ctx.adaptation.challengeLevel === 'stretch' ? 300 : 180;
        const attempts = ctx.scopedCravings.filter((event) => event.interventionId === 'THREE_MINUTE_DELAY' && event.outcome);
        if (attempts[0]) evidenceIds.push(attempts[0].id);
        const durationLabel = duration < 120 ? (de ? 'eine Minute' : 'one minute') : duration === 180 ? (de ? 'drei Minuten' : 'three minutes') : (de ? 'fünf Minuten' : 'five minutes');
        return base({
          title: de ? `Teste ${durationLabel} Abstand.` : `Test a ${durationLabel} gap.`,
          objective: de
            ? `Verschiebe bei einem echten Drang nur die Entscheidung um ${durationLabel}. Danach bewertest du neu – Rauchen bleibt erlaubt.`
            : `At one real urge, delay only the decision for ${durationLabel}. Reassess afterward — smoking remains allowed.`,
          why: de
            ? 'Die Dauer wird vorsichtig an deine bisherigen Situationen angepasst. Der Test prüft nur, ob zwischen Auslöser und Handlung etwas Spielraum entsteht.'
            : 'The duration is adjusted cautiously to your recent situations. The test only checks whether some space can be created between cue and action.',
          completionHint: de ? 'Der Versuch zählt unabhängig vom Ergebnis.' : 'The attempt counts regardless of outcome.',
          inputType: 'none',
          interventionId: 'THREE_MINUTE_DELAY',
          interventionDurationSeconds: duration,
          completionReady: attempts.length >= 1,
          completionProgress: Math.min(attempts.length, 1),
          completionTarget: 1,
        });
      }
      case 7: {
        const targetPlace = ctx.adaptation.targetPlace || ctx.targetPlace;
        const attempts = ctx.scopedCravings.filter((event) => event.interventionId === 'CHANGE_LOCATION' && event.outcome);
        if (attempts[0]) evidenceIds.push(attempts[0].id);
        const placeLabel = targetPlace ? formatPlace(targetPlace, ctx.locale) : undefined;
        return base({
          title: de ? 'Ändere nur den Ort.' : 'Change only the location.',
          objective: placeLabel
            ? (de
              ? `Wenn die nächste typische Situation rund um ${placeLabel} auftaucht, wechsle kurz den Ort und entscheide danach neu.`
              : `When the next typical situation around ${placeLabel} appears, briefly change location and decide again afterward.`)
            : (de
              ? 'Verlasse in einer typischen Rauchsituation kurz den gewohnten Ort und entscheide danach neu.'
              : 'In one typical smoking situation, briefly leave the usual spot and decide again afterward.'),
          why: de
            ? 'Umgebungsreize können Teil einer eingeübten Schleife sein. Wenn deine Daten bereits einen Ort wiederholt zeigen, richtet Smoke Lab den Test darauf aus.'
            : 'Environmental cues can be part of a learned loop. If your data already shows a repeated place, Smoke Lab targets that context.',
          completionHint: de ? 'Ein Ortswechsel mit anschließender Neubewertung.' : 'One location change followed by reassessment.',
          inputType: 'none',
          targetPlace,
          interventionId: 'CHANGE_LOCATION',
          completionReady: attempts.length >= 1,
          completionProgress: Math.min(attempts.length, 1),
          completionTarget: 1,
        });
      }
      case 8: {
        const normalizedTarget = PatternEngine.normalizeTriggerKey(ctx.adaptation.targetTrigger || ctx.targetTrigger);
        const coffeeRelevant = normalizedTarget === 'Coffee';
        const desiredIntervention = coffeeRelevant
          ? 'COFFEE_SEPARATION'
          : ctx.adaptation.preferredInterventionId || ctx.nextBestAction.interventionId || 'THREE_MINUTE_DELAY';
        const attempts = ctx.scopedCravings.filter((event) => event.interventionId === desiredIntervention && event.outcome);
        if (attempts[0]) evidenceIds.push(attempts[0].id);
        const targetLabel = formatSituation(normalizedTarget, ctx.locale);
        return base({
          title: coffeeRelevant
            ? (de ? 'Der Kaffee-Test.' : 'The Coffee Test.')
            : (de ? `Dein Test: ${targetLabel}.` : `Your test: ${targetLabel}.`),
          objective: coffeeRelevant
            ? (de ? 'Behalte den Kaffee. Verschiebe nur die Zigarette und beobachte, ob sich der Drang verändert.' : 'Keep the coffee. Delay only the cigarette and notice whether the urge changes.')
            : ctx.nextBestAction.body,
          why: coffeeRelevant
            ? (de ? 'So testen wir die Kopplung, ohne dir den Auslöser selbst wegzunehmen.' : 'This tests the pairing without taking the cue itself away from you.')
            : (de ? ctx.adaptation.reasonDe : ctx.adaptation.reasonEn),
          completionHint: de ? 'Der Test zählt, egal ob du danach rauchst.' : 'The test counts whether or not you smoke afterward.',
          inputType: 'none',
          targetTrigger: normalizedTarget,
          targetPlace: ctx.adaptation.targetPlace,
          targetTimeWindow: ctx.adaptation.targetTimeWindow,
          interventionId: desiredIntervention,
          completionReady: attempts.length >= 1,
          completionProgress: Math.min(attempts.length, 1),
          completionTarget: 1,
        });
      }
      case 9: {
        const hasMeals = [...ctx.smokingEvents, ...ctx.cravingEvents].some((event) => PatternEngine.normalizeTriggerKey(event.trigger) === 'After meals');
        const desiredIntervention = hasMeals ? 'AFTER_MEAL_RESET' : 'CHANGE_LOCATION';
        const attempts = ctx.scopedCravings.filter((event) => event.interventionId === desiredIntervention && event.outcome);
        if (attempts[0]) evidenceIds.push(attempts[0].id);
        return base({
          title: hasMeals ? (de ? 'Unterbrich den Abschluss.' : 'Interrupt the ending.') : (de ? 'Unterbrich eine Routine.' : 'Interrupt one routine.'),
          objective: hasMeals
            ? (de ? 'Nach einer Mahlzeit: sofort Raum oder Tätigkeit wechseln, dann neu entscheiden.' : 'After a meal: immediately change room or activity, then decide again.')
            : (de ? `Bei ${trigger}: verändere nur den Ort oder die nächste Tätigkeit.` : `At ${trigger}: change only the location or the next activity.`),
          why: de
            ? 'Wir testen, ob ein kleiner Kontextwechsel die automatische Abfolge stört.'
            : 'We are testing whether a small context change interrupts the automatic sequence.',
          completionHint: de ? 'Ein echter Versuch mit Neubewertung.' : 'One real attempt followed by reassessment.',
          inputType: 'none',
          targetTrigger: hasMeals ? 'After meals' : ctx.targetTrigger,
          interventionId: desiredIntervention,
          completionReady: attempts.length >= 1,
          completionProgress: Math.min(attempts.length, 1),
          completionTarget: 1,
        });
      }
      case 10: {
        const conscious = ctx.scopedSmokes.filter((event) => event.decisionType === 'intentional' && event.enjoyment);
        if (conscious[0]) evidenceIds.push(conscious[0].id);
        return base({
          title: de ? 'Mach eine Zigarette vollständig bewusst.' : 'Make one cigarette fully conscious.',
          objective: de
            ? 'Wenn du rauchst: nur rauchen. Kein Scrollen, kein Multitasking. Danach ehrlich einordnen, ob du sie genossen hast.'
            : 'If you smoke: only smoke. No scrolling, no multitasking. Then honestly rate whether you enjoyed it.',
          why: de
            ? 'Bewusste Aufmerksamkeit hilft, automatische Handlung und tatsächliches Erleben auseinanderzuhalten.'
            : 'Deliberate attention helps separate automatic action from the actual experience.',
          completionHint: de ? 'Eine bewusst erfasste Zigarette mit Genuss-Einordnung.' : 'One intentionally logged cigarette with an enjoyment rating.',
          inputType: 'none',
          completionReady: conscious.length >= 1,
          completionProgress: Math.min(conscious.length, 1),
          completionTarget: 1,
        });
      }
      case 11: {
        const target = PatternEngine.normalizeTriggerKey(ctx.adaptation.targetTrigger || ctx.strongestTrigger || ctx.targetTrigger);
        const targetCount = ctx.adaptation.challengeLevel === 'stretch' ? 2 : 1;
        const attempts = ctx.scopedCravings.filter((event) => PatternEngine.normalizeTriggerKey(event.trigger) === target && Boolean(event.outcome));
        evidenceIds.push(...attempts.slice(0, targetCount).map((event) => event.id));
        return base({
          title: de
            ? `${formatSituation(target, ctx.locale)} gezielt unterbrechen.`
            : `Interrupt ${formatSituation(target, ctx.locale)} deliberately.`,
          objective: de
            ? `${targetCount === 2 ? 'Zweimal' : 'Einmal'} beim nächsten passenden Auftreten die vorgeschlagene Intervention nutzen. Nicht auf einen perfekten Moment warten.`
            : `Use the suggested intervention ${targetCount === 2 ? 'twice' : 'once'} when this cue next appears. Do not wait for a perfect moment.`,
          why: de
            ? 'Smoke Lab richtet die Aufgabe auf einen persönlichen Kandidaten aus. Mehr Wiederholung gibt es nur, wenn die letzten Versuche dafür ausreichend gut durchführbar waren.'
            : 'Smoke Lab targets a personal candidate. Extra repetition is only added when recent attempts were manageable enough.',
          completionHint: de ? `${Math.min(attempts.length, targetCount)} / ${targetCount} gezielte Versuche` : `${Math.min(attempts.length, targetCount)} / ${targetCount} targeted attempts`,
          inputType: 'none',
          targetTrigger: target,
          targetPlace: ctx.adaptation.targetPlace,
          interventionId: ctx.adaptation.preferredInterventionId || ctx.nextBestAction.interventionId,
          completionReady: attempts.length >= targetCount,
          completionProgress: Math.min(attempts.length, targetCount),
          completionTarget: targetCount,
        });
      }
      case 12: {
        const historicalBefore = ctx.cravingEvents.filter((event) => this.eventTime(event) < this.getScopeStart(ctx.profile, ctx.progress) && event.outcome);
        const previousIds = new Set(historicalBefore.map((event) => event.interventionId));
        const repeats = ctx.scopedCravings.filter((event) => event.outcome && previousIds.has(event.interventionId));
        if (repeats[0]) evidenceIds.push(repeats[0].id);
        const candidateId = ctx.adaptation.preferredInterventionId || ctx.bestInterventionId || ctx.nextBestAction.interventionId || 'THREE_MINUTE_DELAY';
        const bestLabel = this.interventionLabel(candidateId, ctx.locale);
        const hasPersonalEvidence = Boolean(ctx.adaptation.preferredInterventionId || ctx.bestInterventionId);
        return base({
          title: hasPersonalEvidence
            ? (de ? 'Wiederhole deinen stärksten Kandidaten.' : 'Repeat your strongest candidate.')
            : (de ? 'Wiederhole einen bekannten Test.' : 'Repeat a familiar test.'),
          objective: de
            ? `Teste ${bestLabel} noch einmal in einer echten Situation.`
            : `Test ${bestLabel} once more in a real situation.`,
          why: hasPersonalEvidence
            ? (de
              ? 'Die Strategie hat bereits mehrere verwertbare Vergleichsdaten. Wiederholung prüft, ob das Signal stabil bleibt.'
              : 'This strategy already has several usable comparison points. Repetition tests whether the signal remains stable.')
            : (de
              ? 'Noch gibt es keinen klar besten Ansatz. Eine Wiederholung liefert mehr Vergleichswert als ständig neue Tricks.'
              : 'There is no clearly best approach yet. Repeating a known test provides more comparison value than constantly changing tactics.'),
          completionHint: de ? 'Eine bekannte Intervention erneut testen.' : 'Repeat one familiar intervention.',
          inputType: 'none',
          interventionId: candidateId,
          completionReady: repeats.length >= 1,
          completionProgress: Math.min(repeats.length, 1),
          completionTarget: 1,
        });
      }
      case 13: {
        const currentGoal = ctx.profile.goal;
        return base({
          title: de ? 'Wähle deinen Fokus für die nächste Phase.' : 'Choose your focus for the next phase.',
          objective: de
            ? 'Verstehen, reduzieren oder aufhören: Du kannst den Fokus jederzeit wieder ändern.'
            : 'Understand, reduce, or quit: you can change the focus again at any time.',
          why: de
            ? 'Ziele und Handlungspläne funktionieren besser, wenn sie zur aktuellen Bereitschaft und Situation passen.'
            : 'Goals and action plans work better when they fit your current readiness and circumstances.',
          completionHint: de ? `Aktuell: ${this.goalLabel(currentGoal, ctx.locale)}` : `Current: ${this.goalLabel(currentGoal, ctx.locale)}`,
          inputType: 'goal',
          responseKey: 'journey_goal',
          options: [
            { value: 'pattern', label: de ? 'Muster verstehen' : 'Understand my pattern' },
            { value: 'reduce', label: de ? 'Weniger rauchen' : 'Smoke less' },
            { value: 'quit', label: de ? 'Aufhören' : 'Quit smoking' },
          ],
          completionReady: false,
          completionProgress: 0,
          completionTarget: 1,
        });
      }
      case 14: {
        if (ctx.profile.goal === 'reduce') {
          const defaultCeiling = Math.max(1, (ctx.profile.baseline.typicalCigarettesPerDay || 10) - 1);
          return base({
            title: de ? 'Setze eine sanfte Obergrenze.' : 'Set a gentle ceiling.',
            objective: de
              ? 'Wähle für heute eine realistische Obergrenze – klein genug, um bewusst zu sein, nicht radikal.'
              : 'Choose a realistic ceiling for today — enough to create awareness, not an aggressive cut.',
            why: de
              ? 'Konkrete, erreichbare Ziele sind hilfreicher als vage Vorsätze.'
              : 'Specific, achievable goals are more useful than vague intentions.',
            completionHint: de ? 'Du legst die Zahl selbst fest.' : 'You choose the number yourself.',
            inputType: 'number',
            responseKey: 'daily_ceiling',
            numberMin: 1,
            numberMax: Math.max(2, ctx.profile.baseline.typicalCigarettesPerDay || 20),
            numberDefault: defaultCeiling,
            numberUnit: de ? 'Zigaretten' : 'cigarettes',
            completionReady: false,
            completionProgress: 0,
            completionTarget: 1,
          });
        }
        if (ctx.profile.goal === 'quit') {
          return base({
            title: de ? 'Schütze ein realistisches rauchfreies Fenster.' : 'Protect one realistic smoke-free window.',
            objective: de
              ? 'Wähle ein überschaubares Zeitfenster, in dem du heute nicht automatisch rauchst. Kein ganzer Tag nötig.'
              : 'Choose a manageable window today in which you will not smoke automatically. It does not need to be the whole day.',
            why: de
              ? 'Kleine planbare Veränderungen können helfen, bevor schwierigere Situationen trainiert werden.'
              : 'Small planned changes can help before harder situations are trained.',
            completionHint: de ? 'Wähle ein Fenster, das realistisch wirkt.' : 'Choose a window that feels realistic.',
            inputType: 'choice',
            responseKey: 'protected_window',
            options: [
              { value: '30', label: '30 min' },
              { value: '60', label: '60 min' },
              { value: '90', label: '90 min' },
              { value: '120', label: '2 h' },
            ],
            completionReady: false,
            completionProgress: 0,
            completionTarget: 1,
          });
        }
        const attempts = ctx.scopedCravings.filter((event) => PatternEngine.normalizeTriggerKey(event.trigger) === PatternEngine.normalizeTriggerKey(ctx.targetTrigger));
        if (attempts[0]) evidenceIds.push(attempts[0].id);
        return base({
          title: de ? `Beobachte ${trigger} heute absichtlich.` : `Observe ${trigger} on purpose today.`,
          objective: de
            ? 'Öffne Smoke Lab genau in dieser Situation, bevor du entscheidest.'
            : 'Open Smoke Lab in that exact situation before you decide.',
          why: de
            ? 'Dein aktueller Fokus ist Verstehen. Mehr Präzision ist jetzt wertvoller als erzwungene Reduktion.'
            : 'Your current focus is understanding. More precise data is more useful now than forced reduction.',
          completionHint: de ? 'Eine in Echtzeit erfasste Situation.' : 'One in-the-moment observation.',
          inputType: 'none',
          targetTrigger: ctx.targetTrigger,
          completionReady: attempts.length >= 1,
          completionProgress: Math.min(attempts.length, 1),
          completionTarget: 1,
        });
      }
      case 15: {
        const target = place || (de ? 'einem ruhigen Abschnitt des Tages' : 'a calmer part of your day');
        return base({
          title: de ? 'Schütze dein leichtestes Fenster.' : 'Protect your easiest window.',
          objective: de
            ? `Wähle ein realistisches Zeitfenster – idealerweise rund um ${target} – und plane vorher, was du stattdessen tust.`
            : `Choose a realistic window — ideally around ${target} — and decide in advance what you will do instead.`,
          why: de
            ? 'Planung vor dem Auslöser reduziert die Zahl der Entscheidungen im schwierigen Moment.'
            : 'Planning before the cue reduces the number of decisions needed in the difficult moment.',
          completionHint: de ? 'Ein konkreter Plan reicht.' : 'One concrete plan is enough.',
          inputType: 'text',
          responseKey: 'protected_window_plan',
          placeholder: de ? 'z. B. 14:00–15:00: Pause machen, aber draußen gehen' : 'e.g. 14:00–15:00: take the break, but go for a short walk',
          completionReady: false,
          completionProgress: 0,
          completionTarget: 1,
        });
      }
      case 16: {
        const analysis = PatternEngine.analyze(ctx.smokingEvents, ctx.cravingEvents);
        const windowLabel = analysis.peakTimeWindowDe && ctx.locale === 'de' ? analysis.peakTimeWindowDe : analysis.peakTimeWindowEn;
        if (!analysis.hasEnoughDataForTime || !windowLabel) {
          const count = ctx.scopedCravings.length;
          return base({
            title: de ? 'Finde zuerst dein Zeitfenster.' : 'Find your time window first.',
            objective: de
              ? 'Erfasse heute zwei echte Dränge in dem Moment, in dem sie auftreten. Smoke Lab braucht Timing, bevor es ein Zeitfenster sinnvoll testen kann.'
              : 'Log two real urges as they happen today. Smoke Lab needs timing before it can sensibly test a time window.',
            why: de ? 'Fehlende Daten werden nicht durch Vermutungen ersetzt.' : 'Missing data is not replaced with guesses.',
            completionHint: de ? `${Math.min(count, 2)} / 2 Dränge erfasst` : `${Math.min(count, 2)} / 2 urges logged`,
            inputType: 'none',
            completionReady: count >= 2,
            completionProgress: Math.min(count, 2),
            completionTarget: 2,
          });
        }
        const peakEvents = ctx.scopedCravings.filter((event) => {
          const d = new Date(event.timestamp);
          const currentWindow = PatternEngine.getTimeWindow(d.getHours());
          const expected = analysis.peakTimeWindowDe === currentWindow.de || analysis.peakTimeWindowEn === currentWindow.en;
          return expected && Boolean(event.outcome);
        });
        if (peakEvents[0]) evidenceIds.push(peakEvents[0].id);
        return base({
          title: de ? `Teste dein stärkstes Zeitfenster.` : 'Test your strongest time window.',
          objective: de
            ? `${windowLabel}: Öffne Smoke Lab beim nächsten Drang und unterbrich nur diese eine Schleife.`
            : `${windowLabel}: Open Smoke Lab at the next urge and interrupt only that one loop.`,
          why: de
            ? 'Zeitmuster können zeigen, wann eine Strategie besonders nützlich sein könnte.'
            : 'Time patterns can show when a strategy may be especially useful.',
          completionHint: de ? 'Ein Versuch im erkannten Zeitfenster.' : 'One attempt in the identified time window.',
          inputType: 'none',
          targetTimeWindow: windowLabel || undefined,
          completionReady: peakEvents.length >= 1,
          completionProgress: Math.min(peakEvents.length, 1),
          completionTarget: 1,
        });
      }
      case 17: {
        const target = PatternEngine.normalizeTriggerKey(ctx.targetTrigger);
        const attempts = ctx.scopedCravings.filter((event) => PatternEngine.normalizeTriggerKey(event.trigger) === target && ['CHANGE_LOCATION', 'HANDS_BUSY', 'AFTER_MEAL_RESET', 'BREAK_ROUTINE'].includes(event.interventionId) && event.outcome);
        if (attempts[0]) evidenceIds.push(attempts[0].id);
        return base({
          title: de ? `Gib ${trigger} eine andere Antwort.` : `Give ${trigger} a different response.`,
          objective: de
            ? 'Verändere nur eine Handlung direkt nach dem Auslöser: Ort wechseln, Hände beschäftigen oder Pausenroutine verändern.'
            : 'Change only one action after the cue: change location, keep hands busy, or alter the break routine.',
          why: de
            ? 'Kleine Ersatzhandlungen testen eine Alternative, ohne die ganze Situation neu gestalten zu müssen.'
            : 'Small substitute actions test an alternative without redesigning the whole situation.',
          completionHint: de ? 'Ein Alternativ-Verhalten testen.' : 'Test one alternative action.',
          inputType: 'none',
          targetTrigger: target,
          completionReady: attempts.length >= 1,
          completionProgress: Math.min(attempts.length, 1),
          completionTarget: 1,
        });
      }
      case 18: {
        const targetCount = ctx.adaptation.challengeLevel === 'gentle' ? 1 : 2;
        const attempts = ctx.scopedCravings.filter((event) => ['THREE_MINUTE_DELAY', 'MORNING_DELAY', 'COFFEE_SEPARATION', 'CONSCIOUS_CHOICE'].includes(event.interventionId) && event.outcome);
        evidenceIds.push(...attempts.slice(0, targetCount).map((event) => event.id));
        return base({
          title: targetCount === 1
            ? (de ? 'Trainiere eine bewusste Pause.' : 'Practice one deliberate pause.')
            : (de ? 'Trainiere zweimal eine Pause.' : 'Practice a pause twice.'),
          objective: de
            ? `${targetCount === 1 ? 'Ein echter Drang, eine' : 'Zwei echte Dränge, zwei'} bewusste Unterbrechung${targetCount === 1 ? '' : 'en'}. Das Ergebnis ist egal; die Wiederholung wird an deine letzten Situationen angepasst.`
            : `${targetCount === 1 ? 'One real urge, one' : 'Two real urges, two'} deliberate interruption${targetCount === 1 ? '' : 's'}. The outcome does not matter; repetition is adjusted to your recent situations.`,
          why: de
            ? 'Wiederholung ist informativ, soll aber nicht zur Belastungsprobe werden. Bei schwierigeren letzten Situationen bleibt die Aufgabe bewusst kleiner.'
            : 'Repetition is informative, but it should not become an endurance test. After harder recent situations, the task deliberately stays smaller.',
          completionHint: de ? `${Math.min(attempts.length, targetCount)} / ${targetCount} Versuche` : `${Math.min(attempts.length, targetCount)} / ${targetCount} attempts`,
          inputType: 'none',
          completionReady: attempts.length >= targetCount,
          completionProgress: Math.min(attempts.length, targetCount),
          completionTarget: targetCount,
        });
      }
      case 19: {
        const label = this.interventionLabel(ctx.bestInterventionId || ctx.nextBestAction.interventionId, ctx.locale);
        return base({
          title: de ? 'Was funktioniert bisher am ehesten?' : 'What seems to work best so far?',
          objective: de
            ? `Schau dir deine bisherigen Versuche an. Aktuell ist „${label}“ der sinnvollste Kandidat zum Weiterprüfen.`
            : `Review your previous attempts. “${label}” is currently the most useful candidate to keep testing.`,
          why: de
            ? 'Smoke Lab behandelt frühe Ergebnisse als Arbeitshypothesen, nicht als endgültige Wahrheit.'
            : 'Smoke Lab treats early results as working hypotheses, not final truth.',
          completionHint: de ? 'Bestätige, dass du den Kandidaten geprüft hast.' : 'Confirm that you reviewed the candidate.',
          inputType: 'confirm',
          completionReady: ctx.cravingEvents.filter((event) => Boolean(event.outcome)).length >= 3,
          completionProgress: Math.min(ctx.cravingEvents.filter((event) => Boolean(event.outcome)).length, 3),
          completionTarget: 3,
          interventionId: ctx.bestInterventionId || ctx.nextBestAction.interventionId,
        });
      }
      case 20: {
        return base({
          title: de ? 'Entwirf einen leichteren Tag.' : 'Design a lower-risk day.',
          objective: de
            ? 'Wähle zwei kleine Änderungen, die morgen Reize oder Automatismen reduzieren könnten.'
            : 'Choose two small changes that could reduce cues or automaticity tomorrow.',
          why: de
            ? 'Verhaltenspläne sind konkreter, wenn sie an Situationen statt an Willenskraft gebunden sind.'
            : 'Behavior plans become more concrete when tied to situations rather than willpower.',
          completionHint: de ? 'Zwei kurze Änderungen reichen.' : 'Two short changes are enough.',
          inputType: 'text',
          responseKey: 'low_risk_day_plan',
          placeholder: de ? 'z. B. Kaffee am Schreibtisch statt Raucherplatz; Pause zuerst 5 Min. gehen' : 'e.g. coffee at desk instead of smoking spot; walk 5 min at break first',
          suggestedResponse: place && trigger ? `${trigger} · ${place}` : undefined,
          completionReady: false,
          completionProgress: 0,
          completionTarget: 1,
        });
      }
      case 21: {
        const target = PatternEngine.normalizeTriggerKey(ctx.adaptation.targetTrigger || ctx.strongestTrigger || ctx.targetTrigger);
        const targetCount = ctx.adaptation.challengeLevel === 'stretch' ? 2 : 1;
        const attempts = ctx.scopedCravings.filter((event) => PatternEngine.normalizeTriggerKey(event.trigger) === target && event.outcome);
        evidenceIds.push(...attempts.slice(0, targetCount).map((event) => event.id));
        return base({
          title: de ? `Trainiere deinen wichtigsten aktuellen Auslöser.` : 'Train your most relevant current cue.',
          objective: de
            ? `Wenn ${formatSituation(target, ctx.locale)} heute auftritt, nutze die vorbereitete Unterbrechung bewusst${ctx.adaptation.targetPlace ? ` – besonders bei ${formatPlace(ctx.adaptation.targetPlace, ctx.locale)}` : ''}.`
            : `When ${formatSituation(target, ctx.locale)} appears today, deliberately use the prepared interruption${ctx.adaptation.targetPlace ? ` — especially at ${formatPlace(ctx.adaptation.targetPlace, ctx.locale)}` : ''}.`,
          why: de
            ? 'Jetzt geht es nicht mehr nur ums Erkennen. Smoke Lab nutzt den derzeit stärksten persönlichen Kandidaten und passt die Anzahl der Wiederholungen an deine jüngsten Versuche an.'
            : 'The goal is no longer just noticing. Smoke Lab uses the strongest current personal candidate and adjusts repetition to your recent attempts.',
          completionHint: de ? `${Math.min(attempts.length, targetCount)} / ${targetCount} vorbereitete Versuche` : `${Math.min(attempts.length, targetCount)} / ${targetCount} prepared attempts`,
          inputType: 'none',
          targetTrigger: target,
          targetPlace: ctx.adaptation.targetPlace,
          interventionId: ctx.adaptation.preferredInterventionId || ctx.nextBestAction.interventionId,
          completionReady: attempts.length >= targetCount,
          completionProgress: Math.min(attempts.length, targetCount),
          completionTarget: targetCount,
        });
      }
      case 22: {
        const counts = PatternEngine.analyze(ctx.smokingEvents, ctx.cravingEvents).topTriggers;
        const stress = counts.find((item) => item.name === 'Stress')?.count || 0;
        const social = counts.find((item) => item.name === 'Social')?.count || 0;
        const target = ctx.adaptation.highIntensityTrigger || (stress >= social && stress > 0 ? 'Stress' : social > 0 ? 'Social' : ctx.targetTrigger);
        const attempts = ctx.scopedCravings.filter((event) => PatternEngine.normalizeTriggerKey(event.trigger) === PatternEngine.normalizeTriggerKey(target) && event.outcome);
        if (attempts[0]) evidenceIds.push(attempts[0].id);
        return base({
          title: de ? `Trainiere eine schwierigere Situation.` : 'Train one harder situation.',
          objective: de
            ? `Ziel heute: ${formatSituation(target, ctx.locale)}. Lege vorher genau eine Reaktion fest: kurz verzögern, Ort wechseln oder bewusst neu entscheiden.`
            : `Today’s target: ${formatSituation(target, ctx.locale)}. Decide on exactly one response in advance: delay briefly, change location, or consciously decide again.`,
          why: ctx.adaptation.highIntensityTrigger
            ? (de
              ? 'Dieser Auslöser war in mindestens drei erfassten Situationen mit besonders hohem Drang verbunden. Das ist ein Arbeitssignal, keine Risikodiagnose.'
              : 'This cue was linked with relatively high urge intensity across at least three logged situations. It is a working signal, not a risk diagnosis.')
            : (de
              ? 'Wenn noch kein belastbarer Intensitätskandidat existiert, nutzt Smoke Lab einen häufigen Stress-/Sozial-Auslöser oder deinen aktuellen Hauptauslöser.'
              : 'If there is no sufficiently supported intensity candidate yet, Smoke Lab uses a frequent stress/social cue or your current main cue.'),
          completionHint: de ? 'Ein geplanter Versuch in der Ziel-Situation.' : 'One planned attempt in the target situation.',
          inputType: 'none',
          targetTrigger: PatternEngine.normalizeTriggerKey(target),
          interventionId: ctx.adaptation.preferredInterventionId || ctx.nextBestAction.interventionId,
          completionReady: attempts.length >= 1,
          completionProgress: Math.min(attempts.length, 1),
          completionTarget: 1,
        });
      }
      case 23: {
        return base({
          title: de ? 'Mach Autopilot etwas unpraktischer.' : 'Make autopilot slightly less convenient.',
          objective: de
            ? 'Verändere eine Kleinigkeit in deiner Umgebung, sodass die Zigarette nicht völlig reibungslos passiert.'
            : 'Change one small thing in your environment so the cigarette is not completely frictionless.',
          why: de
            ? 'Umgebungsänderungen können automatische Reiz-Handlungs-Ketten unterbrechen, ohne Verbote zu brauchen.'
            : 'Environmental changes can interrupt automatic cue-action chains without requiring prohibition.',
          completionHint: de ? 'Wähle eine kleine, sichere Veränderung.' : 'Choose one small, safe change.',
          inputType: 'choice',
          responseKey: 'friction_plan',
          options: [
            { value: 'move_pack', label: de ? 'Packung nicht am gewohnten Platz' : 'Move the pack from its usual spot' },
            { value: 'separate_lighter', label: de ? 'Feuerzeug getrennt aufbewahren' : 'Keep the lighter separately' },
            { value: 'change_break_spot', label: de ? 'Gewohnten Raucherplatz wechseln' : 'Change the usual smoking spot' },
            { value: 'other', label: de ? 'Eigene kleine Veränderung' : 'My own small change' },
          ],
          completionReady: false,
          completionProgress: 0,
          completionTarget: 1,
        });
      }
      case 24: {
        const intervention = this.interventionLabel(ctx.bestInterventionId || ctx.nextBestAction.interventionId, ctx.locale);
        const suggestion = de
          ? `Wenn ${trigger} auftaucht, dann nutze ich zuerst „${intervention}“, bevor ich neu entscheide.`
          : `If ${trigger} appears, then I will first use “${intervention}” before deciding again.`;
        return base({
          title: de ? 'Baue deinen Wenn–Dann-Plan.' : 'Build your if–then plan.',
          objective: de
            ? 'Verbinde einen konkreten Auslöser mit genau einer vorbereiteten Reaktion.'
            : 'Connect one concrete cue with exactly one prepared response.',
          why: de
            ? 'Wenn–Dann-Pläne übersetzen eine Absicht in eine konkrete Reaktion auf eine vorhersehbare Situation.'
            : 'If–then plans translate an intention into a concrete response to a predictable situation.',
          completionHint: de ? 'Ein kurzer, konkreter Satz reicht.' : 'One short, concrete sentence is enough.',
          inputType: 'text',
          responseKey: 'if_then_plan',
          placeholder: suggestion,
          suggestedResponse: suggestion,
          targetTrigger: ctx.targetTrigger,
          interventionId: ctx.bestInterventionId || ctx.nextBestAction.interventionId,
          completionReady: false,
          completionProgress: 0,
          completionTarget: 1,
        });
      }
      case 25: {
        const targetId = ctx.bestInterventionId || ctx.nextBestAction.interventionId || 'THREE_MINUTE_DELAY';
        const attempts = ctx.scopedCravings.filter((event) => event.interventionId === targetId && event.outcome);
        if (attempts[0]) evidenceIds.push(attempts[0].id);
        return base({
          title: de ? `Wiederhole ${this.interventionLabel(targetId, ctx.locale)}.` : `Repeat ${this.interventionLabel(targetId, ctx.locale)}.`,
          objective: de
            ? 'Heute geht es nicht um etwas Neues. Wiederhole gezielt die Strategie mit dem bisher besten Signal.'
            : 'Today is not about something new. Deliberately repeat the strategy with the best signal so far.',
          why: de
            ? 'Stabile Strategien entstehen eher durch passende Wiederholung als durch ständig neue Tricks.'
            : 'Stable strategies are more likely to come from useful repetition than from constantly changing tricks.',
          completionHint: de ? 'Ein erneuter echter Versuch.' : 'One repeated real attempt.',
          inputType: 'none',
          interventionId: targetId,
          completionReady: attempts.length >= 1,
          completionProgress: Math.min(attempts.length, 1),
          completionTarget: 1,
        });
      }
      case 26: {
        const options = ctx.adaptation.challengeLevel === 'gentle'
          ? [
              { value: '15', label: '15 min' },
              { value: '30', label: '30 min' },
              { value: '45', label: '45 min' },
              { value: '60', label: '60 min' },
            ]
          : ctx.adaptation.challengeLevel === 'stretch'
            ? [
                { value: '60', label: '60 min' },
                { value: '90', label: '90 min' },
                { value: '120', label: '2 h' },
                { value: '180', label: '3 h' },
              ]
            : [
                { value: '30', label: '30 min' },
                { value: '60', label: '60 min' },
                { value: '90', label: '90 min' },
                { value: '120', label: '2 h' },
              ];
        return base({
          title: de ? 'Teste ein längeres, passendes Fenster.' : 'Test a longer, suitable window.',
          objective: de
            ? 'Wähle ein längeres, aber realistisches Fenster. Die Auswahl ist an deine jüngsten Versuche angepasst; du entscheidest selbst, was heute passt.'
            : 'Choose a longer but realistic window. The options are adjusted to your recent attempts; you still decide what fits today.',
          why: de
            ? 'Schrittweise längere Intervalle können zeigen, welche Situationen mehr Flexibilität erlauben. Die Aufgabe soll fordern, aber nicht überfordern.'
            : 'Gradually longer intervals can reveal which situations allow more flexibility. The task should challenge without becoming an endurance test.',
          completionHint: de ? 'Wähle dein Testfenster und probiere es.' : 'Choose your test window and try it.',
          inputType: 'choice',
          responseKey: 'longer_window',
          options,
          completionReady: false,
          completionProgress: 0,
          completionTarget: 1,
        });
      }
      case 27: {
        const suggestion = de
          ? `Wenn ich nach einem schwierigen Moment rauche, erfasse ich zuerst den Auslöser und wähle danach genau einen nächsten Schritt.`
          : `If I smoke after a difficult moment, I will first log the cue and then choose exactly one next step.`;
        return base({
          title: de ? 'Plane einen Ausrutscher, ohne Reset.' : 'Plan for a lapse without a reset.',
          objective: de
            ? 'Lege jetzt fest, was nach einer ungeplanten Zigarette passiert – ohne Schuld und ohne „Tag 1“.'
            : 'Decide now what happens after an unplanned cigarette — without guilt and without going back to “Day 1”.',
          why: de
            ? 'Rückfallprävention umfasst konkrete Coping-Pläne für schwierige Situationen und mögliche Ausrutscher.'
            : 'Relapse prevention includes concrete coping plans for difficult situations and possible lapses.',
          completionHint: de ? 'Ein nächster Schritt genügt.' : 'One next step is enough.',
          inputType: 'text',
          responseKey: 'lapse_plan',
          placeholder: suggestion,
          suggestedResponse: suggestion,
          completionReady: false,
          completionProgress: 0,
          completionTarget: 1,
        });
      }
      case 28: {
        const topThree = PatternEngine.analyze(ctx.smokingEvents, ctx.cravingEvents).topTriggers.slice(0, 3);
        const labels = topThree.length ? topThree.map((item) => formatSituation(item.name, ctx.locale)).join(' · ') : trigger;
        return base({
          title: de ? 'Baue Pläne für deine drei wichtigsten Auslöser.' : 'Build plans for your top three cues.',
          objective: de
            ? `Aktuelle Kandidaten: ${labels}. Notiere für jeden eine kurze vorbereitete Reaktion.`
            : `Current candidates: ${labels}. Write one short prepared response for each.`,
          why: de
            ? 'Ein persönlicher Plan bündelt die Situationen, die in deinen eigenen Daten tatsächlich vorkommen.'
            : 'A personal plan consolidates the situations that actually appear in your own data.',
          completionHint: de ? 'Drei kurze Zeilen reichen.' : 'Three short lines are enough.',
          inputType: 'text',
          responseKey: 'top_trigger_plans',
          placeholder: de ? 'Kaffee → …\nStress → …\nNach dem Essen → …' : 'Coffee → …\nStress → …\nAfter meals → …',
          completionReady: false,
          completionProgress: 0,
          completionTarget: 1,
        });
      }
      case 29: {
        const label = this.interventionLabel(ctx.bestInterventionId || ctx.nextBestAction.interventionId, ctx.locale);
        return base({
          title: de ? 'Wähle dein Erhaltungs-Experiment.' : 'Choose your maintenance experiment.',
          objective: de
            ? `Nimm eine Strategie mit, die du weiter testen willst. Aktueller Kandidat: ${label}.`
            : `Choose one strategy you want to keep testing. Current candidate: ${label}.`,
          why: de
            ? 'Verhaltensänderung braucht nach einem Programm weiterhin Beobachtung, Feedback und anpassbare Pläne.'
            : 'Behavior change still benefits from monitoring, feedback, and adaptable plans after a program ends.',
          completionHint: de ? 'Eine Strategie auswählen.' : 'Choose one strategy.',
          inputType: 'choice',
          responseKey: 'maintenance_experiment',
          options: this.maintenanceOptions(ctx.locale),
          interventionId: ctx.bestInterventionId || ctx.nextBestAction.interventionId,
          completionReady: false,
          completionProgress: 0,
          completionTarget: 1,
        });
      }
      case 30:
      default: {
        const analysis = PatternEngine.analyze(ctx.smokingEvents, ctx.cravingEvents);
        const top = analysis.topTriggers.slice(0, 3).map((item) => formatSituation(item.name, ctx.locale));
        const label = this.interventionLabel(ctx.bestInterventionId || ctx.nextBestAction.interventionId, ctx.locale);
        const summary = de
          ? `Meine wichtigsten Signale: ${top.length ? top.join(', ') : 'noch im Lernen'}. Meine Strategie zum Weiterprüfen: ${label}. Nach einer ungeplanten Zigarette setze ich nicht zurück, sondern analysiere den Auslöser und wähle einen nächsten Schritt.`
          : `My main signals: ${top.length ? top.join(', ') : 'still learning'}. My strategy to keep testing: ${label}. After an unplanned cigarette, I do not reset; I review the cue and choose one next step.`;
        return base({
          title: de ? 'Dein persönlicher Control Plan.' : 'Your personal Control Plan.',
          objective: de
            ? 'Fasse zusammen, was du über deine Schleifen gelernt hast und was du in schwierigen Momenten konkret tun willst.'
            : 'Summarize what you have learned about your loops and what you want to do in difficult moments.',
          why: de
            ? 'Ein konkreter Erhaltungs- und Coping-Plan hilft, hilfreiche Strategien über das Programm hinaus verfügbar zu halten.'
            : 'A concrete maintenance and coping plan helps keep useful strategies available beyond the program.',
          completionHint: de ? 'Du kannst den Vorschlag übernehmen oder anpassen.' : 'You can keep the suggestion or edit it.',
          inputType: 'text',
          responseKey: 'control_plan',
          placeholder: summary,
          suggestedResponse: summary,
          completionReady: false,
          completionProgress: 0,
          completionTarget: 1,
        });
      }
    }
  }

  static nextPhaseId(day: number): JourneyPhaseId {
    return this.phaseForDay(Math.min(30, day + 1), 'en').id;
  }

  static goalLabel(goal: GoalChoice, locale: 'en' | 'de'): string {
    const de = locale === 'de';
    if (goal === 'reduce') return de ? 'Weniger rauchen' : 'Smoke less';
    if (goal === 'quit') return de ? 'Aufhören' : 'Quit smoking';
    return de ? 'Muster verstehen' : 'Understand my pattern';
  }

  static maintenanceOptions(locale: 'en' | 'de'): JourneyMissionOption[] {
    const de = locale === 'de';
    return [
      { value: 'THREE_MINUTE_DELAY', label: de ? 'Drei Minuten Abstand' : 'Three-minute gap' },
      { value: 'CHANGE_LOCATION', label: de ? 'Ort wechseln' : 'Change location' },
      { value: 'COFFEE_SEPARATION', label: de ? 'Kaffee und Zigarette trennen' : 'Separate coffee and cigarette' },
      { value: 'AFTER_MEAL_RESET', label: de ? 'Nach-dem-Essen-Reset' : 'After-meal reset' },
      { value: 'HANDS_BUSY', label: de ? 'Hände beschäftigen' : 'Keep hands busy' },
      { value: 'CONSCIOUS_CHOICE', label: de ? 'Bewusst neu entscheiden' : 'Decide consciously again' },
    ];
  }
}
