/**
 * engine.ts
 * Pure data + logic: key layout, Cherry MX press/release physics curves,
 * and RGB color math. No sound/audio code lives here or anywhere in this
 * package — sound is intentionally out of scope so a host app can wire its
 * own audio per keypress (see keyboard-controls.md).
 * Unchanged in spirit from the canvas build — only the rendering (Keycap.tsx,
 * Keyboard.tsx) is new; this file is the shared source of truth so the DOM
 * build and the physics numbers can never drift apart.
 */

export const U = 44;

export type KeyDef = {
  code: string; label: string[]; x: number; y: number; w: number;
  h?: number; altLabel?: boolean; align?: "left" | "center" | "left-stacked";
};

// ─── Layout — exact copy from original ───────────────────────────────────────

export const DAS_LAYOUT: KeyDef[] = [
  { code:"Escape",        label:["Esc"],          x:0,    y:1,   w:1,    align:"left" },
  { code:"F1",            label:["F1"],           x:2,    y:1,   w:1,    align:"left" },
  { code:"F2",            label:["F2"],           x:3,    y:1,   w:1,    align:"left" },
  { code:"F3",            label:["F3"],           x:4,    y:1,   w:1,    align:"left" },
  { code:"F4",            label:["F4"],           x:5,    y:1,   w:1,    align:"left" },
  { code:"F5",            label:["F5"],           x:6.5,  y:1,   w:1,    align:"left" },
  { code:"F6",            label:["F6"],           x:7.5,  y:1,   w:1,    align:"left" },
  { code:"F7",            label:["F7"],           x:8.5,  y:1,   w:1,    align:"left" },
  { code:"F8",            label:["F8"],           x:9.5,  y:1,   w:1,    align:"left" },
  { code:"F9",            label:["F9"],           x:11,   y:1,   w:1,    align:"left" },
  { code:"F10",           label:["F10"],          x:12,   y:1,   w:1,    align:"left" },
  { code:"F11",           label:["F11"],          x:13,   y:1,   w:1,    align:"left" },
  { code:"F12",           label:["F12"],          x:14,   y:1,   w:1,    align:"left" },
  { code:"PrintScreen",   label:["Prt","Sc"],     x:15.5, y:1,   w:1,    altLabel:true, align:"left-stacked" },
  { code:"ScrollLock",    label:["Scr","Lk"],     x:16.5, y:1,   w:1,    align:"left-stacked" },
  { code:"Pause",         label:["Pause"],        x:17.5, y:1,   w:1,    align:"center" },
  { code:"Backquote",     label:["~","`"],        x:0,    y:2.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Digit1",        label:["!","1"],        x:1,    y:2.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Digit2",        label:["@","2"],        x:2,    y:2.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Digit3",        label:["#","3"],        x:3,    y:2.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Digit4",        label:["$","4"],        x:4,    y:2.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Digit5",        label:["%","5"],        x:5,    y:2.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Digit6",        label:["^","6"],        x:6,    y:2.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Digit7",        label:["&","7"],        x:7,    y:2.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Digit8",        label:["*","8"],        x:8,    y:2.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Digit9",        label:["(","9"],        x:9,    y:2.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Digit0",        label:[")","0"],        x:10,   y:2.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Minus",         label:["_","-"],        x:11,   y:2.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Equal",         label:["+","="],        x:12,   y:2.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Backspace",     label:["Backspace"],    x:13,   y:2.5, w:2,    align:"center" },
  { code:"Insert",        label:["Ins"],          x:15.5, y:2.5, w:1,    align:"left-stacked" },
  { code:"Home",          label:["Home"],         x:16.5, y:2.5, w:1,    align:"left-stacked" },
  { code:"PageUp",        label:["Page","Up"],    x:17.5, y:2.5, w:1,    align:"left-stacked" },
  { code:"NumLock",       label:["Num","Lk"],     x:19,   y:2.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"NumpadDivide",  label:["/"],            x:20,   y:2.5, w:1,    align:"left" },
  { code:"NumpadMultiply",label:["*"],            x:21,   y:2.5, w:1,    align:"center" },
  { code:"NumpadSubtract",label:["-"],            x:22,   y:2.5, w:1,    align:"center" },
  { code:"Tab",           label:["Tab"],          x:0,    y:3.5, w:1.5,  align:"left" },
  { code:"KeyQ",          label:["Q"],            x:1.5,  y:3.5, w:1,    align:"left" },
  { code:"KeyW",          label:["W"],            x:2.5,  y:3.5, w:1,    align:"left" },
  { code:"KeyE",          label:["E"],            x:3.5,  y:3.5, w:1,    align:"left" },
  { code:"KeyR",          label:["R"],            x:4.5,  y:3.5, w:1,    align:"left" },
  { code:"KeyT",          label:["T"],            x:5.5,  y:3.5, w:1,    align:"left" },
  { code:"KeyY",          label:["Y"],            x:6.5,  y:3.5, w:1,    align:"left" },
  { code:"KeyU",          label:["U"],            x:7.5,  y:3.5, w:1,    align:"left" },
  { code:"KeyI",          label:["I"],            x:8.5,  y:3.5, w:1,    align:"left" },
  { code:"KeyO",          label:["O"],            x:9.5,  y:3.5, w:1,    align:"left" },
  { code:"KeyP",          label:["P"],            x:10.5, y:3.5, w:1,    align:"left" },
  { code:"BracketLeft",   label:["{","["],        x:11.5, y:3.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"BracketRight",  label:["}","]"],        x:12.5, y:3.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Backslash",     label:["|","\\"],       x:13.5, y:3.5, w:1.5,  altLabel:true, align:"left-stacked" },
  { code:"Delete",        label:["Del"],          x:15.5, y:3.5, w:1,    align:"left-stacked" },
  { code:"End",           label:["End"],          x:16.5, y:3.5, w:1,    align:"left-stacked" },
  { code:"PageDown",      label:["Page","Down"],  x:17.5, y:3.5, w:1,    align:"left-stacked" },
  { code:"Numpad7",       label:["7","Home"],     x:19,   y:3.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Numpad8",       label:["8","↑"],        x:20,   y:3.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Numpad9",       label:["9","PgUp"],     x:21,   y:3.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"NumpadAdd",     label:["+"],            x:22,   y:3.5, w:1,    h:2, align:"left" },
  { code:"CapsLock",      label:["Caps Lock"],    x:0,    y:4.5, w:1.75, align:"left" },
  { code:"KeyA",          label:["A"],            x:1.75, y:4.5, w:1,    align:"left" },
  { code:"KeyS",          label:["S"],            x:2.75, y:4.5, w:1,    align:"left" },
  { code:"KeyD",          label:["D"],            x:3.75, y:4.5, w:1,    align:"left" },
  { code:"KeyF",          label:["F"],            x:4.75, y:4.5, w:1,    align:"left" },
  { code:"KeyG",          label:["G"],            x:5.75, y:4.5, w:1,    align:"left" },
  { code:"KeyH",          label:["H"],            x:6.75, y:4.5, w:1,    align:"left" },
  { code:"KeyJ",          label:["J"],            x:7.75, y:4.5, w:1,    align:"left" },
  { code:"KeyK",          label:["K"],            x:8.75, y:4.5, w:1,    align:"left" },
  { code:"KeyL",          label:["L"],            x:9.75, y:4.5, w:1,    align:"left" },
  { code:"Semicolon",     label:[":",";"],        x:10.75,y:4.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Quote",         label:['"',"'"],        x:11.75,y:4.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Enter",         label:["Enter"],        x:12.75,y:4.5, w:2.25, align:"left" },
  { code:"Numpad4",       label:["4","←"],        x:19,   y:4.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Numpad5",       label:["5"],            x:20,   y:4.5, w:1,    align:"left-stacked" },
  { code:"Numpad6",       label:["6","→"],        x:21,   y:4.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"ShiftLeft",     label:["Shift"],        x:0,    y:5.5, w:2.25, align:"left" },
  { code:"KeyZ",          label:["Z"],            x:2.25, y:5.5, w:1,    align:"left" },
  { code:"KeyX",          label:["X"],            x:3.25, y:5.5, w:1,    align:"left" },
  { code:"KeyC",          label:["C"],            x:4.25, y:5.5, w:1,    align:"left" },
  { code:"KeyV",          label:["V"],            x:5.25, y:5.5, w:1,    align:"left" },
  { code:"KeyB",          label:["B"],            x:6.25, y:5.5, w:1,    align:"left" },
  { code:"KeyN",          label:["N"],            x:7.25, y:5.5, w:1,    align:"left" },
  { code:"KeyM",          label:["M"],            x:8.25, y:5.5, w:1,    align:"left" },
  { code:"Comma",         label:["<",","],        x:9.25, y:5.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Period",        label:[">","."],        x:10.25,y:5.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Slash",         label:["?","/"],        x:11.25,y:5.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"ShiftRight",    label:["Shift"],        x:12.25,y:5.5, w:2.75, align:"left" },
  { code:"ArrowUp",       label:["▲"],            x:16.5, y:5.5, w:1,    align:"center" },
  { code:"Numpad1",       label:["1","End"],      x:19,   y:5.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Numpad2",       label:["2","↓"],        x:20,   y:5.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"Numpad3",       label:["3","PgDn"],     x:21,   y:5.5, w:1,    altLabel:true, align:"left-stacked" },
  { code:"NumpadEnter",   label:["Enter"],        x:22,   y:5.5, w:1,    h:2, align:"left" },
  { code:"ControlLeft",   label:["Ctrl"],         x:0,    y:6.5, w:1.25, align:"left" },
  { code:"MetaLeft",      label:["Win"],          x:1.25, y:6.5, w:1.25, align:"left" },
  { code:"AltLeft",       label:["Alt"],          x:2.5,  y:6.5, w:1.25, align:"left" },
  { code:"Space",         label:[""],             x:3.75, y:6.5, w:6.25, align:"center" },
  { code:"AltRight",      label:["Alt"],          x:10,   y:6.5, w:1.25, align:"left" },
  { code:"MetaRight",     label:["Win"],          x:11.25,y:6.5, w:1.25, align:"left" },
  { code:"ContextMenu",   label:["≡"],            x:12.5, y:6.5, w:1.25, align:"center" },
  { code:"ControlRight",  label:["Ctrl"],         x:13.75,y:6.5, w:1.25, align:"left" },
  { code:"ArrowLeft",     label:["◀"],            x:15.5, y:6.5, w:1,    align:"center" },
  { code:"ArrowDown",     label:["▼"],            x:16.5, y:6.5, w:1,    align:"center" },
  { code:"ArrowRight",    label:["▶"],            x:17.5, y:6.5, w:1,    align:"center" },
  { code:"Numpad0",       label:["0","Ins"],      x:19,   y:6.5, w:2,    altLabel:true, align:"left-stacked" },
  { code:"NumpadDecimal", label:[".",  "Del"],    x:21,   y:6.5, w:1,    altLabel:true, align:"left-stacked" },
];

// ─── Cherry MX Physics ───────────────────────────────────────────────────────

function mkCubic(x1: number, y1: number, x2: number, y2: number) {
  const cx=3*x1, bx=3*(x2-x1)-cx, ax=1-cx-bx;
  const cy=3*y1, by=3*(y2-y1)-cy, ay=1-cy-by;
  const sX=(t:number)=>((ax*t+bx)*t+cx)*t;
  const sY=(t:number)=>((ay*t+by)*t+cy)*t;
  return (t: number) => {
    let u=t; for(let i=0;i<8;i++){const g=sX(u)-t,d=(3*ax*u+2*bx)*u+cx;if(Math.abs(g)<1e-6)break;u-=g/d;} return sY(u);
  };
}

export function cubicCss(x1: number, y1: number, x2: number, y2: number): string {
  return `cubic-bezier(${x1},${y1},${x2},${y2})`;
}

// Heavier, metal-bodied travel: presses build up resistance instead of
// snapping instantly (slower initial ease-in, "weighted" mid-travel), and
// releases spring back with real overshoot before settling — like a stiff
// steel spring under a dense keycap, not a light plastic dome.
export const PHYSICS: Record<string,{ms:number;ease:(t:number)=>number;travel:number;cssCubic:[number,number,number,number]}> = {
  blue:  { ms: 95,  ease: mkCubic(0.45,0,0.55,0.3),        travel: 9, cssCubic:[0.45,0,0.55,0.3] },
  brown: { ms: 85,  ease: mkCubic(0.4,0,0.5,0.9),           travel: 8, cssCubic:[0.4,0,0.5,0.9] },
  red:   { ms: 70,  ease: mkCubic(0.3,0.2,0.4,0.85),        travel: 7, cssCubic:[0.3,0.2,0.4,0.85] },
  def:   { ms: 80,  ease: mkCubic(0.35,0.1,0.45,0.9),       travel: 8, cssCubic:[0.35,0.1,0.45,0.9] },
};

export const RELEASE_PHYSICS: Record<string,{ms:number;ease:(t:number)=>number;cssCubic:[number,number,number,number]}> = {
  blue:  { ms: 260, ease: mkCubic(0.22, 1.15, 0.36, 1.55),  cssCubic:[0.22,1.15,0.36,1.55] },
  brown: { ms: 280, ease: mkCubic(0.22, 1.1,  0.36, 1.4),   cssCubic:[0.22,1.1,0.36,1.4] },
  red:   { ms: 230, ease: mkCubic(0.25, 1.05, 0.4,  1.3),   cssCubic:[0.25,1.05,0.4,1.3]   },
  def:   { ms: 270, ease: mkCubic(0.22, 1.1,  0.36, 1.45),  cssCubic:[0.22,1.1,0.36,1.45] },
};

// Stabilized keys — wire/PCB mount sounds different (deeper, more body)
// "Shift" alias covers synthetic/virtual dispatches alongside ShiftLeft/ShiftRight
export const STABILIZED_KEYS = new Set(["Space","Enter","Backspace","Shift","ShiftLeft","ShiftRight","NumpadEnter","NumpadAdd"]);

export function getTravelPx(sw: string): number {
  return (PHYSICS[sw] ?? PHYSICS.def).travel;
}

export interface KState { pressedAt: number; releasedAt?: number; errorAt?: number; }

export function getProgress(s: KState|undefined, now: number, sw: string): number {
  if (!s) return 0;
  const p  = PHYSICS[sw]         ?? PHYSICS.def;
  const rp = RELEASE_PHYSICS[sw] ?? RELEASE_PHYSICS.def;
  const dt = now - s.pressedAt;
  if (s.releasedAt == null) return p.ease(Math.min(1, dt/p.ms));
  const rdt = now - s.releasedAt;
  if (rdt > rp.ms) return 0;
  return 1 - rp.ease(rdt/rp.ms);
}

// ─── Switch Indicator Colors (knob dot) ──────────────────────────────────────

export const SWITCH_INDICATOR: Record<string, { dot: string; shadow: string }> = {
  blue:  { dot: "#5b9bd5", shadow: "rgba(91,155,213,1)"  },
  brown: { dot: "#b5722a", shadow: "rgba(181,114,42,1)"  },
  red:   { dot: "#ff0000", shadow: "rgba(255,0,0,1)"     },
};

// ─── RGB Palette ──────────────────────────────────────────────────────────────

// 16 preset colors + one final slot = custom hue (index RGB_PRESETS.length)
export const RGB_PRESETS: [number,number,number][] = [
  [220, 40,  40 ],  // red
  [40,  200, 60 ],  // green
  [50,  100, 255],  // blue
  [0,   220, 220],  // cyan
  [210, 0,   210],  // magenta
  [220, 210, 0  ],  // yellow
  [255, 120, 0  ],  // orange
  [130, 0,   255],  // purple
  [255, 90,  160],  // pink
  [0,   255, 140],  // mint
  [255, 215, 0  ],  // gold
  [90,  255, 255],  // ice
  [255, 60,  0  ],  // ember
  [140, 255, 0  ],  // lime
  [70,  0,   140],  // indigo
  [255, 255, 255],  // white
];

// RGB effects — "static"/"wave"/"ripple"/"breathing"/"reactive" (original 5)
// plus newer additions "spectrum" (continuous rainbow cycle) and "rain"
// (randomized per-key droplet falloff). Kept as a flat ordered list so
// Sleep-button double-click cycling and the controls manual stay in sync.
export const RGB_EFFECTS = ["static","wave","ripple","breathing","reactive","spectrum","rain"] as const;
export type RgbEffect = typeof RGB_EFFECTS[number];

// ─── Color Helpers ────────────────────────────────────────────────────────────

function h2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1; if (t > 1) t -= 1;
  if (t < 1/6) return p + (q-p)*6*t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q-p)*(2/3-t)*6;
  return p;
}

export function hslToRgb(h: number, s: number, l: number): [number,number,number] {
  h /= 360;
  const q = l < 0.5 ? l*(1+s) : l+s-l*s;
  const p = 2*l - q;
  return [
    Math.round(h2rgb(p,q,h+1/3)*255),
    Math.round(h2rgb(p,q,h)*255),
    Math.round(h2rgb(p,q,h-1/3)*255),
  ];
}

export function rgbToHsl(r: number, g: number, b: number): [number,number,number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  const l = (max+min)/2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d/(2-max-min) : d/(max+min);
  let h = 0;
  if (max === r) h = (g-b)/d + (g<b?6:0);
  else if (max === g) h = (b-r)/d + 2;
  else h = (r-g)/d + 4;
  return [h/6, s, l];
}

// ─── Chassis Constants ────────────────────────────────────────────────────────

export const CW = 23*U + 54;
export const CH = 8.1*U + 32;
const slopeStart = 17.3*U + 12;
const slopeEnd   = 18.7*U + 12;
const topY = 0, midY = 0.8*U;
const radius = 18, sR = 12;
const knobYCenter = 85, notchRadius = 45, notchCutIn = 14;
export const KOX = 29, KOY = 22;

export const CHASSIS_D = `M ${radius} ${midY} L ${slopeStart-sR} ${midY} Q ${slopeStart} ${midY} ${slopeStart+(slopeEnd-slopeStart)*0.1} ${midY-(midY-topY)*0.1} L ${slopeEnd-(slopeEnd-slopeStart)*0.1} ${topY+(midY-topY)*0.1} Q ${slopeEnd} ${topY} ${slopeEnd+sR} ${topY} L ${CW-radius} ${topY} A ${radius} ${radius} 0 0 1 ${CW} ${topY+radius} L ${CW} ${knobYCenter-notchRadius} A ${notchRadius} ${notchRadius} 0 0 0 ${CW-notchCutIn} ${knobYCenter} A ${notchRadius} ${notchRadius} 0 0 0 ${CW} ${knobYCenter+notchRadius} L ${CW} ${CH-radius} A ${radius} ${radius} 0 0 1 ${CW-radius} ${CH} L ${radius} ${CH} A ${radius} ${radius} 0 0 1 0 ${CH-radius} L 0 ${midY+radius} A ${radius} ${radius} 0 0 1 ${radius} ${midY} Z`;

export interface Ripple { x: number; y: number; t: number; }
export interface ReactiveKey { code: string; t: number; }
export interface WobbleState { t: number; dir: number; }
