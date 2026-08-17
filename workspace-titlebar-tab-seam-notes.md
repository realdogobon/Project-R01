# Workspace Title-Bar / Tab Seam Notes

## User-supplied reference evidence — 2026-08-16

Two 684 × 40 px reference strips were inspected at native scale. The unmarked strip shows a horizontal pale-background seam between the lower boundary of the upper title bar and the top edge of the active document tab. The marked strip traces the intended correction in orange: the active tab’s top contour should meet the title-bar lower boundary directly, leaving no empty horizontal band above the tab.

The requested visual contract is deliberately narrow. The active tab’s existing text, icon, close control, width, radius, side border, bottom alignment, and adjacent “new tab” control must remain unchanged. Only the interstitial vertical gap must be removed.

## Pending live inspection

The ordered overlap crops were also inspected. They confirm the orange annotation ends at the active tab’s top-right contour and does **not** ask for changes to the tab’s close affordance, corner radius, neighboring new-tab glyph, or the rest of the tab strip.

The live workspace DOM and computed geometry must now identify whether the seam originates from a title-bar bottom border, tab-strip top padding/margin, a fixed height mismatch, an outer container gap, or paint stacking.

## Live geometry diagnosis — 2026-08-16

The focused live-browser probe confirms the seam is an intentional but now-unwanted **6 px top padding** on the inner tab-strip content container, not a title-bar border, margin, stacking, or tab-corner issue. The outer tab strip runs from y=56 to y=96 (40 px high); the active tab runs from y=62 to y=96 (34 px high), so the tab already shares the strip’s bottom edge and the whole gap appears only above it. Removing that one `pt-1.5` utility will place the existing tab at y=56 without altering its width, horizontal controls, text, borders, radius, or click behavior. Its height will naturally occupy the already-existing 40 px tab-strip allocation, which is required to remove the upper gap while preserving its existing bottom alignment.

## Post-change live evidence — 2026-08-16

After removing only `pt-1.5`, the active tab, inner tab-strip content, and outer tab strip all measure from y=56 to y=96 in the live browser. The measured empty seam is therefore **0 px**, while the tab remains aligned to the strip’s existing lower boundary. Direct light and dark captures show the tab’s file icon, title, close affordance, top corner, side border, adjacent add-tab glyph, and surrounding layout are retained; only the prior empty upper band is gone.
