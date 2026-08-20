# Dashboard Level-Up Milestone — Implementation Validation

## Isolated test setup

- **Purpose:** Validate the approved real-progress level-up handoff without changing the user’s active browser-local workspace.
- **Restoration:** The complete original browser-local key/value snapshot is retained under `__royscript_progression_live_backup__` and will be restored after the isolated test.
- **Controlled crossing:** A disposable account will be taken from Level 1 at `700 / 1000 XP` to Level 2 at `110 / 1000 XP` through one Practice-only session fixture.
- **Expected sequence:** First Dashboard open renders the prior Level 1 state at 70%, completes to 100%, shows restrained local confetti for a minimum two-second hold, then hands off to Level 2 at 11% before one-time acknowledgement.

## Initial code-health check

- Focused Dashboard source contract and TypeScript check passed after the first-render fallback correction.

## First-return milestone result

- The disposable account opened Dashboard directly into the correct prior state: `Level 1 • Novice Copyist` at `1000 / 1000 XP`.
- The existing bar was visibly completed, restrained local particle/confetti feedback was present, and the earned-state message displayed.
- After the configured hold, the same Dashboard transitioned to the settled destination: `Level 2 • Adept Scribe` at `110 / 1000 XP`.
- No destination-level flash was observed on opening.

## Acknowledgement check

- After the visible handoff completed, the durable pending-milestone storage was an empty list.
- This confirms that acknowledgement occurs after the presentation endpoint rather than immediately when the session crosses the boundary.

## Interruption-test setup

- A second disposable pending milestone using the exact persisted application fields was restored after the first successful acknowledgement check.
- The isolated workspace was then reloaded through the normal initialization path, ready to verify that closing before the two-second hold completes does not consume the event.
- The milestone was opened through the ordinary Dashboard path and the Dashboard was then closed before recording the replay outcome. The next check will distinguish a genuinely retained pending event from an already acknowledged event.
- The initial post-close lookup used an obsolete exploratory storage key and returned no account map. The live fixture remains loaded in the current workspace; the replay assertion will use the active persisted key shape instead of inferring the result from that obsolete lookup.
- The replay fixture was then rewritten under the active account key as `{ id: "interruption_live_check", previousLevel: 1, previousLevelXP: 700, nextLevel: 2, nextLevelXP: 110 }` before the final normal-path close-and-reopen check.
- The refreshed disposable workspace reached the normal Profile → Dashboard entry point. No user account storage or application source was changed by this browser-only fixture.
- The first tool-driven close/reopen attempt was **inconclusive**: the time between opening Dashboard and issuing the close interaction exceeded the two-second earned-state hold, so the pending milestone had already completed and been acknowledged. The ensuing settled `Level 2 • Adept Scribe — 110 / 1000 XP` state is therefore not evidence of an early-close failure. A second fixture will use a browser-timed interruption inside the active Dashboard view, before the hold can finish.
