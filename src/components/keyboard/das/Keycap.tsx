/**
 * Keycap.tsx — Block 1+2: one key rendered as pure DOM/CSS, geometrically
 * and visually matched layer-by-layer against the canvas drawKey()/drawLabel()
 * functions from the original engine (see engine.ts comment header).
 *
 * Every offset/radius/gradient-stop below is transcribed directly from the
 * canvas math, not eyeballed — see inline comments citing the original
 * canvas call each block replaces.
 */
import React from "react";
import type { KeyDef } from "./engine";

const FONT = '"Inter",ui-sans-serif,system-ui,-apple-system,sans-serif';

interface KeycapProps {
  keyDef: KeyDef;
  kw: number;
  kh: number;
  isErr: boolean;
  pressed: boolean;
  underglowAlpha: number; // 0.08 idle / 0.18 pressed (see drawKey underglow)
  ledAlpha: number;       // 0.1 idle / 0.3 pressed
  capRef?: React.Ref<HTMLDivElement>;
  rgbRef?: React.Ref<HTMLDivElement>;
}

// ─── Label ───────────────────────────────────────────────────────────────────
// Mirrors drawLabel() branch-for-branch.

function Label({ keyDef, isErr, iw, ih }: { keyDef: KeyDef; isErr: boolean; iw: number; ih: number }) {
  const col = isErr ? "#ff5252" : "#ffffff";
  const glow = isErr ? "rgba(255,82,82,0.8)" : "rgba(255,255,255,0.15)";
  const textShadow = `0 0 3px ${glow}`;
  const code = keyDef.code;

  const isCtrl = ["PrintScreen","ScrollLock","Pause","Insert","Home","PageUp","Delete","End","PageDown"].includes(code);
  if (isCtrl) {
    if (["Pause","Insert","Delete","Home","End"].includes(code)) {
      const lbl = code==="Insert"?"Ins":code==="Delete"?"Del":keyDef.label[0];
      return (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:9, fontWeight:600, color:col, textShadow, fontFamily:FONT, lineHeight:1 }}>
          {lbl}
        </div>
      );
    }
    const map: Record<string,[string,string]> = {
      PrintScreen:["Prt","Sc"], ScrollLock:["Scr","Lk"],
      PageUp:["Page","Up"], PageDown:["Page","Down"]
    };
    const [t,b] = map[code]||[keyDef.label[0],keyDef.label[1]||""];
    return (
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                    fontSize:9, fontWeight:600, color:col, textShadow, fontFamily:FONT, lineHeight:1.15 }}>
        <span>{t}</span><span>{b}</span>
      </div>
    );
  }

  if (code === "ContextMenu") {
    return (
      <svg width={iw} height={ih} style={{ position:"absolute", inset:0 }}>
        <g stroke={col} strokeWidth={2} strokeLinecap="butt" opacity={0.9} style={{ filter: `drop-shadow(0 0 2px ${glow})` }}>
          <line x1={iw/2-8} y1={ih/2-6} x2={iw/2+8} y2={ih/2-6} />
          <line x1={iw/2-8} y1={ih/2}   x2={iw/2+8} y2={ih/2} />
          <line x1={iw/2-8} y1={ih/2+6} x2={iw/2+8} y2={ih/2+6} />
        </g>
      </svg>
    );
  }

  const arrowRot: Record<string, number> = { ArrowUp:0, ArrowRight:90, ArrowDown:180, ArrowLeft:270 };
  if (arrowRot[code] !== undefined) {
    return (
      <svg width={iw} height={ih} style={{ position:"absolute", inset:0 }}>
        <g transform={`translate(${iw/2},${ih/2}) rotate(${arrowRot[code]})`} style={{ filter: `drop-shadow(0 0 2px ${glow})` }}>
          <path d="M 0,-4 L 4,3 L -4,3 Z" fill={col} opacity={0.9} />
        </g>
      </svg>
    );
  }

  if (code === "Escape" || /^F\d+$/.test(code)) {
    const lbl = code==="Escape"?"Esc":keyDef.label[0];
    return (
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:10, fontWeight:600, color:col, textShadow, fontFamily:FONT, lineHeight:1 }}>
        {lbl}
      </div>
    );
  }

  if (code.startsWith("Key")) {
    return (
      <div style={{ position:"absolute", left:5, top:3, fontSize:11, fontWeight:500, color:col, textShadow, fontFamily:FONT, lineHeight:1 }}>
        {keyDef.label[0]}
      </div>
    );
  }

  if (code === "MetaLeft" || code === "MetaRight") {
    const flagCol = isErr ? "#ff5252" : "#e52525";
    return (
      <svg width={iw} height={ih} style={{ position:"absolute", inset:0 }}>
        <g transform={`translate(${iw/2-6},${ih/2-6}) scale(0.12)`} fill={flagCol}>
          <path d="M35,5 L59,23 L59,43 L35,25 Z" />
          <path d="M35,35 L75,65 L35,95 L35,83 L59,65 L35,47 Z" />
        </g>
      </svg>
    );
  }

  if (code === "NumpadEnter" || code === "NumpadAdd") {
    const lbl = code==="NumpadEnter"?"Enter":keyDef.label[0];
    return (
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:10, fontWeight:500, color:col, textShadow, fontFamily:FONT, lineHeight:1 }}>
        {lbl}
      </div>
    );
  }

  if (keyDef.align === "left-stacked") {
    const top = keyDef.label[0], bot = keyDef.label[1]||"";
    return (
      <div style={{ position:"absolute", left:4, top:2.5, display:"flex", flexDirection:"column", fontFamily:FONT }}>
        <span style={{ fontSize:9.5, fontWeight:600, color:col, textShadow, opacity:0.95, lineHeight:1 }}>{top}</span>
        {bot && <span style={{ fontSize:9, fontWeight:500, color:col, textShadow, opacity:0.85, lineHeight:1.2 }}>{bot}</span>}
      </div>
    );
  }

  const leftMods = ["Tab","CapsLock","ShiftLeft","ShiftRight","ControlLeft","ControlRight","AltLeft","AltRight","Enter","Backspace"];
  if (leftMods.includes(code)) {
    const lmap: Record<string,string> = {
      CapsLock:"Caps Lock", ShiftLeft:"Shift", ShiftRight:"Shift",
      ControlLeft:"Ctrl", ControlRight:"Ctrl", AltLeft:"Alt", AltRight:"Alt",
      Tab:"Tab", Enter:"Enter", Backspace:"Backspace"
    };
    return (
      <div style={{ position:"absolute", left:6, top:"50%", transform:"translateY(-50%)",
                    fontSize:10, fontWeight:500, color:col, textShadow, fontFamily:FONT, lineHeight:1 }}>
        {lmap[code] ?? keyDef.label[0]}
      </div>
    );
  }

  return (
    <div style={{ position:"absolute", left:5, top:4, fontSize:10, fontWeight:500, color:col, textShadow, fontFamily:FONT, lineHeight:1 }}>
      {keyDef.label[0]}
    </div>
  );
}

