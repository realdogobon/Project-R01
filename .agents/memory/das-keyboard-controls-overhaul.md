---
name: Das keyboard controls overhaul
description: Documents the redesigned Das Keyboard control interactions — ScrollLock switch cycling, knob color navigation, indicator dot, media backlit color.
---

## ScrollLock = switch type (Das-exclusive)

Implemented in `DasKeyboardApp.tsx` as a `useEffect` window keydown/keyup listener.
- Short press (< 500 ms): cycles `dasSwitchType` blue → brown → red → blue, AND calls global `setActiveSwitch` so the typing-engine sound profile matches immediately.
- Long press (≥ 500 ms): toggles `dasRgbEnabled` on/off.
- `e.preventDefault()` on keydown blocks all browser/engine side-effects.
- Key animation still plays via Keyboard.tsx's own independent window listener.
- ScrollLock lock-LED toggle removed from `Keyboard.tsx`'s `pressKey` — the LED stays permanently off (the key is repurposed, not a lock anymore).
- Handler only registers when Das keyboard is mounted — no effect on Classic.

**Why:** Triple-click on knob was unreliable (focus loss, drag threshold). ScrollLock: no OS intercept on any platform, never typed, fully preventable.

## Knob dot = pure switch-type indicator

`indicatorColor` and `indicatorShadow` in `DasKeyboardApp.tsx` now always read from `SWITCH_INDICATOR[activeSwitch]` regardless of `rgbEnabled`. The RGB-color branch was removed entirely.

**Why:** Dot should answer "which switch am I using?" not "what is my RGB color?" — those are unrelated concerns.

## RGB color navigation via knob

Three ways to cycle palette, all require RGB on + RGB focus:
1. **Knob single-click** (after 350 ms settle) — next color. Uses `rgbPaletteIndexRef` to read fresh index without stale closure.
2. **Knob horizontal scroll** (deltaX dominant) — left swipe = prev, right swipe = next. Vertical scroll unchanged (brightness). Split by `Math.abs(deltaX) > Math.abs(deltaY)`.
3. **Mute double-click** — unchanged, still cycles forward.

Knob triple-click no longer cycles switch type (moved to ScrollLock).

**Why:** User needed color cycling without removing brightness-via-scroll. Horizontal vs vertical scroll split is zero UI change and covers trackpad + tilt-wheel mice naturally. Single-click fills the previously unused click-count-1 slot.

## Media bar backlit

Old: Ambient = hardcoded `rgba(125,195,255,0.95)` blue, RGB = hardcoded `rgba(255,100,100,0.9)` red.

New:
- Ambient focus on = **white** `rgba(255,255,255,0.95)` — neutral, unambiguous "sound active."
- RGB focus on = **actual `dasRgbColor`** at `Math.min(0.95, 0.70 + rgbBrightness × 0.25)` opacity. Glow also uses the RGB color.
- Both use `[mr, mg, mb] = rgbColor` destructure computed once at render.

**How to apply:** When RGB color or brightness changes, the media bar updates automatically (it reads from render-time values, not refs).

## Key deps and refs added

- `rgbPaletteIndexRef` added alongside the existing `isCustomSlotRef` to give wheel + click handlers a fresh index without stale closures.
- `setDasSwitchType` and `setActiveSwitch` now destructured separately in DasKeyboardApp (previously `setDasSwitchType` was aliased to local `setActiveSwitch`, hiding the global setter).
