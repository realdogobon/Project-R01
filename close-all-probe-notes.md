# Close-All Probe Notes (internal)

## Implemented so far
1. `client/src/lib/platformExit.ts` — new module. Exports `requestRoyScriptExit(source)` which: (a) calls `window.__royscriptExit?.()` if injected by a Tauri shell, (b) dispatches `CustomEvent("royscript-request-exit", {detail:{source}})` (Electron shells add a document listener that calls `app.quit()`), (c) best-effort `window.close()`. Always silent-fails.
2. `Workspace.tsx` edits (4 patches applied, 0 TS errors per dev server output):
   - Import: `import { requestRoyScriptExit } from "../lib/platformExit";` (line 3)
   - Handlers after pendingAction state (around line 1081-1109): `closeAllTabsAndRequestExit` (dirty guard → sets pendingAction "closeAllTabs" + opens unsaved popup; clean → `closeAllTabsNow`) and `closeAllTabsNow` (sets tabs=[], activeTabId="", closes popup+overview, calls `requestRoyScriptExit("closeAllTabs")`). Exam lock at top of both.
   - `executePendingAction` branch: `else if (action === "closeAllTabs") closeAllTabsNow();` (line ~1141)
   - Overview header: Close-all button `data-workspace-tab-close-all`, 12px font-medium, rounded-[7px], transparent, hover `bg-neutral-900/[0.045]` / `dark:hover:bg-white/[0.055]`, next to the count capsule. Exam/dirty/disabled states: `text-neutral-300 dark:text-neutral-600 cursor-not-allowed`. Title: "Close all tabs and exit the application".
3. Probe script `scripts/workspace_close_all_probe.mjs` written (Puppeteer, 3 scenarios):
   - S1 clean close-all: Alt+T ×2 → 3 tabs; intercept Window.prototype.close → `window.__exitClosed`; listen exit event → `window.__exitDetail`; click entry; expect 0 tabs, overview closed, exit detail {source:"closeAllTabs"}, closeRequested.
   - S2 dirty guard: type real text (execCommand insertText in [data-lexical-editor] / .lexkit-content-editable), click entry → unsaved popup → cancel → tabs kept, no exit; confirm (button matching /close all|yes|confirm|delete/) → 0 tabs + exit event.
   - S3: entry exists, not disabled normally, title correct.
   - Screenshots: /tmp/workspace-closeall-clean.png, /tmp/workspace-closeall-dirty.png, /tmp/workspace-closeall-darkmode.png. Result JSON: /tmp/workspace-closeall-result.json.

## TODO next
- Fix probe: tabCount helper is fragile — use the count capsule text instead: `document.querySelector('[data-tab-count] span')?.textContent` matches /^\d+ tab/; or query `[data-workspace-tab-strip]` children carefully. The multitab probe counts tab cards with its own selectors; simplest: read the `1 tab`/`3 tabs` capsule inside `[data-tab-count]`.
- Update `server/scannerLayout.test.ts` contract: add assertions for close-all button presence + platformExit module surface (import `requestRoyScriptExit`, `ROYSCRIPT_REQUEST_EXIT_EVENT`).
- Run: pnpm run check && pnpm test && pnpm run build; then probe: PREVIEW_URL=http://127.0.0.1:3000 pnpm tsx scripts/workspace_close_all_probe.mjs; re-run multitab (15/15) and taskview (8/8) probes; visual review of 3 screenshots; update todo.md second-pass + close-all items to [x]; ask user for manual review (no checkpoint without approval).
- After approval: checkpoint message covering: floating-glass second pass + close-all tabs w/ platform exit bridge.

## Existing context worth keeping
- Dev server url: https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer (port 3000).
- Last checkpoint 088e4ad5 (paper-feed animation final). All current work is UNCHECKPOINTED pending user approval.
- User rule: no checkpoint/commit without explicit approval. Reply "Approved" triggers checkpoint.
- Unsafed popup existing flow: pendingAction prefix "closeTab:" / "animatedCloseTab:" / "new"/"open"/"Write"/"Practice"/"switchAccount"; popup component renders "Close all" confirm wording likely "Close all" vs generic — verify confirm button text at runtime ("Close all" likely in popup text; fallback regex used in probe).

## Probe diagnosis (round 2)
- Entry renders correctly inside overview header: verified `entryExists:true, entryDisabled:false, overviewOpen:true` in debug probe 1.
- Scenario-2 confirm click failed because: (a) `execCommand("insertText")` into Lexical does NOT reliably set isDirty (Lexical intercepts input; tab stayed clean → `tabCount` went to 0 and overview closed; zero dialogs). Debug probe 2 showed `tabCount: 0, dialogs: [], overviewStillOpen: false` — meaning the dirty guard never fired.
- Unsaved popup structure (lines 4719-4783): no `data-*` attributes on popup. Buttons in order: Cancel / Don't Save / Save. Popup wrapper: `fixed inset-0 z-[500]` div with class `bg-white dark:bg-[#1c1c1c] rounded-[10px] w-[420px]`. `executePendingAction("closeAllTabs")` calls `closeAllTabsNow()`.
- Fix for probe dirty scenario: set isDirty + content via page.evaluate directly on window state is impossible (React state) → better: trigger Lexical typing via real keyboard events (`page.keyboard.type(...)` into the editor) which updates Lexical → dirty state. Or use the editor's $parse and forceUpdate approach. Simplest reliable: `page.keyboard.type("Unsaved work here")` after focusing editor via click on `[data-lexical-editor]`.
- Confirm button text is "Don't Save" (not "Close all"). Update probe regex to `/don't save|don&#39;t save/i`.
- Popup detection: match any dialog by checking popup-like fixed overlay with "save changes" text instead of `data-workspace-unsaved-popup`.

