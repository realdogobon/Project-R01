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

The same validation pass confirmed the requested presentation changes without altering the button footprint or scanner mechanics. Stop uses a red accent with a neutral queue-count badge, while the regular Scan action uses a red queue-count badge so the number remains prominent against the blue Scan accent. The hand icon is larger with stronger rounded strokes, and the progress status caption was lowered slightly to reduce collision risk with lower scanner controls. The three-clip live cancellation probe still passed after these changes; only clip 1 appeared, the laser stopped, and all three queued clips remained available.

## 13. Hotspot-conscious operating constraint

The user is working through a smartphone hotspot with limited data. Future scanner work should therefore prefer local code inspection, existing fixture files, cached build artifacts, and focused probes. Avoid redundant asset downloads, repeated full regression matrices when a targeted probe answers the question, and unnecessary provider or browser-network traffic. This constraint must not reduce the depth of reasoning or the quality of required verification; it changes test selection and repetition, not engineering rigor.

The targeted badge probe measured the intended rendered states: the Stop badge used neutral gray (`oklch(0.439 0 0)`) with white digits, while the regular Scan badge used the red accent (`oklch(0.637 0.237 25.331)`) with white digits. Both retained the same approximately 18px circular footprint and remained prominent against their respective action colors.

## 14. Local OCR audit baseline — fixture inventory

The local audit is reusing the already-uploaded fixtures and does not require new downloads. Available source material includes `thumb_1200_1696.png` (1200×1696), five 1080×2400 JPEG screenshots, `Volume_02.pdf` (51 pages; scanned image content), and `file-example_PDF_1MB.pdf` (30 pages; selectable text plus a chart). A local 200-DPI render of page 1 from the latter shows clean, high-contrast mixed typography, bullets, emphasis, and a chart, making it a useful baseline with extractable ground truth from `pdftotext`.

The uploaded typing-page image visibly contains the heading `Paragraph typing link:`, the URL `https://unicodepoint.net/typing/mock-test/english-165`, and a clean English paragraph beginning `After being in exile for 50 years the question is becoming more and more important among Tibetans.` It also contains a diagonal `unicodepoint` watermark, which makes it a useful test for ordinary text plus structured visual noise. These observations are recorded before any OCR result is judged.

## 15. Browser-local OCR alternative research

