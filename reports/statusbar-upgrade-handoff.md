# RoyScript Status-Bar Upgrade — Manual Review Handoff

**Status:** Implemented and verified in a clean browser session. **No Git commit and no project checkpoint have been created.**

## What changed

RoyScript retains its approved **32 px footer**, **Segoe UI 12 px typography**, current left/right layout, compact visual density, and dark/light design language. The upgrade adds functional depth instead of reproducing the Notepads layout.

| Status-bar surface | Implemented browser behavior | Verification outcome |
|---|---|---|
| Dirty marker | Appears only when the active tab differs from its saved baseline. Its `Revert to saved` action reuses the existing confirmation flow and restores both saved text and saved format policy. | Modified tab, confirmation, discard/revert, and baseline restoration verified live. |
| Indentation | Per-tab `Spaces` / `Tabs` policy with 2, 4, and 8-space widths. The editor now inserts a literal tab in Tabs mode or the selected number of spaces in Spaces mode. | Live Tab-key insertion measured as +1 character in Tabs mode and +4 in four-space mode. |
| Caret position | `Ln / Col` is derived from the true Lexical caret location, using a canonical top-level-block coordinate model. The cell opens a Go To popover. | Multi-line regression corrected: line 2, column 3 now lands precisely at `Ln 2, Col 3`. |
| Selection information | Selected-character state is tracked independently from total document character and word counts. | Focused status contract covers bounded selection-count semantics; live selected-text flow was exercised with Go To. |
| Zoom | Anchored flyout with a 20%–300% slider, minus/plus 10% commands, and Reset to 100%. | Verified live at 110%, 300%, 20%, and after reset. |
| Line endings | Per-tab Windows CRLF, Unix LF, and Mac CR selector. The active policy is used for supported plain-text serialization rather than altering live rich text. | Unix selection, tab isolation, Task View restore, and browser-reload persistence verified live. |
| Encoding | Per-tab UTF-8, UTF-8 with BOM, UTF-16 LE, and UTF-16 BE selector. Supported encoding byte serialization is coupled to text-file save paths. | UTF-16 BE selector and round-trip serializer contracts verified. |
| Status-bar visibility | Existing `View → Status Bar` preference remains the single visibility authority. | Footer hide and restore verified live after interactive controls were added. |
| Protected exam workflow | Completed-exam Just Look remains sealed; a new tab created from sealed review is fully editable. | Active exam, Times Up, Just Look, fresh tab, and subsequent typing verified live. |

## Clean-browser verification

>The sandbox browser was cleared before testing: RoyScript-origin local storage, Cache Storage, IndexedDB, and browser-state remnants were removed. The app was then reloaded from a blank workspace before the implementation matrix began.

The final validation command passed without TypeScript or test failures:

```text
pnpm exec tsc --noEmit
pnpm test                 → 23 passing assertions across 6 files
pnpm build                → completed successfully
```

The dedicated `server/statusbarUpgrade.test.ts` suite contains five focused contracts for caret position across newline formats, selection counts, selected encoding and line-ending serialization, real compact-footer control wiring, and dirty-state reversion with saved-format restoration. The detailed live-browser evidence is maintained in `reports/statusbar-upgrade-clean-baseline.md`.

The browser console showed no runtime errors during the final matrix. Chrome continues to emit its pre-existing advisory warning about `contenteditable` inside a flex container; this is not a user-facing error and was not introduced by this work.

## Honest browser versus desktop boundary

The current browser app now owns all testable status-bar state above. It deliberately does **not** imitate unavailable OS features. External disk-change detection, generic reload-from-disk, absolute file paths, copy/open-containing-folder, rename, shadow windows, and legacy ANSI/code-page saving remain desktop-shell work for Electron/Tauri. The new per-tab status model and explicit browser serialization policy are designed so those future adapters can power the same visible cells without a status-bar redesign.

## Manual review checklist

Please review the live preview in both themes. In one ordinary tab, test the indentation menu, multi-line caret movement, selected text, Go To, Zoom, line-ending, encoding, dirty-state Revert, and Task View switching. Then confirm the View-menu visibility toggle and run a short exam: choose Just Look, create a new tab, type in it, then return to the sealed exam tab. No commit or checkpoint will occur until you approve this live behavior.