export function Keycap({ keyDef, kw, kh, isErr, pressed, underglowAlpha, ledAlpha, capRef, rgbRef }: KeycapProps) {
  const iT = 1, iB = keyDef.code === "Space" ? 1 : 4.5, iL = 3.5, iR = 3.5;
  const iw = kw - iL - iR, ih = kh - iT - iB;

  // Underglow — drawKey(): radialGradient center (kw/2,-3) r=kw*0.75, fillRect(-3,-7,kw+6,kh+10)
  const ugCx = kw/2 + 3, ugCy = 4, ugR = kw*0.75;
  // LED hotspot — radialGradient center (kw/2, kh*0.15) r=9, fillRect(kw/2-9,0,18,14)
  const ledCy = kh*0.15;

  const ang = pressed ? 55 : 65;

  return (
    <div style={{ position:"absolute", left:0, top:0, width:kw, height:kh, overflow:"visible" }}>
      {/* Backlight underglow */}
      <div style={{
        position:"absolute", left:-3, top:-7, width:kw+6, height:kh+10, pointerEvents:"none",
        background:`radial-gradient(circle ${ugR}px at ${ugCx}px ${ugCy}px, rgba(255,255,255,${underglowAlpha}) 0%, rgba(255,255,255,0) 100%)`,
      }} />
      {/* LED hotspot */}
      <div style={{
        position:"absolute", left:kw/2-9, top:0, width:18, height:14, pointerEvents:"none",
        background:`radial-gradient(circle 9px at 9px ${ledCy}px, rgba(255,255,255,${ledAlpha}) 0%, rgba(255,255,255,0) 100%)`,
      }} />
      {/* RGB underglow overlay — mutated directly via rAF in Keyboard.tsx (see
          RGB canvas loop in the original engine); empty/transparent when RGB
          is disabled so it costs nothing at idle. */}
      <div ref={rgbRef} style={{
        position:"absolute", left:-4, top:-8, width:kw+8, height:kh+12, pointerEvents:"none", opacity:0,
      }} />
      {/* Skirt — visible only while cap is not pressed */}
      {!pressed && (
        <div style={{
          position:"absolute", left:0, top:kh-4, width:kw, height:10, borderRadius:4,
          background:"#0a0a0c", boxShadow:"0 4px 6px rgba(0,0,0,0.4)", border:"1px solid rgba(0,0,0,0.5)",
        }} />
      )}
      {/* Key body */}
      <div ref={capRef} style={{
        position:"absolute", left:0, top:0, width:kw, height:kh, borderRadius:2,
        background:"#1c1c1e",
        boxShadow: isErr
          ? "0 2px 15px rgba(255,0,0,0.9)"
          : (pressed ? "none" : "0 8px 0 0 #080808, 0 12px 18px rgba(0,0,0,0.8)"),
        border: `1px solid ${isErr ? "rgba(255,0,0,0.9)" : "rgba(0,0,0,0.9)"}`,
        willChange: "transform",
      }}>
        {/* Pressed inner-shadow lip */}
        {pressed && (
          <div style={{ position:"absolute", inset:0, borderRadius:2, overflow:"hidden", pointerEvents:"none" }}>
            <div style={{ position:"absolute", left:0, top:0, width:kw, height:Math.min(kh,20),
                          background:"linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0))" }} />
            <div style={{ position:"absolute", inset:0, borderRadius:2, boxShadow:"inset 0 0 12px rgba(255,255,255,0.1)",
                          border:"1px solid rgba(255,255,255,0.05)" }} />
          </div>
        )}

        {/* Corner angle decorators */}
        <div style={{ position:"absolute", left:kw+8-24, top:kh, width:24, height:1.5, background:"#000",
                      transformOrigin:"right center", transform:`rotate(${ang}deg)`, pointerEvents:"none" }} />
        <div style={{ position:"absolute", left:-8, top:kh, width:24, height:1.5, background:"#000",
                      transformOrigin:"left center", transform:`rotate(${-ang}deg)`, pointerEvents:"none" }} />

        {/* Inner keycap surface */}
        <div style={{
          position:"absolute", left:iL, top:iT, width:iw, height:ih, borderRadius:1.5,
          background:"linear-gradient(to bottom, #2c2c2f, #161618)",
          border:"1px solid rgba(0,0,0,0.9)", overflow:"hidden",
        }}>
          <div style={{ position:"absolute", left:0, top:0, width:"100%", height:1, background:"rgba(255,255,255,0.06)" }} />
          <div style={{ position:"absolute", left:0, top:0, width:1, height:"100%", background:"rgba(255,255,255,0.03)" }} />
          <div style={{ position:"absolute", right:0, top:0, width:1, height:"100%", background:"rgba(255,255,255,0.03)" }} />
          <div style={{ position:"absolute", left:0, top:0, width:"100%", height:3,
                        background:"linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(255,255,255,0))" }} />
          <div style={{ position:"absolute", left:0, bottom:0, width:"100%", height:4,
                        background:"linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.7))" }} />
          <div style={{ position:"absolute", inset:0 }}>
            <Label keyDef={keyDef} isErr={isErr} iw={iw} ih={ih} />
          </div>
        </div>
      </div>
    </div>
  );
}
