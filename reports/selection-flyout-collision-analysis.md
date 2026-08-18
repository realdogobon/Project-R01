# Selection Flyout Collision Analysis

## Supplied visual evidence — initial observation

The ordered LexKit reference screenshot is `1280 × 4749` pixels and was read as five overlapping vertical tiles. In the top editor tile, the selected heading’s contextual flyout appears directly below the selection rather than above it, leaving the editor’s persistent formatting toolbar unobstructed. The flyout is horizontally anchored near the selected text, remains inside the editor surface, and visually contains the same inline/block actions RoyScript exposes.

The supplied RoyScript screenshot shows the contrasting failure: a selected opening line causes its flyout to render above the selection at approximately the same vertical level as the workspace toolbar, covering the persistent top controls. This establishes that the repair must evaluate usable editor viewport boundaries—not merely selection coordinates—and flip the flyout below a selection when its preferred above placement would overlap reserved top chrome.

The remaining LexKit reference tiles are being inspected in supplied reading order. No code has been changed by this evidence entry.

## Completed reference review

All five overlapping tiles were reviewed in top-to-bottom order. Only the first tile contains the live editor and selected-text flyout; the remaining tiles show LexKit marketing content below the demo editor and add no contrary positioning evidence. The overlap between the first two tiles confirms the editor boundary cleanly: the flyout is contained within the demo editor rather than extending upward into the site navigation or its permanent editor toolbar.

The reference visually supports a **below-selection fallback** for the top-of-editor selection case. It does not, by itself, reveal the complete implementation algorithm for lower viewport, left/right, or scrolling cases. Those implementation details must be confirmed from LexKit source and live behavior rather than inferred from this static screenshot.

## Verified LexKit source behavior

LexKit’s `FloatingToolbarExtension` owns selection geometry. It derives a DOM range or selected-node rectangle, then calculates a selection rectangle with the following tested source rules:

| Geometry concern | LexKit extension behavior |
|---|---|
| Default placement | Below the selection, using an 8 px vertical offset. |
| Horizontal anchoring | Centers on the selection when possible; otherwise pins to a 10 px left or right viewport margin and exposes `positionFromRight`. |
| Top collision | If the calculated toolbar would cross the viewport’s top bound, it flips below the selection. |
| Bottom collision | If the calculated toolbar would cross the viewport’s lower bound, it flips above and includes the toolbar height. |
| Selection sources | Supports both non-collapsed text ranges and node selections. |

The LexKit demo renderer consumes that extension-owned rectangle rather than recalculating it. Its CSS shell remains a visual concern only.

RoyScript currently duplicates and overrides that geometry inside `FloatingToolbarRenderer`. It hard-codes an **above** placement for text (`rect.top - toolbarHeight - 10`) and treats only the physical browser top (`16 px`) as a collision boundary. It also does not reuse the extension rectangle’s scroll-aware right-pinning hint. This is the direct cause of the screenshot defect: RoyScript’s workspace toolbar occupies protected space below the browser top, but the duplicate calculation has no knowledge of it.

The minimally invasive parity path is therefore to retain RoyScript’s existing contextual action surface but replace only its divergent selection-geometry calculation with a small, measured, workspace-aware placement helper. The helper must preserve LexKit’s default-below behavior, top/bottom flip, horizontal pinning, node-selection support, and recomputation on selection/resize/scroll, while treating RoyScript’s persistent top workspace chrome as an additional protected top boundary.

## Final live collision regression

The approved helper is now live. It derives its placement from actual selection/node geometry, the measured flyout dimensions, the real `.lexkit-editor-header` lower edge, and the live viewport. It uses the reference 8 px offset and 10 px horizontal edge inset, with below-first placement, above fallback at the lower viewport edge, left/right pinning, and recalculation on selection, resize, and capture-phase scroll.

| Live scenario | Observed result |
|---|---|
| Opening/top-of-editor text selection | The contextual flyout appeared below the selected text and beneath the protected workspace header rather than covering the permanent toolbar. |
| Long selected document | The flyout remained associated with the current selection without clipping while the document contained 22 controlled paragraphs. |
| Lower-viewport selection | The selected `Line twenty` range rendered at `y=1047–1068`; the flyout flipped above it at `y=990–1040`, retained a 7 px gap, cleared the header, and remained inside the viewport. |
| Contextual action integrity | Clicking Bold from the flipped lower-viewport flyout formatted the selected line successfully; the selection and toolbar remained usable. |
| Edge behavior | Deterministic helper tests cover 10 px left/right pinning, protected top chrome, lower-viewport above flip, and the no-space clamp. |
| Runtime health | No new browser exception or visible error occurred. The known Chrome contenteditable-in-flex advisory remains pre-existing and unrelated to this positioning path. |

The final validation passed: **9 Vitest files / 37 tests**, `tsc --noEmit`, and the production bundle all completed successfully. The existing PDF.js import and bundle-size build warnings are unchanged and unrelated.

## Grouped flyout composition comparison

The supplied LexKit reference presents its contextual toolbar as a compact **clustered command surface**, not a continuous strip. Its first row separates inline formatting (`Bold`, `Italic`, `Underline`, `Strikethrough`), inline content (`Code`, `Link`), and block conversion (`Paragraph`, `H1`, `H2`) with visible vertical gutters; a second row continues secondary block actions (`H3`, Quote, Code Block, Lists). The visual form uses a dark elevated card, a concise corner radius, subtle group dividers, and a selected light-neutral treatment for the active paragraph style.

RoyScript’s supplied screenshot exposes the same first-row commands in one uninterrupted horizontal bar. Its visual density and command order are compatible with the reference, but the cluster boundaries and deliberate two-row composition are absent. The approved correction is therefore a **visual composition pass only**: preserve every existing command, selection, collision measurement, shortcut, and action callback while grouping the already-rendered controls into LexKit-like command clusters.

## Grouped composition implementation and validation

RoyScript now uses the same 400 px wrapped command-surface constraint as LexKit’s reference renderer. The existing vertical separators and action order were retained; removing RoyScript’s forced `width: max-content`, `maxWidth: fit-content`, and `flexWrap: nowrap` lets those source-equivalent command clusters wrap naturally into the compact multi-row card shown in the reference.

| Measured live result | Value |
|---|---|
| Flyout max width | 400 px |
| Computed wrapping | `wrap` |
| Rendered command buttons | 14 |
| Retained cluster separators | 3 |
| Rendered rows during top-line selection | 2 rows on first layout measurement; a compact third button row may be used once a command has an active-state width change, while remaining contained in the same 400 px grouped card. |
| Top chrome clearance | Header bottom 114 px; flyout top 166 px. |
| Command integrity | Contextual Bold formatted the selected text and preserved the flyout selection state. |

The visual pass passed **38/38 Vitest tests**, TypeScript with zero errors, and the production build. The browser console contains the pre-existing Chrome contenteditable-in-flex advisory and one failed *test-only* DOM range probe, followed by the successful selection measurement; neither is an application runtime exception or visible error state.
