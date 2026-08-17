# Notepads Status Bar — Source Notes

## Sources inspected

- Local cloned repository: `/home/ubuntu/notepads`
- Presentation markup: `src/Notepads/Views/MainPage/NotepadsMainPage.xaml`, lines 271–466
- Controller: `src/Notepads/Views/MainPage/NotepadsMainPage.StatusBar.cs`

## Confirmed presentation structure

The status bar is a lazily loaded 25 px-high `Grid` with eight columns: a leading auto/minimum-width state indicator, a flexible path column, and six trailing auto-width columns. The shared status text style uses 25 px height, `8,4,8,4` padding, 11 px normal-weight text, full opacity, and `SystemControlForegroundBaseMediumHighBrush` foreground.

The leading **file modification state** area is a hand-cursor tap target with accent iconography. It gains a low reveal-list background on hover and supplies a contextual reload-from-disk command.

The **path indicator** occupies the flexible column. It is interactive, fades to 0.7 opacity on hover, and supplies a contextual menu containing Reload from disk, Copy full path, Open containing folder, and Rename. Its menu removes the presenter border.

The following **modification indicator** is accent-colored, receives a reveal-list hover background, and supplies Preview text changes and Revert all changes commands in a borderless contextual menu.

## Audit scope to complete

The remaining markup must be inspected for the Line/Column control, zoom flyout/slider, line-ending menu, encoding menu, final state fields, and their controller-side initialization/state-update behavior. RoyScript must then be mapped against those same surfaces through source and live browser inspection.

## Completed Notepads control and behavior inventory

The remaining markup and controller confirm six additional status-bar surfaces:

1. **Line / column** is a hand-cursor, reveal-hover cell. Tapping it opens the Go To experience; it is not simply a passive readout.
2. **Zoom** is another hand-cursor, reveal-hover cell. Its borderless flyout contains Zoom Out and Zoom In commands, a synchronized slider, low/high percentage labels, a live percentage readout, and Restore Default Zoom. The controller clamps and synchronizes the slider with the persisted font zoom setting.
3. **Line ending** is an interactive contextual-menu cell. Its selectable alternatives are driven by the document setting and changing the selection updates the document line ending state.
4. **Encoding** is interactive. Its one-shot-built borderless menu provides nested Reopen with Encoding and Save with Encoding choices; the selected encoding is represented in the status bar.
5. **Shadow window / preview state** is a trailing state indicator. The code refreshes it together with the other document-dependent fields.
6. **Lifecycle and focus**: the whole bar is lazily created and refreshed through distinct updater methods. When a status-bar flyout closes, the controller returns focus to the editor, explicitly maintaining a desktop-editor interaction loop.

All interactive cells use a hand cursor and either a low reveal-list hover background or a restrained opacity transition. Every observed menu/flyout presenter removes its border, so the bar retains a clean, native Windows surface rather than looking like a collection of detached controls.
