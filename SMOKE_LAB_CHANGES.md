# SMOKE LAB — Core Fix Pass

This build preserves the approved visual design and focuses on data integrity and craving-flow reliability.

## Fixed in this pass
- Restored back navigation before an intervention starts.
- Trigger and place selections can be corrected without cancelling the flow.
- Added explicit Continue actions and an optional Skip action for place/context.
- Removed incomplete AI Studio handler references left by the interrupted generation.
- Exact intervention elapsed time is captured; no misleading upward minute rounding.
- Removed inferred/fabricated final craving intensity values from categorical reassessment.
- Abandoned in-progress craving drafts are removed when the flow is closed before an outcome.
- Quick cigarette logging no longer pre-fills fabricated trigger/intensity/decision/enjoyment data.
- Pattern thresholds are more conservative for automaticity ratios.
- Pattern UI no longer falls back to a fake peak time.
- Time-of-day charts remain in a learning state until enough real timestamps exist.
- Progress no longer draws a fake Day 1 → Day 30 curve; it uses only real recorded days.
- Average pause shows real elapsed time or an em dash when no pause has been recorded.
- Scientific copy was softened to avoid unsupported neurobiological claims.
- External Google Fonts runtime dependency removed; packaged Fontsource fonts remain.
- PWA theme color aligned with the approved warm-stone design.

## Next product phase
Pattern Intelligence + Next Best Action, followed by the full evidence-informed 30-day journey.
