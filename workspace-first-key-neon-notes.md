# Workspace First-Key Neon Investigation

## Initial live-browser reproduction

- A clean local workspace was loaded, local storage was cleared, and one character was entered into a fresh document.
- Before the first key, neither `.tab-neon-trail-path` nor `.tab-neon-pulse-path` existed, confirming the tab is deliberately dark in the fresh state.
- Immediately after the key, both SVG paths were mounted through the `glowingTabId` state. At the first sampled frame, the trail was already present with `opacity: 1` but `stroke-dasharray: 0px, 1px`; the pulse was mounted simultaneously with `opacity: 0`.
- On the following active frame, both animations were running. The trail had advanced to `stroke-dasharray: 0.0816599px, 0.91834px`, while the pulse jumped from hidden to visible. This mount-then-pulse boundary is the likely visible spark/on-off transition reported by the user.
- No console or page errors occurred during the reproduction.

## Source chain to validate next

1. `DefaultTemplate.onChange` marks the tab as having glowed and calls `fireTabGlow()` after the first real character.
2. `fireTabGlow()` clears `glowingTabId`, then sets it in the next animation frame, forcing a fresh animated-SVG mount.
3. The tab’s persistent static path is intentionally withheld until `hasGlowedOnce` becomes true, so the first reactive render changes multiple layers at once.
4. The CSS animation keyframes must now be compared with the captured mount timing to identify the smallest root-cause correction.

## Confirmed root-cause evidence

- The active tab’s geometry is already stable before typing: its live box was measured at `176 px × 40 px`, matching the component’s initial measurement state. The `activeTabBox` effect only responds to an active-tab change or window resize, so it is not the source of the first-key jerk.
- The first content-bearing `onChange` changes `hasGlowedOnce` and starts `fireTabGlow()` in the same React turn. This simultaneously permits the persistent path’s render branch and starts the two animated paths by a forced unmount/remount.
- `neonTrailPathCycle` begins with a fully opaque but zero-length trail, while `neonPulsePathCycle` makes the bright shimmer visible at 3%. The next captured frame therefore crosses an abrupt multi-layer boundary: static eligibility changes, trail growth begins, and the bright pulse appears.
- The reported initial spark/on-off feeling is therefore a lifecycle/keyframe composition issue at first-key activation—not a title-bar/tab geometry problem, a browser error, or a generic animation-speed problem.
