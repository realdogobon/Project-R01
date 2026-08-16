# Scanner Toolbar Paper-Feed Verification Notes

## Initial visual inspection — 2026-08-16

- The light-mode capture confirms that the printer glyph remains unchanged and that the paper layer is visually masked by the printer body rather than floating above it.
- The first probe's frame assertions were affected by screenshot capture time between sampling points: the nominal middle screenshot was captured after the paper had already advanced toward the output tray. The motion implementation itself requires no correction from this observation; the focused probe will be retimed to collect geometry samples first and save evidence screenshots separately.
- The paper uses `bg-current`, so its color resolves to the same inherited toolbar color as the printer in the inspected light view. A dark-mode computed-color assertion remains part of the planned verification.

## Retimed live verification — 2026-08-16

The retimed browser probe passed all trajectory assertions. It sampled a visible sheet above the printer before entry, within the body during transport, and below the printer at the output tray, with strictly increasing vertical positions. The visual mid-feed frame confirms the sheet is correctly occluded by the fixed printer glyph. The final evidence capture is intentionally very quiet because the sheet is already completing its fade after clearing the tray; its prior geometry sample confirms the visible output position. The second-hover, dark-color inheritance, reduced-motion, and browser-console assertions also passed.

## Final verification — 2026-08-16

The expanded probe then passed a rapid interrupted-hover cycle plus three further complete hover cycles. It confirmed that the keyed paper element starts a fresh CSS animation on every entry, including immediately after an interrupted pass. Light and dark themes retain the same paper-to-printer color relationship through `currentColor`; the reduced-motion variant leaves the sheet hidden and does not start the animation. TypeScript, all 14 Vitest assertions, and the production build passed after the implementation.

## User-reported correction investigation — 2026-08-16

The user correctly identified two defects in the first refinement. The interactive region was only the 16-pixel icon wrapper rather than the whole scanner toolbar button, so hover starts failed when the pointer entered the visible button outside the glyph. The sheet was also too short for the original percentage transforms: its geometry never reached a convincingly top-to-bottom path through the printer.

The correction expands the pointer-entry listener to the full button footprint, preserves the icon at its original size, and restarts the keyed animation for every pointer entry. The sheet is now taller and uses a slower 1.35-second path: it begins above the top slot, reaches the printer center halfway through, and clears the lower tray before fading. The repeated live probe passed after coming from Library and entering all four corners of the scanner button, as well as interrupted and repeated cycles, dark mode, and reduced motion. The regular screenshot capture continues slightly after its requested timestamp, so its visual evidence is now being frozen at the sampled frame before capture.

The frozen light-mode evidence was visually checked at the entry and midway samples. The sheet is visible above the printer before passing its top edge, and the mid-path capture shows it behind the fixed printer strokes rather than above the glyph. The geometry probe independently records a strictly downward trajectory with the entry center above the printer center, the middle sample within seven pixels of center, and the output sample below the printer’s measured bottom edge.
