import {
  CravingEvent,
  PersonalExperiment,
  PersonalExperimentKind,
  PersonalExperimentResult,
  SmokingEvent,
  UserProfile,
} from '../../types';
import { formatPlace, formatSituation } from '../../i18n/translations';
import { BehaviorInterventionEngine } from './BehaviorInterventionEngine';
import { PatternEngine } from './PatternEngine';

export interface ExperimentEvaluation {
  attempts: number;
  helpful: number;
  unchanged: number;
  difficult: number;
  complete: boolean;
  result: PersonalExperimentResult;
  summaryDe: string;
  summaryEn: string;
}

export interface ExperimentComparison {
  trigger: string;
  primaryExperimentId: string;
  comparisonExperimentId: string;
  signal: 'context_stronger' | 'sequence_stronger' | 'both' | 'unclear';
  summaryDe: string;
  summaryEn: string;
}

const safeId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Turns repeated on-device observations into small personal working hypotheses.
 * This is exploratory N-of-1 product logic. It does not establish causality,
 * diagnose dependence, or estimate treatment effectiveness.
 */
export class HypothesisEngine {
  private static alreadyCompleted(signature: string, previous: PersonalExperiment[]): boolean {
    return previous.some((experiment) => experiment.signature === signature && experiment.status === 'completed');
  }

  private static alreadyExists(signature: string, previous: PersonalExperiment[]): boolean {
    return previous.some((experiment) => experiment.signature === signature);
  }

  private static create(
    kind: PersonalExperimentKind,
    trigger: string,
    interventionId: string,
    sourceEvidence: PersonalExperiment['sourceEvidence'],
    sourceCount: number,
    copy: Omit<PersonalExperiment, 'id' | 'signature' | 'kind' | 'status' | 'createdAt' | 'targetTrigger' | 'interventionId' | 'targetAttempts' | 'attemptCravingIds' | 'sourceEvidence' | 'sourceCount'>,
    targetPlace?: string,
    targetTimeWindow?: string,
    targetAttempts = 3,
  ): PersonalExperiment {
    // Time window is intentionally part of the signature in v0.6 so two
    // genuinely different time-context questions do not collapse into one test.
    const signature = [
      kind,
      PatternEngine.normalizeTriggerKey(trigger),
      targetPlace ? PatternEngine.normalizePlaceKey(targetPlace) : '',
      targetTimeWindow || '',
      interventionId,
    ]
      .filter(Boolean)
      .join('|');

    return {
      id: `experiment_${Date.now()}_${safeId(signature).slice(0, 48)}`,
      signature,
      kind,
      status: 'suggested',
      createdAt: new Date().toISOString(),
      targetTrigger: PatternEngine.normalizeTriggerKey(trigger),
      targetPlace: targetPlace ? PatternEngine.normalizePlaceKey(targetPlace) : undefined,
      targetTimeWindow,
      interventionId,
      targetAttempts,
      attemptCravingIds: [],
      sourceEvidence,
      sourceCount,
      ...copy,
    };
  }

