# Settings Reset acknowledgement placement verification

## Scope

The existing neutral **“Settings Reset”** acknowledgement was relocated from the Settings header to the bottom-left Settings rail, immediately to the right of the standalone Reset glyph. The reset behavior, existing 2.4-second dismissal timer, visual typography, and drawer glide configuration were not otherwise changed.

## Live managed-preview evidence

The live workspace was opened in the managed preview, Settings was opened through its toolbar control, and the Reset glyph was triggered. The live DOM geometry probe reported the acknowledgement at `left: 915`, with the Reset glyph ending at `right: 898`; their vertical centers aligned within the two-pixel tolerance. The same probe confirmed that the acknowledgement appeared below the header’s bottom edge (`1070 > 60`), rather than competing with the Settings title or close action.

After 2.7 seconds, the live probe confirmed `acknowledgementDismissed: true` while `drawerStillOpen: true`. The component remains anchored to the rail’s relative Reset-control wrapper, so it does not change the drawer’s content layout.

## Automated validation

| Check | Result |
|---|---:|
| Vitest regression suite | 72/72 passing |
| Strict TypeScript check | Passing |
| Production build | Passing |
| Source contract | Covers rail-relative placement and prohibits the former header coordinates |

> A browser-console syntax error observed during the first internal geometry probe was caused solely by an invalid selector in that probe. The corrected probe succeeded, and no application code or UI behavior was affected.
