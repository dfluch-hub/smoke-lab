# SMOKE LAB — Masterplan Gap Audit (v10)

This is an internal product audit for the current source tree. It is intentionally conservative: **implemented** does not mean release-tested on every device.

## Product core
| Area | Status | Notes |
|---|---|---|
| Pattern-first smoking model | Implemented | Trigger, place, time, automaticity and urge data are stored locally. |
| Real-time craving flow | Implemented | Includes back navigation, safety handling and reassessment. |
| Quick smoking log | Implemented | No fake sample history required. |
| Adaptive intervention selection | Implemented | Local deterministic logic. |
| Control Score | Implemented | Explicitly non-clinical internal metric. |
| Pattern evidence thresholds | Implemented | Insufficient / emerging / established. |
| Next Best Action | Implemented | Data-grounded and cautious. |
| Personal experiments | Implemented | N-of-1 working hypotheses; no causal claims. |
| Experiment sequencing | Implemented | Orthogonal questions, replication, diversification. |
| Experiment library | Implemented | Eight core behavioral tests. |
| Personal Control Model | Implemented | Working map with uncertainty rather than diagnosis. |
| Control Plan 2.0 | Implemented | Concise strategy plan from observed/tested data. |

## Journey and goal modes
| Area | Status | Notes |
|---|---|---|
| 30-day Journey | Implemented | Five phases with adaptive missions. |
| Pattern mode | Implemented | Observation-first behavior. |
| Reduce mode | Implemented / needs final E2E QA | Baseline comparison + cautious reduction opportunity + goal-aware orchestration. |
| Quit mode | Implemented / needs final E2E QA | Optional quit date, preparation, protection plans, recovery. |
| Goal switching without reset | Implemented in v10 | Existing history and Journey remain. |
| Competing-task orchestration | Implemented in v10 | Recovery / experiment / protection / Journey priorities are explicit. |
| Maintenance after Day 30 | Implemented | Weekly mode; no forced new 30-day cycle. |
| Weekly review | Implemented | Rolling seven-day descriptive review. |

## Quit / recovery
| Area | Status | Notes |
|---|---|---|
| High-risk signal detection | Implemented | Descriptive repeated-context heuristic, not relapse prediction. |
| Protection plans | Implemented | Can be matched in craving flow. |
| Quit-date states | Implemented | Preparing / quit day / post-quit. |
| Lapse recovery | Implemented | No reset / no lost progress framing. |
| Recovery survives dismissed modal | Implemented in v10 | Today resurfaces unresolved post-quit event. |
| Protection plan priority | Implemented in v10 | Exact plan outranks generic Journey intervention. |

## Data / privacy / platform
| Area | Status | Notes |
|---|---|---|
| Local-first storage | Implemented | Browser localStorage. |
| Data export | Implemented | JSON export includes behavioral/product state. |
| Full data deletion | Implemented | Repositories reset together. |
| No runtime AI API cost | Implemented | Core behavior logic is local. |
| PWA manifest/install UI | Present | Needs final device QA. |
| Offline behavior | Present | Needs final production-build/device QA. |
| DE/EN | Broadly implemented | Needs complete copy and interaction audit. |

## Release work still open
The following are intentionally **not marked done** yet:
1. successful full production `vite build` in an environment with dependencies available;
2. complete mobile end-to-end pass through onboarding → 30 days → Maintenance;
3. explicit QA of every Pattern / Reduce / Quit branch;
4. offline/install/update behavior on real iOS and Android devices;
5. all empty states, corrupted/stale local data and migration behavior;
6. accessibility pass (focus order, labels, contrast, reduced motion, screen reader basics);
7. full DE/EN copy consistency review;
8. final privacy / medical / evidence wording review;
9. final icons, manifest metadata, install assets and launch polish;
10. distribution packaging and buyer/deployment instructions.

## Release rule
Do not call SMOKE LAB a Release Candidate until the open release work above has been executed and critical issues are closed.
