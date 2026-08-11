/**
 * DasKeyboardApp.tsx — copied 1:1 from the source repo's App.tsx
 * (realdogobon/Das-Keyboard-SImulator, artifacts/keyboard/src/App.tsx).
 * All physics, RGB, knob/media-bar/LED behavior and visuals are untouched.
 *
 * The only changes from the original App.tsx:
 *  1. Renamed the default export to a named `DasKeyboardApp` function
 *     component so it can be embedded instead of mounted as a standalone page.
 *  2. Removed the outer full-page wrapper div (`minHeight: "100vh"`, black
 *     page background) since this now renders inside the app's typing
 *     screen rather than as its own page.
 *  3. Added two optional props, `onKeyVirtualDown` / `onKeyVirtualUp`, which
 *     are forwarded to the underlying `<Keyboard>` component (which already
 *     supported them) so the host app can hook its own click-sound engine —
 *     this is the only "sound wiring" requested; no sound code lives here.
 * No other logic, layout, or styling was modified.
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { Keyboard } from "./Keyboard";
import {
  CW, CH, CHASSIS_D, SWITCH_INDICATOR, RGB_PRESETS, RGB_EFFECTS,
  hslToRgb, type RgbEffect,
} from "./engine";
import { useSettings } from "../../../contexts/SettingsContext";
import { AMBIENT_SOUND_IDS } from "../../../constants/ambientSounds";

// ── Ambient dual-purpose mode ────────────────────────────────────────────
// RGB and Ambient Focus (the app's background-sound feature) are two
// independent subsystems that share one physical control cluster (knob,
// Sleep/Mute double-click, media bar). Sleep and Mute's *single*-click
// layer always controls RGB directly, untouched. Everything else — the
// knob, Sleep/Mute's double-click, and the whole media bar — acts on
// whichever subsystem currently has "control focus" (see the focus
// comment below), not on whichever one happens to be switched on, so one
// system never has to be off for the other to be reachable. Full behavior
// is documented for end users in `keyboard-controls.md` at the project root.
const AMBIENT_VOLUME_STEP = 0.20; // fixed nudge size for Mute's ambient-volume double-click

// ── Control focus ───────────────────────────────────────────────────────
// The shared control cluster (knob, Sleep/Mute double-click, media bar) now
// acts on whichever subsystem is "focused" — RGB or Ambient Focus — rather
// than inferring it from whether Ambient Focus happens to be on. Focus is
// switched explicitly (double-click Play/Pause) and persists in
// SettingsContext, independent of either subsystem's own on/off state. This
// is what makes both systems usable side-by-side: Ambient can keep playing
// while focus sits on RGB to tweak color/effect, then flip back.
//
// Settle-window click counting (used here for the knob's triple-click and
// Play/Pause's double-click) replaces the old 3-second knob long-press for
// switch-type cycling — a sustained hold with zero mouse movement over 3
// full seconds turned out to be unreliable in a browser (focus loss, drag
// threshold interference, timer clearing edge cases). Discrete click counts
// use the same short debounce window already proven reliable for Sleep and
// Mute's double-click handling elsewhere in this file.
const CLICK_SETTLE_MS = 350;

function Chassis() {
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", filter:"drop-shadow(0 12px 16px rgba(0,0,0,0.55))" }}>
      <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`}>
        <defs>
          <linearGradient id="chassisGrad" x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0%" stopColor="#2e2e32" />
            <stop offset="15%" stopColor="#242428" />
            <stop offset="45%" stopColor="#1e1e22" />
            <stop offset="100%" stopColor="#161618" />
          </linearGradient>
          <linearGradient id="surfaceSheen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="30%" stopColor="rgba(255,255,255,0.03)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="70%" stopColor="rgba(255,255,255,0.03)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <filter id="powderTexture" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="2.8" numOctaves="3" stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 -1 0.12" result="low" />
            <feComposite operator="in" in="low" in2="SourceGraphic" />
          </filter>
        </defs>
        <path d={CHASSIS_D} fill="url(#chassisGrad)" stroke="#161618" strokeWidth="0.5" strokeLinejoin="round" />
        <path d={CHASSIS_D} fill="transparent" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" strokeLinejoin="round" />
        <path d={CHASSIS_D} fill="url(#surfaceSheen)" />
        <path d={CHASSIS_D} fill="#fff" filter="url(#powderTexture)" opacity="0.22" />
        <path d={CHASSIS_D} fill="#000" filter="url(#powderTexture)" opacity="0.12" />
        <mask id="oeOnly">
          <rect x="-50" y="-50" width={CW+100} height={CH+100} fill="white" />
          <path d={CHASSIS_D} fill="black" />
        </mask>
        <path d={CHASSIS_D} fill="transparent" stroke="rgba(255,255,255,0.14)" strokeWidth="0.5" mask="url(#oeOnly)" transform="translate(0,-0.4)" />
      </svg>
    </div>
  );
}

export interface DasKeyboardAppProps {
  onKeyVirtualDown?: (code: string) => void;
  onKeyVirtualUp?: (code: string) => void;
}

export function DasKeyboardApp({ onKeyVirtualDown, onKeyVirtualUp }: DasKeyboardAppProps) {
  const [locks, setLocks] = useState({ NumLock: false, ScrollLock: false, CapsLock: false });
  const [mediaPressedBtn, setMediaPressedBtn] = useState<"prev"|"play"|"next"|null>(null);
  const [rotation, setRotation] = useState(() => 1 * 360);

  // ── Persisted Das Keyboard state — switch type, every RGB setting, and
  // Ambient Focus's own on/off + volume + control focus all live in
  // SettingsContext (mounted once at the app root) rather than local
  // component state, so none of it resets when this component unmounts —
  // switching to Classic and back, an exam remount, a crash/reload. See
  // the header comment above and keyboard-controls.md section 6.
  const {
    dasSwitchType: activeSwitch, setDasSwitchType, setActiveSwitch,
    dasRgbEnabled: rgbEnabled, setDasRgbEnabled: setRgbEnabled,
    dasRgbEffect, setDasRgbEffect,
    dasRgbPaletteIndex: rgbPaletteIndex, setDasRgbPaletteIndex: setRgbPaletteIndex,
    dasRgbColor: rgbColor, setDasRgbColor: setRgbColor,
    dasRgbCustomHue: rgbCustomHue, setDasRgbCustomHue: setRgbCustomHue,
    dasRgbBrightness: rgbBrightness, setDasRgbBrightness: setRgbBrightness,
    dasControlFocus: focus, setDasControlFocus: setFocus,
    zenNoiseEnabled: ambientOn, setZenNoiseEnabled: setAmbientOn,
    zenNoiseVolume: ambientVolume, setZenNoiseVolume: setAmbientVolume,
    ambientMix, setAmbientMix, savedAmbientMixes,
  } = useSettings();
  const rgbEffect = dasRgbEffect as RgbEffect;
  const setRgbEffect = (updater: RgbEffect | ((prev: RgbEffect) => RgbEffect)) => {
    setDasRgbEffect(typeof updater === "function" ? (updater as (prev: RgbEffect) => RgbEffect)(rgbEffect) : updater);
  };
  const [ambientFlash, setAmbientFlash] = useState({ knob: false, sleep: false, mute: false, media: false });

  const swRef = useRef(activeSwitch); swRef.current = activeSwitch;
  const rgbEnabledRef = useRef(rgbEnabled); rgbEnabledRef.current = rgbEnabled;
  const rgbEffectRef = useRef(rgbEffect); rgbEffectRef.current = rgbEffect;
  const rgbBrightnessRef = useRef(rgbBrightness); rgbBrightnessRef.current = rgbBrightness;
  const rgbCustomHueRef = useRef(rgbCustomHue); rgbCustomHueRef.current = rgbCustomHue;
  const rgbPaletteIndexRef = useRef(rgbPaletteIndex); rgbPaletteIndexRef.current = rgbPaletteIndex;
  const isCustomSlotRef = useRef(rgbPaletteIndex === RGB_PRESETS.length); isCustomSlotRef.current = rgbPaletteIndex === RGB_PRESETS.length;
  const focusRef = useRef(focus); focusRef.current = focus;
  const ambientOnRef = useRef(ambientOn); ambientOnRef.current = ambientOn;
  const ambientVolumeRef = useRef(ambientVolume); ambientVolumeRef.current = ambientVolume;
  const savedAmbientMixesRef = useRef(savedAmbientMixes); savedAmbientMixesRef.current = savedAmbientMixes;

  const dragStartBrightness = useRef(0);
  const dragStartVolume = useRef(0);
  const knobMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const knobUpHandlerRef = useRef<(() => void) | null>(null);
  const isDraggingRef = useRef(false);
  // Settle-window click counter: resolves to a double-click (toggle) or a
  // triple-click (cycle switch type) once no further click arrives within
  // CLICK_SETTLE_MS — see the header comment on CLICK_SETTLE_MS for why
  // this replaced the old 3-second hold-to-cycle-switch-type gesture.
  const knobClickCountRef = useRef(0);
  const knobClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const knobModeRef = useRef<"brightness" | "hue">("brightness");
  const sleepClickCountRef = useRef(0);
  const sleepClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const muteClickCountRef = useRef(0);
  const muteClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Same settle-window pattern for the media bar's Play/Pause button:
  // single click toggles the focused subsystem on/off, double-click swaps
  // which subsystem (RGB vs Ambient) the shared controls are focused on.
  const playClickCountRef = useRef(0);
  const playClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Remembers the volume you were at before a knob-double-click mute, so the
  // matching double-click un-mute restores it instead of guessing a value.
  const ambientPreMuteVolumeRef = useRef<number | null>(null);
  // Position in the combined [saved presets ...(newest first), individual
  // tracks ...] browse list the media bar's prev/next steps through.
  const ambientBrowseIndexRef = useRef(0);
  const ambientFlashTimers = useRef<Partial<Record<"knob"|"sleep"|"mute"|"media", ReturnType<typeof setTimeout>>>>({});

  // Briefly rings the given control with a subtle glow so an ambient action
  // (which has no other visual feedback the way an RGB change does) still
  // confirms it registered.
  const flashAmbient = useCallback((key: "knob"|"sleep"|"mute"|"media") => {
    setAmbientFlash(f => ({ ...f, [key]: true }));
    if (ambientFlashTimers.current[key]) clearTimeout(ambientFlashTimers.current[key]);
    ambientFlashTimers.current[key] = setTimeout(() => {
      setAmbientFlash(f => ({ ...f, [key]: false }));
    }, 260);
  }, []);

  useEffect(() => () => {
    if (knobClickTimerRef.current) clearTimeout(knobClickTimerRef.current);
    if (sleepClickTimerRef.current) clearTimeout(sleepClickTimerRef.current);
    if (muteClickTimerRef.current) clearTimeout(muteClickTimerRef.current);
    if (playClickTimerRef.current) clearTimeout(playClickTimerRef.current);
    (Object.values(ambientFlashTimers.current) as Array<ReturnType<typeof setTimeout> | undefined>).forEach(t => t && clearTimeout(t));
    // Guard against unmounting mid-drag: the knob's mousemove/mouseup
    // listeners live on `document` (added imperatively in handleKnobMouseDown,
    // not via a React effect), so React's own cleanup can't see them.
    if (knobMoveHandlerRef.current) document.removeEventListener("mousemove", knobMoveHandlerRef.current);
    if (knobUpHandlerRef.current) document.removeEventListener("mouseup", knobUpHandlerRef.current);
  }, []);

  // Keeps the knob's visual rotation matched to whichever value it's
  // currently dialing — ambient volume while focus is on Ambient, RGB
  // brightness otherwise — so it never shows a stale angle left over from
  // the other mode when you switch focus.
  //
  // rgbBrightness and ambientVolume are explicit deps (not refs) so this
  // effect re-fires when SettingsContext hydrates from localStorage on the
  // first load, correcting the initial rotation from the default value (1)
  // to whatever was actually persisted. Without these deps the rotation
  // effect only fires when focus changes, so the knob stays visually wrong
  // until the user interacts with it or switches focus.
  useEffect(() => {
    setRotation((focus === "ambient" ? ambientVolume : rgbBrightness) * 360);
  }, [focus, ambientVolume, rgbBrightness]);

  useEffect(() => {
    const clear = () => setMediaPressedBtn(null);
    window.addEventListener("mouseup", clear);
    window.addEventListener("blur", clear);
    return () => { window.removeEventListener("mouseup", clear); window.removeEventListener("blur", clear); };
  }, []);

  // ── Knob handlers — drag = RGB brightness (or hue on the custom RGB
  //    slot) / Ambient volume depending on focus, scroll = the same in
  //    small steps, double-click = toggle the focused subsystem on/off,
  //    triple-click = cycle switch type (unconditional, either focus). ──
  const handleKnobMouseDown = useCallback((e: React.MouseEvent) => {
    dragStartBrightness.current = rgbBrightnessRef.current;
    dragStartVolume.current = ambientVolumeRef.current;
    isDraggingRef.current = false;
    knobModeRef.current = (isCustomSlotRef.current && rgbEnabledRef.current) ? "hue" : "brightness";

    const startHue = rgbCustomHueRef.current;
    const startY = e.clientY;

    const move = (mv: MouseEvent) => {
      const deltaY = mv.clientY - startY;
      if (Math.abs(deltaY) > 4 && !isDraggingRef.current) {
        isDraggingRef.current = true;
      }
      if (isDraggingRef.current) {
        if (focusRef.current === "ambient") {
          const nv = Math.min(1, Math.max(0, dragStartVolume.current + (-deltaY/150)));
          setRotation(nv*360);
          setAmbientVolume(nv);
        } else if (knobModeRef.current === "hue") {
          const newHue = ((startHue + (-deltaY/150)*360) % 360 + 360) % 360;
          rgbCustomHueRef.current = newHue;
          setRgbCustomHue(newHue);
          setRgbColor(hslToRgb(newHue, 1, 0.5));
        } else {
          const nv = Math.min(1, Math.max(0, dragStartBrightness.current + (-deltaY/150)));
          setRotation(nv*360);
          setRgbBrightness(nv);
        }
      }
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      knobMoveHandlerRef.current = null;
      knobUpHandlerRef.current = null;
      if (!isDraggingRef.current) {
        knobClickCountRef.current++;
        if (knobClickTimerRef.current) clearTimeout(knobClickTimerRef.current);
        // Wait out the settle window before acting, so a 3rd click landing
        // just after the 2nd can still upgrade this into a triple-click
        // instead of the double-click action having already fired.
        knobClickTimerRef.current = setTimeout(() => {
          const count = knobClickCountRef.current;
          knobClickCountRef.current = 0;
          if (count === 1) {
            // Single-click in RGB mode: advance to the next color in the
            // palette. No-op while focus is on Ambient or RGB is off — the
            // knob's visual affordance is brightness/volume so a click that
            // does nothing in those states avoids surprising the user.
            if (focusRef.current === "rgb" && rgbEnabledRef.current) {
              const total = RGB_PRESETS.length + 1; // +1 for custom hue slot
              const next = (rgbPaletteIndexRef.current + 1) % total;
              if (next < RGB_PRESETS.length) setRgbColor(RGB_PRESETS[next]);
              setRgbPaletteIndex(next);
            }
          } else if (count >= 2) {
            if (focusRef.current === "ambient") {
              if (ambientVolumeRef.current > 0.001) {
                ambientPreMuteVolumeRef.current = ambientVolumeRef.current;
                setRotation(0);
                setAmbientVolume(0);
              } else {
                const restore = ambientPreMuteVolumeRef.current ?? 0.5;
                ambientPreMuteVolumeRef.current = null;
                setRotation(restore*360);
                setAmbientVolume(restore);
              }
              flashAmbient("knob");
            } else {
              setRgbEnabled(!rgbEnabledRef.current);
            }
          }
        }, CLICK_SETTLE_MS);
      }
    };
    knobMoveHandlerRef.current = move;
    knobUpHandlerRef.current = up;
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }, [flashAmbient, setDasSwitchType, setActiveSwitch, setAmbientVolume, setRgbEnabled, setRgbColor, setRgbPaletteIndex]);

  const handleKnobWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    // Horizontal scroll (trackpad two-finger left/right swipe, or a tilt
    // wheel) cycles through the RGB color palette when focus is on RGB and
    // RGB is on. We pick the dominant axis so a diagonal gesture never
    // triggers both actions at once. deltaX > 0 = swipe left = previous
    // color; deltaX < 0 = swipe right = next color (natural trackpad
    // direction: swipe right to go forward).
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      if (focusRef.current === "rgb" && rgbEnabledRef.current) {
        const total = RGB_PRESETS.length + 1; // +1 for custom hue slot
        const dir = e.deltaX > 0 ? -1 : 1;   // right swipe → next
        const next = (rgbPaletteIndexRef.current + dir + total) % total;
        if (next < RGB_PRESETS.length) setRgbColor(RGB_PRESETS[next]);
        setRgbPaletteIndex(next);
      }
      return;
    }
    // Vertical scroll → brightness (RGB focus) or volume (Ambient) — unchanged.
    if (focusRef.current === "ambient") {
      const nv = Math.min(1, Math.max(0, ambientVolumeRef.current + (e.deltaY>0?-0.02:0.02)));
      setRotation(nv*360);
      setAmbientVolume(nv);
      return;
    }
    const nv = Math.min(1, Math.max(0, rgbBrightnessRef.current + (e.deltaY>0?-0.02:0.02)));
    setRotation(nv*360);
    setRgbBrightness(nv);
  }, [setAmbientVolume, setRgbBrightness, setRgbColor, setRgbPaletteIndex]);

  // ── ScrollLock key — Das-exclusive switch-type cycling ─────────────────
  // This component only mounts when the Das keyboard is active, so this
  // listener is automatically scoped to Das — it silently does nothing on
  // the Classic keyboard because it never registers.
  //
  // Short press (keyup before 500 ms): advance switch type blue→brown→red→blue.
  // Also updates the global activeSwitch so the typing-engine sound profile
  // (which reads from that field) matches the new physics immediately.
  //
  // Long press (key held ≥ 500 ms): toggle RGB on/off as a secondary action.
  // The long-press fires on the timer while the key is still held down;
  // keyup then sees the flag and skips the short-press action so the two
  // gestures never collide.
  //
  // e.preventDefault() on keydown blocks every other side-effect: the
  // browser never sees it as a ScrollLock toggle, and the typing engine
  // never processes it as a keystroke. The key animation still plays because
  // Keyboard.tsx's own window-keydown listener fires (it was registered
  // independently and e.preventDefault does NOT stop propagation).
  useEffect(() => {
    const timerRef = { current: null as ReturnType<typeof setTimeout> | null };
    const longPressedRef = { current: false };
    const LONG_PRESS_MS = 500;

    const onDown = (e: KeyboardEvent) => {
      if (e.code !== "ScrollLock" || e.repeat) return;
      e.preventDefault();
      longPressedRef.current = false;
      timerRef.current = setTimeout(() => {
        longPressedRef.current = true;
        // Long press → toggle RGB
        setRgbEnabled(!rgbEnabledRef.current);
      }, LONG_PRESS_MS);
    };

    const onUp = (e: KeyboardEvent) => {
      if (e.code !== "ScrollLock") return;
      e.preventDefault();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (!longPressedRef.current) {
        // Short press → cycle switch type
        const order: Array<"blue"|"brown"|"red"> = ["blue","brown","red"];
        const next = order[(order.indexOf(swRef.current) + 1) % order.length];
        setDasSwitchType(next);   // Das physics (travel, spring)
        setActiveSwitch(next);    // global → typing-engine sound profile
        flashAmbient("knob");     // brief knob glow confirms the change
      }
      longPressedRef.current = false;
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [setDasSwitchType, setActiveSwitch, setRgbEnabled, flashAmbient]);

  // ── Sleep: click = toggle RGB on/off (always, regardless of focus).
  //    Double-click cycles RGB effect when focus is on RGB, or toggles
  //    Ambient Focus on/off (a real two-way toggle, not one-way-off) when
  //    focus is on Ambient ──────────────────────────────────────────────
  const handleSleepClick = useCallback(() => {
    sleepClickCountRef.current++;
    if (sleepClickTimerRef.current) clearTimeout(sleepClickTimerRef.current);
    if (sleepClickCountRef.current >= 2) {
      sleepClickCountRef.current = 0;
      if (focusRef.current === "ambient") {
        setAmbientOn(!ambientOnRef.current);
        flashAmbient("sleep");
      } else if (rgbEnabledRef.current) {
        // Use rgbEffectRef.current (always fresh) + setDasRgbEffect directly
        // rather than the setRgbEffect wrapper with a function updater. The
        // wrapper evaluates updater(rgbEffect-at-render-time), not the current
        // value, because handleSleepClick is a stale useCallback closure —
        // its deps never include dasRgbEffect, so it was recreated only on
        // mount, capturing whichever setRgbEffect instance existed then.
        setDasRgbEffect(RGB_EFFECTS[(RGB_EFFECTS.indexOf(rgbEffectRef.current) + 1) % RGB_EFFECTS.length]);
      }
    } else {
      sleepClickTimerRef.current = setTimeout(() => {
        sleepClickCountRef.current = 0;
        // Use the ref (always current) rather than a function updater, because
        // setDasRgbEnabled in SettingsContext only accepts a concrete boolean —
        // passing a function updater would make String(fn) get stored in
        // localStorage instead of "true"/"false", corrupting the persisted state.
        setRgbEnabled(!rgbEnabledRef.current);
      }, 300);
    }
  }, [flashAmbient, setAmbientOn, setRgbEnabled]);

  // ── Mute: click = cycle RGB palette (when RGB is enabled and focus is on
  //    RGB), or nudge Ambient volume (when focus is on Ambient). Single-click
  //    no longer steps RGB brightness — that was visually gimmicky (knob
  //    snapped instantly) and redundant with the knob drag. The knob is the
  //    right control for brightness; Mute's single-click is now a no-op so
  //    accidental single-clicks don't snap the knob. Double-click stays:
  //    palette cycle on RGB focus, volume nudge on Ambient focus. ─────────
  const handleMuteClick = useCallback(() => {
    muteClickCountRef.current++;
    if (muteClickTimerRef.current) clearTimeout(muteClickTimerRef.current);
    if (muteClickCountRef.current >= 2) {
      muteClickCountRef.current = 0;
      if (focusRef.current === "ambient") {
        let next = ambientVolumeRef.current + AMBIENT_VOLUME_STEP;
        if (next > 1 + 1e-6) next -= 1;
        next = Math.max(0, Math.min(1, next));
        setRotation(next*360);
        setAmbientVolume(next);
        flashAmbient("mute");
      } else if (rgbEnabledRef.current) {
        const next = (rgbPaletteIndex+1) % (RGB_PRESETS.length + 1);
        if (next < RGB_PRESETS.length) setRgbColor(RGB_PRESETS[next]);
        setRgbPaletteIndex(next);
      }
    } else {
      muteClickTimerRef.current = setTimeout(() => {
        muteClickCountRef.current = 0;
        // Single-click: no-op. Brightness is controlled by the knob (drag or
        // scroll). The old step-through-four-levels behavior caused the knob
        // to snap visually and felt gimmicky; removing it makes the knob the
        // sole brightness control, which is what it looks like it should be.
      }, 300);
    }
  }, [flashAmbient, setAmbientVolume, setRgbColor, setRgbPaletteIndex, rgbPaletteIndex]);

  // ── RGB media browser — prev/next step through RGB_EFFECTS, turning RGB
  //    on automatically if it was off (pressing what looks like a track
  //    button is expected to produce a visible result immediately) ───────
  const stepRgbEffect = useCallback((dir: "prev"|"next") => {
    const idx = RGB_EFFECTS.indexOf(rgbEffectRef.current);
    const n = dir === "next" ? (idx+1) % RGB_EFFECTS.length : (idx-1+RGB_EFFECTS.length) % RGB_EFFECTS.length;
    setRgbEffect(RGB_EFFECTS[n]);
    if (!rgbEnabledRef.current) setRgbEnabled(true);
  }, [setRgbEnabled]);

  // ── Ambient media browser — prev/next browse [saved presets, newest
  //    first] then [individual ambient tracks] as one continuous list,
  //    wrapping back to the start; each step replaces the active mix
  //    outright (like switching tracks, not layering more sound on top),
  //    and — mirroring the RGB browser above — turns Ambient Focus on
  //    automatically if it was off, since pressing a track button should
  //    produce audible sound immediately rather than silently queuing one
  //    up behind a separate on/off toggle. ────────────────────────────────
  const stepAmbient = useCallback((dir: "prev"|"next") => {
    const presetNames = Object.keys(savedAmbientMixesRef.current || {}).slice().reverse();
    const list: string[] = presetNames.length > 0
      ? [...presetNames, ...AMBIENT_SOUND_IDS]
      : [...AMBIENT_SOUND_IDS];
    if (list.length === 0) return;
    const idx = dir === "next"
      ? (ambientBrowseIndexRef.current + 1) % list.length
      : (ambientBrowseIndexRef.current - 1 + list.length) % list.length;
    ambientBrowseIndexRef.current = idx;
    const key = list[idx];
    if (presetNames.includes(key)) {
      setAmbientMix(savedAmbientMixesRef.current[key]);
    } else {
      setAmbientMix({ [key]: 0.5 });
    }
    if (!ambientOnRef.current) setAmbientOn(true);
    flashAmbient("media");
  }, [flashAmbient, setAmbientMix, setAmbientOn]);

  // Knob dot is a pure switch-type indicator — always shows blue/brown/red
  // regardless of whether RGB is on or off, and regardless of the current
  // RGB color. It is not wired to RGB at all; its sole job is to tell the
  // user at a glance which switch they are currently using.
  const indicatorColor = SWITCH_INDICATOR[activeSwitch]?.dot ?? "#ff0000";
  const indicatorShadow = `0 0 12px ${SWITCH_INDICATOR[activeSwitch]?.shadow ?? "rgba(255,0,0,1)"},inset 0 1.2px 2px rgba(255,255,255,0.4)`;

  // ── Media bar backlight — lit whenever the currently *focused* subsystem
  //    is on. Color: white for Ambient focus (neutral, unambiguous "sound
  //    is active"), or the actual current RGB color at the current brightness
  //    level for RGB focus (so the media bar feels physically part of the
  //    same lighting system as the keycaps). This makes the media bar a
  //    persistent, glanceable "which system + which color" indicator with no
  //    separate UI needed.
  const mediaLit = focus === "ambient" ? ambientOn : rgbEnabled;
  const [mr, mg, mb] = rgbColor;
  const mediaLitOpacity = Math.min(0.95, 0.70 + rgbBrightness * 0.25);
  const mediaLitColor = focus === "ambient"
    ? "rgba(255,255,255,0.95)"
    : `rgba(${mr},${mg},${mb},${mediaLitOpacity})`;
  const mediaLitGlow = focus === "ambient"
    ? "drop-shadow(0 0 1px rgba(255,255,255,0.95)) drop-shadow(0 0 2px rgba(255,255,255,0.6))"
    : `drop-shadow(0 0 1px rgba(${mr},${mg},${mb},0.95)) drop-shadow(0 0 2px rgba(${mr},${mg},${mb},0.6))`;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  userSelect:"none", width:"100%", overflow:"visible", paddingBottom:48, paddingTop:32,
                  fontFamily:'"Inter",ui-sans-serif,system-ui,-apple-system,sans-serif' }}>
      <div style={{ position:"relative", width:CW, height:CH, transform:"scale(0.72)", transformOrigin:"top center" }}>
        <Chassis />
        <Keyboard
          activeSwitch={activeSwitch}
          locks={locks}
          onLocksChange={setLocks}
          onKeyVirtualDown={onKeyVirtualDown}
          onKeyVirtualUp={onKeyVirtualUp}
          rgbEnabled={rgbEnabled}
          rgbEffect={rgbEffect}
          rgbColor={rgbColor}
          rgbBrightness={rgbBrightness}
        />

        {/* ── Layer 3: HTML Panel (unchanged from original — already DOM) ── */}
        <div style={{ position:"absolute", right:12, top:24, display:"flex", alignItems:"flex-start", gap:12, zIndex:10, userSelect:"none" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:14, marginTop:4 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:2 }}>
              <svg width="24" height="24" viewBox="0 0 100 100" style={{ color:"#e52525", fill:"currentColor", flexShrink:0, filter:"drop-shadow(0 0 8px rgba(229,37,37,0.3))" }}>
                <path d="M 35 5 L 59 23 L 59 43 L 35 25 Z" />
                <path d="M 35 35 L 75 65 L 35 95 L 35 83 L 59 65 L 35 47 Z" />
              </svg>
              <span style={{ fontSize:20, letterSpacing:"-0.04em", color:"#dcdcdc", lineHeight:1, marginLeft:2,
                             fontFamily:"ui-sans-serif,system-ui,sans-serif", fontWeight:300,
                             filter:"drop-shadow(0 0 5px rgba(255,255,255,0.1))" }}>
                <span style={{ color:"#e52525", fontWeight:600 }}>das</span>keyboard
              </span>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:8, marginLeft:28 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:116 }}>
                <div style={{ width:24, height:24, borderRadius:6, background:"#0d0d0f",
                              boxShadow:"inset 0 1px 3px rgba(0,0,0,0.9), 0 0.5px 0 rgba(255,255,255,0.05)",
                              display:"flex", alignItems:"center", justifyContent:"center", padding:1, transform:"translateX(-1.5px)",
                              outline: ambientFlash.sleep ? "1.5px solid rgba(125,195,255,0.55)" : "1.5px solid transparent",
                              outlineOffset:"1.5px", transition:"outline-color 0.25s ease" }}>
                  <button
                    onClick={handleSleepClick}
                    style={{ width:"100%", height:"100%", borderRadius:4, border:"1px solid #1a1a1c",
                             display:"flex", alignItems:"center", justifyContent:"center",
                             background:"linear-gradient(to bottom,#222225,#18181a)", cursor:"pointer", padding:0 }}
                    title={focus === "ambient" ? "RGB On/Off (double-click: toggle Ambient Focus)" : "RGB On/Off (double-click to cycle RGB effect)"}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"
                         style={{ color: rgbEnabled ? "#d4d4d4" : "#737373", transform:"rotate(-15deg)", transition:"color 0.2s, filter 0.2s",
                                  filter: rgbEnabled ? "drop-shadow(0 0 1px rgba(255,255,255,0.95)) drop-shadow(0 0 2px rgba(255,255,255,0.55))" : "none" }}>
                      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                    </svg>
                  </button>
                </div>

                <div style={{ display:"flex", gap:10, paddingTop:2, justifyContent:"center", alignItems:"flex-end" }}>
                  {(["NumLock","CapsLock","ScrollLock"] as const).map(k => (
                    <div key={k} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2.5 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:9 }}>
                        <span style={{ fontSize:9, fontWeight:600, color:"rgba(163,163,163,0.9)", lineHeight:1 }}>
                          {k==="NumLock"?"1":k==="CapsLock"?"A":""}
                        </span>
                        {k==="ScrollLock" && (
                          <svg width="9" height="9" viewBox="0 0 10 10" style={{ color:"rgba(163,163,163,0.9)", overflow:"visible" }}>
                            <path d="M 5,0 L 5,6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                            <path d="M 2.5,3.5 L 5,6.5 L 7.5,3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            <path d="M 1.5,8.0 L 8.5,8.0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                        )}
                      </div>
                      <div style={{ position:"relative", width:9, height:7, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <svg width="8" height="6" viewBox="0 0 10 8" style={{ overflow:"visible" }}>
                          {locks[k]
                            ? <circle cx="5" cy="4" r="1.6" fill="#ffffff" style={{ filter:"drop-shadow(0 0 1.2px rgba(255,255,255,0.95)) drop-shadow(0 0 4.5px rgba(147,197,253,0.9))" }} />
                            : <circle cx="5" cy="4" r="1.6" fill="#030304" stroke="#131316" strokeWidth="0.4" />}
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ width:24, height:24, borderRadius:"50%", background:"#0d0d0f",
                              boxShadow:"inset 0 1px 3px rgba(0,0,0,0.9), 0 0.5px 0 rgba(255,255,255,0.05)",
                              display:"flex", alignItems:"center", justifyContent:"center", padding:1, transform:"translateX(1.5px)",
                              outline: ambientFlash.mute ? "1.5px solid rgba(125,195,255,0.55)" : "1.5px solid transparent",
                              outlineOffset:"1.5px", transition:"outline-color 0.25s ease" }}>
                  <button
                    onClick={handleMuteClick}
                    style={{ width:"100%", height:"100%", borderRadius:"50%", border:"1px solid #1a1a1c",
                             display:"flex", alignItems:"center", justifyContent:"center",
                             background:"linear-gradient(to bottom,#222225,#18181a)", cursor:"pointer", padding:0 }}
                    title={focus === "ambient" ? "Double-click: nudge Ambient volume up" : "Double-click: cycle RGB color palette"}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" style={{ fill:"currentColor", color: rgbEnabled ? "#d4d4d4" : "#737373", stroke:"currentColor", strokeWidth:1.5, strokeLinecap:"round", strokeLinejoin:"round", transition:"color 0.2s, filter 0.2s",
                                   filter: rgbEnabled ? "drop-shadow(0 0 1px rgba(255,255,255,0.95)) drop-shadow(0 0 2px rgba(255,255,255,0.55))" : "none" }}>
                      <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
                      {rgbBrightness < 0.3
                        ? <><line x1="22" y1="9" x2="16" y2="15" /><line x1="16" y1="9" x2="22" y2="15" /></>
                        : <path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" />}
                    </svg>
                  </button>
                </div>
              </div>

              <div style={{ width:116, height:22, borderRadius:6, background:"#0d0d0f",
                            boxShadow:"inset 0 1.5px 4px rgba(0,0,0,0.9),0 0.5px 0 rgba(255,255,255,0.05)",
                            display:"flex", alignItems:"center", justifyContent:"center", padding:1.5, overflow:"hidden",
                            outline: ambientFlash.media ? "1.5px solid rgba(125,195,255,0.55)" : "1.5px solid transparent",
                            outlineOffset:"1.5px", transition:"outline-color 0.25s ease" }}>
                <div style={{ display:"flex", width:"100%", height:"100%", borderRadius:4, overflow:"hidden", background:"#1a1a1c" }}>
                  <button onClick={()=> focus === "ambient" ? stepAmbient("prev") : stepRgbEffect("prev")}
                          title={focus === "ambient" ? "Previous Ambient Preset / Sound" : "Previous RGB Effect"}
                          onMouseDown={()=>setMediaPressedBtn("prev")}
                          onMouseUp={()=>setMediaPressedBtn(null)}
                          onMouseLeave={()=>setMediaPressedBtn(null)}
                          style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                                   color: mediaLit ? mediaLitColor : "#737373", cursor:"pointer", border:"0", padding:0,
                                   background: mediaPressedBtn==="prev" ? "linear-gradient(to bottom,#18181a,#111113)" : "linear-gradient(to bottom,#222225,#18181a)",
                                   borderRight:"1px solid #0d0d0d",
                                   transform: mediaPressedBtn==="prev" ? "translateY(0.8px)" : "translateY(0)",
                                   transition:"color 0.2s,transform 0.05s ease,background 0.05s ease" }}>
                    <svg width="10" height="7" viewBox="0 0 12 8" style={{ fill:"currentColor", transition:"filter 0.2s",
                                   filter: mediaLit ? mediaLitGlow : "none" }}>
                      <rect x="1.5" y="1" width="1.2" height="6" rx="0.2" />
                      <path d="M6.5,1 L6.5,7 L3,4 Z" />
                      <path d="M10.5,1 L10.5,7 L7,4 Z" />
                    </svg>
                  </button>
                  <button
                    onClick={()=> {
                      // Settle-window click count: single click toggles the
                      // focused subsystem on/off, double-click swaps focus
                      // between RGB and Ambient instead — same pattern as
                      // the knob's double/triple-click split above.
                      playClickCountRef.current++;
                      if (playClickTimerRef.current) clearTimeout(playClickTimerRef.current);
                      playClickTimerRef.current = setTimeout(() => {
                        const count = playClickCountRef.current;
                        playClickCountRef.current = 0;
                        if (count >= 2) {
                          setFocus(focusRef.current === "ambient" ? "rgb" : "ambient");
                          flashAmbient("media");
                        } else if (focusRef.current === "ambient") {
                          setAmbientOn(!ambientOnRef.current);
                          flashAmbient("media");
                        } else {
                          setRgbEnabled(!rgbEnabledRef.current);
                        }
                      }, CLICK_SETTLE_MS);
                    }}
                    title={focus === "ambient" ? "Toggle Ambient Focus On/Off (double-click: switch to RGB control)" : "Toggle RGB On/Off (double-click: switch to Ambient control)"}
                    onMouseDown={()=>setMediaPressedBtn("play")}
                    onMouseUp={()=>setMediaPressedBtn(null)}
                    onMouseLeave={()=>setMediaPressedBtn(null)}
                    style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                             cursor:"pointer", padding:0, border:"0",
                             background: mediaPressedBtn==="play" ? "linear-gradient(to bottom,#18181a,#111113)" : "linear-gradient(to bottom,#222225,#18181a)",
                             borderRight:"1px solid #0d0d0d",
                             color: mediaLit ? mediaLitColor : "#737373",
                             transform: mediaPressedBtn==="play" ? "translateY(0.8px)" : "translateY(0)",
                             transition:"color 0.2s,transform 0.05s ease,background 0.05s ease" }}>
                    <svg width="10" height="7" viewBox="0 0 12 8" style={{ fill:"currentColor", transition:"color 0.2s, filter 0.2s",
                                   filter: mediaLit ? mediaLitGlow : "none" }}>
                      <path d="M1.5,1 L1.5,7 L5.5,4 Z" />
                      <rect x="7.5" y="1" width="1.2" height="6" rx="0.2" />
                      <rect x="9.5" y="1" width="1.2" height="6" rx="0.2" />
                    </svg>
                  </button>
                  <button onClick={()=> focus === "ambient" ? stepAmbient("next") : stepRgbEffect("next")}
                          title={focus === "ambient" ? "Next Ambient Preset / Sound" : "Next RGB Effect"}
                          onMouseDown={()=>setMediaPressedBtn("next")}
                          onMouseUp={()=>setMediaPressedBtn(null)}
                          onMouseLeave={()=>setMediaPressedBtn(null)}
                          style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                                   color: mediaLit ? mediaLitColor : "#737373", cursor:"pointer", border:"0", padding:0,
                                   background: mediaPressedBtn==="next" ? "linear-gradient(to bottom,#18181a,#111113)" : "linear-gradient(to bottom,#222225,#18181a)",
                                   transform: mediaPressedBtn==="next" ? "translateY(0.8px)" : "translateY(0)",
                                   transition:"color 0.2s,transform 0.05s ease,background 0.05s ease" }}>
                    <svg width="10" height="7" viewBox="0 0 12 8" style={{ fill:"currentColor", transition:"filter 0.2s",
                                   filter: mediaLit ? mediaLitGlow : "none" }}>
                      <rect x="9.3" y="1" width="1.2" height="6" rx="0.2" />
                      <path d="M1.5,1 L1.5,7 L5,4 Z" />
                      <path d="M5.5,1 L5.5,7 L9,4 Z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop:22, marginRight:-32, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
            <div style={{ position:"relative", width:82, height:82, display:"flex", alignItems:"center", justifyContent:"center", cursor:"ns-resize",
                          outline: ambientFlash.knob ? "1.5px solid rgba(125,195,255,0.55)" : "1.5px solid transparent",
                          outlineOffset:"2px", borderRadius:"50%", transition:"outline-color 0.25s ease" }}
                 onMouseDown={handleKnobMouseDown}
                 onWheel={handleKnobWheel}
                 title={focus === "ambient" ? "Scroll ↑↓: Ambient volume · Double-click: mute/unmute" : "Scroll ↑↓: brightness · Scroll ←→: cycle color · Click: next color · Double-click: RGB on/off"}>
              <div style={{ position:"absolute", inset:0, pointerEvents:"none",
                            transform:`rotate(${rotation}deg)`,
                            transition:"transform 0.1s cubic-bezier(0.15,0.45,0.3,1)" }}>
                <div style={{ position:"absolute", inset:-3, borderRadius:"50%", background:"#08080a", boxShadow:"inset 0 4px 8px rgba(0,0,0,0.9)", opacity:0.95 }} />
                <div style={{ position:"absolute", inset:-2.5, borderRadius:"50%",
                              background:"conic-gradient(from 0deg, #b30000 0%, #ff0000 12%, #ff4444 25%, #ff8888 35%, #ff0000 48%, #800000 60%, #b30000 72%, #ff0000 85%, #ff4444 92%, #b30000 100%)",
                              WebkitMask:"radial-gradient(circle, transparent 37.0px, #fff 37.5px, #fff 41.5px, transparent 42.2px)",
                              mask:"radial-gradient(circle, transparent 37.0px, #fff 37.5px, #fff 41.5px, transparent 42.2px)",
                              filter:"drop-shadow(0 0 2.5px rgba(255,0,0,0.9)) drop-shadow(0 0 0.8px rgba(255,80,80,0.8))" }} />
                <div style={{ position:"absolute", inset:-2, borderRadius:"50%",
                              background:"conic-gradient(from 0deg, #ff0000 0%, #ff5555 25%, #ffe6e6 35%, #ff5555 45%, #ff0000 60%, #aa0000 75%, #ff0000 90%, #ff0000 100%)",
                              WebkitMask:"radial-gradient(circle, transparent 37.8px, #fff 38.2px, #fff 40.6px, transparent 41.1px)",
                              mask:"radial-gradient(circle, transparent 37.8px, #fff 38.2px, #fff 40.6px, transparent 41.1px)" }} />
                <div style={{ position:"absolute", inset:-3.2, borderRadius:"50%",
                              background:"conic-gradient(from 135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 20%, transparent 40%, transparent 70%, rgba(255,255,255,0.1) 85%, rgba(255,255,255,0.5) 100%)",
                              WebkitMask:"radial-gradient(circle, transparent 41.2px, #fff 41.5px, #fff 42.2px, transparent 42.5px)",
                              mask:"radial-gradient(circle, transparent 41.2px, #fff 41.5px, #fff 42.2px, transparent 42.5px)",
                              opacity:0.9 }} />
              </div>
              <div style={{ width:78, height:78, borderRadius:"50%", position:"relative", overflow:"hidden", border:"1px solid #050506",
                            boxShadow:"0 12px 35px rgba(0,0,0,1),inset 0 1.5px 2px rgba(255,255,255,0.15)",
                            background:"conic-gradient(from 0deg at 50% 50%, #060608 0%, #151518 15%, #333336 25%, #151518 35%, #060608 50%, #151518 65%, #333336 75%, #151518 85%, #060608 100%)",
                            transform:`rotate(${rotation}deg)`, transition:"transform 0.1s cubic-bezier(0.15,0.45,0.3,1)" }}>
                <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"0.5px solid rgba(255,255,255,0.2)", opacity:0.3 }} />
                <div style={{ position:"absolute", inset:6, borderRadius:"50%", background:"linear-gradient(to bottom-right, #010102, #1a1a1d)", boxShadow:"inset 0 15px 30px rgba(0,0,0,1)" }} />
                <div style={{ position:"absolute", top:10, left:"50%", marginLeft:-3.5, width:7, height:7, borderRadius:"50%",
                              background:indicatorColor, border:"1px solid rgba(0,0,0,0.9)", boxShadow:indicatorShadow }} />
                <div style={{ position:"absolute", inset:0, opacity:0.4, background:"radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4) 0%, transparent 60%)" }} />
              </div>
              <div style={{ position:"absolute", inset:-0.5, borderRadius:"50%", border:"0.5px solid rgba(255,255,255,0.15)" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
