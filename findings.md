# RoyScript TSR Scanner — Consolidated Findings

**Author:** Manus AI  
**Scope:** Read-only live UI/UX and lifecycle audit  
**Production changes during audit:** None

## Executive summary

The scanner’s document-present workflow is visually stable for normal, tiny, flat, and awkward crops. Progress cards remain horizontally centered, the laser is visible during active scanning and stops after completion, the queue badge remains stable, and the action returns to `Send` after completion. The principal confirmed defect is isolated to the **retained-queue-after-document-discard** state: once the active PDF is discarded, the scanner returns to a shorter empty-document shell while queued clips remain, so the scanning card/status group is vertically re-laid out and appears to jump upward. This is a layout-contract mismatch, not a crop-coordinate, PDF-rendering, or laser-animation failure.

The scanner also has no visible Stop/Cancel control. The current Scan action starts extraction immediately and disables the control while the queue is processed. A visual-only Scan-to-Stop swap would be misleading because the current OCR pipeline does not expose a single safe cancellation contract across provider requests and local recognition. The safest implementation boundary is a short preflight before the first OCR/provider call, followed by cooperative cancellation between queued clips once extraction has begun.

## 1. Audit fixtures and method

The live audit used the user-provided PDFs `Volume_02.pdf` and `file-example_PDF_1MB.pdf`. The browser harness performed real uploads, crop gestures, Add Clip actions, PDF page navigation, queue inspection, active-document discard, Scan actions, timed DOM measurements, screenshot capture, and console-error collection. No production source file was modified for the audit.

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

When there is no active document and no queued clip, the Scan action remains enabled. Clicking it produces `No image or document loaded to scan.` and does not start a progress card or laser. This is an existing guard path, but it surfaces as a console error rather than a quiet disabled state or deliberate inline validation state.

The awkward-crop audit also captured `Image too small to scale!! (2x36 vs min width of 3)` and `Line cannot be recognized!!` during low-information OCR attempts. These are recognition-quality warnings rather than layout failures. If cancellation or progress-state work later adds explicit failure states, these should remain distinguishable from user cancellation and from renderer errors.

## 6. Current Scan lifecycle and cancellation boundary

The current Scan action starts extraction immediately. During extraction, the Scan control becomes a disabled loading-style control with the queued-count badge. There is no visible Stop or Cancel action. The scanner progress card and laser are visual feedback only; they do not currently expose a cancellation mechanism.

The current safe cancellation boundary is before the extraction loop begins. The extraction loop processes queued clips sequentially, but it does not expose a scanner-level abort contract. Provider requests have internal timeout behavior that is not exposed to the scanner, while local Tesseract recognition does not provide a single per-recognition cancellation handle that can be safely wired to a UI button without further pipeline design.

## 7. Approval-only Scan-to-Stop proposal

The proposed behavior should use an explicit state machine:

| State | User-facing control | Backend behavior |
|---|---|---|
| `idle` | Existing `Scan` control | No active work |
| `preflight` | Same-size `Stop` control with the requested hand SVG | Wait 3–4 seconds before any OCR/provider call |
| `scanning` | Same-size `Stop` control | Process clips; support cooperative cancellation at safe boundaries |
| `stopping` | Temporary disabled/settling state if needed | Stop laser, prevent the next clip from starting, settle active work honestly |
| `success` | Existing completion/send state | Preserve current completion behavior |
| `error` or `cancelled` | Return to `Scan` with truthful status | Preserve queue and document unless the user explicitly discards them |

During `preflight`, Stop must clear the timer, prevent the progress pipeline from starting, preserve the document and queue, and spend zero OCR/provider credits. The visual transition should reuse the current button’s footprint, font, spacing, and icon scale; only the label and SVG should change.

Once actual extraction has begun, Stop must not falsely claim that an already-started provider request was retroactively cancelled. It should prevent subsequent queued clips from starting, abort any provider/local operation only where a reliable abort handle exists, stop the laser, and return the control to Scan after a truthful cancelled or finishing state. Queue order and clips must remain intact.

## 8. Recommended issue-by-issue order

The first implementation issue should be the **empty-shell progress-card vertical alignment** because it is a confirmed visual defect with a narrow scope. The correction should establish one stable progress presentation frame for both document-present and retained-queue-after-discard states without changing crop pixels or extraction math.

The second issue should be the **empty Scan guard presentation**, deciding whether the action should be disabled when there is no document and no queue or whether the existing error should become a quiet, deliberate inline state.

The third issue should be the **preflight Scan-to-Stop buffer**, implemented only after the button transition, timer ownership, queue preservation, and zero-credit guarantee are agreed. Cooperative post-start cancellation should be handled as a separate backend/OCR contract rather than being implied by the visual button swap.

## 9. Approval criteria before implementation

Implementation should not begin until the user approves the issue order and the Scan-to-Stop semantics. The minimum acceptance criteria are: the retained-queue progress card remains centered in the same visual frame as the document-present flow; Stop during the 3–4 second preflight triggers no OCR/provider request; the queue and document remain recoverable after Stop; the laser stops on cancellation; the button returns to Scan; empty Scan is guarded without a browser-console error; and normal PDF/image crop, zoom, page navigation, Send, and OCR behavior remains unchanged.

