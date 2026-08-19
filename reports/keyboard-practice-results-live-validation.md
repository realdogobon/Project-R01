# Keyboard Hand Synchronization and Practice Result Continuity — Live Findings

## Live verification summary

The Practice title-bar hand icon was verified against the active keyboard window. A left-side physical key drove only the left hand, a right-side physical key drove only the right hand, and Space drove both hands. After each `keyup`, the rendered SVG groups returned to the neutral computed transform (`none`). Sustained pointer hover without keyboard activity left both hands at rest; hover no longer acts as an animation source.

The completed Practice result was verified through the normal global navigation route. A completed session was switched from Practice to Workspace and then back to Practice; the result screen restored rather than returning to Configure Session. This uses a completed-result record that is separate from the existing active-session recovery record.

## Scope boundaries retained

No changes were made to scanner behavior, Settings, keyboard visual layout, exam/Just Look behavior, or multi-tab mechanics. The title-bar wordmark refinement retains the existing logo image, header geometry, and accent color source.
