# P1 Editor Hardening and Shortcut Routing Validation

**Date:** 18 August 2026  
**Scope:** The four approved editor P1 defects, plus the requested packaged-Windows shortcut-routing readiness. No scanner, Practice Mode, Exam Mode, Just Look behavior, Settings design, or tab workflow was redesigned.

## Focused-input parity

RoyScript’s live Insert Link field initially reproduced the reported issue: its caret and extra global input treatment were blue. The local LexKit default-template stylesheet shows that the intended component behavior is different: it retains a restrained blue **focus border and halo** for accessibility, while the caret follows the input text foreground. The final correction removes RoyScript’s global `!important` blue caret rule and excludes LexKit input classes from the unrelated global blue hover/transform rule. The local `.lexkit-input` and Command Palette search input now explicitly use `caret-color: currentColor`.

The live post-change measurement confirmed that the focused Link URL input inherits its text color for the caret, has no global hover scale, and retains only the component-owned LexKit focus treatment. Escape then closed the dialog without opening Settings; Ctrl+K opened Settings only after that transient dialog had closed.

## Editor and overlay routing

| Verified path | Result |
|---|---|
| Escape inside the Link dialog | The dialog closes; Settings stays closed. |
| Escape inside Command Palette | The palette closes; Settings stays closed. |
| Ctrl+K with no transient overlay | Settings toggles as requested. |
| Command Palette Enter, `Show Command Palette` command | The palette activates and closes without introducing a new paragraph; the isolated document remains one line and 31 characters. |
| Underline + Strikethrough styling | The missing `lexkit-text-underlineStrikethrough` rule now supplies `underline line-through`. |
| Selection-safe palette dispatch | Preserved: the existing selection snapshot, close-before-dispatch sequence, and one-command history contract remain in place. |

The first capture-phase Enter repair correctly stopped propagation but still permitted a browser-created paragraph because the overlay unmounted before the browser’s complete native Enter sequence finished. The final repair consumes the key in capture phase **and** defers close/dispatch by one task; the same live self-referential-command regression then passed cleanly.

## Shortcut routing and package readiness

All existing client keyboard listeners and advertised editor accelerators were inventoried before changes. LexKit command matching now treats either `Ctrl` or `Meta` as the primary modifier when a command declares a primary shortcut, preserving Windows Ctrl behavior and macOS compatibility without creating duplicate registrations. Workspace routing now gives an open transient overlay priority over Settings, while `Ctrl+K` remains the Settings shortcut only when no overlay is open.

`Ctrl+T` is now an in-app New Tab command alongside the existing Alt+T route. Because browsers may reserve `Ctrl+T` and other accelerators before a page receives them, the project now includes a small renderer bridge and integration guide at `docs/desktop-shortcut-bridge.md`. An Electron/Tauri host can prevent a shell-reserved accelerator and emit `royscript-desktop-shortcut` with its normalized keyboard detail; the renderer forwards it through the ordinary, contextual keyboard chain instead of duplicating tab/editor logic. A live host-style `Ctrl+T` bridge event increased the workspace from 9 to 10 tabs, confirming the route reaches the existing New Tab handler.

> The actual Electron or Tauri host is not present in this repository, so its final `before-input-event` or webview-listener hookup remains a small packaging integration step. The renderer contract and exact event payload are already implemented and documented; this avoids inventing a second shortcut system now.

## Automated verification

| Check | Result |
|---|---|
| Vitest | **9 files, 35 tests passed** |
| TypeScript | `pnpm exec tsc --noEmit` passed with zero errors |
| Production build | `pnpm build` passed |
| Existing Command Palette safety contracts | Passed after being updated to assert the intentional deferred keyboard-dispatch boundary |
| New editor hardening contracts | Passed: primary modifier matching, overlay ownership, global caret removal, combined decoration, and desktop bridge source contract |

The production build retains the pre-existing PDF.js dynamic/static import and large-chunk warnings; they are unrelated to this approved editor hardening pass. Browser automation experienced two isolated synthetic Command Palette activation timeouts, but the browser remained healthy, direct palette interaction worked after restart, and no client-side exception or visible error state was produced by the tested application flows.

## Changed files

| Area | Files |
|---|---|
| Focus and inline styling | `client/src/index.css`, `client/src/components/lexkit/styles.css`, `client/src/components/lexkit/theme.ts` |
| Palette and overlay ownership | `client/src/components/lexkit/CommandPalette.tsx`, `client/src/components/lexkit/components.tsx`, `client/src/components/lexkit/DefaultTemplate.tsx` |
| Shortcut normalization and routing | `client/src/components/lexkit/commands.ts`, `client/src/pages/Workspace.tsx`, `client/src/lib/desktopShortcuts.ts` |
| Package integration reference | `docs/desktop-shortcut-bridge.md` |
| Regression coverage | `server/editorHardening.test.ts`, `server/commandPaletteSafety.test.ts` |

No Git commit, project checkpoint, or publication was created during this pass.
