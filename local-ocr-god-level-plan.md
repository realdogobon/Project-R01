# RoyScript TSR — God-Level Local OCR Plan

## Executive position

The goal is not to make Tesseract slightly less bad. The goal is to build a **local document-understanding system** that can outperform cloud OCR on RoyScript’s target document distribution while remaining honest when the pixels do not support a confident transcription.

Tesseract is a useful classical baseline, but it is not a modern document-AI system. It does not provide the combination of layout analysis, handwriting recognition, contextual region understanding, reading-order reconstruction, and uncertainty handling required for difficult PDFs and damaged images. We should keep it as a lightweight fallback and benchmark reference, not treat it as the final quality engine.

The strongest realistic architecture is a **role-based local ensemble** rather than one universal model:

> **Pixel preservation and restoration → layout and text-region detection → specialist recognition → reading-order reconstruction → disagreement resolution → strict local verification → confidence-aware output.**

This can be fully local. It can beat Gemini on the document types we optimize for. It cannot honestly be promised to beat Gemini on every arbitrary image uploaded by every user.

## 1. Recommended model architecture

### Primary document and layout backbone: PaddleOCR-VL

For complex documents, the first model I would evaluate is the latest stable **PaddleOCR-VL** release. The official materials describe a compact document-parsing vision-language model; the PaddleOCR-VL 1.5 paper reports an approximately **0.9B-parameter** model and strong OmniDocBench results, but those are published benchmark figures rather than RoyScript guarantees [1] [2].

PaddleOCR-VL should not be asked to do every job blindly. Its role is to understand document structure: paragraphs, columns, tables, formulas, charts, irregular regions, and reading order. It becomes especially valuable when a page is not a single clean block of text.

### Fast printed-text path: PP-OCR detector plus recognizer

For ordinary printed English, use the PP-OCR family as the fast path. It should detect text boxes first and recognize each region separately. This is a much better production shape than passing a whole page into one Tesseract recognition call. It also allows rotation classification, region-specific preprocessing, and independent confidence scoring.

### Handwriting path: TrOCR-style specialist

For handwriting, use a dedicated recognizer rather than expecting a printed-text model to generalize. Microsoft’s `trocr-base-handwritten` checkpoint is approximately **0.33B parameters**, uses an image-Transformer encoder and autoregressive text decoder, and is fine-tuned on IAM handwriting data [3] [4]. Its official model card explicitly scopes the raw checkpoint to **single text-line images**, so it must receive line or region crops after layout detection; it is not a whole-page replacement.

TrOCR is a credible starting point, not the final answer. If users have a recurring handwriting style, the highest-value improvement would be fine-tuning a handwriting specialist on labeled examples from that style. A generic handwriting checkpoint may recognize ordinary cursive reasonably while failing badly on a particular person’s notes, language, pen, spacing, or abbreviations.

### Local vision-language verifier

Use a local Qwen-VL-class or equivalent document-capable vision-language model only for **difficult or disputed regions**, not for every page by default. It can compare candidate transcriptions, inspect context, and identify whether a region is handwriting, print, a table, or an artifact. It must receive a strict instruction to transcribe only visibly supported characters, mark uncertainty, and never replace unreadable text with a plausible word.

The verifier is valuable precisely because it is not treated as an unquestionable oracle. If two recognizers disagree and the verifier cannot see the character, the correct output is an uncertainty marker or a flagged region—not a confident invention.

### Model-role table

| Role | Recommended family | Approximate scale | What it should do | What it should not do |
|---|---|---:|---|---|
| Fast printed OCR | PP-OCR detector/recognizer | Tens to hundreds of MB depending on variants and runtime | Clean English print, rotated text, ordinary page regions | Handwriting, heavy occlusion, full document reasoning |
| Layout/document parsing | PaddleOCR-VL | About 0.9B parameters for the cited 1.5 family | Region types, reading order, tables, complex pages, difficult layout | Be assumed perfect on every handwriting style |
| Handwriting specialist | TrOCR handwritten or a fine-tuned successor | About 0.33B for the cited base checkpoint | Single text-line handwriting crops | Whole-page layout or arbitrary mixed documents |
| Local verifier | Qwen-VL-class document-capable model | Roughly 2B–8B for a practical quantized tier; larger is possible | Resolve disagreement, classify hard regions, flag uncertainty | Freely hallucinate missing characters |
| Lightweight fallback | Tesseract.js | Smallest current option | Offline emergency path and simple clean print | Be the quality path for degraded handwriting or complex layout |

## 2. What the complete pipeline must do

### Preserve pixels before recognition

The pipeline must keep the original transformed pixels separate from display-oriented purification. PDF pages should be rasterized at an adequate resolution, preferably around 300 DPI for ordinary documents and higher for small text when practical. We should avoid lossy recompression and preserve the original color information until preprocessing has decided what is useful.

