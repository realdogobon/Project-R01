# URL Import Investigation — In Progress

## Supplied Scribd case

The user supplied `https://www.scribd.com/document/742163601/Progressive-March-2024` after the scanner’s current browser-only URL import appeared to do nothing.

Browser inspection on 2026-08-15 established that this address is a **Scribd document viewer page**, not a direct PDF response. The visible page advertises 40 pages and renders preview images, but its visible Download action opens a dialog offering a 30-day trial. No direct downloadable document file was exposed by the unauthenticated public page.

The original browser-only importer used a browser fetch and expected a directly accessible document/text response. The implemented protected server importer broadens support for legitimate, anonymously public documents, but it still cannot turn this viewer HTML into the original 40-page file and must not bypass Scribd’s trial, login, payment, or publisher restrictions. Direct document responses and legitimate public Google Docs/Drive export or download routes are the supported boundary; hosted viewers, login- or payment-gated pages, and publisher-protected sources remain silent unavailable cases.

## Browser-origin fetch evidence

From the deployed RoyScript preview origin, a direct browser fetch of the supplied Scribd URL failed with `TypeError: Failed to fetch`. The page is therefore blocked from the client-side importer before the importer can receive its viewer HTML, inspect its preview images, or create a scanner document.

Three representative public URLs were then tested from that same origin:

| URL category | Representative result | Current browser-only importer outcome |
|---|---|---|
| Direct Markdown file served by `raw.githubusercontent.com` | HTTP 200, `text/plain`, 4,743 bytes | Works: the browser can read it and the scanner can import it as text. |
| Direct W3C PDF | Browser fetch failed | Does not work in the client-only importer because the host does not grant cross-origin read access. |
| Ordinary HTML page at `example.com` | Browser fetch failed | Does not work for the same cross-origin reason. |
| Scribd viewer page | Browser fetch failed; visible Download action requires a trial | Does not work. It is both cross-origin blocked and access-controlled. |

This demonstrates the central constraint: browser-only URL import is **not a general internet downloader**. A link must expose a directly readable response to the app’s origin and must be within the scanner size/type contract. A separate server-side import service can broaden public direct-download coverage, but it still cannot lawfully or technically treat login-, payment-, DRM-, or publisher-restricted viewer pages as freely downloadable files.

## User-supplied Google-hosted matrix — first observations

The supplied Google Docs editor link opens the document title **“Legal Exercise No. 1 to 100.docx”** and renders its document surface in a logged-out browser. It is therefore publicly viewable at least through the viewer. The visible interface still offers **“Request access”** and **“Sign in”**, so public viewing alone must not be treated as a promise that anonymous document export is permitted; the future importer must test Google’s legitimate export response rather than assume it.

The supplied legacy `docs.google.com/file/.../preview` link resolves to a Google Drive PDF viewer titled **“SSC CGL LAST 7 YEARS QUESTIONS PAPERS.pdf”** and exposes a rendered-preview image endpoint. This indicates anonymous preview availability, but a preview endpoint is not automatically the original PDF download. The server-side importer should normalize its file ID plus resource key to Google Drive’s documented download route and accept it only if Drive returns an allowed document response within the scanner limit.

The supplied Testbook link is a true direct public PDF: Chromium rendered a 63-page PDF document with thumbnail navigation. It is the expected baseline case for the public-link importer, provided its server response remains within the scanner’s 20 MB visual-document ceiling.

The supplied `drive.google.com/file/.../edit` link renders the titled PDF **“Basic GK General Knowledge Questions and Answers in English Quiz - 3.pdf”** in a logged-out Drive viewer and exposes a visible **Download** action. This is a strong candidate for the legitimate normalized Drive download route. As with every Drive link, the importer should request Drive’s download representation and accept it only when the service returns an allowed response without authentication, confirmation, or permission prompts.

### Current four-link classification

