# SMOKE LAB — Adaptive Journey v3

## Added
- Full 30-Lab-day journey with five phases: Discover, Disrupt, Control, Break, Own It.
- Adaptive mission selection using actual trigger, context, time-window, intervention and goal data.
- Mission evidence tracking and persistent completion history.
- Journey day grid with completed/current/future states.
- Today now surfaces the current Lab mission so the program guides the user instead of hiding in a tab.
- Current journey experiments can deliberately override the normal intervention selector for the matching Lab test; this is labelled as a Lab experiment rather than a personalized “best” recommendation.
- Manual journey tasks for goal, ceiling, coping plans, if-then planning, lapse planning and final Control Plan.
- Mission sheets can route the user back to TODAY when the task requires a real craving/smoking event.
- Medical self-management disclaimer in Me.
- Developer-facing `EVIDENCE_BASIS.md`.

## Guardrails
- No streak resets.
- A mission counts for the attempt, not for abstinence success.
- Missing data is not filled with fake analytics.
- Journey personalization uses local deterministic rules only; no AI API.
- Reduce / quit / understand goals remain user-controlled and can be changed later.

## Evidence-informed product direction
The journey uses behavioural support concepts consistent with WHO/NICE tobacco cessation guidance: monitoring smoking behaviour, tailored behavioural support, interval/delay strategies, planned smoke-free windows, coping plans and relapse prevention. Smoke Lab does not claim clinical validation or replace professional cessation treatment.
