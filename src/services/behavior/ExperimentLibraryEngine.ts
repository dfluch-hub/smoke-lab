import { PersonalExperiment, UserProfile } from '../../types';
import { PatternEngine } from './PatternEngine';

export interface ExperimentLibraryItem {
  id: string;
  titleDe: string;
  titleEn: string;
  descriptionDe: string;
  descriptionEn: string;
  interventionId: string;
  recommendedTriggers: string[];
  minutes?: number;
}

const ITEMS: ExperimentLibraryItem[] = [
  { id: 'delay_3', titleDe: '3-Minuten-Test', titleEn: '3-minute delay', descriptionDe: 'Verschiebe nur die Entscheidung und bewerte den Drang danach neu.', descriptionEn: 'Delay only the decision, then reassess the urge.', interventionId: 'THREE_MINUTE_DELAY', recommendedTriggers: ['Habit', 'Stress', 'Boredom', 'Work breaks'], minutes: 3 },
  { id: 'coffee', titleDe: 'Kaffee-Test', titleEn: 'Coffee test', descriptionDe: 'Behalte den Kaffee. Trenne nur die Zigarette zeitlich davon.', descriptionEn: 'Keep the coffee. Separate only the cigarette in time.', interventionId: 'COFFEE_SEPARATION', recommendedTriggers: ['Coffee'], minutes: 10 },
  { id: 'location', titleDe: 'Ort wechseln', titleEn: 'Change location', descriptionDe: 'Verlasse den üblichen Rauchort, bevor du neu entscheidest.', descriptionEn: 'Leave the usual smoking location before deciding again.', interventionId: 'CHANGE_LOCATION', recommendedTriggers: ['Habit', 'After meals', 'Work breaks'] },
  { id: 'after_meal', titleDe: 'After-Meal Reset', titleEn: 'After-meal reset', descriptionDe: 'Wechsle direkt nach dem Essen Raum oder Tätigkeit.', descriptionEn: 'Change room or activity immediately after eating.', interventionId: 'AFTER_MEAL_RESET', recommendedTriggers: ['After meals'] },
  { id: 'hands', titleDe: 'Hände beschäftigt', titleEn: 'Hands busy', descriptionDe: 'Gib deinen Händen fünf Minuten eine andere Aufgabe.', descriptionEn: 'Give your hands another task for five minutes.', interventionId: 'HANDS_BUSY', recommendedTriggers: ['Boredom', 'Social', 'Habit'], minutes: 5 },
  { id: 'conscious', titleDe: 'Bewusste Zigarette', titleEn: 'Conscious cigarette', descriptionDe: 'Wenn du rauchst: ohne Handy, Scrollen oder Nebenbeschäftigung. Danach Genuss bewerten.', descriptionEn: 'If you smoke: no phone, scrolling, or multitasking. Rate enjoyment afterward.', interventionId: 'CONSCIOUS_CHOICE', recommendedTriggers: ['Habit', 'Alcohol', 'Social'] },
  { id: 'work_break', titleDe: 'Pausen-Test', titleEn: 'Work-break test', descriptionDe: 'Behalte die Pause, verändere nur die Aktivität.', descriptionEn: 'Keep the break, change only the activity.', interventionId: 'BREAK_ROUTINE', recommendedTriggers: ['Work breaks'] },
  { id: 'morning', titleDe: 'Morgen-Delay', titleEn: 'Morning delay', descriptionDe: 'Verschiebe die erste Zigarette um einen kleinen realistischen Abstand.', descriptionEn: 'Delay the first cigarette by a small realistic amount.', interventionId: 'MORNING_DELAY', recommendedTriggers: ['Morning routine'], minutes: 5 },
];

export class ExperimentLibraryEngine {
  static list(): ExperimentLibraryItem[] { return ITEMS; }

  static recommended(profile: UserProfile, strongestTrigger?: string | null): ExperimentLibraryItem[] {
    const trigger = strongestTrigger ? PatternEngine.normalizeTriggerKey(strongestTrigger) : null;
    const onboarding = (profile.automaticSituations || []).map((s) => PatternEngine.normalizeTriggerKey(s));
    return [...ITEMS].sort((a, b) => {
      const aScore = (trigger && a.recommendedTriggers.includes(trigger) ? 4 : 0) + a.recommendedTriggers.filter((t) => onboarding.includes(t)).length;
      const bScore = (trigger && b.recommendedTriggers.includes(trigger) ? 4 : 0) + b.recommendedTriggers.filter((t) => onboarding.includes(t)).length;
      return bScore - aScore;
    });
  }

  static createPersonal(item: ExperimentLibraryItem, profile: UserProfile, strongestTrigger?: string | null): PersonalExperiment {
    const normalizedStrongest = strongestTrigger ? PatternEngine.normalizeTriggerKey(strongestTrigger) : null;
    const targetTrigger = normalizedStrongest && item.recommendedTriggers.includes(normalizedStrongest)
      ? normalizedStrongest
      : item.recommendedTriggers[0] || PatternEngine.normalizeTriggerKey(profile.automaticSituations?.[0] || 'Habit');
    const now = new Date().toISOString();
    return {
      id: `library_${item.id}_${Date.now()}`,
      signature: `library|${item.id}|${targetTrigger}`,
      kind: item.id === 'coffee' ? 'cue_separation' : item.id === 'location' ? 'context_shift' : 'delay_test',
      status: 'suggested',
      createdAt: now,
      targetTrigger,
      interventionId: item.interventionId,
      targetAttempts: 3,
      attemptCravingIds: [],
      sourceEvidence: 'insufficient',
      sourceCount: 0,
      hypothesisDe: `Arbeitshypothese: ${item.titleDe} könnte in passenden Situationen ein hilfreiches persönliches Signal liefern.`,
      hypothesisEn: `Working hypothesis: ${item.titleEn} may produce a helpful personal signal in matching situations.`,
      testDe: item.descriptionDe,
      testEn: item.descriptionEn,
      keepConstantDe: `Auslöser: ${targetTrigger}`,
      keepConstantEn: `Cue: ${targetTrigger}`,
      changeDe: item.titleDe,
      changeEn: item.titleEn,
      rationaleDe: 'Dieser Test wurde bewusst aus der Bibliothek gewählt. Drei vergleichbare Situationen reichen für ein erstes persönliches Arbeitssignal, nicht für einen Wirksamkeitsbeweis.',
      rationaleEn: 'This test was deliberately chosen from the library. Three comparable situations are enough for an initial personal working signal, not proof of effectiveness.',
    };
  }
}
