import { CravingEvent, PersonalExperiment, SmokingEvent, UserProfile } from '../../types';
import { formatPlace, formatSituation } from '../../i18n/translations';
import { HypothesisEngine } from './HypothesisEngine';
import { PatternEngine } from './PatternEngine';

export type SequenceReasonCode =
  | 'new_dimension'
  | 'comparison_opportunity'
  | 'mixed_prior_signal'
  | 'replicate_supportive_signal'
  | 'untested_trigger'
  | 'repeated_context'
  | 'repeated_time_window'
  | 'diversify_learning';

export interface ExperimentSequenceDecision {
  experiment: PersonalExperiment;
  score: number;
  alternativesConsidered: number;
  questionDe: string;
  questionEn: string;
  whyNowDe: string;
  whyNowEn: string;
  expectedLearningDe: string;
  expectedLearningEn: string;
  reasonCodes: SequenceReasonCode[];
}

type Dimension = 'context' | 'sequence' | 'time' | 'replication';

const dimensionFor = (experiment: PersonalExperiment): Dimension => {
  if (experiment.kind === 'context_shift') return 'context';
  if (experiment.kind === 'time_window_test') return 'time';
  if (experiment.kind === 'repeat_strategy') return 'replication';
  return 'sequence';
};

/**
 * Chooses the next small personal experiment using a deterministic information-
 * value heuristic. "Information value" here is a product prioritization concept,
 * not Bayesian inference, statistical power, diagnosis, or clinical decision support.
 */
export class ExperimentSequencingEngine {
  static next(
    profile: UserProfile,
    smokingEvents: SmokingEvent[] = [],
    cravingEvents: CravingEvent[] = [],
    previousExperiments: PersonalExperiment[] = [],
  ): ExperimentSequenceDecision | null {
    const active = previousExperiments.find((experiment) => experiment.status === 'active');
    if (active) return null;

    const candidates = HypothesisEngine.buildCandidates(profile, smokingEvents, cravingEvents, previousExperiments);
    if (candidates.length === 0) return null;

    const completed = previousExperiments.filter((experiment) => experiment.status === 'completed');
    const lastCompleted = [...completed].sort((a, b) =>
      new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime()
    )[0];

    const scored = candidates.map((candidate) => {
      const trigger = PatternEngine.normalizeTriggerKey(candidate.targetTrigger);
      const dimension = dimensionFor(candidate);
      const sameTriggerCompleted = completed.filter(
        (experiment) => PatternEngine.normalizeTriggerKey(experiment.targetTrigger) === trigger
      );
      const sameDimensionCompleted = sameTriggerCompleted.filter((experiment) => dimensionFor(experiment) === dimension);
      const differentDimensionCompleted = sameTriggerCompleted.filter(
        (experiment) => dimensionFor(experiment) !== dimension && dimensionFor(experiment) !== 'replication'
      );
      const unresolvedPrior = sameTriggerCompleted.find(
        (experiment) => experiment.result === 'mixed' || experiment.result === 'signal_not_seen'
      );
      const supportivePrior = sameTriggerCompleted.find((experiment) => experiment.result === 'signal_supports');
      const otherTriggersWithCandidates = new Set(
        candidates
          .filter((other) => PatternEngine.normalizeTriggerKey(other.targetTrigger) !== trigger)
          .map((other) => PatternEngine.normalizeTriggerKey(other.targetTrigger))
      );
      const reasonCodes: SequenceReasonCode[] = [];

      // Evidence volume is useful, but intentionally capped so the most common cue
      // does not monopolize every future experiment.
      let score = Math.min(candidate.sourceCount, 10) * 0.7;
      if (candidate.sourceEvidence === 'established') score += 3;
      else if (candidate.sourceEvidence === 'emerging') score += 1.5;

      if (sameDimensionCompleted.length === 0) {
        score += 5;
        reasonCodes.push('new_dimension');
      }

      if (differentDimensionCompleted.length > 0 && dimension !== 'replication') {
        score += 7;
        reasonCodes.push('comparison_opportunity');
      }

      if (unresolvedPrior && dimensionFor(unresolvedPrior) !== dimension && dimension !== 'replication') {
        score += 4;
        reasonCodes.push('mixed_prior_signal');
      }

      if (sameTriggerCompleted.length === 0) {
        score += 3;
        reasonCodes.push('untested_trigger');
      }

      if (candidate.kind === 'context_shift') {
        score += 2.5;
        reasonCodes.push('repeated_context');
      }

      if (dimension === 'sequence') {
        // Sequence/cue tests are usually highly actionable while changing only one
        // immediate part of the loop, so they receive a small feasibility bonus.
        score += 2.5;
      }

      if (candidate.kind === 'time_window_test') {
        score += 2;
        reasonCodes.push('repeated_time_window');
      }

      if (candidate.kind === 'repeat_strategy') {
        // Replication matters, but a genuinely different question about the same
        // recurring cue usually teaches more first.
        score += supportivePrior ? 4 : 0;
        score -= candidates.some(
          (other) =>
            PatternEngine.normalizeTriggerKey(other.targetTrigger) === trigger &&
            dimensionFor(other) !== 'replication'
        ) ? 5 : 0;
        reasonCodes.push('replicate_supportive_signal');
      }

      // After two completed tests on one cue, gently diversify if another repeated
      // cue is ready to learn from. This prevents tunnel vision around one trigger.
      if (sameTriggerCompleted.length >= 2 && otherTriggersWithCandidates.size > 0) {
        score -= 8;
        reasonCodes.push('diversify_learning');
      }

      // Avoid immediately circling the exact same trigger after a just-completed
      // test unless there is a strong comparison opportunity.
      if (
        lastCompleted &&
        PatternEngine.normalizeTriggerKey(lastCompleted.targetTrigger) === trigger &&
        !reasonCodes.includes('comparison_opportunity') &&
        dimension !== 'replication'
      ) {
        score -= 1.5;
      }

      return { candidate, score, reasonCodes };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.candidate.sourceCount !== a.candidate.sourceCount) return b.candidate.sourceCount - a.candidate.sourceCount;
      return a.candidate.signature.localeCompare(b.candidate.signature);
    });

