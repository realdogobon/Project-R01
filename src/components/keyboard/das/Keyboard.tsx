/**
 * Keyboard.tsx — Block 1+2 assembly: SVG chassis (unchanged, already DOM),
 * DOM wells, and 110 DOM keycaps with per-key press/release physics driven by
 * a rAF loop that runs ONLY while at least one key is mid-animation (this is
 * the change that gets idle CPU/GPU to ~0, versus the old infinite canvas loop).
 *
 * RGB underglow (Block 3), knob/LED panel (Block 4) are wired in later blocks;
 * this file currently renders the idle + press/release states 1:1 against the
 * canvas engine's math (see engine.ts + Keycap.tsx for the line-by-line
 * translation notes).
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Keycap } from "./Keycap";
import {
  DAS_LAYOUT, U, CW, CH, KOX, KOY, CHASSIS_D,
  getProgress, getTravelPx,
  rgbToHsl, hslToRgb,
  type KState, type WobbleState, type Ripple, type ReactiveKey, type RgbEffect,
} from "./engine";

interface WellRect { x: number; y: number; w: number; h: number; r: number; }

// ─── Wells — transcribed from drawWells()/drawWell() ─────────────────────────
const WELL_RECTS: WellRect[] = [
  { x: 0*U-8,    y: 1*U-5,   w: 1*U+12,  h: 1*U+12, r: 7 },
  { x: 2*U-8,    y: 1*U-5,   w: 4*U+12,  h: 1*U+12, r: 7 },
  { x: 6.5*U-8,  y: 1*U-5,   w: 4*U+12,  h: 1*U+12, r: 7 },
  { x: 11*U-8,   y: 1*U-5,   w: 4*U+12,  h: 1*U+12, r: 7 },
  { x: 15.5*U-8, y: 1*U-5,   w: 3*U+12,  h: 1*U+12, r: 7 },
  { x: 0*U-8,    y: 2.5*U-8, w: 15*U+12, h: 5*U+12, r: 8 },
  { x: 15.5*U-8, y: 2.5*U-5, w: 3*U+12,  h: 2*U+12, r: 8 },
  { x: 19*U-8,   y: 2.5*U-5, w: 4*U+12,  h: 5*U+12, r: 8 },
];

// Arrow-cluster well — Path2D from drawWells(), coordinates are already in
// chassis space (post KOX/KOY translate), unlike WELL_RECTS above.
const ARROW_WELL_D = "M 726,237 L 766,237 Q 774,237 774,245 L 774,273 Q 774,281 782,281 L 810,281 Q 818,281 818,289 L 818,329 Q 818,337 810,337 L 682,337 Q 674,337 674,329 L 674,289 Q 674,281 682,281 L 710,281 Q 718,281 718,273 L 718,245 Q 718,237 726,237 Z";

function Well({ x, y, w, h, r }: WellRect) {
  return (
    <div style={{
      position:"absolute", left:x, top:y, width:w, height:h, borderRadius:r,
      background:"linear-gradient(to bottom, #040405 0%, #070709 30%, #0c0c0e 100%)",
      boxShadow:"inset 0 16px 16px -4px rgba(0,0,0,0.85)",
      border:"1px solid rgba(255,255,255,0.03)",
    }} />
  );
}

function computeKeyBox(code: string, x: number, y: number, w: number, h: number) {
  const kw = w*U-4, kh = h*U-4;
  const kx = code === "Escape" ? x*U-1.0 : x*U;
  const ky = y*U;
  return { kw, kh, kx, ky };
}

export interface KeyboardProps {
  activeSwitch: string;
  locks: { NumLock: boolean; CapsLock: boolean; ScrollLock: boolean };
  onLocksChange: (updater: (p: KeyboardProps["locks"]) => KeyboardProps["locks"]) => void;
  onKeyVirtualDown?: (code: string) => void;
  onKeyVirtualUp?: (code: string) => void;
  virtualShiftActive?: boolean;
  virtualCapsLockActive?: boolean;
  rgbEnabled: boolean;
  rgbEffect: RgbEffect;
  rgbColor: [number, number, number];
  /** Overall RGB intensity multiplier, 0–1. Controlled by the knob (see App.tsx). */
  rgbBrightness: number;
  keyboardApiRef?: React.MutableRefObject<{ pressKey: (c: string) => void; releaseKey: (c: string) => void } | null>;
}

