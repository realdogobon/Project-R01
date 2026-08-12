---
name: Font + theme system
description: How fonts load, how themes apply colors, key bugs fixed, and the historical font-corruption incident.
---

## Font loading architecture
- `injectAllFonts()` in SettingsContext: loads `google_fonts.css` (self-hosted local woff2 files, not a Google CDN link), then injects @font-face for any FontOption with `mtFileName`.
- BUILT_IN_FONTS deduplicates against MONKEYTYPE_FONTS (BUILT_IN wins). If a BUILT_IN entry has no `mtFileName` and no `googleFamily` coverage in google_fonts.css, the font silently fails.
- `MONKEYTYPE_FONTS` in `src/constants/themes.ts` mirrors monkeytype's own `frontend/src/ts/constants/fonts.ts` config 1:1 (same keys/fileNames) — verified by diffing against the live monkeytype repo.

## Historical incident: all local webfonts were corrupted (fixed)
Every file in `public/assets/fonts/` (both the monkeytype-sourced woff2s and the Google Fonts subset files referenced by `google_fonts.css`) had been corrupted at some point in the file's history: each invalid byte was replaced with the UTF-8 replacement character sequence `EF BF BD`, inflating file size by ~1.8x and making the font either fail to parse or render as a fallback/garbled face.
**Why it matters:** if fonts look wrong again (missing glyphs, wrong shape, browser console OTS parse errors), check for this signature — `od -An -tx1 -N32 <file>` and look for repeated `ef bf bd` sequences — before assuming it's a code/config bug. This means something in the save/transfer path is round-tripping binary assets through a text/UTF-8 codec.
**How to apply:** if it recurs, do NOT try to "patch" the corrupted file — always re-fetch the exact original binary fresh (e.g. `raw.githubusercontent.com` for monkeytype fonts, `fonts.gstatic.com` for Google Fonts CSS2 API) and compare byte-for-byte size against the source before trusting a local asset file for anything binary (fonts, images, audio).

## Theme color architecture
- `applyDynamicThemeColors(themeId)` (exported from SettingsContext) applies 7 `--theme-*` CSS vars AND 4 `--typing-*` vars.
- Built-in themes (classic/mint/royal/dolch/sand/scarlet): `[bg, sub, main]` — bg/sub/main are the full palette. Text derived via `hexLuminance(bg) > 0.5 ? "#2c2e31" : "#d1d0c4"`.
- MonkeyType themes: full 7-field objects (bg/main/sub/subAlt/text/caret/error).
- `--theme-*` vars are set but not currently consumed by any CSS rule (available for future use). `--typing-*` vars ARE consumed by TypingScreen.

## Hover preview pattern
- Theme preview: `onMouseEnter={() => applyDynamicThemeColors(t.id)}` + `onMouseLeave={() => applyDynamicThemeColors(accent)}` on theme card buttons.
- Font preview: `onMouseEnter` sets `--app-font-family` to hovered font's cssFamily; `onMouseLeave` reverts to `selectedFont.cssFamily`.
- Keyboard/error sound preview: exported `previewClickSound(variantId, volume)` and `previewErrorSound(variantId, volume)` from useSoundEngine — module-level globals mean any caller can access buffers. Fires unconditionally on hover (no longer gated behind the sound-enabled toggle) so users can audition sounds without turning sound on.
- Ambient/background sound preview: exported `previewAmbientSound(id, volume, durationMs=6000)` and `stopAmbientPreview()` from useAmbientEngine — separate from the real persistent ambient mix (module-level `previewSource`/`previewGain`, not `activeSounds`), longer default duration than a click sound since it's meant to be heard as music. UI only triggers it when that track isn't already actually playing, to avoid double-triggering/disturbing a live mix.

**Why:** These are imperative DOM/WebAudio mutations, not React state — avoids re-renders on every hover while still updating the live UI/audio.
