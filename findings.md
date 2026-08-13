# RoyScript TSR Scanner — Consolidated Findings

**Author:** Manus AI  
**Scope:** Live UI/UX and lifecycle audit plus the approved scanner implementation pass
**Production changes during audit:** Limited to scanner interaction, cancellation, alignment, sizing, and PDF/OCR lifecycle fixes documented below

## Executive summary

The scanner’s document-present workflow is visually stable for normal, tiny, flat, and awkward crops. Progress cards remain centered, the laser is visible during active scanning and stops after completion, the queue badge remains stable, and the action returns to `Send` after completion. The confirmed **retained-queue-after-document-discard** layout mismatch has been corrected by keeping the progress presentation in the established scanner stage rather than allowing the shorter empty-document shell to pull it upward.

The scanner now has a real Scan-to-Stop lifecycle. The control changes to a same-footprint `Stop` action during the backend-only preflight and active OCR phases, Stop during preflight clears the timer before any OCR/provider call, and Stop after work begins aborts the active cloud request or local recognition race, prevents subsequent clips from starting, stops the laser, preserves the queue/document, and returns the action to `Scan`.

## 1. Audit fixtures and method

The live audit used the user-provided PDFs `Volume_02.pdf` and `file-example_PDF_1MB.pdf`. The browser harness performed real uploads, crop gestures, Add Clip actions, PDF page navigation, queue inspection, active-document discard, Scan actions, timed DOM measurements, screenshot capture, and console-error collection. The subsequent implementation pass was kept scoped to the documented scanner defects and cancellation contract.

The second focused matrix created five crop geometries: a micro crop, a tiny crop, a very flat horizontal crop, a very flat vertical crop, and an awkward rectangular crop. These shapes were tested both while the source PDF remained visible and after the active PDF was discarded while retaining the clips.

## 2. Document-present workflow

For the first fixture, the audit created clips across PDF pages, queued them, and scanned them sequentially. The full awkward-shape matrix queued five clips and completed successfully.

| Observation | Result |
|---|---|
| Horizontal progress-card alignment | `0px` throughout the measured states |
| Vertical settling at 50 ms | Approximately `+67px`, representing the active layout transition |
| Vertical alignment at 250 ms | Approximately `+1.1px` |
| Vertical alignment through completion | Within approximately `±0.64px` |
| Laser during progress | Visible |
| Laser after completion | Hidden |
| Scan control during progress | Disabled queue-badge loading control |
| Terminal action | Returns to `Send` |
| PDF page/crop behavior | Page navigation and queued crop scanning succeeded |

The screenshots show a coherent document-present composition. The left settings panel, queued-clips list, central card, status label, laser, and footer toolbar remain visually related. The first 50 ms frame should not be interpreted as a permanent offset because the card is still entering or being fitted; the card settles by the next sample.

## 3. Retained queue after active-document discard

The second fixture was cropped into the same five awkward shapes. The active PDF was then discarded using the existing “keep clips” behavior. The main document viewport disappeared, but all five clips remained queued and were successfully scanned.

| Observation | Result |
|---|---|
| Queue after discard | `Queued Clips (5)` remained |
| Active document image after discard | Not present |
| Horizontal card alignment | Correct; approximately `0px` |
| Vertical alignment at 50 ms | Approximately `-77.5px` |
| Vertical alignment at 250 ms | Approximately `-77px` |
| Middle progress samples | Approximately `-9.5px` |
| Terminal completion alignment | Approximately `-77px` |
| Laser during progress | Visible |
| Laser after completion | Hidden |
| Queue completion | All five retained clips completed |

The screenshots make the defect clear. The empty-document shell is shorter than the document-present shell, while the footer remains bottom-anchored. The progress card and status label are therefore pulled upward relative to the full modal frame. This is the source of the feeling that the card “moves around like a maniac.” The issue is not caused by the crop’s intrinsic aspect ratio, distorted crop pixels, stale crop coordinates, or an unstable laser.

