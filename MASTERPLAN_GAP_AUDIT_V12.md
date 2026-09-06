# SMOKE LAB — Masterplan Gap Audit (v12)

This is an internal product audit for the current source tree. It remains intentionally conservative: **implemented** does not mean release-tested on every device.

## Product core
| Area | Status | Notes |
|---|---|---|
| Pattern-first smoking model | Implemented | Trigger, place, time, automaticity and urge data are stored locally. |
| Real-time craving flow | Implemented | Includes back navigation, driving safety handling, intervention priority and reassessment. |
| Quick smoking log | Implemented | No fake sample history required. |
| Adaptive intervention selection | Implemented | Local deterministic logic. |
| Control Score | Implemented | Explicitly non-clinical internal metric; Today and Progress no longer present the neutral start value as measured data when there are zero observations. |
| Pattern evidence thresholds | Implemented | Insufficient / emerging / established. |
| Next Best Action | Implemented | Data-grounded and cautious. |
| Personal experiments | Implemented | N-of-1 working hypotheses; no causal claims. |
| Experiment sequencing | Implemented | Orthogonal questions, replication, diversification. |
| Experiment library | Implemented | Eight core behavioral tests. |
| Personal Control Model | Implemented | Working map with uncertainty rather than diagnosis. |
| Control Plan 2.0 | Implemented | Concise strategy plan from observed/tested data. |
| Explicit zero-data learning states | Implemented in v12 | Patterns and Progress explain why real data is needed and avoid fabricated trends. |

## Journey and goal modes
| Area | Status | Notes |
|---|---|---|
| 30-day Journey | Implemented | Five phases with adaptive missions. |
| Pattern mode | Implemented | Observation-first behavior. |
| Reduce mode | Implemented / needs final E2E QA | Baseline comparison + cautious reduction opportunity + goal-aware orchestration. |
| Quit mode | Implemented / needs final E2E QA | Optional quit date, preparation, protection plans, recovery. |
| Goal switching without reset | Implemented | Existing history and Journey remain. |
| Competing-task orchestration | Hardened | One-focus Today behavior plus consistent intervention priority. |
| Maintenance after Day 30 | Implemented | Weekly mode; no forced new 30-day cycle. |
| Weekly review | Implemented | Rolling seven-day descriptive review. |

## Quit / recovery
| Area | Status | Notes |
|---|---|---|
| High-risk signal detection | Implemented | Descriptive repeated-context heuristic, not relapse prediction. |
| Protection plans | Implemented | Can be matched in craving flow. |
| Quit-date states | Implemented | Preparing / quit day / post-quit. |
| Lapse recovery | Implemented | No reset / no lost progress framing. |
| Recovery survives dismissed modal | Implemented | Today resurfaces unresolved post-quit event. |
| Protection plan priority | Hardened | Moment-specific protection outranks generic Maintenance. |

## Data / privacy / platform
| Area | Status | Notes |
|---|---|---|
| Local-first storage | Implemented | Browser localStorage. |
| Data export | Implemented | JSON export includes current schema version and behavioral/product state. |
| Full data deletion | Implemented | User repositories reset together. |
| Structural local-state repair | Implemented | Deterministic repair for duplicates, orphan links and inconsistent state. |
| Forward storage migrations | Implemented in v12 | Explicit schema marker, v1→v2 step, legacy-key import, idempotence, future-schema no-downgrade. |
| Critical profile validation | Implemented | Invalid profile payloads are not trusted by the main UI. |
| No runtime AI API cost | Implemented | Core behavior logic is local. |
| PWA manifest/install shell | Hardened in v12 / device QA open | One generated manifest source, cache cleanup, maskable asset, app-shell fallback, improved iOS detection. |
| Offline behavior | Implemented at shell level / production-device QA open | UI is local-first and Workbox config is hardened; final built SW/device behavior still needs verification. |
| DE/EN structural parity | Implemented in v12 | Automated key parity + non-empty copy test. Full editorial copy review is still open. |
| Accessibility fundamentals | Implemented in v12 / device AT QA open | Zoom, focus-visible, reduced motion, skip link, core dialog focus behavior, localized labels and state semantics. |

## Release work still open
The following are intentionally **not marked done** yet:
1. successful full production `vite build` in an environment with dependencies available;
2. complete mobile end-to-end pass through onboarding → all 30 Lab days → Maintenance;
3. explicit QA of every Pattern / Reduce / Quit / Recovery branch and conflicting-state path;
4. offline/install/update behavior on real iOS and Android devices;
5. VoiceOver / TalkBack / keyboard screen-reader basics on real rendered UI, plus contrast verification with production fonts/assets;
6. complete editorial DE/EN review of all hard-coded dynamic copy, beyond the now-enforced translation-table parity;
7. final privacy / medical / evidence wording review;
8. final icon/launch appearance check on real home screens and splash surfaces;
9. deployment smoke test on the actual target host;
10. distribution packaging and buyer/deployment instructions.

## Build environment note
During v12, `npm install --no-audit --no-fund` was attempted for **180 seconds**. The execution environment timed out before dependencies were installed, so a full Vite production build is still not claimed. This does not invalidate the dependency-free engine/integration tests or source syntax validation above.

## Release rule
Do not call SMOKE LAB a Release Candidate until the open release work above has been executed and critical issues are closed.
