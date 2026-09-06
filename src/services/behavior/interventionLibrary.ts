import { Intervention } from '../../types';

export const INTERVENTIONS: Intervention[] = [
  {
    id: 'THREE_MINUTE_DELAY',
    titleKey: 'interventionDelayTitle',
    instructionKey: 'interventionDelayDesc',
    durationSeconds: 180,
    recommendedTriggers: ['Gewohnheit', 'Stress', 'Langeweile', 'Habit', 'Boredom', 'Abendroutine', 'Evening routine', 'Sonstiges', 'Other'],
    type: 'delay',
    requiresSafeContext: false,
    rationaleInternal: 'Delay response to weaken automatic stimulus-response coupling',
  },
  {
    id: 'CHANGE_LOCATION',
    titleKey: 'interventionLocationTitle',
    instructionKey: 'interventionLocationDesc',
    durationSeconds: undefined,
    recommendedTriggers: ['Gewohnheit', 'Arbeitspause', 'Habit', 'Work breaks', 'Abendroutine', 'Evening routine'],
    type: 'location',
    requiresSafeContext: false,
    rationaleInternal: 'Stimulus control: alter environmental cue configuration',
  },
  {
    id: 'COFFEE_SEPARATION',
    titleKey: 'interventionCoffeeTitle',
    instructionKey: 'interventionCoffeeDesc',
    durationSeconds: 180,
    recommendedTriggers: ['Kaffee', 'Coffee'],
    type: 'separation',
    requiresSafeContext: false,
    rationaleInternal: 'Decouple conditioned gustatory pairing from immediate nicotine consumption',
  },
  {
    id: 'AFTER_MEAL_RESET',
    titleKey: 'interventionMealTitle',
    instructionKey: 'interventionMealDesc',
    durationSeconds: undefined,
    recommendedTriggers: ['Nach dem Essen', 'After meals'],
    type: 'reset',
    requiresSafeContext: false,
    rationaleInternal: 'Disrupt post-prandial completion ritual',
  },
  {
    id: 'HANDS_BUSY',
    titleKey: 'interventionHandsTitle',
    instructionKey: 'interventionHandsDesc',
    durationSeconds: 180,
    recommendedTriggers: ['Langeweile', 'Sozial', 'Boredom', 'Social'],
    type: 'friction',
    requiresSafeContext: false,
    rationaleInternal: 'Provide motor substitution to interrupt tactile searching reflex',
  },
  {
    id: 'CONSCIOUS_CHOICE',
    titleKey: 'interventionChoiceTitle',
    instructionKey: 'interventionChoiceDesc',
    durationSeconds: 180,
    recommendedTriggers: ['Alkohol', 'Sozial', 'Stress', 'Alcohol', 'Social'],
    type: 'mindset',
    requiresSafeContext: false,
    rationaleInternal: 'Metacognitive distancing and delayed implementation intention',
  },
  {
    id: 'MORNING_DELAY',
    titleKey: 'interventionMorningTitle',
    instructionKey: 'interventionMorningDesc',
    durationSeconds: 180,
    recommendedTriggers: ['Morgenroutine', 'Morning routine', 'Morning', 'Morgens'],
    type: 'delay',
    requiresSafeContext: false,
    rationaleInternal: 'Extend the latency between waking and first nicotine administration',
  },
  {
    id: 'BREAK_ROUTINE',
    titleKey: 'interventionRoutineTitle',
    instructionKey: 'interventionRoutineDesc',
    durationSeconds: 180,
    recommendedTriggers: ['Arbeitspause', 'Work breaks'],
    type: 'reset',
    requiresSafeContext: false,
    rationaleInternal: 'Substitute break ritual with active physical micro-interruption',
  },
];

export function getInterventionById(id: string): Intervention {
  const found = INTERVENTIONS.find((i) => i.id === id);
  return found || INTERVENTIONS[0];
}