## 4. Crop-shape findings

The measured crop selections confirm that the scanner accepts extreme shapes without crashing:

| Shape | Document-present selection | Discard-retained selection | Finding |
|---|---:|---:|---|
| Micro | Approximately `9.5×22.7px` | Approximately `8.2×22.7px` | Queued and scanned; downstream recognition can be low-information |
| Tiny | Selection may collapse below the probe’s DOM selector threshold | Same selector limitation | Minimum-frame behavior remains relevant; probe geometry should treat this as a special tiny case |
| Flat horizontal | Approximately `422.4×22.7px` | Approximately `366.4×22.7px` | Queued and scanned without progress-card horizontal drift |
| Flat vertical | Selection may collapse below the probe’s DOM selector threshold | Same selector limitation | No browser crash; requires a more specific crop-state selector if pixel geometry is needed |
| Awkward rectangle | Approximately `267.8×71.4px` | Approximately `142.0×84.2px` | Queued and scanned successfully |

The selector limitation for the tiny and vertical-flat cases does not mean the crop gesture failed. The scan matrix still reached five queued clips and completed. A future automated regression should inspect the crop component’s own committed state rather than relying only on the visible selection rectangle.

## 5. Empty state behavior

When there is no active document and no queued clip, the Scan action is now disabled with the existing scanner visual language and the title `No document or clips available`. The action cannot start a progress card, laser, OCR call, or console-error path from an empty source state.

The awkward-crop audit also captured `Image too small to scale!! (2x36 vs min width of 3)` and `Line cannot be recognized!!` during low-information OCR attempts. These are recognition-quality warnings rather than layout failures. If cancellation or progress-state work later adds explicit failure states, these should remain distinguishable from user cancellation and from renderer errors.

## 6. Implemented Scan lifecycle and cancellation boundary

The Scan action now enters a short `preflight` state before extraction. During both `preflight` and `scanning`, the control is a clickable Stop action with the queued-count badge. The progress card and laser remain the existing visual feedback; Stop explicitly ends the active run and turns the laser off.

The scanner owns an `AbortController` for each run. Provider requests receive its signal through the existing timeout wrapper, local Tesseract recognition races its recognition promise against the signal, and worker initialization is also abort-aware. The sequential queue loop checks the signal before each clip and after each result, so Stop prevents subsequent clips from starting. The queue and active document are not discarded by cancellation.

## 7. Implemented Scan-to-Stop state machine

The proposed behavior should use an explicit state machine:

| State | User-facing control | Backend behavior |
|---|---|---|
| `idle` | Existing `Scan` control | No active work |
| `preflight` | Same-size `Stop` control with the requested hand SVG | Wait 3.5 seconds before any OCR/provider call |
| `scanning` | Same-size `Stop` control | Process clips; support cooperative cancellation at safe boundaries |
| `stopping` | Temporary disabled/settling state if needed | Stop laser, prevent the next clip from starting, settle active work honestly |
| `success` | Existing completion/send state | Preserve current completion behavior |
| `error` or `cancelled` | Return to `Scan` with truthful status | Preserve queue and document unless the user explicitly discards them |

During `preflight`, Stop clears the timer, prevents the progress pipeline from starting, preserves the document and queue, and makes no OCR/provider call by construction. The visual transition reuses the current button’s footprint, font, spacing, and icon scale; only the label and SVG change.

Once actual extraction has begun, Stop does not claim that an already-completed provider request was retroactively cancelled. It prevents subsequent queued clips from starting, aborts the active provider/local operation where the signal is supported, stops the laser, and returns the control to `Scan` after the active run settles. Queue order and clips remain intact.

## 8. Implementation status

The **empty-shell progress-card vertical alignment** was corrected first. The progress presentation now uses one stable stage contract for both document-present and retained-queue-after-discard states without changing crop pixels or extraction math.

The **empty Scan guard** is implemented as a disabled action when neither a document nor a queued clip exists.

