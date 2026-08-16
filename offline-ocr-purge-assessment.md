# Offline OCR Purge Assessment

**Status:** Closed — retain the current offline fallback unchanged

## Current contract

The installed offline OCR path consists of one runtime dependency, `tesseract.js`, one browser-only module, `client/src/lib/OcrEngine.ts`, and two imports in `Workspace.tsx`: `recognizeImage` and `releaseWorker`. The engine lazily creates a Tesseract worker, transcribes the raw JPEG crop, races that work against the scanner abort signal, and terminates the worker when Scan-to-Stop is triggered.

The scanner currently attempts cloud OCR only when the selected provider has a saved key. If a cloud request fails, or if no key exists, `recognizeOneImage` falls back to the local engine. The existing Settings copy promises **online document scanning** for configured keys; the model selector is unavailable when no provider key exists. However, the visible Scan action itself is currently enabled whenever a document or clip is available, regardless of whether a cloud key is configured.

| Scenario | Current behavior | Effect of an unguarded local-OCR deletion |
|---|---|---|
| Configured provider succeeds | Cloud OCR; normal Send handoff | Safe, subject to normal provider behavior |
| Configured provider fails | Falls back locally | Scan would complete silently with no text unless a cloud-only failure state is introduced |
| No configured provider | Falls back locally | Scan would begin despite no viable OCR route; this is a dead end |
| Stop during preflight | Cancels before either OCR route begins | Remains safe |
| Stop during active local OCR | Aborts recognition and releases worker | Worker-specific cleanup becomes unnecessary; cloud abort remains intact |
| Workspace and Practice handoff | Receives the accumulated OCR text | Unchanged after a successful cloud result |

## Recommendation

Do **not** perform a literal delete-only purge. It would break the no-key path and turn a temporary cloud outage into a silent empty result, conflicting with the app’s silent-failure preference and current scanner behavior.

The safe cloud-only option is to establish an explicit **cloud-only gate** before deletion. When no provider key is available, Scan must not start. When a configured provider fails, the current run should settle cleanly without local fallback, preserving the document and queue. This requires a small scanner-state contract change but no new visible error card or red error message.

## Exact approved-scope deletion, if cloud-only is confirmed

1. Delete `client/src/lib/OcrEngine.ts`.
2. Remove `tesseract.js` from `package.json` and the lockfile.
3. Remove `recognizeImage` and `releaseWorker` imports and all local-worker cleanup from `Workspace.tsx`.
4. Replace the current cloud-then-local branch in `recognizeOneImage` with a cloud-only branch that preserves abort normalization and does not add user-facing error copy.
5. Gate Scan on a configured key in the scanner modal, while preserving the existing no-document guard, Scan-to-Stop preflight, queue preservation, crop workflow, and Workspace/Practice delivery.
6. Update the focused cancellation and scanner contracts to assert zero Tesseract imports, no provider call during preflight cancellation, disabled no-key Scan, and normal cloud success handoff.

## Explicit non-goals

This proposal does not change the scanner upload UI, URL import, crop geometry, PDF behavior, provider-key storage, Practice Mode, Settings navigation, or the app’s silent failure policy. It also does not begin the separate “god-level local OCR” architecture investigation listed in `todo.md`.

## Recorded decision

The user chose **Option A**: retain the current local fallback with no code or behavior changes. The cloud-only deletion proposal is closed. The broader “god-level local OCR” program remains intentionally deferred to a future dedicated project, where it can be researched and engineered against the quality, hardware, and anti-hallucination criteria already tracked in `todo.md`.
