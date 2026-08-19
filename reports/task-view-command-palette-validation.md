# Task View Command Palette Validation

## Initial Live Parity Check

The live Task View opens from the existing toolbar control as a fixed, centred overlay. Its observed shell matches the active Command Palette language: shared dimmed backdrop, centred compact panel, `Search open tabs…` input, uppercase `OPEN TABS · 10` group label, palette row stack, vertical list containment, and the `↑↓ to navigate, ↵ to open, ESC to close` footer.

The running workspace contained ten real document tabs, confirming that the new presentation draws its rows from the preserved open-tab collection rather than from a parallel task model.

The live dense collection retained the same centred compact panel discipline as Command Palette and did not fall back to the previous anchored preview-grid presentation.

The real eleven-tab workspace continued to fit inside the same bounded Command Palette shell. Derived document context remained a single truncating row beneath each title, so long editor content did not turn the palette into a card grid or widen its visual hierarchy.

## Completed Interaction Checks

- Search filter and empty result state — verified live: setting `Top boundary` through the real search-input event path reduced the rendered tab-option collection to zero without mutating the open-tab data.
- Arrow-key selection and Enter-driven tab activation — verified live: ArrowDown moved the palette selection from index 0 to index 1 while the search input retained focus; Enter then closed the palette and loaded the second real document through the preserved switch path.
- Clean close — verified live: an isolated empty tab closed through its palette row-end control without opening confirmation, returning the workspace to its prior tab count.
- Escape dismissal — verified live: Escape closed the centred Task View only, without opening Settings or changing the active document.
- Dirty-close cancellation — verified live: an isolated dirty tab opened the original Save / Don’t Save / Cancel dialog from the palette; Cancel dismissed it and restored the tab unchanged.
- Dirty-tab disposal and workspace restoration — verified live: reopening the isolated test tab’s original confirmation path and choosing Don’t Save removed only that disposable tab, returning the workspace to the retained document set.
- Outside-pointer dismissal — verified live: clicking the editor canvas closed the centred Task View without changing the active document.
- Dark presentation — verified live: the task palette retained the same dimmed overlay, near-opaque shell, quiet border, search field, grouped list, selected-row, and keyboard-footer hierarchy as the dark Command Palette.
- Light presentation — verified live: the centred Task View retained the same Command Palette shell, `Search open tabs…` field, `OPEN TABS · 10` group header, selected row, bounded list, and keyboard footer without reverting to the former card-grid presentation.

## Protection, Build, and Console Evidence

| Verification | Result |
|---|---|
| Preserved-protection contract | The focused editor-hardening contract verifies that the centred palette retains the existing `isSwitchLocked` running/countdown expression, `canCloseFromOverview = !tab.examSealed`, close eligibility data hook, desktop Close All gate, existing `switchTab` path, and existing `initiateTabClose` path. |
| Full Vitest | `pnpm test` passed: 39 assertions across 9 test files. |
| TypeScript | `pnpm exec tsc --noEmit` passed. |
| Production build | `pnpm build` passed. The retained pdfjs dynamic/static import and bundle-size notices are pre-existing build warnings. |
| Console | No Task View runtime exception appeared. The current log contains only the existing Chrome contenteditable-in-flex warning and Vite Fast Refresh notices, plus prior browser-driver aborted-request records. |

## Pending Regression Checks

- Manual verification of visual fit and real-world protected exam workflow