## Brand mark request (NEW, from user)
- User sent screenshot of title-bar wordmark "RoyScript TSR" (white text + orange "TSR", appears in dark mode, current font is global app font).
- Wants: delink from global font; redesign ideas for Apple-aesthetic, premium, clean, lean wordmark; NOT gimmicky. Ideas FIRST, no code until direction confirmed.
- TODO after close-all handoff: locate wordmark markup in Workspace.tsx (search "RoyScript"), study Apple typography (SF Pro, weight contrast, tight tracking, optical sizing), present options with visual mockups (generate images via image tools), user picks, then implement + verify both themes.

## Round 3 diagnosis
Probe output: zeroTabsAfterClean=true and overviewGone=true, but exitDispatched=null and closeRequested=false. This means the click hit the entry but requestRoyScriptExit either never ran OR the window.dispatchEvent target issue. NOTE: `requestRoyScriptExit` calls `window.dispatchEvent` — should work since listener is attached BEFORE the click. But scenario 1 typed content? Alt+T tabs are clean. Possible cause: clicking entry while overview panel is inside [data-workspace-tab-controls] — the entry exists; BUT the "Close all tabs" button also exists elsewhere? Check duplicate data attribute. Alternate: the click happened, tabs cleared, but the button was re-rendered and click landed on wrong element? Tabs cleared (0 tabs), overview closed — so the same render cycle. Wait: probe intercepts `Window.prototype.close` AFTER initial navigation; React handler uses imported `window` module-level `window` object — dispatchEvent on the imported window should be same object. WHY null? Because `setIsTabOverviewOpen(false)` re-renders, but listener persists. Unless: button's onClick ran but `tabs.length === 0` disabled? It wasn't disabled. Another possibility: page1 had 3 tabs, all clean → dirtyCount=0 → closeAllTabsNow called → requestRoyScriptExit dispatched. The listener in probe attaches correctly. The only way detail is null: handler threw... no, try/catch silent. OR — the click in Puppeteer actually hit the overview-close (outside click?) No, tabs cleared, so the handler ran. THEN the custom event MUST have been dispatched... unless the `window` object inside platformExit.ts is a different reference due to iframe? No iframe.
=> Next step: reproduce minimally — after close-all click, evaluate document's exit listeners count and manually dispatch test event; also check if maybe React StrictMode double-render swallowed it. Test by adding temporary console.log in platformExit.ts or by verifying from evaluate after click whether the event fired (re-attach listener immediately after click too, in case page did a full SPA navigation).

## Round 4 — resolution
Root cause of earlier probe failures: probe attached exit listeners in separate evaluate() calls; React re-initialization between calls made the listeners capture nothing. Debug probe `_debug_exit3.mjs` proved the real flow works: entry click → requestRoyScriptExit dispatched on window → detail {source:"closeAllTabs"} captured, tabs→0, overview closed.

Fix applied to `scripts/workspace_close_all_probe.mjs`: attach __exitClosed flag, Window.prototype.close intercept, and BOTH window+document listeners (capture phase) in a SINGLE evaluate BEFORE the close-all click. Also added exitDetailAtCancel check.

Status: probe re-run pending. Expected outcome: exitEventDispatchedOnCleanClose=true, windowCloseRequestedOnCleanClose=true (protocol-ignored but requested), dirty guard checks now rely on real keyboard typing (works).

Remaining after probe passes: (1) extend scannerLayout.test.ts contract for close-all entry + platformExit module if not done; (2) TypeScript/tests/build + run multitab (15/15) + taskview (8/8) probes; (3) screenshots already at /tmp/workspace-closeall-*.png; (4) mark todo items; (5) HAND OVER to user for manual review of close-all feature; (6) THEN start brand mark research (user request, screenshot at /home/ubuntu/upload/pasted_file_SoibgL_image.png — white "RoyScript" + orange "TSR" in dark title bar, currently uses global app font; wants font delink + Apple-premium redesign ideas FIRST, no code until confirmed).

## Round 5 — closeRequested still false
With prototype patched at document init, `window.__exitClosed` is STILL false while `__exitDetail` IS captured. That means requestRoyScriptExit's try block executes window.dispatchEvent but the `window.close()` line is never reached — UNLESS the CustomEvent dispatch itself throws synchronously (it doesn't; debug3 proved). Wait — dispatchEvent returns true; then dispatched=true; then window.close(). But closeCalled=false. Possible: `window.dispatchEvent(...)` here is called with the module's captured `window`, but closeCalled false means close() wasn't invoked...

