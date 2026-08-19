# Task View Command Palette Composition

## Source of Truth

The Task View will reuse the existing Command Palette’s exact visual primitives instead of approximating them: `lexkit-command-palette-overlay`, `lexkit-command-palette`, `lexkit-command-palette-header`, `lexkit-command-palette-input`, `lexkit-command-palette-list`, `lexkit-command-palette-group`, `lexkit-command-palette-item`, and `lexkit-command-palette-footer`.

This means the Task View receives the same fixed centred overlay, 20vh top placement, 640px maximum panel width, 12px radius, quiet border, `var(--lexkit-*)` theme tokens, search field, selected-row treatment, and keyboard hint footer that already define the active Command Palette.

## Presentation-Only State

The implementation may add three local presentation values: a `Search open tabs…` query, the selected visible row index, and an input ref for autofocus. Filtering is derived from the existing open `tabs` array and must not create, reorder, mutate, or persist a second tab model.

## Callback and Protection Boundary

The Task View continues to use `isTabOverviewOpen` as its existing open-state owner and `setIsTabOverviewOpen(false)` as its existing dismissal path. A selected row continues to call the existing `switchTab(tab.id)`. A close control continues to call `initiateTabClose(tab.id, event)`. `canCloseFromOverview` remains based on the existing sealed-tab rule, and `isSwitchLocked` remains based on the existing running/countdown rule.

The existing outside-pointer listener, Escape dismissal, transient-overlay gate, Command Palette shortcut routing, dirty Save / Don’t Save / Cancel confirmation, Just Look behavior, desktop Close All gate, and preview-content derivation remain structurally untouched.

## Task-Tab Adaptation

Each row uses the palette’s information order: file icon, document title, a small dirty indicator when present, one truncating context line from existing preview derivation, and a flat row-end close control only when eligibility permits. The `OPEN TABS` group title replaces the Command Palette’s command category label. The footer keeps the real keyboard instructions: arrows to navigate, Enter to open, Escape to close.
