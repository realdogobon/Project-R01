# Windows 11 Task View Glyph Verification

## Authoritative target

The user supplied the final authoritative glyph image on 2026-08-16. The intended mark consists of three vertically stacked left-hand window frames, a separate right-hand vertical rail, and one small blue-to-lilac gradient square between the right rail segments. This supersedes the earlier generic Segoe MDL2 overflow-glyph interpretation.

## Implementation

`WindowsTaskViewGlyph` in `client/src/pages/Workspace.tsx` renders the supplied artwork entirely as inline SVG in a `1200 × 1200` coordinate system. It contains the three frame paths, top and bottom rail segments, a 112-unit square tile, and distinct vertical frame/tile gradients. The final literal color samples are `#196DFF → #CA20FF` for the frames/rail and `#6FC8FF → #E5ABFF` for the tile. It displays at 18 px in the live workspace toolbar without dependency on a Windows-only font.

## Live evidence

The isolated browser probe captured `/tmp/workspace-taskview-trigger.png` and `/tmp/workspace-taskview-open.png`. The trigger capture shows the three stacked frames, split right rail, and colored square at its actual toolbar size. The opened capture proves the trigger still opens the tab overview normally from a clean one-tab workspace baseline.

The final probe passed all seven checks: literal canvas dimensions, three frames, right rail and gradient tile, two gradients, dark-mode legibility, overview opening, and no console errors. The dark-mode capture at `/tmp/workspace-taskview-dark.png` confirms that the direct artwork remains visible against the workspace’s dark chrome. TypeScript validation, all 16 Vitest assertions, production build, and whitespace validation also passed.
