# Scanner Action-Bar Clipping Verification

## Reproduction

The supplied 63-page Testbook GK PDF reproduced the reported clipped Scan action at the standard 1280 × 820 desktop viewport. The scanner shell was 860 px wide, leaving a 549 px right-hand document pane after the settings rail. The footer placed three non-shrinking control groups on one forced row from the `sm` breakpoint onward, producing 620 px of content in the 549 px pane.

The primary Scan control ran from x=1045 to x=1125, while the scanner shell ended at x=1070. Its rightmost 55 px was therefore clipped. The PDF itself rendered normally as page `1/63`, and the browser reported no console errors; this was a responsive action-bar sizing fault rather than a document-rendering or import failure.

## Layout-only correction and visual result

The action bar now preserves its single-row composition whenever the fixed controls fit, but wraps naturally when they do not. It no longer forces a single row at the `sm` breakpoint and no longer uses horizontal footer overflow as its layout escape hatch. No scanner logic, crop behavior, provider routing, file ingestion, or Scan-to-Stop behavior was changed.

The corrected Testbook run retained the same 549 px document pane. The footer had no horizontal overflow and the full 80 px Scan control appeared at x=585–665 inside the shell. The after screenshot confirms that the document preview, crop action, page controls, and Scan action are all visible and reachable.

## Focused coverage

`scripts/scanner_action_clipping_probe.mjs` imports a real public document through the production scanner route and measures the loaded document, action bar, primary action, page counter, overflow, and shell bounds. `server/scannerLayout.test.ts` protects the layout contract in Vitest. The first corrected run passed with `scanFullyVisible: true`, `footerScrollWidth: 549`, `footerClientWidth: 549`, page `1/63`, and zero browser errors.

## Narrow-screen follow-up

The same geometry probe then loaded a local four-page PDF at 375 × 812. The first footer-wrap correction kept Scan visible but left the inner tool cluster at a 410 px scroll width in a 374 px footer, which hid the final next-page control beyond the right edge. The tool cluster was therefore updated to wrap its own fixed control groups rather than relying on horizontal overflow.

The final 375 px run measured matching `footerScrollWidth` and `footerClientWidth` values of 374 px, retained a fully visible Scan control, and visually showed both the previous and next page arrows, the `1/4` counter, crop action, document preview, and trash action. It reported zero browser errors and used the local fixture only.
