# Dashboard Achievement Depth and Level-State Marker Proposal

**Status:** Proposal only. No source code, Dashboard layout, achievement rule, XP rule, asset, or interface behavior has been changed.

## Executive position

The current Dashboard has a strong, quiet base, but its six achievements are mostly one-shot thresholds. They are earned quickly because a single peak speed, one perfect Practice result, a small document count, or ten total sessions is enough to complete most of the catalogue. The existing level line has the opposite issue: it already communicates progress well, but its ladder climber is the same visual at every level and therefore does not communicate the *meaning* of long-term growth.

The recommended direction is a **two-layer mastery system**. The first layer is the existing long-term Practice progression: levels, quality gates, and level-up celebration. The second is a substantially richer achievement catalogue that records meaningful variety in the user’s journey. Achievements should **never grant Progress XP** and should not change level requirements. They make the journey feel game-like; levels remain the serious training curriculum.

> **Design principle:** Levels certify sustained mastery. Achievements document memorable evidence of that mastery. Neither system should be farmable through short, repeated, low-quality runs.

## Current-state audit

| Area | Current behavior | Why it feels limited |
|---|---|---|
| Achievement catalogue | Six badges: three peak-speed thresholds, one perfect result, five cloud files, and ten total runs. | Most badges are single-event thresholds and do not create a long-term path. |
| Session eligibility | Several current badges evaluate all sessions or an individual peak, without a duration-quality gate. | Very short or low-effort runs can still influence perceived achievement progress. |
| Unlock persistence | Current badges are recalculated live from session/file counts. | Deleting history can make an already-earned badge disappear. |
| Achievement presentation | Existing tab already has a quiet locked/unlocked row treatment. | The surface is good; the catalogue needs depth, grouping, and progress—not a visual redesign. |
| Progress marker | The same ladder and climbing figure is reused at every level; position changes only inside the current bar. | It shows local XP movement but not the learner’s broader stage of development. |
| Level system | The currently deployed fixed-1,000-XP display model remains active. | The formal 10-level mastery curriculum is still a separate proposal and must not be silently introduced. |

## Proposal A — Achievement system with real game depth

The existing **Achievements** tab remains a scrolling list with the same restrained row treatment, typography, lock state, and checkmark. The only structural additions are small category dividers and a compact header count such as `8 / 30 earned`. There are no new dashboard panels, no card-grid redesign, no points shop, no loot-box behavior, and no noisy achievement pop-ups.

### Catalogue shape

The first mature catalogue should contain **30 permanent achievements**, organised into six five-item paths. Five-item paths give each skill a visible beginning, middle, and long-term endpoint without overwhelming a new user.

| Path | What it rewards | Five achievement stages | Proof requirement |
|---|---|---|---|
| **Foundation** | Sustainable Practice habit | First Finish; 25; 100; 500; 1,000 qualifying finishes | Completed qualifying Practice sessions only |
| **Velocity** | Speed built with control | 40; 50; 60; 75; 90 WPM | A completed Practice session meeting the matching speed, minimum 90 seconds, and at least 92% accuracy |
| **Precision** | Error control over meaningful work | 95%; 97%; 98%; 99%; five 100% runs | Completed Practice session, minimum 90 seconds; the final achievement requires five separate qualified sessions |
| **Endurance** | Longer, steady practice | 3; 5; 10; 20; 30-minute completed runs | Actual completed duration, with at least 92% accuracy |
| **Consistency** | Repeatable performance rather than lucky highs | 3; 10; 25; 50; 100 qualifying sessions at the current baseline | Each counted session must meet baseline quality; no calendar-day streak mechanic in v1 |
| **Craft** | Deliberate workspace ownership | First saved draft; 10; 25; 50; 100 saved drafts | First-time document saves only; edits to the same document do not count again |

This provides clear objectives for different kinds of users. A new learner sees reachable Foundation and Craft steps. A serious typist can chase Velocity, Precision, and Endurance. A long-term trainer gets the Consistency path. The catalogue feels alive without pretending that every action deserves a reward.

### Anti-farming policy

Achievement tracking needs its own durable ledger. An achievement should unlock once, remain unlocked forever, and store the event time and supporting session or document IDs. It must not be recomputed solely from the currently visible history.

| Rule | Policy | Reason |
|---|---|---|
| Practice-only performance evidence | Speed, precision, endurance, and consistency use completed **Practice** sessions only. | Preserves the established rule that Exam records do not contribute to training certification. |
| Minimum meaningful run | A performance achievement needs at least 90 seconds unless the individual achievement explicitly requires more. | Blocks short-run speed or accuracy farming. |
| Quality floor | Speed and endurance achievements require at least 92% recorded accuracy. | Stops careless fast runs being celebrated as mastery. |
| Unique completion | A session ID can contribute only once to each achievement counter. | Prevents reloads or repeated result-screen visits from producing credit. |
| First-save count | Craft counts unique file IDs that have been saved at least once. | Prevents repeatedly editing one draft to inflate progress. |
| Permanent unlock | Once earned, the badge stays earned even if a user later deletes a session or file. | An achievement is personal history, not a temporary dashboard calculation. |
| No XP linkage | Achievements do not award XP and do not weaken level gates. | Keeps the training ladder credible and prevents achievement farming from becoming level farming. |

