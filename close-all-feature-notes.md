# Close-All Tabs + Platform Exit — Implementation Notes

## User request (2026-08-16)
"Give it a little touchup and do one thing.. give one option to close all the tab and that should close the application, it should be functional when I will package this with electron or tauri you know.. for now inject the code and the feature."
- Final visual touchup on the overview panel (small refinements, keep approved composition).
- "Close all tabs" option inside the overview. Closing the LAST remaining tab should exit the app.
- Must be functional after Electron/Tauri packaging. Inject the code now with a platform-neutral exit abstraction.

## Where the overview lives
`client/src/pages/Workspace.tsx`, lines ~4329-4398 (`AnimatePresence` block inside `data-workspace-tab-controls`).
- Panel classes (line 4337): `rounded-[14px] border border-transparent bg-white/[0.76] ... ring-1 ring-black/[0.04] backdrop-blur-[52px] backdrop-saturate-[1.35] dark:bg-[#1c1c1c]/[0.82] dark:ring-white/[0.06]`
- Header: "Open tabs" h2 + count capsule (`{tabs.length} tab(s)`) at lines 4341-4348.
- Grid container at line 4353 (`data-workspace-tab-overview-list`, `grid grid-cols-3 gap-3.5 rounded-[11px] bg-black/[0.018] p-2.5 dark:bg-black/[0.16]`).
- Cards: lines 4354-4391. `isLocked = examStatus === "running" || "countdown"`. Preview via `buildTabOverviewPreview`. Active styling via `themeAccentColor`.
- Dirty guard exists per-tab in strip close: `initiateTabClose(tab.id, e)`. Exam guard uses `alert(...)` in strip close handler (line 4278-4281) — note this alert exists in the strip; overview should silently do nothing or use the same guard.

## Existing helpers (from earlier context)
- `initiateTabClose(tabId, e)` — existing dirty-aware close flow (may be async/confirmation based).
- `createNewTab`, `switchTab`, `tabs` state, `activeTabId`, `examStatus`, `themeAccentColor`, `setIsTabOverviewOpen`.
- Source contract tests in `server/scannerLayout.test.ts` assert specific class strings.

## Design decisions
1. **Exit abstraction** — new file `client/src/lib/platformExit.ts`:
   - Browser: `window.close()` only works for windows the script opened; fallback: `location.reload()` is NOT exit. Best web fallback: post a message + attempt `window.close()`, and expose `closeRoyScriptApp()` that also dispatches `document.dispatchEvent(new CustomEvent('royscript-request-exit'))` so Electron/Tauri shells can listen and call `app.quit()` / `exit()`.
   - Electron shell listens via IPC; Tauri shell calls `@tauri-apps/plugin-shell`/`@tauri-apps/api` `exit`. Both wired to the same custom event/bridge.
   - Include a `window.__royscriptExit` bridge function slot so Tauri can inject `window.__royscriptExit = () => exit()`.
2. **Close-all flow**:
   - Entry point in overview: small "Close all tabs" text-button in the header row (right side, low emphasis, red-tinted neutral) — visible only if tabs exist; exam lock disables it.
   - Collect dirty tabs. If any dirty: show ONE consolidated confirmation dialog (use existing dialog UX if any, else a minimal modal) — "There are unsaved changes in N tab(s). Close all anyway?" Confirm/Cancel. Confirm = close all + exit. Cancel = no-op.
   - If no dirty tabs: close all + exit immediately.
   - Closing sequence: iterate all tabs, call the same close path as single-tab close (without confirm per-tab), then when `tabs.length === 0` invoke `closeRoyScriptApp()`.
   - Guard: never exit during exam countdown/running (entry disabled; programmatic also refuses).
3. **Visual touchup**: reduce header right-edge density — move count capsule next to title or keep; add divider-free Close-all button; maybe slightly softer bed and card hover. Keep borderless floating-glass.

## Verification plan
- Vitest contract test covers the close-all entry markup + platformExit module surface.
- New probe `scripts/workspace_close_all_probe.mjs`: multi-tab close-all with no dirty (expects exit bridge event dispatched, tabs = 0), dirty cancel path (tabs unchanged), dirty confirm path, exam lock, light+dark, console healthy.
- Existing suites: 16/16 tests, multitab 15/15, taskview 8/8 — re-run.

## Constraints
- No checkpoint/commit without user approval. Silent failures only. No scanner/Practice/keyboard/Settings changes. No mobile. Not flashy.