HYPOTHESIS: requestRoyScriptExit in platformExit.ts runs inside React's concurrent batch; `window.dispatchEvent` on a NON-bubbling CustomEvent... no.
REAL candidate: TypeScript compilation caches. The dev server may serve an OLDER bundle that lacks requestRoyScriptExit call or has different platformExit code. The curl test showed current code. Hmm — but detail WAS captured with source "closeAllTabs", so current code DOES run.
=> Next: add temporary console.log in platformExit.ts between dispatch and close, run probe with browserConsole grep to see whether close line is reached.

## Round 6 — resolved mystery
Console marker "[royExit] reached window.close for source: closeAllTabs" CONFIRMS window.close() IS executed. The probe's `closeRequested=false` is a probe-side illusion: the Window.prototype.close patch set via page.evaluate apparently doesn't intercept the actual close call (likely because Puppeteer evaluate runs in a different realm/CCW wrapper, or the real call goes through a different path). The exit contract is working.

Action: revert the temporary console.log instrumentation in platformExit.ts. Accept exitEventDispatched as the canonical proof; re-label or drop the windowCloseRequested checks in the probe (replace with an expectation-free note). Then complete verification: tests, build, multitab+taskview probes, and hand over.

## Round 7 — full verification PASSED
Standalone scenario-2 probe (/tmp/probe_s2.mjs) confirmed the complete dirty close-all lifecycle:
- textTyped=true, Cancel/Don't Save/Save buttons all visible (so the unsaved popup DID render; `popupAppeared=false` was only a race in the selector timing — the button list proves the dialog is present)
- Cancel keeps both tabs (cancelKeptTabs=true), exit NOT fired on cancel (exitNotFiredOnCancel=true)
- Don't Save closes ALL tabs (confirmClosedAll=true), overview closes, exitEventDispatchedOnDirtyConfirm=true with source "closeAllTabs", closeRequestedOnConfirm=true (window.close called once)

CONCLUSION: the close-all feature works end-to-end in all three paths (clean exit, dirty-cancel, dirty-confirm). Only the main probe's `dirtyDialogVisible` timing check and the dirty-flow exit checks are the unreliable parts; everything else in the main probe already passed (clean path all true, entry enabled, title correct).

Decision: patch the main probe's dirty detection to a robust check (wait for the dialog buttons with page.waitForFunction), then run the whole suite once more. Screenshots at /tmp/workspace-closeall-*.png. After that: ts/tests/build, multitab probe, taskview probe, mark todo, hand over for manual review.

## Round 8 — probe hardened (in progress)
Main probe scripts/workspace_close_all_probe.mjs edited: (a) dirty-dialog detection now waits via page2.waitForFunction for "Don't Save" button visibility (result stored in dirtyDialogVisibleFinal — need to wire that into result/checks); (b) Cancel click matches exact button text "Cancel"; (c) confirm path waits for the same dialog then clicks "Don't Save".

TODO remaining (in order):
1. Wire `dirtyDialogVisibleFinal` into result object and checks (dirtyConsolidatedDialogAppears).
2. Run main probe once: PREVIEW_URL=http://127.0.0.1:3000 pnpm tsx scripts/workspace_close_all_probe.mjs — expect all 16 checks true (previous run had 13 true; dirty ones were timing artifacts now fixed; the standalone /tmp/probe_s2.mjs proved dirty flow fully works).
3. Then full gate: pnpm run check && pnpm test && pnpm run build && git diff --check.
4. Run scripts/workspace_multitab_probe.mjs and scripts/workspace_taskview_glyph_probe.mjs (both passing earlier, 15/15 and 8/8).
5. Screenshots exist at /tmp/workspace-closeall-*.png (clean, dirty, darkmode).
6. Mark close-all todo items [x] in todo.md, then HAND OVER to user for manual review (no checkpoint yet — user rule).
7. After user approves: checkpoint + ask about GitHub push.
8. Then start brand mark work (user request in progress): screenshot /home/ubuntu/upload/pasted_file_SoibgL_image.png shows "RoyScript TSR" wordmark — white bold + orange TSR — in dark title bar, currently follows global font. User wants: delink from global font + Apple-premium redesign ideas FIRST (research Apple typographic identity principles), present ideas, no code until direction confirmed.

## Round 9 — diagnosis
probe_s2b (clean scenario-2 run): tabsAfterShortcut=2, textTyped=true, dlgVisible=true, afterCancel={tabs:2, exitDetail:null}. Cancel path PERFECT in isolation.

Earlier main-probe run printed checks then "Terminated" (exit 143 = timeout, killed) — meaning the run HUNG after printing (probe was still running past 180s, grep showed partial output mid-run). The checks snapshot shown was mid-execution (cancel step). Need to re-run with higher timeout (180s → enough; actual hang may be scenario 3 dark-mode page or screenshot). Fix: rerun main probe with 300s timeout and output to file.
