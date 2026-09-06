# SMOKE LAB v0.4 — Adaptive Journey Intelligence

This iteration makes the 30-day Lab materially adaptive instead of merely personalized in copy.

## Added

- `JourneyAdaptationEngine` with a cautious local adaptation profile.
- Three non-clinical challenge bands: `gentle`, `standard`, `stretch`.
- Challenge level is based on recent completed craving attempts, recent urge intensity, and whether recent interventions were manageable — never on abstinence.
- Personal target selection can use recurring trigger, trigger + place combinations, time context, high-intensity trigger candidates, and previously helpful interventions.
- Same Lab day can now produce different experiments for different users.
- Journey experiments can override intervention duration without changing the base intervention library.
- Day 6 delay is bounded and adaptive (1 / 3 / 5 minutes).
- Days 11, 18 and 21 adjust repetition instead of forcing the same workload on everyone.
- Day 22 can focus on a supported high-intensity trigger candidate.
- Day 26 offers different realistic window ranges depending on recent experience.
- Mission sheet now explains why a mission was chosen today when the recommendation is data-grounded.
- Today and Lab show a restrained “for you” indicator for genuinely adapted missions.

## Safeguards

- Adaptation is explicitly a product rule system, not a clinical risk score.
- Smoking never decreases Journey progress or resets the program.
- Harder recent situations reduce task demand rather than producing punishment.
- More demanding missions are only offered after repeated manageable attempts.
- No unsupported claims are generated from sparse data.
