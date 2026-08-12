---
name: Das Keyboard dead after tab/model switch
description: Root cause and fixes for the bug where RGB, key animations, and controls all die after switching browser tabs or keyboard models in Settings.
---

## Root cause 1 — `activeRef` stuck `true` in StrictMode (primary killer)

`Keyboard.tsx` had a cleanup-only effect:
```ts
useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
```
React StrictMode's simulated-unmount fires this cleanup between the first and second effect invocations. It cancelled the pending animation frame but **never reset `activeRef.current = false`**. On the second (real) mount, the RGB effect called `ensureLoopRunning()` which checked `if (activeRef.current) return;` — saw `true` — and returned early forever. The loop was dead. All subsequent `pressKey()` calls also call `ensureLoopRunning()` and return early. RGB, key animations, button state changes — all dead.

**Fix**: the cleanup also sets `rafRef.current = 0; activeRef.current = false;` so the flag is clean for the next mount.

**Why only after a switch, not initial load?** On initial load, `rgbEnabled = false` by default, so the RGB effect calls `clearRgb()`, NOT `ensureLoopRunning()`. The stuck-flag scenario only triggers if `ensureLoopRunning()` is called before StrictMode's cleanup fires — which only happens when RGB is enabled (persisted from a previous session) and the keyboard remounts.

## Root cause 2 — `isFocused` never auto-recovers after tab/switch

After a tab switch or Settings modal close, the typing input loses focus → `isFocused = false`. Nothing automatically refocused it. The user had to click in the text area or press a key to get `handleGlobalKeyFocus` to call `inputEl.focus()`. Until then, the Das keyboard appeared "dead" even though the underlying loop was fine.

**Fix (tab switch)**: `visibilitychange` listener in `TypingScreen` refocuses input when tab becomes visible.

**Fix (keyboard switch)**: `useEffect` on `keyboardModel === "das_keyboard_4"` refocuses input 80ms after switching (delay lets the modal exit animation finish).

## Root cause 3 — rAF loop could stall while tab was hidden

Browser throttles rAF to 1 Hz (or 0) for hidden tabs. If the loop exited cleanly (`anyActive=false`, `activeRef=false`) while hidden, it would not restart automatically on return — RGB would be frozen until a key press.

**Fix**: `visibilitychange` + `window focus` listeners in `Keyboard.tsx` call `ensureLoopRunning()` when the tab/window regains visibility.

## Bonus — tick errors would permanently kill the loop

If `tick()` threw any exception (shouldn't happen normally, but defensive), `activeRef.current` would stay `true` with no running frame. Added `try/catch` around the entire tick body that resets both flags on error.

## Files changed
- `src/components/keyboard/das/Keyboard.tsx`
- `src/components/typing/TypingScreen.tsx`
