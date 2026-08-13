# Volume_02.pdf Investigation

## Initial live reproduction

- File: `Volume_02.pdf`
- PDF metadata: 51 pages, 3,013,625 bytes, PDF 1.4, unencrypted, page size `538.581 × 660.69 pt`.
- Fresh live-browser baseline: the existing scanner probe completed all nine checks with zero browser errors.
- The live counter reported `1/51` on the cover and `2/51` after navigation.
- Page-one surface measured `528 × 648`; page-two spread measured `864 × 549`.
- Zoom, cursor-anchored zoom, max scroll, transformed crop, and page-two crop all passed.

## Current code path under investigation

- PDF.js loads the selected file with `getDocument({ data: arrayBuffer })`.
- Each requested page is rendered at scale `1.5` into a fresh canvas, then passed through `ScannerEngine.purifyCanvas` and converted to JPEG data URLs.
- Single-page and spread previews are committed only after the current render token is still valid.
- `page.cleanup()` runs in each page-render `finally` block.

## Open verification question

The supplied file does not reproduce the reported blank state under the current baseline probe. A stronger live test is still required that checks actual image paint, cycles pages repeatedly, and exercises close/reopen and rapid navigation transitions before deciding whether a code change is justified.

## Stronger live evidence

The pixel-aware stress harness reproduced the failure on the first preview. The scanner image was complete at `807 × 991`, but its sampled pixels were effectively white (`nonWhiteRatio: 0`, luminance range approximately `255–255`). Page `2/51` became non-white after navigation, but the stress run then timed out while waiting for the next target. This means the earlier geometry-only probe was insufficient: it confirmed dimensions and state counters while missing content loss.

As an independent source check, rasterizing pages one through three with Poppler produced visibly populated pages, including dense handwriting and printed text on page one. Therefore the first-page blank result is introduced inside the browser pipeline, not caused by an inherently blank first page in `Volume_02.pdf`.

The instrumented browser trace narrowed the fault further. Even after bypassing OpenCV for PDF previews and deferring `page.cleanup()` until after `toDataURL()`, the first page’s canvas trace remained all white at `807 × 991`. The later spread canvases also showed white source traces in the harness while their visible stitched image contained sparse dark pixels, so the app’s page-state transition remains coupled to a separate image conversion path. The blank first-page canvas is therefore not caused solely by the OpenCV preview transform or cleanup timing.

The next diagnostic should capture PDF.js’s render-task and canvas state immediately after `page.render(...).promise`, before React state updates, and compare it with an isolated PDF.js render of the same file in the browser. If the isolated render is populated while the app canvas is white, the remaining fault is in the app’s page acquisition/render scheduling; if both are white, the browser PDF.js worker/resource path is the failing boundary.

External PDF.js issue evidence is consistent with this boundary: Mozilla has tracked blank renders involving `/CCITTFaxDecode` image streams and notes that image allocation/decoding is the underlying failure class. The current Volume_02 pages are CCITT 1-bit grayscale images. PDF.js usage guidance for difficult image PDFs also supports explicitly disabling the browser image decoder. The next controlled fix is therefore to load PDFs with `isImageDecoderSupported: false`, then repeat the same raw-canvas and navigation probes before retaining or reverting the change.

## Verified fix and final live evidence

The failure was tied to the newer PDF.js browser build’s handling of this CCITT-scanned PDF class. The scanner now uses the PDF.js `5.4.149` legacy browser build with its processed worker URL, disables the browser `ImageDecoder` path for PDF loading, retains WASM decoding, and keeps raw PDF.js-rendered pixels as the scanner preview source. OpenCV purification remains in the crop/scan extraction path rather than being applied to the document preview.

The supplied file was then tested in a fresh live browser session. `Volume_02.pdf` contains 51 pages, so the final valid book state is `50/51`; there is intentionally no standalone `51/51` state. The final stress matrix passed with zero browser errors, three sessions (`initial-open`, `after-close`, and `reopen`), 23 valid transitions, and populated pixels for every completed session and transition. The initial page measured a non-white pixel ratio of approximately `0.651`, and page navigation reached the final `50/51` spread and returned to `1/51` successfully.

The known-good image and four-page PDF regression also passed all nine checks: image load, 200% zoom, cursor-anchored zoom, anchor precision, maximum scroll, transformed crop, PDF page one, PDF page two, and page-two crop, with zero browser errors. Temporary browser diagnostics were removed from production code before the final pass. The remaining timeout seen earlier was a test-harness assumption requesting the invalid `51/51` counter, not a rendering failure.
