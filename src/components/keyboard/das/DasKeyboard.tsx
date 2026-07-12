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
      className="flex justify-center select-none scale-[1.14] sm:scale-[1.20] md:scale-[1.26] lg:scale-[1.33] xl:scale-[1.39] origin-center transition-transform duration-300"
    >
      <DasKeyboardApp onKeyVirtualDown={onKeyVirtualDown} onKeyVirtualUp={onKeyVirtualUp} />
    </div>
  );
}

DasKeyboard.displayName = "DasKeyboard";