  /**
   * Build all currently defensible candidate questions. The sequencing engine
   * decides which one is most useful next; this method only creates candidates
   * from evidence that actually exists on-device.
   */
  static buildCandidates(
    profile: UserProfile,
    smokingEvents: SmokingEvent[] = [],
    cravingEvents: CravingEvent[] = [],
    previousExperiments: PersonalExperiment[] = [],
  ): PersonalExperiment[] {
    const analysis = PatternEngine.analyze(smokingEvents, cravingEvents);
    const candidates: PersonalExperiment[] = [];

    // A) Context question: repeated trigger + place. Use the place-only combo,
    // not a hyper-specific place+time combo, so the initial test stays feasible.
    const contextCombos = analysis.combinations.filter(
      (combo) =>
        combo.place &&
        !combo.timeWindow &&
        combo.count >= PatternEngine.MIN_EVENTS_FOR_COMBINATION &&
        PatternEngine.normalizeTriggerKey(combo.trigger) !== 'Driving'
    );

    for (const combo of contextCombos) {
      const trigger = PatternEngine.normalizeTriggerKey(combo.trigger);
      const place = PatternEngine.normalizePlaceKey(combo.place!);
      const triggerDe = formatSituation(trigger, 'de');
      const triggerEn = formatSituation(trigger, 'en');
      const placeDe = formatPlace(place, 'de');
      const placeEn = formatPlace(place, 'en');
      const experiment = this.create(
        'context_shift',
        trigger,
        'CHANGE_LOCATION',
        combo.strength,
        combo.count,
        {
          targetPlace: place,
          hypothesisDe: `Arbeitshypothese: Nicht nur ${triggerDe}, sondern auch der gewohnte Ort könnte Teil deiner Schleife sein.`,
          hypothesisEn: `Working hypothesis: the usual place — not only ${triggerEn.toLowerCase()} — may be part of your loop.`,
          testDe: `Wenn ${triggerDe} wieder bei ${placeDe} auftaucht, verändere kurz den Ort und entscheide erst danach neu.`,
          testEn: `When ${triggerEn.toLowerCase()} appears again at ${placeEn}, briefly change location before deciding again.`,
          keepConstantDe: `Auslöser: ${triggerDe}`,
          keepConstantEn: `Cue: ${triggerEn}`,
          changeDe: `Kontext: kurz weg von ${placeDe}`,
          changeEn: `Context: briefly move away from ${placeEn}`,
          rationaleDe: `${triggerDe} + ${placeDe} ist bisher ${combo.count}-mal gemeinsam aufgetaucht. Wir testen beschreibend, ob ein Ortswechsel in vergleichbaren Situationen mit einem anderen Drangverlauf zusammenfällt.`,
          rationaleEn: `${triggerEn} + ${placeEn} has appeared together ${combo.count} times so far. We are descriptively testing whether changing location in comparable situations coincides with a different urge trajectory.`,
        },
        place,
      );
      if (!this.alreadyExists(experiment.signature, previousExperiments)) candidates.push(experiment);
    }

    // B) Sequence/cue question for every sufficiently repeated trigger, not just
    // the single strongest one. This gives the sequencer meaningful alternatives.
    for (const triggerItem of analysis.topTriggers.filter((item) => item.count >= PatternEngine.MIN_EVENTS_FOR_TRIGGER)) {
      const trigger = PatternEngine.normalizeTriggerKey(triggerItem.name);
      if (trigger === 'Driving') continue;
      const triggerDe = formatSituation(trigger, 'de');
      const triggerEn = formatSituation(trigger, 'en');
      const selection = BehaviorInterventionEngine.selectIntervention(trigger, undefined, cravingEvents);
      const interventionId = selection.intervention.id;
      let kind: PersonalExperimentKind = 'delay_test';
      let hypothesisDe = `Arbeitshypothese: Ein Teil des Drangs bei ${triggerDe} könnte an der automatischen Abfolge hängen – nicht nur am Auslöser selbst.`;
      let hypothesisEn = `Working hypothesis: part of the urge around ${triggerEn.toLowerCase()} may come from the automatic sequence, not only the cue itself.`;
      let testDe = `Beim nächsten ${triggerDe}-Moment testest du dieselbe kleine Unterbrechung und bewertest den Drang danach neu.`;
      let testEn = `At the next ${triggerEn.toLowerCase()} moment, repeat the same small interruption and reassess the urge afterward.`;
      let keepDe = `Auslöser: ${triggerDe}`;
      let keepEn = `Cue: ${triggerEn}`;
      let changeDe = 'Nur die automatische Reaktion';
      let changeEn = 'Only the automatic response';

      if (interventionId === 'COFFEE_SEPARATION') {
        kind = 'cue_separation';
        hypothesisDe = 'Arbeitshypothese: Kaffee und Zigarette sind möglicherweise stärker als Routine gekoppelt, als es der Drang allein erklärt.';
        hypothesisEn = 'Working hypothesis: coffee and smoking may be paired by routine more strongly than the urge alone explains.';
        testDe = 'Behalte den Kaffee. Trenne nur den Zeitpunkt der Zigarette und beobachte, ob sich der Drang verändert.';
        testEn = 'Keep the coffee. Separate only the timing of the cigarette and observe whether the urge changes.';
        keepDe = 'Kaffee bleibt gleich';
        keepEn = 'Coffee stays the same';
        changeDe = 'Zeitpunkt der Zigarette';
        changeEn = 'Timing of the cigarette';
      } else if (interventionId === 'AFTER_MEAL_RESET') {
        kind = 'routine_break';
        hypothesisDe = 'Arbeitshypothese: Der Abschluss einer Mahlzeit könnte selbst Teil der Rauchschleife sein.';
        hypothesisEn = 'Working hypothesis: the ending of a meal may itself be part of the smoking loop.';
        testDe = 'Behalte die Mahlzeit. Ändere direkt danach nur Raum oder Tätigkeit und entscheide anschließend neu.';
        testEn = 'Keep the meal unchanged. Change only the room or activity immediately afterward, then decide again.';
        keepDe = 'Mahlzeit bleibt gleich';
        keepEn = 'Meal stays the same';
        changeDe = 'Der Ablauf direkt danach';
        changeEn = 'What happens immediately after';
      }

      const evidence = triggerItem.count >= 10 && analysis.uniqueDaysRecorded >= 3 ? 'established' : 'emerging';
      const experiment = this.create(
        kind,
        trigger,
        interventionId,
        evidence,
        triggerItem.count,
        {
          hypothesisDe,
          hypothesisEn,
          testDe,
          testEn,
          keepConstantDe: keepDe,
          keepConstantEn: keepEn,
          changeDe,
          changeEn,
          rationaleDe: `${triggerDe} ist in deinen bisherigen Einträgen ${triggerItem.count}-mal aufgetaucht. Drei vergleichbare Tests können zeigen, ob diese Unterbrechung bei dir ein wiederkehrendes Arbeitssignal erzeugt.`,
          rationaleEn: `${triggerEn} has appeared ${triggerItem.count} times in your current logs. Three comparable tests can show whether this interruption produces a recurring working signal for you.`,
        },
      );
      if (!this.alreadyExists(experiment.signature, previousExperiments)) candidates.push(experiment);
    }

    // C) Time-window question: if a cue repeatedly clusters in one time window,
    // test a small interruption specifically inside that window. This does not
    // claim that time causes the urge; it asks whether the window is useful context.
    const timeCombos = analysis.combinations.filter(
      (combo) =>
        combo.timeWindow &&
        !combo.place &&
        combo.count >= PatternEngine.MIN_EVENTS_FOR_COMBINATION &&
        PatternEngine.normalizeTriggerKey(combo.trigger) !== 'Driving'
    );

    for (const combo of timeCombos) {
      const trigger = PatternEngine.normalizeTriggerKey(combo.trigger);
      const triggerDe = formatSituation(trigger, 'de');
      const triggerEn = formatSituation(trigger, 'en');
      const windowDe = PatternEngine.getTimeWindowLabel(combo.timeWindow, 'de') || combo.timeWindow!;
      const windowEn = PatternEngine.getTimeWindowLabel(combo.timeWindow, 'en') || combo.timeWindow!;
      const interventionId = trigger === 'Morning routine' ? 'MORNING_DELAY' : 'THREE_MINUTE_DELAY';
      const experiment = this.create(
        'time_window_test',
        trigger,
        interventionId,
        combo.strength,
        combo.count,
        {
          targetTimeWindow: combo.timeWindow,
          hypothesisDe: `Arbeitshypothese: ${windowDe} könnte bei ${triggerDe} ein wiederkehrender Teil deiner Routine sein.`,
          hypothesisEn: `Working hypothesis: ${windowEn} may be a recurring part of your ${triggerEn.toLowerCase()} routine.`,
          testDe: `Wenn ${triggerDe} wieder am ${windowDe.toLowerCase()} auftaucht, setze eine kurze bewusste Pause ein und bewerte den Drang danach neu.`,
          testEn: `When ${triggerEn.toLowerCase()} appears again in the ${windowEn}, insert a short deliberate pause and reassess the urge afterward.`,
          keepConstantDe: `Auslöser: ${triggerDe}`,
          keepConstantEn: `Cue: ${triggerEn}`,
          changeDe: `Reaktion im Zeitfenster ${windowDe}`,
          changeEn: `Response during the ${windowEn} window`,
          rationaleDe: `${triggerDe} ist bisher ${combo.count}-mal in diesem Zeitfenster aufgetaucht. Der Test prüft, ob eine gezielte Unterbrechung gerade dort ein wiederkehrendes persönliches Signal liefert.`,
          rationaleEn: `${triggerEn} has appeared ${combo.count} times in this time window. The test checks whether a targeted interruption there produces a recurring personal signal.`,
        },
        undefined,
        combo.timeWindow,
      );
      if (!this.alreadyExists(experiment.signature, previousExperiments)) candidates.push(experiment);
    }

    // D) Replication candidate: a supportive signal is more useful if it can be
    // observed again. Replication is deliberately lower priority than a new,
    // orthogonal question when one exists; the sequencing engine decides.
    const supportiveCompleted = previousExperiments.filter(
      (experiment) => experiment.status === 'completed' && experiment.result === 'signal_supports' && experiment.kind !== 'repeat_strategy'
    );
    for (const completed of supportiveCompleted) {
      const trigger = PatternEngine.normalizeTriggerKey(completed.targetTrigger);
      if (trigger === 'Driving') continue;
      const triggerDe = formatSituation(trigger, 'de');
      const triggerEn = formatSituation(trigger, 'en');
      const experiment = this.create(
        'repeat_strategy',
        trigger,
        completed.interventionId,
        completed.sourceEvidence,
        completed.sourceCount,
        {
          targetPlace: completed.targetPlace,
          targetTimeWindow: completed.targetTimeWindow,
          hypothesisDe: `Offene Frage: Wiederholt sich das bisher hilfreiche Signal bei ${triggerDe}, wenn du denselben Test noch einmal in vergleichbaren Situationen machst?`,
          hypothesisEn: `Open question: does the helpful signal around ${triggerEn.toLowerCase()} repeat when you run the same test again in comparable situations?`,
          testDe: `Wiederhole die bisher hilfreiche Unterbrechung zweimal in passenden ${triggerDe}-Situationen.`,
          testEn: `Repeat the previously helpful interruption twice in matching ${triggerEn.toLowerCase()} situations.`,
          keepConstantDe: completed.keepConstantDe,
          keepConstantEn: completed.keepConstantEn,
          changeDe: completed.changeDe,
          changeEn: completed.changeEn,
          rationaleDe: 'Ein einzelner Dreier-Test ist nur ein erstes Arbeitssignal. Zwei weitere vergleichbare Situationen können zeigen, ob es sich wiederholt oder eher zufällig wirkte.',
          rationaleEn: 'One three-attempt test is only an initial working signal. Two more comparable situations can show whether it repeats or looked more incidental.',
        },
        completed.targetPlace,
        completed.targetTimeWindow,
        2,
      );
      if (!this.alreadyExists(experiment.signature, previousExperiments)) candidates.push(experiment);
    }

    // Onboarding choices can guide Journey missions, but sparse choices alone are
    // intentionally not enough to manufacture a personal hypothesis.
    void profile;
    return candidates;
  }

