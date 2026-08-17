# Status-Bar Upgrade — Clean Browser Baseline

**Recorded:** 17 August 2026  
**Scope:** RoyScript sandbox-browser preparation before status-bar capability implementation.

The RoyScript preview was opened before test preparation. It initially restored a persisted workspace with six tabs and an exam-related document, confirming that a clean-state reset was necessary for reliable regression testing.

The sandbox browser’s RoyScript-origin data was then cleared without modifying production code or user-facing project files. The reset removed **6 local-storage keys**, **1 Cache Storage entry**, and the IndexedDB database **`keyval-store`**. Session storage contained no keys. The reset was scoped to the RoyScript preview origin; it did not touch unrelated sites or external accounts.

All browser verification for the requested status-bar upgrade will begin only after a fresh reload from this cleared origin. No test workspace data, user workspace content, Git commit, or project checkpoint has been created in this phase.

## Fresh-load and capability confirmation

After the reset, RoyScript reloaded to the expected blank workspace state: **one tab**, no editor text, and the baseline footer values `Ln 1, Col 1`, `Chars 0, Words 0`, `Zoom 100%`, `Windows (CRLF)`, and `UTF-8`.

The clean browser exposes the File System Access picker APIs (`showOpenFilePicker` and `showSaveFilePicker`), Cache Storage, IndexedDB, and `FileSystemObserver`. It can decode the tested UTF-8, UTF-16 LE/BE, Windows-1252, ISO-8859-1 alias, Shift_JIS, GBK, and EUC-KR labels using `TextDecoder`. Its native `TextEncoder`, however, encodes **UTF-8 only**. Therefore the browser implementation can truthfully detect/decode supported source encodings and preserve format metadata, while arbitrary legacy re-encoding must use a vetted in-app encoder or remain a desktop-adapter responsibility; it must not be represented as a capability merely because a menu item exists.

## First live implementation capture — 2026-08-17

After the clean-state reload, RoyScript rendered the retained compact **32 px Segoe UI 12 px** status bar with `Tabs: 4`, `Ln 1, Col 1`, document metrics, and the new button surfaces for Zoom, line ending, and encoding. The fresh editor began at `Ln 1, Col 1` with zero document metrics, confirming that no stale selection or tab content survived the baseline reset. The initial click target was revalidated because hydration added a transient empty paragraph and shifted the accessible element indices; subsequent control checks use freshly enumerated targets rather than cached indices.

## Live interaction diagnosis

The current `Tabs: 4` footer cell is the new indentation-size selector, not a tab-count regression. Its menu correctly opens after React’s scheduled state flush and exposes `2 spaces`, `4 spaces` (selected), and `8 spaces`. Earlier direct DOM checks sampled state synchronously immediately after `.click()`, before React had committed the update, so they falsely reported that the menu had not opened. All subsequent automated interaction checks wait for a render frame before evaluating state.

## Reproduced caret-coordinate defect

Entering `Alpha`, `Beta`, and `Gamma` through the live editor produced explicit blank Lexical paragraphs between those text paragraphs. The browser’s rendered `innerText` contains five newlines between adjacent text blocks, while the DOM `textContent` omits all structural newlines. The preliminary callback used `root.getTextContent()` alongside text-node lookup, which therefore reported `Ln 9, Col 6` at the end of the visual fifth line. This is a real semantic defect, not a screenshot artifact. The status callback will be corrected to derive the line/column coordinate string and node offsets from a single canonical document model that represents every Lexical top-level block as one logical line.

## Corrected live caret regression

After the canonical top-level-block coordinate correction, clicking within `Gamma` reported `Ln 3, Col 4`; pressing **End** then reported `Ln 3, Col 6`, exactly matching the third visual editor line and the one-based caret position after the five-character word. The correction also preserves the selection-neutral post-reload state (`Ln 1, Col 1`) until the user actively places a caret.

## Corrected live Go To regression

The first Go To implementation used the new canonical footer coordinates while the editor reference still restored selections by concatenating text nodes without canonical block separators. With `Alpha`, `Beta`, and `Gamma`, requesting line 2, column 3 therefore landed at `Ln 2, Col 4`.

The editor reference now restores selections through the same one-logical-newline-per-top-level-block model, including a safe element-point fallback for empty blocks. A clean local reload and exact repeat of the request produced **`Ln 2, Col 3`** in the live footer. The requested target and reported caret position now agree.

## Live zoom control — initial verification

The Zoom footer cell opens a compact flyout with a labelled controlled range input, `−10%`, `Reset`, and `+10%` actions. A live `+10%` click changed both the footer label and flyout readout from **100% to 110%** while the editor remained focused and the flyout stayed open. The remaining range-limit and reset checks continue from this known 110% state.

The slider was then exercised through its standard keyboard semantics. **End** moved the focused slider to, and displayed, the implemented maximum of **300%**; **Home** then moved it to, and displayed, the implemented minimum of **20%**. Both updates propagated immediately to the footer label and the controlled slider value.

