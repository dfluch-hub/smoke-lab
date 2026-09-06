# SMOKE LAB — Pattern Intelligence v2

This pass keeps the approved visual design and strengthens the on-device behavior engine.

## Added
- `NextBestActionEngine`: produces one cautious, testable next action from actual local data.
- Personalized recommendation priority: proven-helpful intervention -> recurring context loop -> strongest trigger -> autopilot signal -> early signal -> observation.
- Pattern evidence labels: insufficient / emerging / established.
- Trigger + place + time-window combination detection.
- Language-normalized pattern analysis so switching German/English does not split the same cue into separate patterns.
- Pattern Intelligence screen now shows what the Lab can responsibly infer, personal signals, recurring loops, and the next suggested test.
- Today screen now shows a dynamic “Next best action” instead of a hard-coded Coffee Test.
- Engine tests for first-use, bilingual trigger normalization, trigger-based recommendation and adaptive intervention selection.

## Corrected
- Safer behavior-science wording: observed signals are separated from diagnoses or clinical predictions.
- Removed remaining unused Gemini API dependency and server-only packages from `package.json`.
- Fixed duplicate Control Score label in Progress.
- Replaced an overly absolute “willpower” statement with more cautious product language.

## Evidence thresholds
- Strongest trigger: at least 5 logged trigger events.
- Time pattern: at least 7 timestamped events.
- Trigger/place/time combination: at least 3 repeated occurrences.
- Intervention helpfulness: at least 3 completed comparable uses.

The recommendation engine is deterministic and on-device. It does not call an AI API and is not presented as a clinical prediction model.
bun.lock removed to avoid stale dependency lock after API-package cleanup.