  /** Backward-compatible fallback. v0.6 UI uses ExperimentSequencingEngine. */
  static suggest(
    profile: UserProfile,
    smokingEvents: SmokingEvent[] = [],
    cravingEvents: CravingEvent[] = [],
    previousExperiments: PersonalExperiment[] = [],
  ): PersonalExperiment | null {
    return this.buildCandidates(profile, smokingEvents, cravingEvents, previousExperiments)[0] || null;
  }

  static matches(experiment: PersonalExperiment, trigger?: string, place?: string, timestamp?: string): boolean {
    if (experiment.status !== 'active' || !trigger) return false;
    if (PatternEngine.normalizeTriggerKey(trigger) !== PatternEngine.normalizeTriggerKey(experiment.targetTrigger)) return false;
    if (experiment.targetPlace) {
      if (!place) return false;
      if (PatternEngine.normalizePlaceKey(place) !== PatternEngine.normalizePlaceKey(experiment.targetPlace)) return false;
    }
    // Only explicit time-window experiments require an in-window match. Older
    // context experiments may carry targetTimeWindow metadata from v0.5 and
    // should not suddenly become more restrictive after migration.
    if (experiment.kind === 'time_window_test' && experiment.targetTimeWindow) {
      const d = timestamp ? new Date(timestamp) : new Date();
      if (Number.isNaN(d.getTime())) return false;
      if (PatternEngine.getTimeWindow(d.getHours()).id !== experiment.targetTimeWindow) return false;
    }
    return true;
  }

