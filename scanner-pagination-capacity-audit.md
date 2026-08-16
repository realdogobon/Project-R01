# Scanner Pagination and Capacity Audit

**Date:** 15 August 2026

## Reproduced terminal-page behavior

The real 51-page `Volume_02.pdf` fixture confirms the reported behavior. Page `1/51` renders as a single sheet. The current normal navigation stops at `50/51`, where the renderer intentionally creates a `50–51` spread. The page-turn control disables its final forward action at that point, so it never reaches a standalone `51/51` state.

The modal and workspace use matching legacy conditions: page 1 and an **even** final page are considered single sheets. An odd final page is therefore always treated as the right side of the preceding spread. This explains both the missing terminal single-sheet state and its residual book gutter/shadow. The correction must make every absolute last page a single sheet, and let normal forward navigation reach that exact page.

## Capacity contract

Local visual document imports and server-backed public visual-document imports are both capped at **20,000,000 bytes**. Text-like documents remain separately limited to **2,000,000 bytes**. The URL importer additionally verifies `Content-Length`, streamed bytes, response body size, public-host eligibility, redirects, file signatures, and supported media types.

The proposed capacity change will raise only the visual-document limit, leaving the lower text cap and all importer safety checks intact. The target will be **50 MB**, rather than 100 MB, until 100 MB PDF loading and rendering can be demonstrated to stay within the scanner’s memory and interaction budget.