### Generate controlled variants

One image should produce a small, deliberate set of variants rather than one irreversible black-and-white image. Useful variants include original color, grayscale, contrast-normalized, adaptive threshold, illumination-corrected, denoised, and bleed-through-suppressed versions. Variants should be generated only when the first pass is low-confidence or internally inconsistent so the system does not waste resources on every easy page.

### Detect layout and regions

The system should identify paragraphs, columns, headers, footers, tables, charts, marginal notes, handwriting, and non-text artifacts before recognition. Each region then gets the correct recognizer and preprocessing policy. This is the main structural leap from “OCR a page” to “understand a document.”

### Reconstruct reading order

Recognition output must be ordered geometrically and semantically. A two-column page, a chart with labels, or a page with annotations must not be flattened in arbitrary detector order. Reading order should be a separately tested output with its own quality metric.

### Preserve uncertainty

The output object should retain confidence per region or line, alternate hypotheses where useful, and explicit uncertainty. The system must be allowed to say that a character is unreadable. This is essential for a typing trainer: silently inventing a word is worse than exposing one uncertain character.

## 3. Hardware, storage, and latency tiers

The numbers below are engineering planning ranges, not guarantees. Actual memory depends on precision, model implementation, runtime, image resolution, concurrency, and whether the model is loaded in browser WASM, WebGPU, Python, or a native backend.

| Tier | Hardware assumption | Practical local stack | Disk planning | RAM/VRAM planning | Expected experience |
|---|---|---|---:|---:|---|
| Minimum CPU | 4 modern cores, 8 GB RAM | PP-OCR small + Tesseract fallback | 0.5–2 GB | 4–8 GB RAM | Good clean print; difficult pages slow; no always-on VLM |
| Comfortable laptop | 6–8 cores, 16 GB RAM, integrated GPU | PP-OCR + TrOCR specialist + optional small layout model | 2–6 GB | 8–16 GB RAM | Practical offline OCR; handwriting region path is usable but not instant |
| Recommended discrete GPU | 8 GB VRAM, 16–32 GB RAM | PaddleOCR-VL + PP-OCR + TrOCR + quantized verifier | 6–15 GB | 8 GB VRAM and 16–32 GB RAM | Strongest normal laptop/workstation experience |
| High-end workstation | 12–16+ GB VRAM, 32–64 GB RAM | Larger document VLM, specialists, multi-variant ensemble | 15–40+ GB | 16+ GB VRAM and 32+ GB RAM | Fastest and most capable local quality path |

For model storage, the practical total is not just parameter count. Add tokenizer/dictionary files, detector and classifier weights, ONNX/Paddle/PyTorch runtime, quantization variants, cached compiled kernels, and benchmark fixtures. A serious but compact local installation should plan for **6–15 GB**, with a larger workstation installation potentially using **15–40 GB**.

For memory, a rough rule is that FP16 weights consume about two bytes per parameter before runtime overhead; INT8 is about one byte; INT4 is about half a byte, again before activations and runtime overhead. Therefore a 0.9B model is not “only 0.9 GB” in practice. It may need several additional gigabytes of RAM/VRAM depending on context length and image resolution.

## 4. Browser-only versus local companion service

The current app is a browser-first static project. The browser can run small ONNX/WASM/WebGPU models, but the strongest local architecture should not be forced into browser-only execution. Browser memory limits, worker lifecycle, model caching, WebGPU availability, and mobile browsers make large document VLMs unnecessarily fragile.

The recommended production shape is a **local companion OCR service** on the user’s machine, with the existing browser UI remaining unchanged. The browser sends the cropped or full-page pixels to `localhost`; the local service runs the model ensemble and returns structured text, region boxes, confidence, and uncertainty. If the local service is unavailable, the current browser-local Tesseract fallback remains available. This gives us the quality of a native Python/ONNX/Paddle runtime without redesigning the scanner.

For a fully offline installation, model files should be bundled or installed once with cryptographic hashes. The runtime must never depend on a CDN at recognition time. “Offline” should mean: after installation, no cloud API, model download, telemetry, or external asset request is required for OCR.

## 5. Data and fine-tuning strategy

No architecture can guarantee handwriting superiority without representative labeled data. The benchmark should contain exact transcripts and region metadata for clean print, small text, degraded print, stains, skew, bleed-through, marginal notes, handwriting, tables, and mixed pages.

For an initial model-selection benchmark, a few hundred carefully selected pages or crops are enough to distinguish bad candidates. For a robust production system, plan for roughly **1,000–5,000 labeled pages/crops** across the document distribution. For handwriting, the meaningful unit is often a line image; a useful specialist may require **thousands of labeled lines**, with the amount depending heavily on the number of writers, scripts, and styles.

Synthetic augmentation should simulate coffee stains, shadows, blur, perspective, low contrast, bleed-through, compression, and partial occlusion. Synthetic corruption is useful for robustness, but it must supplement real examples rather than replace them.

