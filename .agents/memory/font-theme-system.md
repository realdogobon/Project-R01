---
name: Font + theme system
description: How fonts load, how themes apply colors, key bugs fixed and corrupted file note.
---

## Font loading architecture
- `injectAllFonts()` in SettingsContext: loads `google_fonts.css` (covers JB Mono, Fira Code, Space Grotesk, IBM Plex Mono, Inter Tight, Nunito, Atkinson Hyperlegible — all hashed .woff2 files ARE present locally), then injects @font-face for any FontOption with `mtFileName`.
- BUILT_IN_FONTS deduplicates against MONKEYTYPE_FONTS (BUILT_IN wins). If a BUILT_IN entry has no `mtFileName` and no `googleFamily` coverage in google_fonts.css, the font silently fails.
- `GeistMono-Medium.woff2` is corrupt (OTS: decompressed size < compressed). geist-mono entry removed its `mtFileName` and uses `ui-monospace, 'Cascadia Code', monospace` as cssFamily fallback.
- `SourceCodePro-Regular.woff2` is valid and used via `mtFileName` (NOT in google_fonts.css).

## Theme color architecture
- `applyDynamicThemeColors(themeId)` (exported from SettingsContext) applies 7 `--theme-*` CSS vars AND 4 `--typing-*` vars.
- Built-in themes (classic/mint/royal/dolch/sand/scarlet): `[bg, sub, main]` — bg/sub/main are the full palette. Text derived via `hexLuminance(bg) > 0.5 ? "#2c2e31" : "#d1d0c4"`.
- MonkeyType themes: full 7-field objects (bg/main/sub/subAlt/text/caret/error).
- `--theme-*` vars are set but not currently consumed by any CSS rule (available for future use). `--typing-*` vars ARE consumed by TypingScreen.

## Hover preview pattern
- Theme preview: `onMouseEnter={() => applyDynamicThemeColors(t.id)}` + `onMouseLeave={() => applyDynamicThemeColors(accent)}` on theme card buttons.
- Font preview: `onMouseEnter` sets `--app-font-family` to hovered font's cssFamily; `onMouseLeave` reverts to `selectedFont.cssFamily`.
- Sound preview: exported `previewClickSound(variantId, volume)` and `previewErrorSound(variantId, volume)` from useSoundEngine — module-level globals mean any caller can access buffers. Guard with `if (soundEnabled)` before calling.

**Why:** These are imperative DOM mutations, not React state — avoids re-renders on every hover while still updating the live UI.
