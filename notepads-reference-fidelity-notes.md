# Notepads Reference Fidelity Notes

## Ground Truth Observed

The Notepads Settings implementation is not a grid of category cards. It is a compact WinUI `NavigationView` with `PaneDisplayMode="LeftCompact"`, `IsPaneOpen="False"`, `OpenPaneLength="200"`, four vertically stacked navigation items, and a separate settings content frame. The category list uses a small monochrome glyph column, a narrow active indicator, and a simple selected background state rather than rounded card containers.

The Settings shell itself uses a two-row composition: a 60px title row with 18px horizontal margins and a 1px bottom divider, followed by a content frame. The light theme uses a near-white `WhiteSmoke` panel surface; the dark theme uses `#222222`. The content typography is comparatively large and calm, with a clear page title and thin divider before the active settings page.

The exact reference categories are **Text & Editor**, **Personalization**, **Advanced**, and **About**. Their source glyphs are Segoe MDL2 Assets glyphs `F17F`, `E771`, `E9E9`, and `E946`, respectively. The left navigation item template is 40px high, uses a 48px icon column, a 6px active selection indicator with 24px height, and text content padding rather than rounded card padding.

The light-theme screenshot confirms that Notepads keeps the editor visible while a settings page occupies a clean right-side surface. The settings page uses large section headings, thin horizontal rules, restrained radio/toggle controls, native-looking sliders, and generous vertical rhythm. The visual language is Fluent/WinUI: square or lightly softened geometry, minimal shadows, neutral surfaces, and an accent color applied to the active indicator and selected controls. It does not use the current RoyScript category-card treatment.

## Replication Consequence

RoyScript should replace the current six rounded category cards with a Notepads-style compact navigation rail and a distinct content surface. RoyScript’s existing controls can remain inside the content surface, but the shell, geometry, icon scale, active indicator, divider treatment, title hierarchy, and right-side composition must follow this reference rather than an invented card-grid interpretation.

## RoyScript Fidelity Smoke Findings

The desktop category-rail capture now shows the intended right-edge full-height surface, 60px title row, 48px navigation column, 6px active indicator, monochrome glyph stack, and flat detail rows. The existing Appearance controls remain functional and visually recognizable inside the adapted content frame.

The nested Themes capture was taken during the 180ms detail transition and therefore appears temporarily faded; this is a probe-timing artifact rather than evidence of missing content. The probe itself waits for the settled state and passes the Themes assertion with zero browser errors. A settled screenshot should be taken before final delivery.

The settled Themes capture confirms that nested RoyScript controls remain intact within the new shell: the Notepads-style title/back row, compact glyph rail, flat content surface, two-column theme choices, and existing theme swatches all fit without clipping at 1280px.

The 375px capture confirms that the full-height Settings surface remains readable on a narrow viewport. The compact icon rail stays 48px wide, the title row remains stable, and the existing Appearance controls do not overflow horizontally.
