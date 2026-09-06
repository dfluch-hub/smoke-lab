# SMOKE LAB v0.5 — Personal Hypothesis Lab

This iteration turns pattern intelligence into small, explicit personal behavioral experiments.

## Added

- `HypothesisEngine`: converts repeated real observations into a cautious working hypothesis.
- Initial hypothesis types: context shift, cue separation, routine break, delay test, repeat strategy.
- Personal experiments are only suggested after minimum evidence thresholds; sparse data never generates a fake hypothesis.
- One active experiment at a time, stored locally in `ExperimentRepository`.
- Experiments define what stays constant, what changes, the target trigger/context, and a 3-attempt collection target.
- Matching craving situations automatically use the active experiment intervention and are linked with `experimentId`.
- Experiment attempts are evaluated from real craving outcomes only.
- Results are framed as `signal_supports`, `mixed`, or `signal_not_seen`, never as success/failure or causal proof.
- Today shows a personal hypothesis card and activation sheet when enough data exists.
- Craving Mode identifies a matching personal hypothesis test and shows progress through comparable attempts.
- Patterns shows the active experiment or the latest completed experiment result.
- Once two different completed tests target the same trigger, Smoke Lab can compare the working signals (for example context change vs cue-separation) without presenting the comparison as causal proof.
- Progress counts completed personal tests without gamifying them.
- Experiments are included in full local-data reset.

## Scientific guardrails

- Three attempts are a product-level learning threshold, not a claim of statistical significance.
- Personal experiments are exploratory N-of-1 style observations, not randomized clinical trials.
- Wording explicitly avoids causal claims, diagnostic language, and guarantees of effectiveness.
- A mixed or unhelpful result is treated as useful information, not failure.
