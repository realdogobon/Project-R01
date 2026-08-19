# Task View long-document stress validation

## Scope

This validation targets the reported Task View overflow where a tab’s first typed line could visually escape its row and make the palette resemble a document renderer instead of a compact tab selector.

## Fixture

The agent browser’s RoyScript origin storage was cleared before testing. A normal Workspace persistence snapshot then restored **10 independent tabs**, each with a distinct **1,000-word single first line** (`Stress document 01` through `Stress document 10`). This is the worst-case input for automatic title derivation because the derived title originates from a single exceptionally long line.

## Verified live results

| Check | Result |
|---|---|
| Compact title rows | All ten Task View rows rendered as bounded, single-line previews with ellipses; no title or subtitle painted outside its row. |
| Dense-list reachability | The list scrolled to the tenth tab without overlapping the fixed footer. |
| Search semantics | Searching `Stress document 10` returned the tenth tab even though its visual display was clipped, confirming full-title matching is retained. |
| Keyboard activation | The filtered item opened with Enter; a separate ArrowDown + Enter route opened a different long-document tab (`Stress document 02`). |
| Full document preservation | Opening the tenth and second tabs rendered their full 1,000-word editor content, confirming clipping is display-only rather than destructive. |
| Alternate-theme parity | The dense ten-row palette remained contained, readable, and scrollable after switching to dark mode; the original light theme was restored after the check. |
| Dirty-close protection | A dirty long-document close attempt displayed the existing confirmation instead of silently closing content. |
| Escape containment | After repair, Escape dismissed that confirmation only; it did not leak to the global Settings shortcut and left Task View open as expected. |
| Browser health | No Task View runtime error occurred during the dense fixture; only pre-existing informational and browser layout warnings remained. |

## Static validation

The final post-repair run completed successfully: **43 / 43 Vitest tests** across 9 files, TypeScript without errors, and a production build. The build retains the pre-existing pdfjs import/chunk-size warnings only.

## Clean reset and restart

After the stress pass, the agent browser’s RoyScript origin was cleared: **7 local-storage keys**, **1 cache entry**, all session state, local cookies, and available IndexedDB records were removed. The managed development service was then restarted. A fresh local load restored the expected clean baseline of **one empty tab**, `Start typing…`, and zero characters/words.