### Progress presentation without a redesign

Locked rows should show an honest micro-progress label only where progress is countable—for example `38 / 100 qualifying sessions` or `3 / 5 perfect runs`. Threshold-only achievements such as `60 WPM` should keep the current concise requirement label. An unlocked row continues to show the current checkmark.

The header can show a single muted count, such as **`Achievements · 8 / 30`**, not a gamified score. This gives the user a sense of collection progress without turning the Dashboard into a game UI.

## Proposal B — Level-state visual in the existing progress-line footprint

The existing 28×28 marker beside `Level N · Title` should remain exactly where it is. The ladder can remain as a faint shared outline, but the learner figure changes posture by formal level. This makes the marker feel like a small visual story, not a second animation system.

### Visual-language recommendation

I recommend a **single neutral, hand-drawn learner silhouette** rather than a literal detailed baby character. At Level 1, the silhouette is low to the ground and crawling; the meaning is immediately understood, while the monochrome line style keeps it premium and avoids a cartoonish feeling. The accent color remains only on one small clothing/identity detail, exactly as the current SVG uses it.

| Level | Marker posture | Meaning | Motion behavior |
|---:|---|---|---|
| 1 | Crawling beside the first rung | Learning the basics | Static; shifts a few pixels with current-bar progress |
| 2 | Kneeling, one hand on the ladder | Beginning to rise | Static; shifts with progress |
| 3 | Half-standing, holding a low rung | Developing balance | Static; shifts with progress |
| 4 | Standing and starting the climb | Deliberate practice | Static; shifts with progress |
| 5 | Confident two-rung climb | Established rhythm | Static; shifts with progress |
| 6 | Mid-ladder, upright posture | Sustained improvement | Static; shifts with progress |
| 7 | Near the upper rungs | Advanced control | Static; shifts with progress |
| 8 | Reaching toward the summit | High-skill commitment | Static; shifts with progress |
| 9 | Standing at the top rung | Mastery nearly complete | Static; shifts with progress |
| 10 | Quiet summit stance with a small star or notebook | Completion of the formal curriculum | Static; no looping celebration |

The existing local level-up sequence remains the only moment of richer movement. During the 900 ms fill, the level-state figure moves along its existing ladder path. During the approved two-second hold, it can transition to the existing trophy pose, with the restrained local confetti already approved. During handoff, it crossfades to the next level’s static posture. For reduced-motion preference, it swaps directly to the next posture with no motion or confetti.

This means there is **no permanent idle animation**, no bounce, no extra visual noise, and no change to progress-bar height, width, wording, title placement, or Dashboard spacing.

## Relationship to the separate 10-level curriculum

The level-state marker and achievement catalogue can be designed now, but their final thresholds must ultimately read from one central progression policy. The already documented 10-level mastery curriculum is still **approval-gated and unimplemented**. This proposal does not convert the current fixed-1,000-XP display into that curriculum.

If you approve both initiatives together later, the clean order is:

1. Approve the formal 10-level progression policy separately.
2. Centralise Practice-only progression qualification and the per-account credit ledger.
3. Add the permanent achievement ledger and its anti-farming evidence rules.
4. Replace the progress-line marker SVG with the ten posture states, preserving current layout and level-up timing.
5. Validate old-session migration, earned-badge permanence, deletion behavior, reduced motion, and the existing early-close milestone replay.

If you prefer to postpone the formal curriculum, the achievement system can still be introduced with the current level display, but the marker should use **broad current rank bands** rather than permanent Level 1–10 posture definitions. My recommendation is to wait and align the marker with the formal ten-level structure, so we do not create an interim visual language that has to be replaced later.

## Approval decisions requested

| Decision | Recommended choice |
|---|---|
| Achievement catalogue | Approve 30 achievements across six five-stage paths. |
| Anti-farming | Approve Practice-only quality evidence, minimum durations, unique-session counting, permanent unlocks, and no achievement-to-XP rewards. |
| Dashboard design scope | Keep the present tab and rows; add only category dividers, a muted total, and honest per-row count progress. |
| Level marker | Approve the neutral learner-posture story from crawling Level 1 through quiet summit Level 10, inside the existing 28×28 marker footprint. |
| Progression dependency | Keep the formal 10-level curriculum as a separate explicit decision; do not silently implement it with this work. |

No implementation should start until you explicitly approve the selected scope.