| Supplied link | Observed access state | Intended importer path |
|---|---|---|
| Google Docs document editor | Anonymous viewer opens; anonymous export still needs proof | Normalize document ID to a legitimate `export` request and accept only an allowed result. |
| Legacy Google file preview with resource key | Anonymous Drive PDF preview | Normalize ID and resource key to Drive download; validate final response. |
| Testbook PDF | Public 63-page direct PDF | Fetch through the guarded generic public-document path. |
| Google Drive file editor | Anonymous Drive PDF viewer with Download action | Normalize ID to Drive download; validate final response. |

## Server-side direct-PDF verification

The supplied Testbook URL returned an openly accessible `application/pdf` response with a reported length of **4,001,888 bytes**. The first server-backed UI trial exposed a Node 22 address-family callback incompatibility: Node requested `lookup(..., { all: true })`, while the SSRF-safe resolver returned the legacy scalar callback shape, producing `ERR_INVALID_IP_ADDRESS` and an unavailable result. The importer now returns the one already-vetted public address in the callback shape Node requests. The focused server probe then imported the Testbook source successfully as a 4,001,888-byte PDF through the protected route. This confirms that the source is public and that the earlier no-op was an importer defect, not a Testbook access restriction.

## Supplied link matrix — protected importer results

The server-side importer was exercised against the four supplied URLs after normalizing public Google-hosted document routes. Results are intentionally limited to public, legitimate document retrieval; no credentials, subscription bypass, or private-content access was used.

| Link | Protected-import result | Interpretation |
|---|---|---|
| Google Docs editor — `1wqfTP7p8yMDjfadbqgMcEF-MSD0KTL2F` | **Imported** as `application/pdf` via Google Docs’ official public `export?format=pdf` route | The document is openly exportable and can reach the scanner exactly like a local PDF. |
| Legacy Google file preview — `0B09iKyui00ineDhuR256Wmt6R0k` | **Rejected as unavailable** | The preview link does not yield an anonymously importable document through the legitimate download route, so the scanner leaves its empty state unchanged. |
| Testbook direct PDF | **Imported** as `application/pdf` | The public direct PDF is compatible with the server route and scanner ingestion contract. |
| Google Drive file editor — `1EHosDVqY7FyBXy9V1ZlBVhmIDwmXXCEN` | **Imported** as a PDF after verified binary-signature recognition | Drive returned a legitimate public PDF download with a nonstandard response filename/type; the importer accepts it only after confirming the PDF signature and preserving the usual size cap. |

The public Testbook PDF initially failed only because Node 22 requested address-family selection using `lookup({ all: true })`; the importer was corrected to return its previously DNS-vetted address in Node’s expected array form. The direct public PDF then imported successfully through the safe network path.

## End-to-end browser verification

The final browser investigation identified that the actual server-to-scanner handoff was already operating correctly. `Workspace.tsx` narrows the successful tRPC result, decodes the returned base64 payload into a `File`, and routes that file through the same `processUploadedFile()` path used by local uploads. The prior probe incorrectly treated the later `Send extracted text` action as proof that a document had loaded. That control appears only after OCR, not after a PDF preview has loaded.

The browser harness now waits for the scanner stage to contain its rendered PDF/image preview and records the tRPC response status. It verified the following full UI outcomes using the local full-stack preview: the Testbook direct PDF imported and rendered as a 63-page scanner document; the supplied Google Docs editor link imported and rendered through the public PDF export route; and the supplied Drive editor link imported and rendered as a four-page scanner document. Each received HTTP 200 from `scanner.importPublicLink`, produced a visible scanner preview, and had no browser errors. The legacy Google preview received HTTP 200 at the RPC transport level but returned the importer’s `ok: false` outcome, left the scanner empty, and produced no browser error or visible error card, preserving the requested silent-failure behavior.

## Google Drive binary download verification

The final protected-import test of the supplied Drive editor link resolved to Drive’s legitimate anonymous download representation and returned a real PDF payload. Google’s response did not consistently identify the content with an accepted filename or MIME header, so the importer now performs a strict, bounded signature check after the normal public-host, redirect, DNS, and size protections have already passed. The verified `%PDF-` signature permits the file to enter the scanner as a PDF; HTML viewer, permission, login, confirmation, and unsupported binary responses remain rejected. No document bytes are retained in this investigation record.