export function Keyboard({
  activeSwitch, locks, onLocksChange,
  onKeyVirtualDown, onKeyVirtualUp, virtualShiftActive, virtualCapsLockActive,
  rgbEnabled, rgbEffect, rgbColor, rgbBrightness, keyboardApiRef,
}: KeyboardProps) {
  const statesRef = useRef(new Map<string, KState>());
  const wobblesRef = useRef(new Map<string, WobbleState>());
  const capRefs = useRef(new Map<string, HTMLDivElement>());
  const wrapRefs = useRef(new Map<string, HTMLDivElement>());
  const rgbRefs = useRef(new Map<string, HTMLDivElement>());
  const ripplesRef = useRef<Ripple[]>([]);
  const reactiveKeysRef = useRef<ReactiveKey[]>([]);
  const rafRef = useRef<number>(0);
  const activeRef = useRef(false);

  const swRef = useRef(activeSwitch); swRef.current = activeSwitch;
  const rgbEnabledRef = useRef(rgbEnabled); rgbEnabledRef.current = rgbEnabled;
  const rgbEffectRef  = useRef(rgbEffect);  rgbEffectRef.current  = rgbEffect;
  const rgbColorRef   = useRef(rgbColor);   rgbColorRef.current   = rgbColor;
  const rgbBrightnessRef = useRef(rgbBrightness); rgbBrightnessRef.current = rgbBrightness;

  // ── force React re-render on press/release for skirt-visibility + error-color
  //    changes only; the per-frame travel animation itself writes to the DOM
  //    node directly (see tick()) so idle CPU stays at zero.
  const [, forceTick] = useState(0);

  // RGB underglow — mirrors the original RGB canvas loop exactly (per-effect
  // alpha/color math), but writes straight to each key's overlay div style
  // instead of redrawing a whole canvas frame.
  const paintRgb = useCallback((now: number) => {
    if (!rgbEnabledRef.current) return;
    const [r, g, b] = rgbColorRef.current;
    const effect = rgbEffectRef.current;
    for (const key of DAS_LAYOUT) {
      const el = rgbRefs.current.get(key.code);
      if (!el) continue;
      const { kw, kh, kx, ky } = computeKeyBox(key.code, key.x, key.y, key.w, key.h||1);
      const centerX = kx + KOX + kw/2, centerY = ky + KOY + kh/2;
      let cr = r, cg = g, cb = b, alpha = 0.22;

      if (effect === "static") {
        alpha = 0.22;
      } else if (effect === "wave") {
        const phase = ((kx) / (CW - KOX*2)) * Math.PI * 2 - (now / 1200);
        const wave = 0.5 + 0.5 * Math.sin(phase);
        alpha = 0.10 + wave * 0.28;
        const [bH, bS, bL] = rgbToHsl(r, g, b);
        const shiftedH = ((bH * 360 + Math.sin(phase) * 15) % 360 + 360) % 360;
        const [wr, wg, wb] = hslToRgb(shiftedH, Math.max(bS, 0.7), Math.max(bL, 0.4));
        cr = wr; cg = wg; cb = wb;
      } else if (effect === "ripple") {
        alpha = 0.10;
        for (const ripple of ripplesRef.current) {
          const elapsed = now - ripple.t;
          if (elapsed > 600) continue;
          const expandRadius = elapsed * 0.45;
          const dist = Math.sqrt((centerX - ripple.x)**2 + (centerY - ripple.y)**2);
          const ringWidth = 40;
          const distFromRing = Math.abs(dist - expandRadius);
          if (distFromRing < ringWidth) {
            const fade = (1 - elapsed / 600);
            const intensity = (1 - distFromRing / ringWidth) * fade;
            alpha += 0.35 * intensity;
          }
        }
      } else if (effect === "breathing") {
        const breath = 0.5 + 0.5 * Math.sin((now / 1000) * Math.PI);
        alpha = 0.06 + breath * 0.34;
      } else if (effect === "reactive") {
        alpha = 0;
        for (const rk of reactiveKeysRef.current) {
          if (rk.code === key.code) {
            const elapsed = now - rk.t;
            if (elapsed < 800) alpha = Math.max(alpha, 0.60 * Math.pow(1 - elapsed/800, 0.55));
          }
        }
      } else if (effect === "spectrum") {
        // Continuous rainbow cycle sweeping across the board — hue is a
        // function of x-position plus time, independent of the chosen color.
        const hue = (((kx / (CW - KOX*2)) * 360) - (now / 20)) % 360;
        const [sr, sg, sb] = hslToRgb(((hue % 360) + 360) % 360, 0.85, 0.55);
        cr = sr; cg = sg; cb = sb; alpha = 0.24;
      } else if (effect === "rain") {
        // Randomized per-key droplet falloff: each key has its own pseudo-random
        // phase so drops of brightness fall across the board independently.
        const seed = (key.x * 7.13 + key.y * 13.7) % 1;
        const cycle = 1400 + seed * 900;
        const t = (now + seed * 5000) % cycle;
        const drop = Math.max(0, 1 - t / 260);
        alpha = 0.06 + drop * 0.4;
      }

      alpha *= rgbBrightnessRef.current;
      const a1 = Math.min(1, alpha*2.2), a2 = Math.min(1, alpha*0.8);
      el.style.opacity = "1";
      el.style.background = `radial-gradient(circle ${kw*0.8}px at ${kw/2+4}px ${kh*0.1+8}px, rgba(${cr},${cg},${cb},${a1}) 0%, rgba(${cr},${cg},${cb},${a2}) 50%, rgba(${cr},${cg},${cb},0) 100%)`;
    }
    ripplesRef.current = ripplesRef.current.filter(rp => now - rp.t < 600);
    reactiveKeysRef.current = reactiveKeysRef.current.filter(rk => now - rk.t < 800);
  }, []);

  const clearRgb = useCallback(() => {
    for (const el of rgbRefs.current.values()) el.style.opacity = "0";
  }, []);

  const rgbNeedsLoop = useCallback(() => {
    if (!rgbEnabledRef.current) return false;
    const effect = rgbEffectRef.current;
    // wave/breathing are continuously time-varying and need the loop running
    // the whole time RGB is on. ripple/reactive are event-driven — only keep
    // the loop alive while a ripple/reactive decay is actually in flight, so
    // idle time with RGB on but no recent key press costs nothing.
    if (effect === "wave" || effect === "breathing" || effect === "spectrum" || effect === "rain") return true;
    if (effect === "ripple") return ripplesRef.current.length > 0;
    if (effect === "reactive") return reactiveKeysRef.current.length > 0;
    return false;
  }, []);

  const ensureLoopRunning = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    const tick = (now: number) => {
      try {
        let anyActive = false;
        let anyStructuralChange = false;
        if (rgbEnabledRef.current) paintRgb(now);
        for (const key of DAS_LAYOUT) {
          const s = statesRef.current.get(key.code);
          if (!s) continue;
          const prog = getProgress(s, now, swRef.current);
          const travel = Math.max(-1.5, prog * getTravelPx(swRef.current));
          const wasPressed = wobblesRef.current.has(`__pressed_${key.code}`);
          const pressed = prog > 0.01;

          // Wobble trigger: key bottoms out at >90% travel
          if (prog > 0.9 && !s.releasedAt && !wobblesRef.current.has(key.code)) {
            wobblesRef.current.set(key.code, { t: now, dir: Math.random() < 0.5 ? 1 : -1 });
          }
          if (s.releasedAt && prog < 0.01) wobblesRef.current.delete(key.code);

          let wobbleX = 0;
          const w = wobblesRef.current.get(key.code);
          if (w && prog > 0.01) {
            const elapsed = now - w.t;
            // Scaled up alongside the heavier PHYSICS/RELEASE_PHYSICS timings
            // (~1.7x the original 80ms/0.3px) so the bottom-out wobble reads as
            // a dense keycap settling under real mass, not a light snap-back.
            if (elapsed < 135) wobbleX = w.dir * 0.5 * (1 - elapsed/135);
          }

          const wrap = wrapRefs.current.get(key.code);
          if (wrap) wrap.style.transform = `translate3d(${wobbleX}px, ${travel}px, 0)`;

          if (pressed !== wasPressed) {
            anyStructuralChange = true;
            if (pressed) wobblesRef.current.set(`__pressed_${key.code}`, { t: 0, dir: 0 });
            else wobblesRef.current.delete(`__pressed_${key.code}`);
          }

          if (prog > 0.001 || (s.releasedAt && now - s.releasedAt < 260)) anyActive = true;

          if (s.releasedAt && now - s.releasedAt > 260) {
            statesRef.current.delete(key.code);
            anyStructuralChange = true;
          }
        }
        if (anyStructuralChange) forceTick(t => t+1);
        if (anyActive || rgbNeedsLoop()) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          activeRef.current = false;
        }
      } catch (err) {
        // If anything in the tick throws (shouldn't happen, but defensive),
        // reset both flags so the next ensureLoopRunning() call can restart
        // cleanly rather than seeing activeRef=true and returning early forever.
        console.error("[Keyboard] tick error:", err);
        rafRef.current = 0;
        activeRef.current = false;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [paintRgb, rgbNeedsLoop]);

  // Static RGB effect needs no per-frame loop — paint once whenever it turns
  // on, its color changes, or brightness changes, and clear when disabled
  // (keeps idle CPU at zero). rgbBrightness is included here so knob-driven
  // brightness changes are reflected immediately even while "static" (which
  // has no running animation loop to naturally pick up the new value).
  useEffect(() => {
    if (rgbEnabled && rgbEffect === "static") {
      paintRgb(performance.now());
    } else if (!rgbEnabled) {
      clearRgb();
    } else {
      ensureLoopRunning();
    }
  }, [rgbEnabled, rgbEffect, rgbColor, rgbBrightness, paintRgb, clearRgb, ensureLoopRunning]);

  // On unmount (and on StrictMode's simulated-unmount between the two effect
  // firings), cancel the pending frame AND reset the active flag so the next
  // mount's ensureLoopRunning() doesn't see a stale `true` and return early
  // before any frame has actually been scheduled.  Without this reset, the
  // StrictMode sequence is:
  //   mount → RGB effect sets activeRef=true, schedules frame
  //   StrictMode cleanup → cancelAnimationFrame (frame gone) but activeRef still true
  //   re-mount → ensureLoopRunning() sees true → returns early → loop never runs
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    activeRef.current = false;
  }, []);

  // realLockState: when this key-press came from a physical keyboard event,
  // the browser can tell us the OS lock state directly (via
  // KeyboardEvent.getModifierState) — use that instead of blindly toggling,
  // so the on-screen indicator can never drift out of sync with the real
  // keyboard. Virtual (mouse-clicked) key presses have no such signal, so
  // they fall back to a simple toggle.
  const pressKey = useCallback((code: string, realLockState?: boolean) => {
    const now = performance.now();
    statesRef.current.set(code, { pressedAt: now });

    if (rgbEnabledRef.current && rgbEffectRef.current === "ripple") {
      const key = DAS_LAYOUT.find(k => k.code === code);
      if (key) {
        const { kw, kh, kx, ky } = computeKeyBox(key.code, key.x, key.y, key.w, key.h||1);
        ripplesRef.current.push({ x: kx+KOX+kw/2, y: ky+KOY+kh/2, t: now });
      }
    }
    if (rgbEnabledRef.current && rgbEffectRef.current === "reactive") {
      reactiveKeysRef.current = reactiveKeysRef.current.filter(rk => rk.code !== code);
      reactiveKeysRef.current.push({ code, t: now });
    }

    if (code === "NumLock")    onLocksChange(p => ({...p, NumLock: realLockState ?? !p.NumLock}));
    if (code === "CapsLock")   onLocksChange(p => ({...p, CapsLock: realLockState ?? !p.CapsLock}));
    // ScrollLock is repurposed as the Das-exclusive switch-type key (handled
    // in DasKeyboardApp). It must NOT toggle the lock LED state here — the
    // key animates normally via pressKey() but the ScrollLock indicator stays
    // permanently off so it never confuses users or conflicts with the new
    // switch-cycling gesture.
    forceTick(t => t+1);
    ensureLoopRunning();
  }, [ensureLoopRunning, onLocksChange]);

  const releaseKey = useCallback((code: string) => {
    const s = statesRef.current.get(code);
    if (s && !s.releasedAt) {
      s.releasedAt = performance.now();
    }
    ensureLoopRunning();
  }, [ensureLoopRunning]);

  useEffect(() => {
    if (keyboardApiRef) keyboardApiRef.current = { pressKey, releaseKey };
  }, [pressKey, releaseKey, keyboardApiRef]);

  // ── Physical keyboard events ──────────────────────────────────────────────
  useEffect(() => {
    const LOCK_CODES = new Set(["NumLock", "CapsLock", "ScrollLock"]);
    const readLockState = (e: KeyboardEvent): boolean | undefined => {
      if (!LOCK_CODES.has(e.code)) return undefined;
      try {
        // Supported for CapsLock in all major browsers; NumLock/ScrollLock
        // support varies by browser/OS (no physical key on many laptops/Mac),
        // so this is best-effort — see keyboard-controls.md for the caveat.
        return e.getModifierState(e.code);
      } catch {
        return undefined;
      }
    };
    const onDown = (e: KeyboardEvent) => { if (e.repeat) return; pressKey(e.code, readLockState(e)); };
    const onUp = (e: KeyboardEvent) => releaseKey(e.code);
    const onErr = (e: Event) => {
      const code = (e as CustomEvent<{code:string}>).detail?.code;
      if (code) {
        const s = statesRef.current.get(code) || { pressedAt: performance.now() };
        statesRef.current.set(code, { ...s, errorAt: performance.now() });
        forceTick(t => t+1);
        setTimeout(() => forceTick(t => t+1), 260);
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("typing-error", onErr);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("typing-error", onErr);
    };
  }, [pressKey, releaseKey]);

  // When the browser tab becomes visible again (after the user switched away),
  // the rAF loop may have throttled to 1 Hz or stopped entirely. Restart it
  // so RGB animation and key-press physics resume immediately on return.
  // Also restart on window focus for the keyboard-switch case: when the user
  // closes the Settings modal the page regains focus and the loop should be
  // live again without requiring a manual key press.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") ensureLoopRunning();
    };
    const onFocus = () => ensureLoopRunning();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [ensureLoopRunning]);

  useEffect(() => {
    const now = performance.now();
    ["ShiftLeft","ShiftRight"].forEach(c => {
      if (virtualShiftActive) { statesRef.current.set(c,{pressedAt:now}); ensureLoopRunning(); }
      else { const s=statesRef.current.get(c); if(s&&!s.releasedAt) { s.releasedAt=now; ensureLoopRunning(); } }
    });
  }, [virtualShiftActive, ensureLoopRunning]);

  useEffect(() => {
    const now = performance.now();
    if (virtualCapsLockActive) { statesRef.current.set("CapsLock",{pressedAt:now}); ensureLoopRunning(); }
    else { const s = statesRef.current.get("CapsLock"); if (s && !s.releasedAt) { s.releasedAt = now; ensureLoopRunning(); } }
  }, [virtualCapsLockActive, ensureLoopRunning]);

  const handleKeyMouseDown = useCallback((code: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    pressKey(code);
    onKeyVirtualDown?.(code);
    setTimeout(() => { releaseKey(code); onKeyVirtualUp?.(code); }, 100);
  }, [pressKey, releaseKey, onKeyVirtualDown, onKeyVirtualUp]);

  return (
    <div style={{ position:"absolute", inset:0, clipPath:`path('${CHASSIS_D}')` }}>
      <div style={{ position:"absolute", left:KOX, top:KOY }}>
        {WELL_RECTS.map((wr, i) => <Well key={i} {...wr} />)}
        <svg width={200} height={200} style={{ position:"absolute", left:0, top:0, overflow:"visible", pointerEvents:"none" }}>
          <defs>
            <linearGradient id="arrowWellGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#040405" />
              <stop offset="30%" stopColor="#070709" />
              <stop offset="100%" stopColor="#0c0c0e" />
            </linearGradient>
          </defs>
          <path d={ARROW_WELL_D} fill="url(#arrowWellGrad)" stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
        </svg>

        {DAS_LAYOUT.map(key => {
          const { kw, kh, kx, ky } = computeKeyBox(key.code, key.x, key.y, key.w, key.h||1);
          const s = statesRef.current.get(key.code);
          const now = performance.now();
          const prog = getProgress(s, now, swRef.current);
          const pressed = prog > 0.01;
          const isErr = !!(s?.errorAt && now - s.errorAt < 250);
          return (
            <div
              key={key.code}
              ref={el => { if (el) wrapRefs.current.set(key.code, el); }}
              onMouseDown={handleKeyMouseDown(key.code)}
              style={{ position:"absolute", left:kx, top:ky, width:kw, height:kh, cursor:"default", touchAction:"none" }}
            >
              <Keycap
                keyDef={key}
                kw={kw}
                kh={kh}
                isErr={isErr}
                pressed={pressed}
                underglowAlpha={pressed ? 0.18 : 0.08}
                ledAlpha={pressed ? 0.3 : 0.1}
                capRef={el => { if (el) capRefs.current.set(key.code, el); }}
                rgbRef={el => { if (el) rgbRefs.current.set(key.code, el); }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