    const chosen = scored[0];
    const copy = this.explain(chosen.candidate, chosen.reasonCodes, completed);
    const experiment: PersonalExperiment = {
      ...chosen.candidate,
      sequenceQuestionDe: copy.questionDe,
      sequenceQuestionEn: copy.questionEn,
      sequenceWhyNowDe: copy.whyNowDe,
      sequenceWhyNowEn: copy.whyNowEn,
      sequenceLearningDe: copy.expectedLearningDe,
      sequenceLearningEn: copy.expectedLearningEn,
      sequenceScore: Math.round(chosen.score * 10) / 10,
      sequenceReasonCodes: chosen.reasonCodes,
    };

    return {
      experiment,
      score: experiment.sequenceScore || 0,
      alternativesConsidered: scored.length,
      ...copy,
      reasonCodes: chosen.reasonCodes,
    };
  }

  private static explain(
    experiment: PersonalExperiment,
    reasons: SequenceReasonCode[],
    completed: PersonalExperiment[],
  ): Omit<ExperimentSequenceDecision, 'experiment' | 'score' | 'alternativesConsidered' | 'reasonCodes'> {
    const trigger = PatternEngine.normalizeTriggerKey(experiment.targetTrigger);
    const triggerDe = formatSituation(trigger, 'de');
    const triggerEn = formatSituation(trigger, 'en');
    const placeDe = experiment.targetPlace ? formatPlace(experiment.targetPlace, 'de') : null;
    const placeEn = experiment.targetPlace ? formatPlace(experiment.targetPlace, 'en') : null;
    const windowDe = PatternEngine.getTimeWindowLabel(experiment.targetTimeWindow, 'de');
    const windowEn = PatternEngine.getTimeWindowLabel(experiment.targetTimeWindow, 'en');
    const priorSameTrigger = completed.filter(
      (item) => PatternEngine.normalizeTriggerKey(item.targetTrigger) === trigger
    );

    let questionDe = `Welche kleine Veränderung macht bei ${triggerDe} einen Unterschied?`;
    let questionEn = `Which small change makes a difference around ${triggerEn.toLowerCase()}?`;
    let expectedLearningDe = 'Wir vergleichen nur deine eigenen wiederkehrenden Situationen. Das Ergebnis ist ein Arbeitssignal, kein Beweis für Ursache oder Wirksamkeit.';
    let expectedLearningEn = 'We compare only your own recurring situations. The result is a working signal, not proof of cause or effectiveness.';

    if (experiment.kind === 'context_shift') {
      questionDe = `Ist es nur ${triggerDe} – oder spielt der Ort ${placeDe || ''} mit?`;
      questionEn = `Is it only ${triggerEn.toLowerCase()} — or does ${placeEn || 'the place'} play a role too?`;
      expectedLearningDe = `Wir verändern nur den Ort und beobachten, ob sich der Drang in vergleichbaren ${triggerDe}-Situationen anders entwickelt.`;
      expectedLearningEn = `We change only the location and observe whether the urge develops differently in comparable ${triggerEn.toLowerCase()} situations.`;
    } else if (experiment.kind === 'cue_separation' || experiment.kind === 'routine_break' || experiment.kind === 'delay_test') {
      questionDe = trigger === 'Coffee'
        ? 'Ist es der Kaffee – oder vor allem die automatische Kopplung an die Zigarette?'
        : `Ist es ${triggerDe} selbst – oder vor allem die automatische Abfolge danach?`;
      questionEn = trigger === 'Coffee'
        ? 'Is it the coffee — or mainly the automatic pairing with a cigarette?'
        : `Is it ${triggerEn.toLowerCase()} itself — or mainly the automatic sequence that follows?`;
      expectedLearningDe = 'Wir lassen den Auslöser bestehen und verändern nur die direkte Reaktion darauf.';
      expectedLearningEn = 'We keep the cue and change only the immediate response that follows it.';
    } else if (experiment.kind === 'time_window_test') {
      questionDe = `Ist ${windowDe || 'dieses Zeitfenster'} bei ${triggerDe} ein besonders stabiler Teil deiner Routine?`;
      questionEn = `Is ${windowEn || 'this time window'} a particularly stable part of your ${triggerEn.toLowerCase()} routine?`;
      expectedLearningDe = 'Wir testen eine kleine Unterbrechung gezielt in diesem wiederkehrenden Zeitfenster. Das prüft die Nützlichkeit des Zeitkontexts – nicht, ob die Uhrzeit die Ursache ist.';
      expectedLearningEn = 'We test a small interruption specifically in this recurring time window. This tests the usefulness of time context, not whether time is the cause.';
    } else if (experiment.kind === 'repeat_strategy') {
      questionDe = `War das hilfreiche Signal bei ${triggerDe} stabil – oder nur in diesen ersten Situationen sichtbar?`;
      questionEn = `Was the helpful signal around ${triggerEn.toLowerCase()} stable — or only visible in those first situations?`;
      expectedLearningDe = 'Wir wiederholen denselben Test zweimal, bevor Smoke Lab ihn stärker gewichtet.';
      expectedLearningEn = 'We repeat the same test twice before Smoke Lab gives it more weight.';
    }

    let whyNowDe = `${triggerDe} ist oft genug aufgetaucht, um eine kleine vergleichbare Frage zu testen.`;
    let whyNowEn = `${triggerEn} has appeared often enough to test one small comparable question.`;

    if (reasons.includes('comparison_opportunity')) {
      whyNowDe = `Für ${triggerDe} gibt es bereits einen abgeschlossenen Test. Jetzt verändern wir bewusst einen anderen Teil der Schleife, damit Smoke Lab nicht einfach dieselbe Idee wiederholt.`;
      whyNowEn = `There is already a completed test for ${triggerEn}. Now we deliberately change a different part of the loop instead of simply repeating the same idea.`;
    } else if (reasons.includes('mixed_prior_signal')) {
      whyNowDe = `Ein früherer Test bei ${triggerDe} war gemischt oder zeigte kein hilfreiches Signal. Deshalb prüft Smoke Lab jetzt eine andere plausible Komponente der Schleife.`;
      whyNowEn = `An earlier test around ${triggerEn} was mixed or did not show a helpful signal, so Smoke Lab now tests a different plausible part of the loop.`;
    } else if (experiment.kind === 'repeat_strategy') {
      whyNowDe = `Ein früherer Test bei ${triggerDe} sah wiederholt hilfreich aus. Bevor daraus eine bevorzugte Strategie wird, prüfen wir, ob sich dieses Signal noch einmal zeigt.`;
      whyNowEn = `An earlier test around ${triggerEn} repeatedly looked helpful. Before treating it as a preferred strategy, we check whether that signal appears again.`;
    } else if (experiment.kind === 'context_shift' && placeDe) {
      whyNowDe = `${triggerDe} und ${placeDe} sind bisher ${experiment.sourceCount}-mal gemeinsam aufgetaucht. Diese Wiederholung macht den Kontext zu einer sinnvollen offenen Frage.`;
      whyNowEn = `${triggerEn} and ${placeEn} have appeared together ${experiment.sourceCount} times. That repetition makes context a useful open question.`;
    } else if (experiment.kind === 'time_window_test' && windowDe) {
      whyNowDe = `${triggerDe} ist bisher ${experiment.sourceCount}-mal im Zeitfenster ${windowDe} aufgetaucht. Das reicht für einen kleinen gezielten Vergleich.`;
      whyNowEn = `${triggerEn} has appeared ${experiment.sourceCount} times in the ${windowEn} window, enough for a small targeted comparison.`;
    } else if (priorSameTrigger.length === 0) {
      whyNowDe = `${triggerDe} wiederholt sich in deinen Daten, wurde aber noch nicht mit einem persönlichen Test untersucht.`;
      whyNowEn = `${triggerEn} repeats in your data but has not yet been explored with a personal test.`;
    }

    return { questionDe, questionEn, whyNowDe, whyNowEn, expectedLearningDe, expectedLearningEn };
  }
}
