# SMOKE LAB v0.7 — Personal Control Model

This release turns the existing pattern signals, N-of-1 experiments, and intervention history into a cautious personal working model.

## Added
- `PersonalControlModelEngine`: builds an on-device working map of recurring cue/context/time loops.
- Per-loop stability across multiple days before stronger wording is used.
- Trigger-specific craving dynamics (average initial urge and observed change after reassessment when enough data exists).
- Strategy memory that requires repeated uses and multi-day evidence before calling a strategy a useful working signal.
- A dynamic current Control Plan derived from real data and open experiment questions.
- Pattern screen now surfaces the Control Model without presenting it as diagnosis or causal proof.
- Local JSON data export containing profile, journey, raw events, experiments, and the current Control Model.

## Guardrails
- No prediction of future smoking.
- No clinical risk score.
- No causal claims from personal experiments.
- No "successful/failed person" language.
- Smoking never resets previous progress.

## Goal-specific support
- Reduce focus now uses real multi-day counts and only suggests a gentle reduction candidate when a repeated automatic loop also has recorded, relatively lower urge intensity.
- Quit focus now shows a preparation checklist instead of turning the product into a streak tracker. It checks mapped cues, practiced strategies, difficult situations, if–then planning, and lapse planning.
- No quit date is forced and no reduction opportunity is invented when evidence is insufficient.