The labels should include exact text, region or line boxes, region type, reading order, orientation, quality flags, and uncertainty where a human annotator cannot confidently read the source. The model must not be trained to “correct” a transcription into a more plausible sentence when the image says something else.

## 6. Quality gates that define “better than Gemini”

The claim must be corpus-specific and measurable. We should score Character Error Rate, Word Error Rate, reading-order accuracy, region classification, table/layout fidelity, hallucinated-character rate, uncertainty calibration, latency, peak RAM/VRAM, and end-to-end delivery into Workspace and Practice.

The recommended gates are:

| Gate | Promotion requirement |
|---|---|
| Clean print | Beat the current baseline on character and word accuracy without increasing hallucinations |
| Degraded print | Improve both accuracy and reading order on real stains, skew, bleed-through, and low contrast |
| Handwriting | Beat Tesseract substantially on labeled handwriting lines; show uncertainty rather than fabricated words |
| Layout | Preserve columns, paragraphs, tables, and region order on mixed pages |
| End to end | Deliver exact or uncertainty-aware text into Workspace and Practice with no cloud request |
| Resource | Stay within the chosen hardware tier and an agreed latency budget |
| Regression | Do not break crop pixels, PDF rendering, cancellation, queue preservation, or scanner UI/UX |

The local system is allowed to be better than Gemini on one class and worse on another. The promotion decision should be based on a weighted corpus score and a hard hallucination ceiling, not a single impressive sample.

## 7. Staged implementation roadmap

**Stage 0 — Freeze the contract.** Keep the scanner UI/UX, crop coordinate system, queue semantics, cloud routing, and Scan-to-Stop behavior unchanged. Add only backend interfaces and test fixtures.

**Stage 1 — Build the benchmark.** Expand the existing ground-truth set and record the current Tesseract output. Include clean print, Volume_02 degraded scans, tiny/flat crops, handwriting, and mixed layouts. Establish reproducible scores before adding a new model.

**Stage 2 — Add a local companion runtime.** Start with PP-OCR detection/recognition and structured output. Keep Tesseract as a fallback. Measure actual disk, RAM, VRAM, latency, and offline startup on the user’s hardware.

**Stage 3 — Add layout understanding.** Evaluate PaddleOCR-VL on complex pages and compare region detection, reading order, tables, and mixed content against PP-OCR alone. Promote it only if the measured benefit justifies its resource cost.

**Stage 4 — Add handwriting specialization.** Detect handwriting regions and send line crops to TrOCR or a stronger current specialist. Fine-tune only after collecting representative labels. Never use a generic handwriting checkpoint as proof that arbitrary handwriting is solved.

**Stage 5 — Add disagreement resolution.** Run a local verifier only for low-confidence or conflicting regions. Enforce exact-transcription constraints, expose uncertainty internally, and measure hallucinations separately.

**Stage 6 — Optimize and package offline.** Quantize where accuracy holds, preload or bundle model assets, hash every model, remove runtime network dependencies, and document CPU/GPU tiers. The first-run installer may be large; recognition afterward should be fully offline.

**Stage 7 — Promote by evidence.** A model becomes the default only after it beats the baseline on the benchmark, passes end-to-end Workspace/Practice tests, meets the resource tier, and does not regress scanner behavior. Otherwise it remains an optional experimental backend or is removed.

## Final decision

If we want the highest probability of success, I recommend this exact direction:

> **Local companion service + PP-OCR fast path + PaddleOCR-VL layout/document path + TrOCR-style handwriting specialist + strict local verifier + confidence-aware ensemble output.**

The realistic resource target is **6–15 GB of local model/runtime storage, 16–32 GB system RAM, and ideally 8 GB VRAM** for a strong laptop/workstation experience. A CPU-only tier can still provide excellent printed OCR, but difficult pages and handwriting will be slower. The strongest differentiator will not be the model name alone; it will be **domain-specific labeled data, preprocessing variants, region routing, and a hard no-hallucination policy**.

This is how we can honestly pursue “better than Gemini locally”: not by claiming universal superiority, but by optimizing and proving superiority on the exact materials and failure modes RoyScript users care about.

## References

[1]: [PaddleOCR-VL official model card](https://huggingface.co/PaddlePaddle/PaddleOCR-VL)  
[2]: [PaddleOCR-VL 1.5 paper](https://arxiv.org/abs/2601.21957)  
[3]: [Microsoft TrOCR research page](https://www.microsoft.com/en-us/research/publication/trocr-transformer-based-optical-character-recognition-with-pre-trained-models/)  
[4]: [Microsoft TrOCR handwritten model card](https://huggingface.co/microsoft/trocr-base-handwritten)  
[5]: [PaddleOCR official repository and deployment documentation](https://github.com/PaddlePaddle/PaddleOCR)
