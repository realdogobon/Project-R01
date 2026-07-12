/**
 * DasKeyboard.tsx — the only file in this folder written for this app rather
 * than copied from the source repo. It does not touch any physics, RGB,
 * layout, or control logic — it just:
 *   1. Renders the raw `DasKeyboardApp` (itself an unmodified-logic copy of
 *      the source repo's App.tsx) inside a container.
 *   2. Applies an outer CSS `transform: scale(...)` so the keyboard's
 *      on-screen footprint lines up with the Classic Keyboard's footprint
 *      (same responsive-breakpoint pattern ClassicKeyboard already uses).
 *      This changes only the presentation size, never the keyboard's
 *      intrinsic width/height (CW/CH in engine.ts are untouched).
 *
 * Sound: real typing sound already fires from the app's typing engine
 * independent of which keyboard is on screen. `onKeyVirtualDown`/
 * `onKeyVirtualUp` are forwarded here so mouse clicks on this keyboard's
 * keys also trigger the same click sound as the Classic Keyboard.
 *
 * Sizing: a real Das Keyboard 4 (full size, with numpad) is about 22% wider
 * than the Classic Keyboard's TKL layout (no numpad), at roughly the same
 * height. Both keyboards' *unscaled* layout footprints were measured
 * directly (getBoundingClientRect at zoom:1): Das's SVG chassis (CW/CH from
 * engine.ts, plus this component's own top/bottom padding) is natively
 * 1066px wide; Classic's widest row + padding/border is natively ~828.5px
 * wide. Note: DasKeyboardApp.tsx has its own baked-in *internal*
 * `transform: scale(0.72)` (line ~299) that only shrinks what's painted
 * inside that 1066px box — `transform` never changes an element's layout
 * size — so it does NOT change the 1066px figure above and must not be
 * divided out here (an earlier version of this file incorrectly did that,
 * which is what made Das render far too large).
 *
 * So at every breakpoint: dasZoom = classicZoom × targetRatio ×
 * (828.5 / 1066) (Classic's native width ÷ Das's native width, to convert
 * "same zoom" into "same target ratio"). targetRatio is 1.5 rather than the
 * literal real-world 1.22 — at 1.22 Das rendered correctly proportioned but
 * visibly too small/toy-like on screen, so it's deliberately sized up while
 * keeping the same single-multiplier approach (≈1.166 today), so Das stays
 * proportionate to Classic if either one's numbers ever change. Height ends
 * up somewhat taller than Classic's at the same zoom — expected, since a
 * real Das Keyboard 4 has an extra top strip (logo/media keys/volume knob)
 * a TKL board doesn't have.
 *
 * Uses `zoom`, not `transform: scale`, so the element's layout box matches
 * what's actually painted — with `transform`, the parent's
 * `width: max-content` wrapper (see TypingScreen.tsx) sizes itself off the
 * un-scaled box while the visible keyboard paints at a different size,
 * which is what caused the clipping/scrollbar bug.
 */
import React from "react";
import { DasKeyboardApp } from "./DasKeyboardApp";

export interface DasKeyboardProps {
  onKeyVirtualDown?: (code: string) => void;
  onKeyVirtualUp?: (code: string) => void;
}

export function DasKeyboard({ onKeyVirtualDown, onKeyVirtualUp }: DasKeyboardProps) {
  return (
    <div
      data-keyboard-root
      className="flex justify-center select-none [zoom:0.84] sm:[zoom:0.89] md:[zoom:0.93] lg:[zoom:0.98] xl:[zoom:1.03]"
    >
      <DasKeyboardApp onKeyVirtualDown={onKeyVirtualDown} onKeyVirtualUp={onKeyVirtualUp} />
    </div>
  );
}

DasKeyboard.displayName = "DasKeyboard";
