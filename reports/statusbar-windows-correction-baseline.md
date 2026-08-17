# Status-Bar Windows-Style Correction Baseline

**Captured:** 2026-08-17

## Clean local-build observation

The local RoyScript workspace was opened at `http://127.0.0.1:3000/?statusbar-windows-correction-baseline=1` before the correction. The visible footer contained a separate unsaved blue-dot trigger, `Spaces: 4`, `Ln 1, Col 1`, `Chars 24, Words 3`, `Zoom 100%`, `Windows (CRLF)`, and `UTF-8`.

This confirms the user-reported density issue: the primary footer presents an indentation configuration control and an isolated dirty-state dot before the cursor position, rather than the requested clean Windows-style readout. The current implementation also applies `font-size: ${editorZoom}rem` to the outer editor wrapper, which is insufficiently reliable for the actual content surface and explains the reported percentage/display mismatch at large zoom values.

The correction will retain browser-safe functionality, but move indentation configuration out of the primary footer, consolidate saved/dirty behavior into a compact native-style document-state cell, and apply zoom directly to the editor content surface with a scroll-safe transform contract.