The `Reset` action returned the live footer and controlled range value from 20% to **100%**. The line-ending selector then opened its three real radio-menu options—**Windows (CRLF)**, **Unix (LF)**, and **Mac (CR)**—with CRLF initially selected. Selecting Unix immediately dismissed the menu, restored editor focus, and changed the current tab’s footer label to **Unix (LF)**.

The encoding selector opened the supported browser serialization menu: **UTF-8**, **UTF-8 with BOM**, **UTF-16 LE**, and **UTF-16 BE**, with UTF-8 initially selected. Selecting UTF-16 BE dismissed the menu and immediately updated the active tab’s footer label to **UTF-16 BE**. The selector state is intentionally per-tab and is coupled to the plain-text serialization path, not merely a decorative label.

## Live indentation-policy regression

The refreshed local workspace was exercised at `http://127.0.0.1:3000/?statusbar-indent-policy=1` with the new compact indentation cell. The menu exposed the expected `Spaces`, `Tabs`, `2 spaces`, `4 spaces`, and `8 spaces` radio options, with the selected policy indicated by checkmarks.

Choosing **Tabs** changed the footer label to `Tabs: 4`. Pressing Tab in the live third line increased `Chars` from 18 to 19 and the displayed column by one, which confirms a single literal tab character was inserted. Choosing **Spaces** restored `Spaces: 4`; pressing Tab in the same line increased `Chars` from 19 to 23 and changed `Ln 3, Col 7` to `Ln 3, Col 11`, confirming the active four-space policy inserted exactly four spaces.

The browser automation reported a false non-persisted-selection warning because the compact radio menu intentionally stays open after an option selection. Fresh live DOM inspection confirmed the radio state and footer label changed correctly in both cases. No console error was observed. The document intentionally remains dirty for the upcoming dirty-state, revert, and persistence regression cases.

## Live dirty-state and revert regression

The deliberately modified first tab rendered the status cell with the accessible label **Unsaved changes**. Activating it opened a compact `Revert to saved` menu. That command correctly routed through RoyScript’s existing unsaved-change confirmation rather than discarding data immediately; the dialog named the current document and offered `Cancel`, `Don't Save`, and `Save`.

Choosing **Don't Save** restored the first tab to its saved empty baseline: `Start typing…`, `Ln 1, Col 1`, `Chars 0`, `Words 0`, **Windows (CRLF)**, **UTF-8**, and `Spaces: 4`. The dirty-status cell remained accessible but no longer exposed a revert menu, confirming content and saved-format baselines are restored together. No visible error or console error was produced.

## Live per-tab format isolation

On the restored first tab, choosing **Unix (LF)** immediately changed only that tab’s footer state. Creating a third fresh tab produced the expected independent defaults—**Windows (CRLF)**, **UTF-8**, and `Spaces: 4`—rather than inheriting the first tab’s chosen format. Opening Task View and returning to the first card restored **Unix (LF)** with the other first-tab values unchanged. This confirms status formatting is held per tab, remains compatible with the existing toolbar Task View workflow, and survives normal tab switching.

Reloading the local workspace into a new URL state retained the active first tab, its three-tab workspace, and the first tab’s **Unix (LF)** status value. The persisted workspace restore path therefore retains the new per-tab format metadata rather than resetting it on browser reload.

## Live visibility control

The existing `View → Status Bar` menu entry remained functional with the upgraded footer. In the clean local browser, it removed the complete footer and unchecked its own menu indicator; choosing the same item again restored the complete status bar and its checked state. This confirms the new interactive cells do not bypass or compromise the existing visibility preference.

## Live active-exam and sealed-review regression

From the clean browser state, a controlled exam was started through RoyScript’s normal timer and rules sequence. During the active exam, the status bar continued to show the existing live WPM metric together with the upgraded indentation, truthful caret position, document metrics, zoom, line ending, and encoding surfaces. The exam lock still restricted only the established prohibited app actions; it did not produce console errors or a malformed footer.

The exam was then ended through its normal stop flow and entered **Just Look**. In sealed review, the editor and formatting toolbar correctly became unavailable while the compact status bar remained readable. Creating a new tab from this sealed state produced a fifth, ordinary workspace tab with the expected default status values. Typing `Fresh editable workspace` succeeded and immediately reported `Ln 1, Col 25`, `Chars 24`, and `Words 3`, proving that the approved sealed-exam boundary and the fresh-tab editability path remain intact after the status-bar upgrade.

## Final automated validation

The final local validation command completed successfully: `pnpm exec tsc --noEmit`, `pnpm test`, and `pnpm build`. TypeScript reported no errors; Vitest passed all **23 assertions across 6 test files**, including the focused status-bar suite; and the production build completed successfully. The build retains the pre-existing PDF.js dynamic/static import and chunk-size warnings, neither of which were introduced by this status-bar work.
