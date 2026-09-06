# SMOKE LAB v0.6 — Intelligent Experiment Sequencing

## Product behavior

- Added `ExperimentSequencingEngine`, a deterministic local engine that chooses the next defensible personal experiment from multiple open questions.
- Sequencing now considers evidence volume, untested behavioral dimensions, within-person comparison opportunities, mixed prior results, replication needs, and diversification across repeated triggers.
- Added a time-window experiment type for recurring trigger/time patterns. Time is framed as context, never causal proof.
- Helpful first signals can later receive a small two-attempt replication test, but new orthogonal questions are preferred first when available.
- After two experiments concentrate on one trigger, another sufficiently repeated untested trigger can be prioritized to avoid tunnel vision.
- Active personal experiments still outrank Journey intervention suggestions only when the live craving matches the experiment context.

## UX

- Today now presents a sequenced **Next open question** instead of simply taking the first available hypothesis.
- The experiment sheet explains **Why this question now?** and what the test can realistically teach.
- Patterns shows the next open question when no personal experiment is active.
- Generic Next Best Action is suppressed when a concrete personal experiment is already the clearer next action, reducing competing recommendations.

## Data / integrity

- Personal experiment signatures now include target time windows where relevant.
- Time-window matching is enforced only for explicit time-window experiments, preserving compatibility with older context experiments.
- Sequencing metadata is stored with activated experiments for transparent local reasoning and future review.
- Removed a duplicate `totalCravingsLogged` type declaration and a duplicate elapsed-time assignment.

## Guardrails

- The sequence score is internal product logic, not a clinical score or statistical confidence measure.
- No causal claims, efficacy guarantees, diagnosis, relapse prediction, or medical decision support were added.
- All sequencing remains local and deterministic; no AI API or backend is required.
