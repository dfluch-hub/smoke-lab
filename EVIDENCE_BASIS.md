# SMOKE LAB — Evidence basis notes

This document is a product-development reference, not a claim of clinical validation for Smoke Lab.

## What the product intentionally uses

- **Behavioral support / self-management:** WHO's 2024 clinical guideline recommends behavioural support and recognizes digital cessation interventions such as smartphone apps and internet programmes as adjuncts or self-management tools.
- **Personal smoking plan and review:** NICE recommends discussing current and past smoking behaviour and developing a personal stop-smoking plan.
- **Reduction strategies:** NICE explicitly lists increasing the interval between cigarettes, delaying the first cigarette of the day, and choosing periods or occasions when a person will not smoke as behavioural harm-reduction strategies.
- **Relapse prevention:** NICE recommends discussing coping strategies and practical relapse-prevention approaches early and at follow-up.
- **Professional treatment signposting:** WHO and NICE emphasize that behavioural support can be combined with evidence-based cessation treatment; Smoke Lab therefore does not position itself as a replacement for professional care.

## Product guardrails

- Control Score is a **non-clinical internal product metric**, not a diagnostic or validated clinical score.
- Pattern confidence labels (insufficient / emerging / established) describe **amount of app evidence**, not medical certainty.
- The app never claims a trigger, intervention, or craving outcome is clinically proven for a specific user.
- A lapse never resets prior progress.
- Medication instructions are out of scope for this PWA.
- Driving interactions are blocked until the user indicates they are safely parked.

## Primary references

1. World Health Organization. *WHO clinical treatment guideline for tobacco cessation in adults.* 2024. https://www.who.int/publications/i/item/9789240096431
2. NICE. *Tobacco: preventing uptake, promoting quitting and treating dependence (NG209).* https://www.nice.org.uk/guidance/NG209/chapter/treating-tobacco-dependence
3. Lancaster T, Stead LF. *Individual behavioural counselling for smoking cessation.* Cochrane Database of Systematic Reviews.

No wording in the product should imply endorsement by WHO, NICE, Cochrane, or any other external organization.

## Adaptive journey guardrails (v0.4)

The adaptive Journey uses deterministic on-device rules to change the specificity and burden of behavioral experiments. It is not a clinical decision-support system and must not be described as predicting relapse, dependence severity, treatment response, or medical risk.

Adaptation should follow a "challenge without overload" product principle: recent intense or poorly tolerated situations should keep the next experiment smaller, while repeated manageable attempts may justify modest additional repetition or a longer test window. Smoking itself is never treated as a failure signal and never resets the Journey.

Personalization claims must remain proportional to the available observations. A recurring trigger/context combination or repeatedly helpful intervention may guide the next experiment, but the UI should describe these as current signals or candidates rather than proven causes or guaranteed solutions.

## Personal hypothesis experiments (v0.5)

SMOKE LAB may use repeated on-device observations to propose a small personal behavioral experiment. These experiments are exploratory, N-of-1 style learning exercises. They are intended to help the user compare their own repeated situations and are **not** randomized trials, causal inference, clinical efficacy estimates, or diagnostic tests. Three comparable attempts are used as an initial product threshold for a working signal only; the UI must never present that threshold as statistical significance.

## Intelligent experiment sequencing (v0.6)

SMOKE LAB may prioritize the next personal experiment using a deterministic on-device heuristic that weighs repeated observations, whether a behavioral dimension has already been explored, whether a different test would allow a more informative within-person comparison, and whether learning should diversify to another repeated trigger. The internal sequence score is a **product-prioritization heuristic only**. It is not Bayesian inference, a clinical risk score, statistical power, a treatment recommendation, or an estimate of causal effect.

The sequencer follows these guardrails:

- Prefer a genuinely different, testable question over immediately repeating the same idea.
- After a helpful first signal, seek an orthogonal comparison when the user's observations support one before giving the strategy stronger weight.
- If two or more experiments have concentrated on one trigger and another trigger has sufficient repeated observations, allow learning to diversify rather than creating tunnel vision.
- A supportive experiment can later be replicated with a small follow-up test; replication is framed as checking whether the personal signal repeats, not as validating treatment efficacy.
- Time-window experiments describe time as **context**, never as a proven cause of craving or smoking.
- Experiment sequencing never predicts relapse, dependence severity, medical risk, or treatment response.

## v8 — Quit preparation, high-risk planning and lapse recovery

- An optional quit date is treated as a planning anchor, not a streak start or a condition for using the product.
- High-risk situations are descriptive patterns from repeated user logs (cue/context/time, craving strength and automaticity). They are not clinical risk predictions.
- A cigarette after a chosen quit date never resets the Journey, Control Score, experiments or learned patterns. The app offers a short lapse review and a concrete next protection step instead.
- Prepared if–then style protection plans can be surfaced in matching future craving situations, but are still personal self-management prompts rather than guaranteed treatment effects.
- The UI may suggest professional support as an option, while avoiding medication instructions or claims that Smoke Lab replaces evidence-based cessation care.

## v10 product orchestration note
SMOKE LAB v10 introduces explicit priority rules between recovery, a user-activated personal experiment, a prepared Quit protection plan, the 30-day Journey and adaptive recommendations. These priorities are **interface/product orchestration rules**, not a clinical triage model, relapse-risk model or treatment recommendation system. A higher product priority means only that the app should avoid presenting contradictory tasks at the same moment.