The **3.5-second Scan-to-Stop preflight** and the cooperative post-start OCR contract are implemented together. The live probe verifies the button transition, timer cancellation, laser shutdown, queue preservation, and return to `Scan`.

## 9. Live verification evidence

The current live Stop probe was run against the published preview with `Volume_02.pdf`. It completed with an empty browser-error list and verified the following results:

| Scenario | Verified result |
|---|---|
| Preflight at 50–1000 ms | `Stop scan` is present, enabled, and reports `Preparing scan...`; laser is off |
| Stop during preflight | Stop click succeeds; within 100 ms the button is enabled `Scan`, status is gone, laser is off, and the queued clip remains |
| After the 3.5-second boundary | The cancelled preflight does not restart; the action remains `Scan` and no scanning card/laser appears |
| Active OCR at 3.6–4.2 s | `Stop scan` is present, enabled, status is `Scanning clip 1 of 1...`, and laser is visible |
| Stop after OCR starts | Stop click succeeds; within 100 ms the button is enabled `Scan`, status is gone, laser is off, and the queue remains |
| Empty source | The action is disabled with title `No document or clips available`; no scan state starts |
| Browser errors | None reported by the probe |

The code-level zero-credit guarantee is the preflight boundary itself: `recognizeOneImage` is not reached until the 3.5-second wait resolves, and an abort rejects that wait before any cloud or local OCR path is entered. The retained-queue alignment, crop, zoom, PDF, sizing, and scan-complete behaviors remain covered by the earlier published regression checkpoints and are included in the final regression matrix before the implementation checkpoint.

## 10. Final acceptance criteria

The approved implementation criteria are now met in code and in the focused live Stop probe: the retained-queue progress card remains centered in the established stage; Stop during preflight spends no OCR/provider work; post-start Stop cooperatively cancels the active operation; the queue and document remain recoverable; the laser stops; the button returns to `Scan`; empty Scan is guarded without a browser-console error; and the existing PDF/image crop, zoom, page navigation, Send, and OCR flows remain unchanged by the cancellation contract.

## 11. Multi-clip Scan-to-Stop regression

The repository now includes `scripts/scanner_multiclip_stop_probe.mjs`. The harness creates three real clips from `Volume_02.pdf`, confirms the queue contains three items, waits until the status reads `Scanning clip 1 of 3...` with the laser visible, clicks the live `Stop scan` control, and samples the scanner for six seconds after cancellation.

The live run passed with zero page or console errors. Only clip index `1` was observed; no `Scanning clip 2 of 3...` or `Scanning clip 3 of 3...` state appeared. After cancellation, the status was cleared, the laser count was `0`, the action returned to enabled `Scan`, and `Queued Clips (3)` remained intact. This directly verifies that the sequential extraction loop does not begin subsequent queued clips after Stop.

## 12. Provider-mock preflight assertion and visual refinement

The repository now includes `scripts/scanner_preflight_provider_probe.mjs`. It installs browser-side request interception for the Gemini, Groq, and OpenAI OCR hosts, supplies mock provider keys locally, creates one lightweight image clip, starts a scan, and stops it during the 3.5-second preflight. The probe does not allow a provider request to reach the network: any unexpected request is recorded and answered by the local mock.

The focused live run passed with zero intercepted provider requests and zero browser errors. The Stop action was present and enabled during `Preparing scan...`, the click succeeded, and the action returned to enabled `Scan` after cancellation and after the preflight boundary. This is the requested zero-cloud-request assertion, performed without running a full OCR request or consuming provider bandwidth.

The same validation pass confirmed the requested presentation changes without altering the button footprint or scanner mechanics. Stop now uses a red accent, the queue-count badge is neutral rather than red or blue, and the hand icon is larger with stronger rounded strokes. The progress status caption was lowered slightly to reduce collision risk with lower scanner controls. The three-clip live cancellation probe still passed after these changes; only clip 1 appeared, the laser stopped, and all three queued clips remained available.