  static evaluate(experiment: PersonalExperiment, cravingEvents: CravingEvent[]): ExperimentEvaluation {
    const attempts = cravingEvents
      .filter((event) => event.experimentId === experiment.id && Boolean(event.outcome))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const helpful = attempts.filter((event) => event.outcome === 'gone' || event.outcome === 'weaker').length;
    const unchanged = attempts.filter((event) => event.outcome === 'unchanged').length;
    const difficult = attempts.filter((event) => event.outcome === 'stronger' || event.outcome === 'smoked').length;
    const complete = attempts.length >= experiment.targetAttempts;

    let result: PersonalExperimentResult = 'collecting';
    if (complete) {
      const neededForSignal = Math.ceil(experiment.targetAttempts * 2 / 3);
      if (helpful >= neededForSignal) result = 'signal_supports';
      else if (helpful === 0) result = 'signal_not_seen';
      else result = 'mixed';
    }

    const baseDe = `${helpful} von ${attempts.length} abgeschlossenen Versuchen endeten mit „schwächer“ oder „weg“.`;
    const baseEn = `${helpful} of ${attempts.length} completed attempts ended with a weaker or gone urge.`;

    let summaryDe = `Noch sammeln wir vergleichbare Situationen. ${baseDe}`;
    let summaryEn = `We are still collecting comparable situations. ${baseEn}`;

    if (result === 'signal_supports') {
      if (experiment.kind === 'context_shift') {
        summaryDe = `${baseDe} Das ist ein persönliches Signal dafür, dass der Kontext Teil dieser Schleife sein könnte – kein Beweis für Ursache und Wirkung.`;
        summaryEn = `${baseEn} This is a personal signal that context may be part of this loop — not proof of cause and effect.`;
      } else if (experiment.kind === 'time_window_test') {
        summaryDe = `${baseDe} Die Unterbrechung war in diesem Zeitfenster wiederholt mit einem schwächeren Drang verbunden. Das ist ein persönliches Arbeitssignal, keine Aussage darüber, dass die Uhrzeit die Ursache ist.`;
        summaryEn = `${baseEn} The interruption in this time window was repeatedly associated with a weaker urge. This is a personal working signal, not a claim that time is the cause.`;
      } else if (experiment.kind === 'repeat_strategy') {
        summaryDe = `${baseDe} Das frühere hilfreiche Signal hat sich in diesem kleinen Wiederholungstest erneut gezeigt. Es bleibt eine persönliche Beobachtung, keine Wirksamkeitsgarantie.`;
        summaryEn = `${baseEn} The earlier helpful signal appeared again in this small replication. It remains a personal observation, not a guarantee of effectiveness.`;
      } else {
        summaryDe = `${baseDe} Die Unterbrechung wirkt in diesen Situationen bisher wiederholt hilfreich. Das ist ein Arbeitssignal, keine Wirksamkeitsgarantie.`;
        summaryEn = `${baseEn} The interruption has repeatedly looked helpful in these situations so far. This is a working signal, not a guarantee of effectiveness.`;
      }
    } else if (result === 'mixed') {
      summaryDe = `${baseDe} Das Muster ist gemischt. Smoke Lab sollte diese Strategie deshalb nicht automatisch als deine beste behandeln.`;
      summaryEn = `${baseEn} The pattern is mixed, so Smoke Lab should not automatically treat this strategy as your best one.`;
    } else if (result === 'signal_not_seen') {
      summaryDe = `${baseDe} In diesen Versuchen zeigt sich bisher kein hilfreiches Signal. Das ist nützliche Information für die nächste offene Frage.`;
      summaryEn = `${baseEn} These attempts do not show a helpful signal so far. That is useful information for the next open question.`;
    }

    return {
      attempts: attempts.length,
      helpful,
      unchanged,
      difficult,
      complete,
      result,
      summaryDe,
      summaryEn,
    };
  }

