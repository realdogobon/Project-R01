# RoyScript TSR — Training Progression Design Report

**Status:** Proposal only. No application progression, account, session, Dashboard, Practice, or Exam source has been changed.

## Executive recommendation

RoyScript should move from the present **unbounded display counter** to a **ten-level, mastery-oriented training ladder**. The ladder should reward a completed, quality-verified Practice session with **one Progress XP**. This is intentionally simple: because Level 1 must require *at least 1,000 typing sessions*, a session cannot grant multiple XP without breaking that promise. The system therefore feels generous at the start because its entry gates are attainable, not because it inflates the number.

Level 1 is a real foundation: **1,000 qualifying Practice sessions**, each at least 90 seconds, at least 40 WPM, and at least 92% accuracy. Every later level becomes harder by combining a higher session commitment, higher minimum speed, higher accuracy, longer sustained typing, and a stronger final consistency audit. A session that misses any gate remains visible in history, but earns **zero Progress XP** for the current level.

> This makes the number meaningful. A user cannot reach a later title merely by opening and ending fast sessions, or by collecting large speed bonuses from very short work.

## 1. Current-system audit

| Area | Current behavior | Consequence |
|---|---|---|
| Numeric levels | `Level = floor(total XP / 1000) + 1`; there is no actual maximum. | The system has **unlimited numeric levels**, rather than a finite training curriculum. |
| Named ranks | Five display bands only: Novice Copyist, Adept Scribe, Speed Sage, Grand Archivist, and Legendary Typist. | A user can advance through many levels without receiving a distinct training standard at each one. |
| XP award | Practice earns `120 + (WPM × 3)`, Exam earns `250 + (WPM × 6)`, plus 50 XP at 95% accuracy or above. | A normal 40-WPM Practice session currently earns **290 XP**; Level 1 can therefore be crossed in roughly four sessions. |
| Session evidence | Stored fields include speed, accuracy, duration, type, title, content, and replay data. | The data needed for minimum speed, accuracy, duration, and one-credit-per-session qualification is already present. |
| Exam quality field | Exam persistence currently stores accuracy as `99` rather than a calculated result. | Exams must **not** earn training Progress XP until their accuracy is truly measured; otherwise the training system could certify unverified precision. |

The existing Dashboard and Workspace duplicate the current XP calculation, so a later approved implementation must centralize the new progression policy rather than allow those two copies to drift.

## 2. Recommended structure: 10 formal levels

The proposed curriculum has **ten formal levels**. Level 10 is the top achievement, **Legendary Typist**. After that, the profile can remain visibly Level 10 and continue recording ordinary practice statistics; it should not create Level 11, Level 12, and so on unless a future expansion introduces a genuine advanced curriculum.

Each passed qualifying Practice session provides exactly **1 Progress XP**. The progress requirement below is therefore also the minimum qualifying-session requirement. This meets the requested Level 1 floor transparently and makes every filled segment of the bar accountable to a real, completed practice run.

| Level | Training title | Progress XP required | Per-session gate: WPM / accuracy / duration | Promotion consistency audit | Why this is harder |
|---:|---|---:|---|---|---|
| 1 | Novice Copyist | 1,000 | **40 WPM**, **92%**, **90 sec** | Latest 20 qualified sessions average ≥ 40 WPM and ≥ 92% accuracy | Entry is attainable but asks for 25 active hours of controlled, accurate typing. |
| 2 | Adept Scribe | 1,100 | **43 WPM**, **93%**, **105 sec** | Latest 25 average ≥ 43 WPM and ≥ 93% | More sessions, more sustained attention, tighter error tolerance. |
| 3 | Methodical Clerk | 1,250 | **46 WPM**, **94%**, **120 sec** | Latest 25 average ≥ 46 WPM and ≥ 94% | Two-minute control becomes normal rather than exceptional. |
| 4 | Precision Operator | 1,400 | **49 WPM**, **94%**, **135 sec** | Latest 30 average ≥ 49 WPM and ≥ 94% | Volume and duration rise while mistakes stop being rewarded. |
| 5 | Steady Transcriber | 1,600 | **52 WPM**, **95%**, **150 sec** | Latest 30 average ≥ 52 WPM and ≥ 95% | This is the first strongly professional-accuracy stage. |
| 6 | Technical Clerk | 1,800 | **55 WPM**, **95%**, **165 sec** | Latest 35 average ≥ 55 WPM and ≥ 95% | Longer runs demand composure, not a single fast burst. |
| 7 | Speed Sage | 2,050 | **58 WPM**, **96%**, **180 sec** | Latest 35 average ≥ 58 WPM and ≥ 96% | Three-minute sustained speed with very little error room. |
| 8 | Grand Archivist | 2,350 | **62 WPM**, **96%**, **210 sec** | Latest 40 average ≥ 62 WPM and ≥ 96% | The user must sustain a demanding pace for three and a half minutes. |
| 9 | Master Stenographer | 2,700 | **66 WPM**, **97%**, **240 sec** | Latest 40 average ≥ 66 WPM and ≥ 97% | Four-minute precision endurance; weak consistency becomes visible. |
| 10 | Legendary Typist | 3,100 | **70 WPM**, **97%**, **300 sec** | Latest 50 average ≥ 70 WPM and ≥ 97% | Five-minute, high-speed, near-error-free work is a genuine mastery target. |

The level rule is deliberately strict: **every XP-earning run must clear the active level’s individual gates**, and promotion must also clear the final rolling-average audit. That means a user cannot obtain 1,000 easy credits, have one fortunate fast run, and be promoted. The user must demonstrate that the target skill has become stable.

