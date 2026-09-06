export type InterventionPrioritySource = 'personal_experiment' | 'quit_protection' | 'journey' | 'adaptive';

export interface InterventionOverrideCandidate {
  id: string;
  durationSeconds?: number;
}

export interface InterventionPriorityDecision {
  source: InterventionPrioritySource;
  id?: string;
  durationSeconds?: number;
  reasonDe: string;
  reasonEn: string;
}

/**
 * Resolves competing intervention suggestions before the craving flow starts.
 * This is product orchestration, not clinical prioritization.
 *
 * Priority is intentionally explicit:
 * 1) a personal experiment the user deliberately activated,
 * 2) an exact matching quit protection plan the user prepared,
 * 3) the current Journey mission,
 * 4) the adaptive intervention engine.
 */
export class InterventionPriorityEngine {
  static resolve(
    personalExperiment?: InterventionOverrideCandidate,
    quitProtection?: InterventionOverrideCandidate,
    journey?: InterventionOverrideCandidate,
  ): InterventionPriorityDecision {
    if (personalExperiment?.id) {
      return {
        source: 'personal_experiment',
        id: personalExperiment.id,
        durationSeconds: personalExperiment.durationSeconds,
        reasonDe: 'Ein bewusst aktivierter persönlicher Test hat Vorrang, damit die Situationen vergleichbar bleiben.',
        reasonEn: 'A deliberately activated personal test takes priority so the situations remain comparable.',
      };
    }
    if (quitProtection?.id) {
      return {
        source: 'quit_protection',
        id: quitProtection.id,
        durationSeconds: quitProtection.durationSeconds,
        reasonDe: 'Ein passender vorbereiteter Schutzplan hat Vorrang vor einer allgemeinen Journey-Aufgabe.',
        reasonEn: 'A matching prepared protection plan takes priority over a general Journey task.',
      };
    }
    if (journey?.id) {
      return {
        source: 'journey',
        id: journey.id,
        durationSeconds: journey.durationSeconds,
        reasonDe: 'Die aktuelle Journey-Aufgabe wird genutzt, solange kein persönlicher Test oder Schutzplan passt.',
        reasonEn: 'The current Journey task is used when no personal test or protection plan matches.',
      };
    }
    return {
      source: 'adaptive',
      reasonDe: 'Smoke Lab wählt die Intervention adaptiv aus den bisher erfassten Situationen.',
      reasonEn: 'Smoke Lab selects the intervention adaptively from the situations recorded so far.',
    };
  }
}