  /**
   * Compare two completed experiments that targeted the same trigger but changed
   * different parts of the loop. This is a descriptive within-person comparison,
   * not a causal estimate or statistical test.
   */
  static compareCompleted(experiments: PersonalExperiment[]): ExperimentComparison | null {
    const completed = experiments.filter((experiment) => experiment.status === 'completed' && experiment.result);
    const byTrigger: Record<string, PersonalExperiment[]> = {};
    completed.forEach((experiment) => {
      const key = PatternEngine.normalizeTriggerKey(experiment.targetTrigger);
      if (!byTrigger[key]) byTrigger[key] = [];
      byTrigger[key].push(experiment);
    });

    for (const [trigger, group] of Object.entries(byTrigger)) {
      const context = group.find((experiment) => experiment.kind === 'context_shift');
      const sequence = group.find((experiment) => ['cue_separation', 'routine_break', 'delay_test'].includes(experiment.kind));
      if (!context || !sequence) continue;

      const contextSupport = context.result === 'signal_supports';
      const sequenceSupport = sequence.result === 'signal_supports';
      let signal: ExperimentComparison['signal'] = 'unclear';
      let summaryDe = 'Die beiden Tests ergeben bisher kein klares unterschiedliches Arbeitssignal. Weitere Situationen oder ein anderer Test sind sinnvoller als eine vorschnelle Schlussfolgerung.';
      let summaryEn = 'The two tests do not yet show a clear difference in working signals. More situations or a different test is more useful than a premature conclusion.';

      if (contextSupport && sequenceSupport) {
        signal = 'both';
        summaryDe = 'Sowohl Kontextwechsel als auch die Unterbrechung der gewohnten Abfolge zeigten wiederholt ein hilfreiches Signal. Bei diesem Auslöser könnten mehrere Teile der Schleife relevant sein.';
        summaryEn = 'Both changing context and interrupting the usual sequence repeatedly showed a helpful signal. More than one part of the loop may matter for this cue.';
      } else if (contextSupport && !sequenceSupport) {
        signal = 'context_stronger';
        summaryDe = 'Der Kontextwechsel zeigt bisher das deutlichere Arbeitssignal als die reine Unterbrechung der Abfolge. Das spricht dafür, den Ort in ähnlichen Situationen gezielter zu testen – ohne Ursache zu behaupten.';
        summaryEn = 'Changing context currently shows the clearer working signal than interrupting the sequence alone. That makes location worth testing more deliberately, without claiming causality.';
      } else if (!contextSupport && sequenceSupport) {
        signal = 'sequence_stronger';
        summaryDe = 'Die Unterbrechung der gewohnten Abfolge zeigt bisher das deutlichere Arbeitssignal als ein Ortswechsel. Der Zeitpunkt bzw. die Kopplung könnte für den nächsten Test interessanter sein.';
        summaryEn = 'Interrupting the usual sequence currently shows the clearer working signal than changing location. Timing or cue pairing may be more useful to test next.';
      }

      return {
        trigger,
        primaryExperimentId: context.id,
        comparisonExperimentId: sequence.id,
        signal,
        summaryDe,
        summaryEn,
      };
    }
    return null;
  }
}