The most relevant maintained browser-local candidate found so far is [siva-sub/client-ocr](https://github.com/siva-sub/client-ocr). Its README describes an ONNX Runtime Web pipeline with RapidOCR and PPU PaddleOCR models, including text detection, rotation classification, recognition, confidence scoring, PDF support, and 100+ language options. The documented model footprint is approximately 4–5 MB for detection, 8–17 MB for recognition, and 0.5 MB for classification, with browser caching after the initial download. The repository showed 12 stars, 71 commits, two releases, and recent v2.x documentation/model updates at the time of review.

This is a promising **printed-document** alternative because it separates text detection from recognition and should handle layouts, rotation, and multi-region pages better than the current whole-image Tesseract call. It is not yet evidence of handwriting success, and its first-run model downloads matter under the user’s smartphone-hotspot constraint. It must therefore be benchmarked against the existing Tesseract outputs before adoption.

A second, lighter candidate is [ppu-paddle-ocr](https://github.com/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr), published on [npm](https://www.npmjs.com/package/ppu-paddle-ocr) as version 6.4.0 with an approximately 274 KB unpacked package footprint. Its documented API exposes a `PaddleOcrService`, ONNX Runtime execution settings, OpenCV or canvas-native preprocessing, PP-OCRv6 tiny defaults, confidence thresholds, per-box/per-line output, and bounded batch recognition. The README reports vendor benchmark claims around 140 ms median inference and approximately 99.48% character accuracy on a receipt fixture; these figures are **not yet independently verified** on RoyScript fixtures and should not be treated as product guarantees. The package is technically attractive for a focused browser-local printed-text benchmark because its wrapper is small, but its model assets still create a first-run download cost.

For the first controlled benchmark, the adapter should use the package’s English mobile preset rather than the generic default: `V5_EN_MOBILE_MODEL` or its smaller `V5_EN_MOBILE_INT8_MODEL`. These assets are hosted by the project at `media.githubusercontent.com` with the English dictionary on `raw.githubusercontent.com`; this is a one-time model-cache cost, so the benchmark should warm the cache once and reuse the same browser session. The server model is intentionally deferred until the mobile/int8 quality-versus-size tradeoff is measured.

The first implementation benchmark used the clean selectable-text PDF page as ground truth. After disabling the adapter’s experimental `spaceRecovery` option, PP-OCR produced readable continuous text, but its normalized similarity was slightly below the saved Tesseract baseline: Tesseract reached `0.9810` character similarity and `0.9848` token similarity, while PP-OCR reached `0.9792` and `0.9378`. PP-OCR also took about 15.4 seconds on its first browser run because model/WASM assets were initialized. This means PP-OCR is **not yet proven as a universal replacement**; the next decision depends on its performance on degraded printed and handwritten crops. The browser emitted one known ONNX Runtime `Unknown CPU vendor` warning, classified separately from actual page errors; there were zero cloud requests.

## 16. Measured local OCR baseline

The repository now includes `scripts/local_ocr_quality_probe.mjs`, which reuses the real scanner upload, Scan, OCR, and Send-to-Workspace path while forcing an empty provider-key state and aborting any cloud-provider request. The baseline ran against three existing local fixtures with zero cloud requests and no browser errors. Tesseract downloaded or requested its browser worker/WASM/English assets during the session; these are the main first-run bandwidth cost and should be cached rather than re-fetched.

| Fixture | Local OCR result | Measured observation |
|---|---:|---|
| `thumb_1200_1696.png` | 1,369 characters | Clean printed paragraph was largely readable; the title/URL and watermark area produced some omissions, but the body was coherent. |
| `file-example-page1.png` | 1,289 characters | Clean PDF page was highly accurate; the heading and chart labels were mostly preserved, with minor symbol/layout noise. |
| `volume02-page1.png` | 2,984 characters | Printed speech text was substantially readable but had frequent substitutions around scan artifacts, ruling lines, marginal annotations, and low-contrast regions. |

Controlled crops made the boundary clearer: the clean text crop and printed Volume_02 crop remained readable, while the handwritten/marked left crop returned approximately 176 characters of mostly visual noise. This is not evidence that the worker is randomly broken; it is a capability gap between Tesseract’s printed-text model and handwritten/occluded material, compounded by whole-image page segmentation and scan artifacts. The first improvement target is therefore adaptive preprocessing/segmentation for printed pages, while handwriting requires a separate recognition model rather than a cosmetic Tesseract tweak.

## 17. Raw-pixel and segmentation validation

The local fallback now preserves the original transformed pixels alongside the purified display/cloud payload. Queued crops already carried raw pixels; the new whole-document path applies the same rotation, mirror, and resolution transform to the raw full-page source before local recognition. Crop scans use Tesseract block segmentation (`PSM 6`), while whole-document scans retain automatic page segmentation (`PSM 3`). Scanner UI, crop coordinates, extraction math, cloud routing, and cancellation behavior were not changed.

The focused cached benchmark completed with zero cloud requests and no page errors for the clean typing image and the degraded Volume_02 page. The selectable-text PDF page scored `0.9844` character similarity and `0.9674` token similarity against `pdftotext` ground truth after the raw-pixel change, compared with the saved purified-input baseline of `0.9810` and `0.9848`. This is a small character-level improvement but not a universal token-level win; it supports retaining raw pixels as a fallback input, not claiming that Tesseract is solved.

The real handwritten crop still produced approximately 170 extracted characters of mostly non-readable visual noise, with zero cloud requests and no browser errors. A native system Tesseract binary is not installed in the sandbox, so there is no native-versus-WASM comparison to make. The evidence therefore points to a recognition-model limitation on handwriting/occlusion, not a missing native executable or a scanner UI defect.

The temporary PP-OCR experiment was removed from production after its clean-page benchmark failed to beat the saved Tesseract baseline consistently and introduced a roughly 24 MB-class WASM/runtime path plus first-run model downloads. Its research remains documented as a future printed-text alternative, but it is not being presented as a verified improvement.

## 18. End-to-end destination validation

The real-crop local OCR harness now accepts a destination argument and was run through both supported text destinations using the cached browser profile and the degraded printed Volume_02 crop. The Workspace path queued one clip, scanned it locally, saved the extracted text, and delivered non-empty content into the editor with zero cloud requests and no browser errors. The Practice path queued one clip, scanned it locally, closed the scanner, and reached the populated Practice shell with `Reference Text`, `Start Practice`, and `Configure Session` visible; it also completed with zero cloud requests and no browser errors.

This verifies the local OCR result is not merely present in a scanner preview: it reaches the two primary downstream user flows. The handwriting crop remains a documented model limitation rather than being hidden by a cloud fallback.

The official `microsoft/trocr-base-handwritten` model card describes TrOCR as an image-Transformer encoder plus autoregressive text-Transformer decoder, initialized from BEiT and RoBERTa, and explicitly scopes the raw checkpoint to **single text-line images**. This makes it a handwriting-region specialist, not a whole-page drop-in OCR engine; a layout detector and line/region cropper must precede it, and fine-tuning may be needed for the user’s writing style.

The same model card identifies the checkpoint as a base-sized model fine-tuned on IAM and reports approximately **0.33B parameters**. That is small enough for a local specialist role, but its IAM/single-line training scope is not sufficient evidence for arbitrary handwriting, multi-line notes, stains, or full-page documents.

## 19. Official model research for the next architecture

The current research direction is no longer “find a better Tesseract setting.” The strongest candidate for complex local document parsing is the **PaddleOCR-VL** family: the official materials describe it as a compact document-parsing vision-language model, and the 1.5 paper reports that it remains approximately 0.9B parameters while improving its OmniDocBench score from 92.11% to 93.43% [1] [2]. These are vendor/paper benchmark results, not RoyScript guarantees.

For handwriting-specific recognition, **TrOCR** remains a relevant specialist family. Microsoft describes it as an encoder-decoder Transformer for printed and handwritten text recognition, but a generic handwritten checkpoint should still be treated as a starting point that may require fine-tuning on the user’s document style [3] [4]. A local Qwen-VL-class model is better considered a contextual verifier or difficult-region specialist than an unconditional transcription authority; it must be instructed not to infer characters that are not visibly supported [5].

The architecture decision for the discussion phase is therefore a **role-based ensemble**: PP-OCR for fast printed text, PaddleOCR-VL for layout and complex document parsing, a handwriting-specialist recognizer for handwriting regions, and a local VLM verifier only for disagreement or low-confidence regions. The system should preserve uncertainty instead of silently selecting a plausible hallucination.

### Sources

[1]: [PaddleOCR-VL official model card](https://huggingface.co/PaddlePaddle/PaddleOCR-VL)
[2]: [PaddleOCR-VL 1.5 paper](https://arxiv.org/abs/2601.21957)
[3]: [Microsoft TrOCR research page](https://www.microsoft.com/en-us/research/publication/trocr-transformer-based-optical-character-recognition-with-pre-trained-models/)
[4]: [Microsoft TrOCR handwritten checkpoint](https://huggingface.co/microsoft/trocr-base-handwritten)
[5]: [Qwen3-VL official announcement](https://qwen.ai/blog?id=99f0335c4ad9ff6153e517418d48535ab6d8afef)

## 20. Offline OCR purge assessment — no deletion approved yet

The offline OCR footprint is currently concentrated in `tesseract.js` and `client/src/lib/OcrEngine.ts`. `Workspace.tsx` imports `recognizeImage` and `releaseWorker`, sends every cloud failure or missing provider key into that local path, and retains raw image/PDF pixels specifically so local recognition can avoid the purified display payload. The cancellation contract also aborts and releases the local worker. The scanner UI itself does not need Tesseract to render, but the current no-key and cloud-failure behavior does.

Removing the local engine immediately would therefore not be a harmless dependency cleanup. It would change the promise that scans do not dead-end when a user has no API key or when a provider request fails. A naive deletion would require either a new visible error state, a silent empty result, or a cloud-only contract; each would be a behavioral change even if the scanner markup remained untouched.

The safe recommendation is to **defer the purge until the cloud-only contract is explicitly approved**. The future removal boundary is clear: delete the `tesseract.js` dependency, `OcrEngine.ts`, worker-release calls, local raw-source preparation that exists only for fallback OCR, fallback log strings, and the no-key/cloud-error route. Before doing so, the app must define what happens with no configured provider and with a failed or aborted provider request. No production source was deleted during this assessment.

## 21. Notepads repository audit — initial verified observations

The audit clone is read-only at `/tmp/notepads-audit`, obtained from `0x7c13/Notepads` at shallow commit `6ec270c` (`ci: fix CI pipeline and bump action dependencies (#1496)`). The repository is a Windows-native application organized around `src/Notepads.sln`, a primary `src/Notepads` project, a `Notepads.Controls` project, a `Notepads.Core` project, and supporting test or tooling areas. The repository overview identifies the product as a lightweight Windows 10 notepad replacement, not a web application.

The root `LICENSE.txt` is the MIT License, copyright Jackie (Jiaqi) Liu, 2019–2024. It permits use, copying, modification, publication, distribution, sublicensing, and sale, provided the copyright and permission notices are retained in copies or substantial portions. It includes the standard “AS IS” warranty disclaimer and liability limitation. This is generally compatible with recreating behavior or adapting source portions, but any direct source, icon, asset, or substantial code reuse must preserve the notice and must be checked against each dependency’s separate license. The MIT license does not grant Microsoft trademarks, Windows design ownership, or third-party asset rights.

The README’s explicitly documented product features are a Fluent-style interface with built-in tab sets, lightweight startup and editing, command-line/file-path launch, multiline handwriting support, Markdown live preview, a side-by-side diff viewer, session snapshots, and multi-instance behavior. It also documents keyboard shortcuts for new tabs, tab switching, numeric tab selection, font zoom/reset, LTR/RTL flow, Markdown preview, and diff preview. The author describes the intent as modern, minimalist, fast, and less heavy than large general-purpose editors.

The first two reference screenshots show a compact, edge-to-edge editor shell rather than a conventional centered card. Screenshot 1 uses a dark surface, a hamburger/menu affordance at the far left, a horizontal tab strip, a visible new-tab affordance, compact window controls, an inline find/replace overlay, a bottom status bar, and a native-looking context menu with editing, reading-order, wrapping, search, preview, and sharing commands. Screenshot 2 shows the Markdown editor and rendered preview as a split view with a vertical divider, preserving the tab strip and bottom status bar while allowing the document and rendered result to occupy separate panes.

Screenshot 3 confirms that the diff viewer is a true two-pane comparison: the panes are labeled “Before your changes” and “After your changes,” share the same document scale and vertical rhythm, and use strong inline background colors to distinguish deletions/changes from additions. Screenshot 4 shows the same shell in a light theme with a right-side personalization/settings pane. The settings expose theme mode, acrylic/background tint opacity, and accent color controls, while the editor remains visible rather than navigating away to a separate page. The visual evidence supports treating shell structure, tab state, editor viewport, status metadata, and auxiliary panels as separate composable regions.

The main project targets UWP (`TargetPlatformIdentifier` `UAP`) with a minimum Windows platform version of `10.0.17763.0` and a current target of `10.0.22621.0`. Its project metadata uses `AppContainerExe`, appx packaging, x86/x64/ARM64 bundles, and a project reference to `Notepads.Controls`. The dependency boundary includes DiffPlex, Microsoft’s Universal Windows platform package, Windows Community Toolkit, XAML Behaviors, UTF.Unknown, JSON libraries, and Microsoft Store engagement. The controls project itself targets UWP and contains reusable WinUI/XAML controls such as `DropShadowPanel`, `GridSplitter`, `InAppNotification`, and a custom Markdown renderer. This confirms that the product’s behavior is separable, but its concrete composition is tightly coupled to Windows XAML and UWP.

The application startup handles normal launch, file activation, protocol activation, and command-line activation through UWP lifecycle events. It initializes theme/settings services, supports multiple instances through a named mutex, extends the view into the title bar, and flushes clipboard state on suspension. These are product behaviors that can be approximated on the web through URL/deep-link routing, file input/drop handling, browser persistence, and visibility-aware autosave, but the UWP activation and window APIs have no 1:1 browser equivalent.

The `SessionManager` serializes a versioned session document, selected tab identity, and horizontal tab-strip offset. Each tab’s `TextEditorStateMetaData` records file placeholder/name, saved encoding and line ending, modification state, selection start/end, word wrap, font zoom factor, horizontal/vertical scroll offsets, Markdown preview visibility, and diff-preview mode. It also stores backup paths and Windows FutureAccessList tokens for reopening files. The state fields are directly portable to RoyScript’s local persistence model; backup folders, OS access tokens, and real-file recovery are platform-specific and should be replaced with browser-safe storage and explicit file handles.

The editor command layer registers find, replace, go-to, Markdown preview, diff preview, next/previous search, and Escape behavior. Find/replace supports case sensitivity, whole-word matching, regular expressions, forward/backward traversal, single replacement, and replace-all. The editor can restore wrap mode, zoom-derived font size, selection, and scroll offsets, and can open a resizable content-preview split or a read-only side-by-side diff against the last saved snapshot. These are strong React/Lexical candidates because the underlying concepts are document state, commands, selection, panes, and derived views rather than UWP APIs.

The status bar is intentionally interactive rather than decorative: it exposes the file path, modification state, line/column selection, zoom, line ending, and encoding. Path and modification indicators open contextual actions such as reload, copy full path, open containing folder, rename, preview changes, and revert. Notepads also has OS-backed MRU and Jump List services; those services should be classified as Windows-only implementations, while a RoyScript equivalent could provide browser-local recent documents and app-internal commands without claiming identical shell integration.

The completed read-only synthesis is available in `notepads-audit-report.md`. It records the audited commit, MIT-style license obligations, source-backed architecture and interaction findings, screenshot-derived design patterns, React/Lexical portability mapping, Windows-native compatibility limits, implementation risks, and a proposed priority order. No RoyScript application code was changed during the audit.

## Categorized Settings panel implementation — initial verification

The approved Settings implementation adds six semantic categories—Appearance, Keyboard, Practice, Ambient Focus, Performance, and Scanner—using Lucide glyphs and concise descriptions while retaining the existing controls, nested views, persistence setters, reset behavior, and scanner provider settings. Category selection filters the existing sections in place rather than rewriting their internal control markup.

The live desktop visual probe at 1280×720 shows the right-side drawer with the category index above the selected Appearance controls. The selected category uses the existing accent color, inactive categories remain neutral, and the category cards fit within the established drawer without changing unrelated workspace chrome. A focused browser probe passed for all six categories, the Themes nested view, dialog focus, Escape behavior, and zero browser errors.

The same probe passed at 375×812, confirming that the existing drawer max-width and the two-column category index remain usable on a narrow viewport. The implementation adds dialog semantics, initial panel focus, and visible keyboard focus rings for category buttons. No scanner, editor, extraction, persistence, or unrelated application behavior was changed in this pass.

## Practice Text cancellation and typing-surface theme inspection

The Practice Text cancellation implementation now mirrors the scanner’s cooperative-stop model without changing the typing surface. The Generate action transitions to an enabled red Cancel button with an X glyph; cancellation propagates through the initial provider request, expansion retry, and continuation pass via `AbortSignal`. The desktop and mobile no-credit cancellation probe passed: one request was issued, one abort was observed, the modal recovered to Generate, input values remained unchanged, no stale text committed, and no unexpected browser errors were recorded.

The requested read-only inspection of `TypingScreen.tsx` found that the normal practice text root is explicitly neutral (`text-neutral-800 dark:text-neutral-200`), pending characters use a neutral fallback variable, and the typed text does not consume the practice accent. The accent is intentionally used for the hardware cursor, countdown, and limited header hover affordances. The strict-rule overlay’s warning icon is explicitly `text-red-500`; its heading, body, and actions remain neutral. No changes were made to this dangerous surface. If a theme still tints every character in the live app, the remaining source is likely an adjacent DOM-applied style or keyboard/theme layer rather than `TypingScreen`’s normal text classes.

The misleading “Checking...” stage was removed from the Practice Text user flow and replaced with creation-only wording. The live smoothness harness still recorded one 67.8 ms first-frame sample against its strict 50 ms threshold, so first-frame smoothness remains an open verification item rather than being claimed complete.

## Practice Text neutral-color implementation and comprehensive live QA — verified

The scoped implementation now sets `--typing-text-correct` and `--typing-text-pending` to `currentColor` on the Practice typing root, while keeping `--typing-accent` unchanged for the keyboard and cursor and setting `--typing-text-error` to the standard `#ef4444`. This is intentionally limited to the typing-surface color tokens; provider routing, generation enforcement, cancellation, scanner behavior, editor behavior, and Settings behavior were not changed.

The corrected theme matrix found the actual `StaticWords` character markup instead of assuming obsolete `typing-char-*` IDs. It exercised **192 themes × 2 viewports = 384 cases**, all passing. Every case found a mounted pending character whose rendered color matched the neutral typing root, a `currentColor` pending token, a standard-red error token, and a non-empty accent token for the keyboard/cursor. No application browser errors were recorded. The matrix uses a fresh browser context per viewport so persisted desktop state cannot contaminate mobile entry coverage.

The final Practice live checks also passed on desktop and mobile: the deterministic generation probe passed; cancellation observed abort propagation, Generate recovery, and no stale text commit; the smoothness probe measured **49 ms desktop** and **48 ms mobile** click-to-first-loading-frame latency and confirmed the scoped spinner animation; and the heavyweight no-credit matrix passed **14 subjects, 121 topic cases, 166 cases per viewport, and 166 mocked provider requests per viewport** with zero ignored-warning anomalies. Settings category, nested-spacing, rapid-switch, non-Settings modal, TypeScript, production-build, and screenshot checks also passed.

The earlier 67.8 ms headless sample is retained as historical variance, not erased. The latest measured samples meet the strict 50 ms probe threshold, but timing remains environment-dependent. The heavyweight and theme matrices are no-credit/browser-mock evidence; the earlier real-provider 503 recovery record in `practice-ai-live-qa.md` remains separate and no additional provider calls were made during this final pass.
