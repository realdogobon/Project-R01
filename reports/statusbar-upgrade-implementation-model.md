# RoyScript Status-Bar Implementation Model

**Status:** Approved design handoff to implementation. This document describes the model to be built; it does not itself modify application behavior.

## Interaction model

RoyScript retains its present 32 px, Segoe UI 12 px footer and its existing left/right groups. The passive footer cells become quiet, keyboard-accessible buttons only where a command has a truthful browser implementation. Their trigger labels remain compact, and menus/popovers use the existing borderless, low-contrast workspace language rather than reproducing the Notepads XAML layout.

| Surface | Trigger behavior | State owner | Browser behavior | Sealed-tab behavior |
|---|---|---|---|---|
| Dirty marker | Visible only when the tab content differs from its saved baseline; opens compact menu | Active tab | Revert to saved baseline after existing unsaved confirmation path | Informational only; no mutation action |
| `Ln / Col` | Opens a compact Go To popover | Live Lexical selection status | Jump to a one-based line and column by calculating a global plain-text offset, then restore editor focus | No open/mutation |
| Selection info | Passive readout while range is non-collapsed | Live Lexical selection status | Shows selected character count; no detached menu | Passive only |
| Character / word count | Passive readout | Current content state | Retains current metrics | Passive only |
| Zoom | Button opens anchored popover | Workspace zoom state | 20%–300%, slider, −10%, +10%, and Reset to 100%; returns focus after command/dismissal | No zoom mutation |
| Tab display width | Button opens compact radio menu | Per-tab format metadata | 2, 4, or 8-space visual `tab-size` only | Informational only |
| Line ending | Button opens radio menu | Per-tab format metadata | Windows (CRLF), Unix (LF), Mac (CR); affects plain-text serialization only | Informational only |
| Encoding | Button opens radio menu | Per-tab format metadata | UTF-8, UTF-8 with BOM, UTF-16 LE, UTF-16 BE; affects supported byte serialization only | Informational only |

## Data and API model

`WorkspaceTab` will be named as an interface and will gain a serializable `format` object and `savedBaseline` string. The initial format is `{ lineEnding: "crlf", encoding: "utf-8", tabSize: 4 }`. New and existing cached tabs will be normalized through one helper at read time, preserving backward compatibility with snapshots that predate this release.

The rich editor never rewrites its visible document merely because the selected line-ending or encoding policy changes. The policy is applied at trusted file import/export boundaries, avoiding cursor, formatting, hydration, or sealed-exam side effects.

`DefaultTemplate` will gain an optional status callback supplied from `Workspace`. The Lexical update listener will publish a global text snapshot and a global selection range. It will translate anchor and focus points by walking text nodes in root order and including the text separator that Lexical contributes between top-level blocks. This lets the footer derive a one-based caret line/column, a normalized selection range, and selected-character count from the same snapshot. Imports preserve their selection-neutral behavior: a hydration update publishes no manufactured caret.

## Controlled focus and accessibility

Every interactive status cell uses a real `button`, descriptive `aria-label`, `aria-pressed`/radio state where appropriate, and visible keyboard focus. Popovers close on Escape and outside interaction. A completed command or ordinary dismissal schedules `editorRef.current.focus()` only when the active tab is editable; it will not pierce the sealed-exam interaction boundary.

## Explicit non-goals for this browser release

The implementation will not fabricate filesystem paths, external-disk-change detection, generic reload from disk, containing-folder access, rename, shadow windows, or legacy ANSI saving. The format model will remain ready for those Electron/Tauri bridge capabilities later. There will be no change to scanner behavior, Practice Mode, keyboard styling, settings surfaces, the workspace task-view system, or Just Look / sealed-exam workflow.

## Test model

Pure utilities will cover line/column translation, selection spans, Go To offsets, line-ending normalization, UTF byte encoding/decoding, and legacy snapshot normalization. Source and component tests will cover footer control wiring, per-tab persistence, focus restoration, and sealed-tab prohibitions. Browser runs will verify clean-state behavior, menus, slider input, content edits, selections, tab switching, reload persistence, and dark/light rendering without application-visible errors.
