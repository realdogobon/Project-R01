/**
 * DasKeyboard.tsx — the only file in this folder written for this app rather
 * than copied from the source repo. It does not touch any physics, RGB,
 * layout, or control logic — it just:
 *   1. Renders the raw `DasKeyboardApp` (itself an unmodified-logic copy of
 *      the source repo's App.tsx) inside a container.
 *   2. Applies an outer CSS `zoom` so the keyboard's on-screen footprint
 *      lines up with the Classic Keyboard's footprint, sized dynamically
 *      from the space the host page actually has available.
 *      This changes only the presentation size, never the keyboard's
 *      intrinsic width/height (CW/CH in engine.ts are untouched).
 *
 * Sound: real typing sound already fires from the app's typing engine
 * independent of which keyboard is on screen. `onKeyVirtualDown`/
 * `onKeyVirtualUp` are forwarded here so mouse clicks on this keyboard's
 * keys also trigger the same click sound as the Classic Keyboard.
 *
 * Sizing — corrected model:
 * `DasKeyboardApp.tsx` wraps its whole chassis in a 1066×388-ish box
 * (`CW`×`CH` from engine.ts) but then applies its own baked-in *internal*
 * `transform: scale(0.72)` to that box (see DasKeyboardApp.tsx, ~line 299).
 * `transform` shrinks only what's *painted*, never the element's *layout*
 * size, so the 1066px-wide box still reserves 1066px of layout — but the
 * keyboard art actually visible inside it is only 1066 × 0.72 ≈ 768px wide.
 * A previous version of this file used the raw 1066px box as "Das's native
 * width" when scaling Das up relative to Classic, without correcting for
 * that internal 0.72 shrink. That silently undid most of the intended
 * size boost — Das's *painted* content ended up barely bigger than
 * Classic's (instead of the intended ~1.5×), which is why Das could look
 * smaller than a real full-size board should, especially on large screens.
 * `DAS_PAINTED_NATIVE_W` below is the corrected reference: the box width
 * divided by that same internal 0.72, i.e. what's actually visible.
 *
 * Rather than re-deriving Classic's current zoom in JS (fragile — it lives
 * in Tailwind breakpoint classes on a different component we must not
 * touch), Das's zoom is now computed directly from the real pixel width
 * the host page hands it (`availableWidth`, measured by the parent
 * `KeyboardSection` via ResizeObserver — see TypingScreen.tsx). That zoom
 * is clamped so the *layout* box (`CW × zoom`) never exceeds the available
 * width, which is what guarantees Das can never get cut off/force a
 * scrollbar the way the old fixed per-breakpoint zoom values could on
 * narrow viewports — the same adaptive behavior Classic already has, just
 * driven by a measurement instead of fixed breakpoints. On generous
 * screens (large windows, fullscreen, F11) it grows up to `MAX_ZOOM`,
 * at which point Das's painted width is ~1.4–1.5× Classic's, appropriately
 * reflecting that it's a full-size board with a numpad next to a TKL one.
 *
 * Uses `zoom`, not `transform: scale`, so the element's layout box matches
 * what's actually painted — with `transform`, the parent's
 * `width: max-content` wrapper (see TypingScreen.tsx) sizes itself off the
 * un-scaled box while the visible keyboard paints at a different size,
 * which is what caused the original clipping/scrollbar bug this file
 * exists to avoid.
 */
import React, { useMemo } from "react";
import { DasKeyboardApp } from "./DasKeyboardApp";
import { CW } from "./engine";

// DasKeyboardApp's own hardcoded internal shrink (see file header above) —
// read here only as a known constant; DasKeyboardApp.tsx itself is never touched.
const DAS_INTERNAL_SCALE = 0.72;
const DAS_PAINTED_NATIVE_W = CW * DAS_INTERNAL_SCALE;

// The biggest zoom Das is allowed to reach even when there's abundant room,
// so it reads as "clearly the bigger, full-size board" without becoming
// cartoonish on ultra-wide monitors. At MAX_ZOOM, Das's painted width is
// DAS_PAINTED_NATIVE_W * MAX_ZOOM ≈ 1.4-1.5x Classic's own max painted width.
const MAX_ZOOM = 1.35;
// Never shrink smaller than this even on very narrow viewports, so the
// board stays legible; a truly tiny window may still need a touch of
// horizontal scroll at this floor, same as Classic does at its own floor.
const MIN_ZOOM = 0.42;
// Fraction of the measured available width the keyboard's layout box is
// allowed to occupy, leaving a small breathing margin either side.
const FIT_SAFETY = 0.96;
// Used only before the first real measurement arrives (initial paint),
// so there's no flash of an oversized keyboard.
const DEFAULT_ZOOM = 0.9;

export interface DasKeyboardProps {
  onKeyVirtualDown?: (code: string) => void;
  onKeyVirtualUp?: (code: string) => void;
  /** Measured available width (px) from the host page; see TypingScreen.tsx. */
  availableWidth?: number | null;
}

export function DasKeyboard({ onKeyVirtualDown, onKeyVirtualUp, availableWidth }: DasKeyboardProps) {
  const zoom = useMemo(() => {
    if (!availableWidth || availableWidth <= 0) return DEFAULT_ZOOM;
    const fitZoom = (availableWidth * FIT_SAFETY) / CW;
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fitZoom));
  }, [availableWidth]);

  return (
    <div
      data-keyboard-root
      className="flex justify-center select-none"
      style={{ zoom }}
    >
      <DasKeyboardApp onKeyVirtualDown={onKeyVirtualDown} onKeyVirtualUp={onKeyVirtualUp} />
    </div>
  );
}

DasKeyboard.displayName = "DasKeyboard";
