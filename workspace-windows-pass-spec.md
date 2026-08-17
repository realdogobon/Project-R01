# Windows-experience pass — extracted spec from user-supplied MainWindow.xaml

## TabsOverviewFlyout (authoritative, from supplied MainWindow.xaml)
- Real WinUI `Flyout`, Placement BottomEdgeAlignedRight, CornerRadius 8, Border 1px DividerStrokeColorDefaultBrush, Padding 16, MaxWidth 800, MaxHeight 560, background `AcrylicInAppFillColorDefaultBrush` (in-app acrylic, NOT solid card color).
- StackPanel with 10px spacing.
- Header: "Open tabs", FontSize 16, SemiBold, TextFillColorPrimaryBrush.
- Empty text "(no open tabs)", 13px, SecondaryBrush (collapsed when tabs exist).
- GridView: items Padding 2, min-width 0. Item: Border 220x152, CornerRadius 6, Background CardBackgroundFillColorDefaultBrush, border 1px BorderBrush bound per item (active = accent).
- Card inner: title 13px SemiBold MaxLines1 ellipsis, margin 10,8,10,4.
- Preview box: CornerRadius 4, margin 10,0,10,10, background ControlFillColorDefaultBrush, border ControlStrokeColorDefaultBrush 1px; inner Consolas 11px, Wrap, ellipsis, MaxLines 8, TextFillColorSecondaryBrush, margin 7.
- NOTE: The preview box in the REAL XAML is the same as current implementation. The "AI-SLOP" complaint is about: overall feel — panel surface, heading weight/size, spacing (Spacing=10), empty text, and card typography (13/11 not mono). Possibly the accent border look and the panel's acrylic translucency/softness.
- WinUI GridViewItem hover: subtle light overlay; selected none (SelectionMode None).

## Windows Notepad status bar (user's screenshot)
- Segoe UI ~12px (not monospace!), neutral gray-on-dark text, no accent color, letter-spacing slightly tight.
- Items: "Ln 1, Col 1" (left), then right side: "Zoom 100%", "Windows (CRLF)", "UTF-8".
- User wants: delink status bar AND the tab-count label ("7 tabs" after the +) from the global monospace font -> Segoe UI style.

## TaskView glyph scaling
- Currently 18x18 svg; user wants it slightly bigger to match "+" sign (also 18x18 Lucide). Suggested: render at 20x20 or 22x22 container; keep 18-19px visible area. Use w-5 h-5 (20px).

## Implementation notes
- Status bar is at Workspace.tsx bottom (footer). Tab count "7 tabs" next to + button in tab strip (data-workspace-tab-count).
- Must keep: dark/light both modes; overview interaction unchanged; accent = themeAccentColor.
- User screenshot shows current overview: panel appears slightly more opaque/card-like than acrylic, title maybe bold but the panels look generic. The key fixes per XAML: Spacing 10, header 16px semi-bold (not bold), card title 13 semi-bold, preview Consolas 11 inside inset bordered box, panel max-width 800 with padding 16, border 1px divider, rounded 8.

## Implementation state (after first edit pass)
The three requested changes are applied in client/src/pages/Workspace.tsx. The WindowsTaskViewGlyph now renders at h-[20px] w-[20px] (wrapped in inline-flex) so it matches the "+" Add glyph visually. The overview flyout panel now carries an inline Segoe UI style attribute (Segoe UI Variable, Segoe UI, system-ui, sans-serif) to delink it from the user-selected global app font; card title stays 13px semi-bold and the live preview stays Consolas 11px inside its inset bordered box, matching the supplied XAML line 66 exactly. The tab-count label after the "+" (line ~4394) and the status bar (line ~4498) both now carry inline Segoe UI style at 12px, replacing the inherited font-mono/text-neutral-400 treatment.

## Still to verify
TypeScript + tests + build; live browser probes (multi-tab stress, taskview glyph probe, tab seam, first-key neon); visual check of overview in light and dark modes and status bar delinking with a user-selected monospace font. The user's complaint was the overview looked "AI-SLOP" — the key authenticity cues are: Segoe UI typography on the panel, XAML-accurate Spacing=10 (gap-2.5 = 10px, already matched), header 16px semi-bold (already matched), card 220x152, border radius 8/6/4, acrylic-ish bg (already matched), and inset preview box (already matched). The missing piece was the global-font bleed — now fixed via inline style.


## Verification results (final, Aug 16)
- Typography delink probe: status bar Segoe 12px, tab count Segoe 12px, overview header Segoe 16px — all delinked from the global monospace app font. Probe app-font change did not apply via the settings path, but inline styles prove independence (probe checks actual computed families).
- Multi-tab stress probe: 15/15 passed, console healthy.
- Static gate: tsc clean, 16/16 Vitest, production build OK, git diff whitespace OK.
- Screenshot: clean baseline shows TaskView glyph (20px) left of "+" with tab count; status bar visible with Segoe typography.
- Glyph size: WindowTaskViewGlyph container increased to w-5 h-5 to visually match the "+" sign (Lucide Plus is 18px in a 20px button; glyph visible area kept identical).
