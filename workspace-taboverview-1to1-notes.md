# OpenEditor Tab Overview — Exact MainWindow.xaml Specification

## Primary source

The user supplied the actual `OpenEditor/MainWindow.xaml` on 2026-08-16. This note records only
the actual markup and paired code-behind contracts from that source, replacing the earlier
reconstruction study.

## Exact XAML structure

| OpenEditor element | Exact definition | RoyScript parity target |
|---|---|---|
| Overview flyout | `Placement="BottomEdgeAlignedRight"`, 8 px corners, 1 px divider border, 16 px padding, max width 800 px, max height 560 px, `AcrylicInAppFillColorDefaultBrush` background | Right-aligned floating acrylic overview positioned beneath its trigger, with matching dimensions and material hierarchy. |
| Panel stack | `StackPanel Spacing="10"` | Header-to-grid rhythm of 10 px. |
| Header | `Open tabs`, 16 px, semibold, primary text | Exact title typography and wording. |
| Empty state | `(no open tabs)`, 13 px, secondary text | Preserve source state even though RoyScript maintains at least one tab. |
| Overview grid | Clickable `GridView`; vertical scrolling; hidden horizontal scrolling | Responsive clickable card grid with vertical scrolling only. |
| Card | 220 × 152 px, 6 px corner radius, card fill, 1 px dynamic border | Exact card geometry and active-border contract. |
| Card title | 10/8/10/4 px margin, 13 px semibold, one line, character ellipsis | Exact title geometry and overflow behavior. |
| Preview inset | 10/0/10/10 px margin, 4 px corners, control fill, 1 px control stroke | Exact inset geometry and material. |
| Preview type | 7 px padding, 11 px Consolas, wrap, 8 lines, character ellipsis, secondary text | 11 px monospace preview with 8-line crop in the inset. |
| Overflow button | `Content="&#xE7C4;"`, `Segoe MDL2 Assets`, 10/6 px padding, transparent, no border | Exact Windows `E7C4` **TaskView** glyph, native-feeling 10/6 px hit area, transparent no-border treatment. |
| Native add button | `TabView IsAddTabButtonVisible="True"` | The existing new-tab behavior shown with the source's clean native `+` treatment. |

## Exact interaction contract from MainWindow.xaml.cs

`TabsOverflow_Click` creates one card per tab in strip order. Every card receives its title,
dirty state, active state, and `BuildOverviewPreview(tab.Editor.Text)`. Previews show the first ten
source lines, capped at 900 characters. Activating a card hides the flyout and switches to that tab.
OpenEditor additionally enables drag-reorder in the overview grid; it is intentionally **not** being
ported because the user previously excluded reorder, and the current task explicitly requires
preserving RoyScript's existing tab behavior rather than adding new tab-management capabilities.

## User-confirmed fidelity decisions

1. The supplied XAML is the only design authority: no reconstruction and no substitute glyph.
2. Live previews are required to match OpenEditor.
3. The overview contains no per-card close control. RoyScript's existing tab-strip close action and
   dirty-state guard remain the only close path.
4. Existing exam locking, active-tab reveal, keyboard creation/switching, and first-key neon lifecycle
   must remain untouched.

## Constraints retained from the project

No changes outside the workspace tab system. Do not alter scanner behavior, Practice Mode, keyboard
styling, settings, or OCR. No checkpoint or Git operation before explicit manual approval.

## External glyph reference

Microsoft's Segoe MDL2 Assets reference identifies `E7C4` as **TaskView**. The source XAML remains
the styling authority; the reference only verifies the glyph's public name and code point:
https://learn.microsoft.com/en-us/windows/apps/design/iconography/segoe-ui-symbol-font

## Implemented port and live verification — 2026-08-16

The workspace now carries the supplied OpenEditor `TabView` model into the browser implementation: the fixed overflow control uses the XAML `E7C4` TaskView glyph and the fixed add control uses the native `E710` Add glyph, both through `Segoe MDL2 Assets` when that exact Windows system font is present. A small visual fallback is supplied only for non-Windows browsers that do not carry Microsoft’s system font; it does not replace the native font glyph on Windows.

The overview viewport is right-anchored and acrylic-style, with the supplied 800 px maximum width, 560 px maximum height, 16 px inset, 8 px outer radius, `Open tabs` heading, 10 px stack rhythm, and vertical-only grid scrolling. Cards use the supplied 220 × 152 px geometry, 6 px radius, active accent border, dirty `●` suffix, and no per-card close control. The preview derives the first ten source lines from each tab, caps at 900 characters, and is constrained visually to eight 11 px Consolas-compatible preview lines. The active card reads from the live editor state rather than waiting for a tab switch.

The final multi-tab live browser stress run passed all 14 checks: tab overflow, fixed control position, overview cardinality, overview selection, keyboard creation, active-tab visibility after keyboard and exam-created tabs, absence of overview close controls, dirty-state confirmation through the real tab-strip close control, dark-mode continuity, exam locking, and zero console errors. TypeScript and all 16 Vitest assertions also passed before final visual review.

## Browser-safe glyph tracing and workspace reset — 2026-08-16

The supplied `E7C4` TaskView and `E710` Add marks will be drawn from the actual official Segoe MDL2 outlines, rather than from a visually similar browser fallback. The official Microsoft font package identifies `E7C4` as TaskView and maps the glyph to the 2048-unit outline bounded by `x=171..1877`, `y=427..1621`; the same package maps `E710` to the 2048-unit Add outline. These outlines will be embedded as semantic inline SVG paths with the source 2048-unit viewbox, preserving the supplied XAML glyph geometry without asking browsers to carry Microsoft’s proprietary font.

At the user's explicit request, the saved `typing_suite_state_<account>` snapshot will be migrated once to a single clean `New Document` tab. The migration removes only document-tab/editor and stale exam-tab state; it retains the current account, application preferences, practice configuration, scanner/library records, credentials, and all other local browser storage. A schema stamp ensures later tabs are persisted normally and are never cleared again.
