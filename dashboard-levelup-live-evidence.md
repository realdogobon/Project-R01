# Dashboard Level-Up Live Test Evidence

## Scope

This is a **read-only application-source investigation** using a disposable browser-local account. The user’s normal account data and production source have not been modified.

## Controlled baseline

| Field | Observed value |
|---|---:|
| Disposable account | `Level Test` (`level_test_20260819`) |
| Baseline sessions | 2 Practice sessions |
| Calculated total XP | 700 |
| Rendered level | Level 1 — Novice Copyist |
| Rendered progress | `700 / 1000 XP` |
| Last-seen level marker before opening | Absent |

The live Dashboard rendered the expected Level 1 baseline and 70% progress position. This establishes the intended pre-crossing state for the next controlled test.

## Source-trace finding before the crossing

The existing first-observation branch treats a missing `typing_suite_last_seen_level_<uid>` marker as though the current level were already acknowledged, but does not write that marker. Therefore, a user who first views Level 1 at 700 XP can subsequently cross into Level 2 and return with the marker still absent; the current logic then treats Level 2 as a fresh baseline and does not trigger its level-up sequence.

## Controlled crossing prepared

One further disposable Practice session was added to the local browser fixture. Its calculated XP was 410, moving the account from **700 total XP** to **1,110 total XP**—the intended target state of **Level 2 at 110 / 1000 XP**.

Before the Dashboard was re-opened, the local `last_seen_level` marker was still absent. After reload, the workspace header immediately changed to **Adept Scribe**, confirming the underlying level calculation updates independently of the Dashboard-return experience.

## First-return result — reproduced defect

The Dashboard was then opened immediately after the controlled crossing. It rendered **Level 2 — Adept Scribe** at **`110 / 1000 XP`** as a settled state. It did **not** show the preceding Level 1 `700 / 1000 XP` state, complete the Level 1 bar, display a milestone moment, or visibly hand off into Level 2.

This reproduces the user-reported silent-level-jump behavior with a controlled Level 1 → Level 2 fixture.

## Existing-animation control

For a separate browser-local control test, the disposable account’s `last_seen_level` marker was set manually to `1` while its completed session data remained Level 2 at 110 XP. This does not alter application source code or the user’s normal account. It allows the existing marker-dependent animation branch to be observed independently of the reproduced missing-marker defect.

When the Dashboard was re-opened under that controlled marker, it did invoke the legacy animation branch: the surface showed **Level 1 — Novice Copyist**, the `Leveling...` status, and the generic `Outstanding progress! You've leveled up.` message.

The source confirms this branch initializes its simulated bar at `0` and advances in fixed 2% increments, rather than beginning from the actual prior progress (`700 / 1000 XP`). It also retains the celebratory state for ten seconds before transitioning. This is why the existing branch is not suitable as-is for the restrained, real-progress animation the user requested.

After the legacy hold completed in the live browser, the Dashboard settled at **Level 2 — Adept Scribe, `110 / 1000 XP`**. It made the destination state correct, but the route there was both disconnected from the actual prior 70% position and much longer than a quiet, encouraging acknowledgement should be.

## Controlled interruption setup

The Dashboard was closed after the legacy sequence completed. For a read-only browser-local interruption probe, the disposable account’s prior-level marker was reset to `1` with its same three sessions intact. The next step is to open the legacy sequence, interrupt it before completion, and check whether the current marker is acknowledged too early.

The legacy sequence was reopened and visibly entered its Level 1 / `Leveling...` state. It was then closed before its completion-and-handoff cycle ended. The Dashboard will now be reopened without altering local fixture data to observe whether the existing code retained or prematurely consumed the milestone.

On reopening the Dashboard after interruption, it rendered the settled **Level 2 — Adept Scribe, `110 / 1000 XP`** state with no level-up sequence. This confirms the current implementation acknowledges the marker at animation start, not after the user has actually received the milestone. The proposed implementation must instead retain its pending milestone until the handoff completes successfully.

## Test-fixture restoration

The disposable account and all test-specific storage entries were removed by restoring the exact browser-local backup captured before the test. A reload confirmed the original pre-test workspace state returned, with no `level_test_20260819` records remaining. No application source, user session data, or production persistence code was changed during this live test.

## Final proposed implementation boundary — not yet authorized

The source change should be limited to the existing account/session persistence boundary and `WorkspaceDashboard`’s current level-status area. A durable per-account pending milestone will capture the pre-award and post-award positions only when a completed session crosses a boundary. `WorkspaceDashboard` will consume that pending event only on a Dashboard return, animate from the genuine prior position to completion, show a brief local reward moment, and then settle at the genuine new-level position. The event is acknowledged only after that handoff completes. No Dashboard layout, metrics, navigation, XP formula, session history, Practice Mode, Exam Mode, or ordinary same-level progress behavior should be changed.
