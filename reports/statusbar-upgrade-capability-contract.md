# RoyScript Status-Bar Capability Contract

**Status:** Approved implementation boundary, before application-code changes  
**Design rule:** Preserve RoyScript’s existing 32 px footer, Segoe UI 12 px typography, current left/right grouping, dark-mode palette, and restrained hover language. Add capability depth; do not copy Notepads’ XAML layout.

## Evidence basis

This contract is based on the Notepads source audit in `reports/notepads-statusbar-source-notes.md`, the RoyScript workspace and Lexical source, and a fresh Chromium sandbox check recorded in `reports/statusbar-upgrade-clean-baseline.md`.

| Notepads surface | RoyScript browser implementation now | Browser testability | Desktop adapter boundary |
|---|---|---|---|
| Current line / column | Real live caret metric from Lexical editor-state updates. It will use document-text offsets, not the existing document-wide character count. | Full | Same model can be retained by Electron/Tauri. |
| Selected-character detail | Add an explicit selection readout only for a non-collapsed text selection; hide it when the caret is collapsed. | Full | Same model can be retained. |
| Character and word counts | Retain as live content metrics. Correctly distinguish total characters from selection details. | Full | Same model can be retained. |
| Zoom cell with slider, commands and reset | Add a RoyScript-styled anchored flyout: 20%–300% safe range, 10% increments, continuous slider and reset to 100%. Reuse the current editor zoom state and existing View-menu shortcuts. | Full | Same model can be retained. |
| Line-ending selector | Store a per-tab line-ending policy (`CRLF`, `LF`, or `CR`), normalize text during plain-text serialization, and show the selected value in the footer. The rich-text editing surface remains internally newline-normalized. | Full for state, display, menu, serialization helper and plain-text export; native picker behavior is exercised where browser permissions permit. | Native save/load will use the same policy when bytes are read/written. |
| Encoding selector | Store a per-tab encoding policy. Provide exact browser-safe save choices: UTF-8, UTF-8 with BOM, UTF-16 LE and UTF-16 BE. Decode imported text with `TextDecoder`; preserve the detected/specified policy when possible. | Full for menu state, UTF-8/UTF-16 byte serialization and imported-byte decoding. | Additional legacy code-page save/reopen choices belong in the desktop adapter after byte-level filesystem validation. |
| Indentation presentation | Add a per-tab tab-display width setting that actually applies `tab-size` to the editor surface. Do **not** claim that it changes Lexical rich-text tab-key semantics until that behavior is deliberately implemented and tested. | Full for display width and persistence. | A packaged editor may add text-mode indentation commands through the same state. |
| Dirty / modification indication | Add an actionable dirty marker only when the active tab differs from its recorded saved baseline. Provide a revert command that restores that baseline after the existing unsaved-work confirmation flow. | Full for editor state and baseline revert. | Native change detection can extend it to disk divergence. |
| Reload from disk | No generic browser control: a normal upload fallback has no durable file identity. A permission-backed File System Access handle may be refreshed only when access is available, but it must not be advertised as universal. | Partial / guarded | Implement as a native bridge operation. |
| Full path, copy path, containing folder, rename | Not available from normal browser file input or File System Access handles; only a file name is exposed safely. | Not applicable | Implement through Electron/Tauri bridge APIs. |
| Shadow window / preview indicator | Not meaningful in the current single-window browser workspace. | Not applicable | Add only if packaged shell implements a real preview/shadow window. |
| Go To from line / column cell | Implement a focused RoyScript flyout only after real global text offsets are available. It will move the selection without changing footer layout. | Full for text blocks; rich-node edge cases must be covered by automated tests. | Same model can be retained. |
| Focus restoration | Every footer popover/menu must restore editor focus after a command or dismiss when the active tab is editable. Sealed exam tab rules remain authoritative. | Full | Same model can be retained. |

## Required data model

Each workspace tab will gain a serializable status-format object. Its initial defaults are Windows line endings, UTF-8, four-space tab display width, and an empty saved baseline for new scratch tabs. Loaded files may override the detected encoding and line-ending metadata. The crash-safe workspace snapshot will persist these fields per tab.

The current `DefaultTemplateRef.getSelection()` is not sufficient for a status bar: it returns offsets local to the selected Lexical node. The implementation must expose a document-level `StatusSelection` object from Lexical’s update listener, including the collapsed caret offset, normalized range bounds, selected-character count, and text snapshot used to calculate line and column. This avoids fabricating cursor accuracy in multi-paragraph or formatted content.

## Guardrails

1. No footer operation may bypass sealed-exam restrictions or mutate a sealed tab.
2. Switching tabs must load the selected tab’s format metadata before rendering its footer fields.
3. A line-ending or encoding change alters the selected tab’s serialization policy, not the editor’s visible text or a different tab’s data.
4. Browser-unavailable operations remain hidden or non-actionable; no menu entry may suggest that a full native path, folder, or disk reload was completed when it was not.
5. All failures remain silent at the application surface, as required. Test instrumentation may record an assertion failure outside the product UI.
