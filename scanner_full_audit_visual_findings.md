# Scanner Full Audit — Visual Findings

This file records read-only observations from the live screenshots captured during the scanner audit. No production code was changed for this audit.

## Queue-and-scan, in-progress state

The queued two-clip scan presents the crop card within the scanner stage with a visible blue laser beam and the status label beneath the card. The card is horizontally centered in the available stage. The left control panel remains stable, the queued-clips list remains visible, and the Scan control changes to a disabled loading-style control with the queue-count badge. The overall modal remains visually coherent while the stage resizes from the document state to the progress-card state.

## Queue-and-scan, later progress state

The second captured frame shows the second clip in progress with the laser still active and the status label reading `Scanning clip 2 of 2...`. The card remains centered horizontally and the toolbar remains stable below the progress area. The captured frame was still in progress rather than a final completed frame, which confirms that OCR/render timing can outlast a short visual sampling window; the DOM regression report later observed the terminal `Scan completed` state.

## Current audit implications

The current UI has a clear scanning visual state but no visible Stop/Cancel action. The Scan control is disabled/loading while the pipeline is active, so an accidental scan cannot currently be stopped through the scanner UI. The audit also observed that an empty-state scan attempt reaches the existing `No image or document loaded to scan.` error path rather than being silently ignored.

## Retained queue after document discard

After the active PDF is discarded while one clip remains queued, the scanner shell contracts to the empty-document presentation while retaining the queued clip. The live scan still renders the retained clip and keeps the laser/progress treatment visible. The completed card is horizontally centered, but the available viewport is shorter than the shell’s content contract and the card/status composition sits visually high relative to the full modal shell; this is an important distinction between the document-present and document-discarded layouts. The screenshot confirms that the empty-document state does not erase the retained queue, but it also exposes why the progress-card composition can feel like it moves when the active document disappears.

## Full read-only audit results

The live harness exercised both supplied fixtures: `Volume_02.pdf` as the multi-page queue-and-scan source and `file-example_PDF_1MB.pdf` as the discard-with-retained-queue source. For the first fixture, it created a crop on page 1, advanced to page 2, created a second crop, queued both clips, and scanned them sequentially. The in-progress samples showed the laser visible, `Scanning clip 1 of 2...` followed by `Scanning clip 2 of 2...`, and a disabled queue-badge control. The terminal state reached `Scan completed`, the laser disappeared, the result card was centered at `x: 0, y: 0`, and the action changed to `Send`.

For the second fixture, the harness created and queued one clip, discarded the active PDF, confirmed that the document disappeared while `Queued Clips (1)` remained, and scanned the retained clip successfully. The terminal state also reached `Scan completed` and the laser stopped. The result card stayed horizontally centered but measured `y: -32px` relative to the available viewport center because the modal returned to its empty-document shell contract. This is the concrete source of the “moves around like a maniac” feeling: the queued item survives correctly, but the progress presentation is re-laid out against a different stage height after discard.

The truly empty state keeps the Scan button enabled even with no document and no queued clips. Clicking it produces `No image or document loaded to scan.` and no progress card or laser. The audit also captured `Image too small to scale!! (2x36 vs min width of 3)` and `Line cannot be recognized!!` from the OCR path while testing tiny/low-information clips; these are downstream recognition warnings, not scanner layout failures, but they should be represented as a deliberate error/partial-result state if the cancellation work later touches the pipeline.

## Approval-only Scan-to-Stop proposal

The current safe cancellation boundary is before `executeExtraction()` begins. Today `triggerScan()` immediately awaits that function; `executeExtraction()` sets loading and progress state, then processes queued clips sequentially with no abort checks. Cloud requests have an internal timeout controller that is not exposed to the scanner, and local Tesseract recognition has no per-recognition abort handle. Therefore, a visual button swap alone would falsely suggest that an in-flight request can be cancelled and would not reliably save credits.

The proposed implementation should use a small explicit state machine: `idle → preflight → scanning → success/error`, with `stopping` as a terminal transition from `preflight` and a cooperative transition from between queued items. On Scan, the existing button should transition to the same-size Stop control and the backend should wait 3–4 seconds before entering `executeExtraction()`. A Stop click during this preflight must clear the timer, restore `idle`, preserve the queue and document, avoid any OCR/provider call, keep the laser/progress card unstarted, and spend zero OCR credits. If the buffer expires, the actual pipeline begins normally.

Once extraction has started, Stop should remain honest: it should request cancellation, stop starting any next queued clip, clear or abort any cancellable provider request exposed by the OCR layer, stop the laser, and settle the UI into a clearly labelled cancelled state before returning to Scan. If a provider/local OCR operation cannot be interrupted safely, the UI must not claim that the current request was retroactively cancelled; it should stop subsequent work and report that the active operation is finishing. This distinction is necessary for credit correctness.

Acceptance criteria for approval: no OCR request before the 3–4 second preflight expires; Stop during preflight causes no progress card and no provider/local OCR call; Scan/Stop occupies the same footer slot with the existing typography and icon scale; starting from a document-present layout and from the retained-queue-after-discard layout produces the same centered progress composition; Stop halts the laser and returns the control to Scan; queue order and clips remain intact after cancellation; empty Scan is guarded without a console error; and normal image/PDF crop, zoom, page navigation, Send, and OCR flows remain unchanged.

## Awkward-crop alignment regression

The second read-only live matrix exercised five crop shapes on the supplied PDFs: a micro crop, a tiny crop, a very flat horizontal crop, a very flat vertical crop, and an awkward rectangular crop. The document-present scan reached all five queued clips and completed successfully. During the first 50 ms sample, the progress card was still settling (`y: +67px`), then reached approximately `y: +1.1px` at 250 ms and remained within `±0.64px` through completion; horizontal error stayed at `0px`. The laser was visible during progress and absent after `Scan completed`.

The visual screenshots confirm that the document-present progress card remains contained and centered while the queue badge and footer controls stay stable. At 250 ms the card is intentionally in its entrance/layout transition, not permanently offset; by the later sample the card and status label are visually coherent, although the scan was still processing clip 4 of 5 at 3.5 seconds.

The same five clips were then created from the second PDF, the active document was discarded, and the retained queue was scanned from the empty main viewport. All five clips remained queued and the scan completed. In this state the progress card was horizontally centered but vertically offset by approximately `-77px` at the first/last samples and `-9.5px` during the middle samples. This confirms the previously observed empty-shell re-layout issue, now reproduced with tiny, flat, and awkward crop shapes rather than a single normal clip. The empty Scan guard still produces `No image or document loaded to scan.` when no document and no queued clips exist.

The discarded-document screenshots make the cause visually clear: the result card remains horizontally centered, but the empty scanner shell is shorter and the card/status composition is pulled upward. At 250 ms, the active card is centered within the reduced shell but not within the original document-present visual frame; after completion, the card is still approximately `77px` above the viewport center while the footer remains anchored at the bottom. This is a real empty-shell presentation mismatch, not crop-shape distortion or a laser-animation problem.
