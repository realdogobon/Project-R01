# Workspace Multi-Tab Architecture Assessment

## Scope and source boundary

This is an assessment only. No workspace multi-tab UI or behavior has been changed. The primary reference is the user-provided OpenEditor source archive at `/home/ubuntu/reference-repos/OpenEditor-src.txt`, principally its `EditorTab` model and `MainWindow.xaml.cs` tab management code.

## OpenEditor’s tab system

OpenEditor treats each open item as one durable `EditorTab` object. That object owns three coordinated pieces of state: an `OpenDocument` model, a `SplitViewHost` containing the editor pane or panes, and its `TabViewItem` UI. The tab’s visible header is derived from document state and dirty state rather than being the model itself.

Creation (`CreateTab`) creates all three pieces, wires editor events once, applies settings, appends the model to `_tabs`, and appends the view to the native `TabView`. Activation (`ActivateTab`) updates the active model, native selected item, derived window/status UI, and editor focus together. The selection handler performs the same model-to-view lookup when selection originates in the strip. Closing delegates to an asynchronous close routine, allowing dirty-document handling before the model and UI are removed.

The add action is not relied upon as the only escape route. `TabView` exposes its add-tab behavior through `Tabs_AddTabClick`, while a separate always-reserved `TabsOverflowButton` opens an overview flyout. The overview includes every tab’s title, dirty state, active state, and a short content preview; selecting a card activates the tab. Reordering the overview cards synchronizes both `_tabs` and `Tabs.TabItems`, preserving one authoritative order. The app explicitly treats the native Add button and overview button as independent interactive regions even when the strip reaches its available width.

OpenEditor also supports close actions, reordering, pinning, and native tear-out/rejoin. Those latter desktop-window features depend on WinUI `TabView` and should not be transplanted into the browser app as part of the requested correction.

## RoyScript’s current tab system

RoyScript currently keeps a flat `tabs` array in `Workspace.tsx`. Each plain object combines title, serialized Lexical content, optional file handle, dirty/auto-name flags, exam state, glow history, and recent-activity timestamp. `activeTabId` points into that array; `createNewTab`, `switchTab`, and `doCloseTab` update both document-related fields and independent editor/UI state.

The strip maps every tab to a fixed `w-44` (176 px) DOM element inside a horizontally scrollable flex container. The `+` button is rendered as a sibling at the end of that same scrolling region. As tabs accumulate, this sibling scrolls off-screen with the tabs, making the only visible new-tab control inaccessible. There is no persistent overview/list button, no active-tab auto-reveal mechanism, no overflow surface, and no centralized tab action abstraction. The content model itself is workable for browser tabs, but its UI shell is not resilient when the row overflows.

## Directly transferable design principles

| Principle from OpenEditor | Safe RoyScript interpretation |
| --- | --- |
| Document state and tab UI are synchronized through explicit lifecycle operations. | Introduce a small typed tab-action layer around the current `tabs` model; retain Lexical serialization and exam safeguards. |
| Creation is always reachable independently of visible tab width. | Move the existing `+` out of the horizontal scroller into a permanently visible trailing control. |
| A separate overview presents every open document and activates any selected document. | Add a permanently visible, compact tab-overview glyph that opens a keyboard-accessible list/popover of all tabs. |
| The overflow view shows title, dirty/active state, and supports navigation. | Start with title, active state, dirty dot, and close action; do not add invented previews, pinning, tear-out, or reorder until explicitly approved. |
| One order is synchronized across model and UI. | Render from the current `tabs` array only; future reorder must update that array transactionally. |

## Non-transferable or deferred features

- WinUI tab tear-out/rejoin across desktop windows.
- Native drag-region registration, caption controls, and window management.
- Split-editor pane ownership inside a tab.
- Pinning and content-preview cards, unless separately requested.

## First-key neon root cause (separate issue)

The first-key jerk is unrelated to tab overflow. In a clean browser run, `DefaultTemplate.onChange` simultaneously marks `hasGlowedOnce` and invokes `fireTabGlow`. `fireTabGlow` intentionally unmounts animated paths, then mounts them on the next animation frame. At the same moment the static steady neon path becomes eligible. The CSS trail starts at an opaque zero-length path and the bright pulse appears at 3%, creating a visible lifecycle discontinuity that reads as a spark/off/on before the sweep. The tab’s geometry was already stable at 176 × 40 px, so this is not a measurement or layout issue.

## Recommended implementation order, pending approval

1. Correct the first-key neon lifecycle with a minimal state/keyframe sequencing change, preserving the existing visual language and later glow behavior.
2. Stabilize the tab-strip shell: fixed trailing controls outside the scroll container for new-tab and overview access.
3. Add the compact OpenEditor-inspired overview glyph and a minimal tab list/popover that can activate and close tabs while retaining all existing safeguards.
4. Add auto-reveal of the active tab after creation or overview selection.
5. Stress-test many tabs, long names, narrow desktop widths, light/dark themes, keyboard flow, dirty-close confirmation, and exam locking before seeking manual review.