## 3. Estimated commitment

The estimates below use only the minimum active typing duration. They exclude reading the prompt, setting up the session, breaks, and reviewing results, so real calendar time will be somewhat longer.

| Finish level | New qualified sessions at this level | Minimum active hours at this level | Cumulative sessions | Cumulative active hours | Approx. calendar time at 30 min/day | Approx. calendar time at 60 min/day |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1,000 | 25.0 | 1,000 | 25.0 | 50 days | 25 days |
| 2 | 1,100 | 32.1 | 2,100 | 57.1 | 114 days | 57 days |
| 3 | 1,250 | 41.7 | 3,350 | 98.8 | 198 days | 99 days |
| 4 | 1,400 | 52.5 | 4,750 | 151.2 | 302 days | 151 days |
| 5 | 1,600 | 66.7 | 6,350 | 217.9 | 436 days | 218 days |
| 6 | 1,800 | 82.5 | 8,150 | 300.4 | 601 days | 300 days |
| 7 | 2,050 | 102.5 | 10,200 | 402.9 | 806 days | 403 days |
| 8 | 2,350 | 137.1 | 12,550 | 540.0 | 1,080 days | 540 days |
| 9 | 2,700 | 180.0 | 15,250 | 720.0 | 1,440 days | 720 days |
| 10 | 3,100 | 258.3 | 18,350 | 978.3 | 1,957 days | 978 days |

This is intentionally a long program. At one hour of active practice per day, reaching Level 10 is approximately **2.7 years of minimum typing time** before allowing for breaks or failed sessions. It is not a badge-grinding track; it is a real long-term training ladder. If this feels too severe after review, the cleanest dial is the *session requirement*, not the quality gates.

## 4. XP qualification and anti-farming rules

Only **Practice** sessions should earn Progress XP in the first version. They have real WPM, real accuracy, real duration, and replay evidence. Existing Exams remain visible in the Dashboard and still contribute to their ordinary history and statistics, but they earn **0 Progress XP** until their accuracy pipeline is made measurable instead of being persisted as a fixed 99%.

| Rule | Proposed policy | Protection gained |
|---|---|---|
| Completion | The session must reach its normal completed-results state. Cancelled, abandoned, or incomplete work earns 0 Progress XP. | Prevents opening/closing farming. |
| Duration | The actual stored duration must meet the active level’s duration gate. | Prevents ultra-short high-WPM bursts. |
| Quality | The actual recorded WPM and accuracy must both meet the active level’s gate. | Makes speed and precision co-requirements. |
| Credit cap | Maximum **1 Progress XP per qualifying session**. | Guarantees the stated session commitment. |
| Identity | Session ID may be credited once only and credit is stored per account. | Prevents reload or Dashboard-open duplicates. |
| Promotion audit | The latest qualifying-session window must meet the level’s rolling WPM and accuracy target. | Requires consistent mastery rather than a single lucky run. |
| Legacy migration | Existing Practice sessions can be backfilled only if they satisfy Level 1 gates. Existing Exam sessions receive no training credit in v1. | Fair to existing work without certifying unverified accuracy. |

## 5. Level-up moment: refined duration

The previous proposal’s full-bar moment will be held for **at least two seconds**, as requested. The interaction remains local to the current level line and uses no new panels, dialogs, or permanent visuals.

| Step | Timing | Behavior |
|---|---:|---|
| Continue current level | ~800 ms | Bar moves from the actual saved prior percentage—such as 70%—to 100%; the existing character moves with the bar. |
| Earned pause | **2,000 ms minimum** | Completed bar stays visible. A small local confetti burst appears once, then settles; the existing achievement emphasis can remain. |
| Handoff | ~450 ms | The existing line transitions to the new level title and its actual starting XP percentage—such as Level 2 at 11%. |
| Completion | immediate after handoff | The milestone is acknowledged only after the handoff has completed. Future Dashboard returns show the ordinary settled state. |

The full normal-motion sequence is therefore approximately **3.25 seconds**. For reduced-motion preference, it will retain the two-second readable completed state but omit the movement and confetti.

## 6. Safe implementation boundary after approval

The eventual change should create one central, versioned progression policy that both Workspace and Dashboard read. It should persist a compact per-account progression record containing credited session IDs, current level credit, latest qualified sessions for the rolling audit, and a pending/acknowledged level-up milestone. Existing session history stays intact.

The first-return milestone will use the pending milestone’s real prior XP and new XP, rather than inferring a generic animation from total XP. It will remain pending through navigation or reload until the user has actually seen the full completion-and-handoff state. No Practice typing mechanics, Exam sealing, scanner workflow, task view, Settings, current Dashboard structure, or visual layout will change.

## 7. Validation required before manual review

The implementation will be accepted only after automated and live checks cover a Level 1 near-boundary run; one qualifying credit; a disqualified speed, accuracy, and duration run; 1,000-session promotion; rolling-audit failure; duplicate session prevention; close/reload during the milestone; reduced motion; existing-session migration; and confirmation that Exam sessions do not receive false precision credit.

## Decision requested

Approval is requested for the following design decisions before any source implementation begins:

1. **Ten formal levels**, ending at Legendary Typist.
2. **One Progress XP per qualifying Practice session**, making Level 1 exactly 1,000 qualifying sessions.
3. **The per-level gates and session counts in the table**, including the 25-hour active Level 1 commitment.
4. **Practice-only progression credit initially**, because current Exam accuracy is not yet measured.
5. **A two-second completed-bar hold** inside the restrained first-return level-up sequence.
