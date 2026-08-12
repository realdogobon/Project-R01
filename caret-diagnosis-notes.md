# RoyScript TSR — Caret Surgery Round 3 (live log)

## Round 3 fixes applied (DefaultTemplate.tsx + lexkit/styles.css)
1. CSS blink animation removed; JS-driven blink in loop (0.8s period, settledAt-anchored, 150ms grace).
2. Mobile: user-select auto, touch-action auto on .lexkit-content-editable; input/composition/touchend listeners.
3. Sub-stepped spring, poison guard (clamp -1e6 sentinel, hide while poisoned), reveal fade.
4. Loop no longer stops when settled (`!p.isVisible` only).
5. Debug probe window.__caretLog at line ~1029 in updateCaretPosition.
6. TS clean, HMR live.

## State at 08:14 UTC
- Live caret (single element, live wrap): transform stable `translate3d(923.062px, 49.1px, 0px) scaleX(...)` — VALID, at end-of-text position. No e+38/Infinity. caretTop=228 consistent with container offsets.
- Probe: 32 rect measurements, 0 bad rects.
- PROBLEM REMAINING: blink never fires (opacity stays 1 for 4s+). Loop writes transform+opacity in same block; transform is stable — loop could be dead (frozen values) or alive and writing same transform + blink opacity that never toggles.
- Blink math: BLINK_PERIOD 0.8s, blinkOn = phase < 0.4, grace 150ms, activeGlow = isActive ? 1 : blinkOn. p.settledAt default 0, blinkPhaseOffset default 0. isActive=false after snap → activeGlow = blinkOn → opacity should alternate. fadeAlpha starts 1. So blink should work IF loop writes.
- NEXT: set caret.style.opacity='0' directly → if it stays 0 → loop dead; if restored → loop alive and blink bug is elsewhere (maybe p.settledAt constantly reset by snap block re-triggering? snap re-fires every frame once settled? NO: snap condition dist<0.008 AND velocity<0.008 — once snapped, velocity 0, target=current, dist 0 → re-fires EVERY FRAME → p.settledAt = now continuously → now - settledAt = 0 always → grace always true → activeGlow always 1 → BLINK NEVER FIRES!)
- ROOT CAUSE FOUND: snap block re-executes every frame while settled, continuously resetting p.settledAt to now, so grace (now - settledAt < 150) is perpetually true → caret stays solid forever.
- FIX: only set settledAt when transitioning INTO settled state (wasActive → inactive), e.g., `if (p.isActive) p.settledAt = now;` inside the snap block, or guard `if (p.isActive && dist < ...)` → snap only when active.

## Recurring pattern (08:14-08:15 UTC)
- New TS source IS served by dev server (verified via fetch, hasFix/hasProbe/hasVisibleGate all true).
- But browser-side runtime keeps executing STALE compiled JS: caret transform reads -3.4e38 sentinel (old snapshot), blink doesn't fire.
- Pattern across 3 navigation cycles: console navigate → page remounts → old compiled bundle still executes. HMR `hmr update` logs fire but the DefaultTemplate module (nested inside EditorContent component, wrapped?) doesn't get its effect re-run in the live tab.
- Hypothesis: React HMR preserves the component instance; the module is updated but... actually if module source changed, Vite HMR re-executes the module; but DefaultTemplate is lazy? No. The caret physics effect `useEffect(..., [])` runs on mount; if HMR didn't re-mount, old effect persists.
- DECISION: Stop fighting HMR staleness. Validate via PRODUCTION BUILD instead: run `pnpm run build` then serve `dist` via python http.server on another port, test there — gives definitive fresh code. Also final delivery is production anyway.
- Validation plan on prod build: (1) clear+focus+burst → transform finite + last line; (2) 2.4s rest → blink off frames ≥ 8; (3) mobile viewport 375px → touch selection + caret; (4) select-all → caret hidden.

## Files modified this round
- client/src/components/lexkit/DefaultTemplate.tsx: poison guard + sentinel hide, blink transition fix (settledAt only on active→idle), loop visible-only gate, sub-stepped spring, JS blink, debug probe window.__caretLog (~line 1029 — REMOVE before checkpoint), mobile listeners, reveal fade.
- client/src/components/lexkit/styles.css: removed .animate-caret-blink keyframes + class comment; user-select/touch-action rules on .lexkit-content-editable.

## Production validation setup (08:16 UTC)
Prod bundle served at http://localhost:4000/index.html (python http.server, cwd dist/public). App loads clean: 'Start typing...' placeholder, fresh document, caret container visible. Prod preview URL for dev server: https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer (HMR stale — do NOT validate on it).
Validation battery on prod: (1) click editable → burst type → transform finite; (2) rest 2.4s → blink off frames; (3) 375px mobile viewport test via webdev_take_screenshot viewport or browser mobile emulation; (4) select-all → caret hidden.
Prod validation script (paste into console on localhost:4000):
```
(async () => {
  const editable = document.querySelector('.lexkit-content-editable');
  const caret = document.querySelector('.custom-smooth-caret');
  editable.focus({preventScroll:true});
  await new Promise(r => setTimeout(r, 300));
  for (let i = 0; i < 15; i++) { document.execCommand('insertText', false, `p${i} `); await new Promise(r => setTimeout(r, 30)); }
  const midBad = caret.style.transform.includes('e+38') || caret.style.transform.includes('Infinity');
  await new Promise(r => setTimeout(r, 1000));
  const samples = [];
  for (let i = 0; i < 24; i++) { samples.push(parseFloat(getComputedStyle(caret).opacity)); await new Promise(r => setTimeout(r, 100)); }
  return JSON.stringify({ midBad, blinkOff: samples.filter(v => v < 0.05).length, total: samples.length, endT: caret.style.transform.slice(0,45), caretTop: caret.getBoundingClientRect().top, lastLineTop: editable.lastElementChild.getBoundingClientRect().top });
})()
```

## Evidence at 08:17 UTC (prod page)
Direct caretRange measurements during focus+burst: ALL finite, correct (left 472→689, top 177, h 18). No poisoned rect EVER occurs in my code's path. Yet caret.style.transform reads -3.4e38.
Therefore the e+38 is NOT produced by my rect math. Candidates remaining: (a) the transform write came from an OLD bundle snapshot the page still executes; (b) another code path writes caret transform (search codebase for other caret transform writers); (c) caretRef.current refers to a different (old) element.
Action: re-verify on hard-reloaded prod page: sample transform at t=0 (mount), t=1s, then burst, then rest; check caret display.

## 08:17:51 timeline evidence (prod)
- After focus (no burst yet): caret transform = 688.266px CORRECT, display block — caret visible at load.
- Mid burst: x = -3.4e38, y = 23.6 (y never poisoned!) → ONLY x gets poisoned during execCommand bursts.
- caretTop remains 177 (rendered position correct — CSS clamps the huge translate, so caret still visually near text... actually it'd render off-screen left; screenshot didn't show caret. caretTop 177 = computed via getBoundingClientRect which returns actual position? getBoundingClientRect returns the CLAMPED/rendered rect — hmm browsers clamp translate to... actually Chromium clamps transform values to ±Number.MAX_VALUE? No wait — getBoundingClientRect of an element translated -3.4e38px left would return left ≈ -3.4e38... but caretTop=177 is y, x wasn't checked.
- My geometry instrumentation (Range/Elem gBCR/gCR) caught ZERO poisoned rects during bursts → poisoned x does NOT come from any measured rect in updateCaretPosition BEFORE the guard... UNLESS it comes from a path AFTER the guard.
- ONLY candidate left after guard: the `p.current = {x: left}` snap (left=good), p.target = {left, top, h} (good), loop integration... BUT what about `const left = ...; const top = ...` computed for the FOCUS measurement where `caretRange.setStart(focusNode, focusOffset)` — during execCommand's rAF, focusOffset could equal a large offset on a node that got split → offset > node.length → caretRange invalid → getClientRects returns poisoned rect (Chromium: collapsed range with invalid state returns {left: MAX, top: MAX, ...}!) — THIS is a known Chromium behavior for detached/invalid ranges!
- My wrapper would have caught caretRange.getClientRects though... UNLESS caretRects was obtained BEFORE wrapper install (impossible) OR the poisoned rect came from `caretRange.getBoundingClientRect()` — also wrapped.
- OR — the poisoned rect came from a DIFFERENT range measurement in another code path: updateScrollStats? Or caretRange in the FIRST guard section (commonAncestorContainer check)... none write left/top.
- DECISIVE NEXT: log the STACK when caret.style.transform gets e+38 by patching Element.prototype.getBoundingClientRect... no. Patch: caret.style.transform setter via caret's element class? Simplest: in the loop, the write is `caretRef.current.style.transform = ...`. Add a check: if value includes 'e+38', console.trace('poison write', left, top, rectInfo) directly in the TSX file itself (in-source trace). HMR stale problem again for dev, but PROD bundle gets rebuilt → definitive.

## ROOT CAUSE FOUND (08:19) — velocity explosion in sub-step loop
POISON WRITE payload: curX=-2.7e38, tgtX=101 (good!), vx=3.15e38, vy=0. So target is fine; velocity explodes to ±MAX.
Mechanism: in the sub-step loop, dt is in '60Hz frame units' (dt = elapsed/0.016666, max 6 for a 100ms frame). The semi-implicit Euler spring with wn=22 is unstable when wn*dt >> 2: here wn*dt_frame = 22*6 = 132, so each poisoned/jump frame makes current + velocity diverge exponentially to ±MAX_VALUE within one frame.
Trigger sequence: poisoned rect (e.g., during execCommand burst rAF) → guard sets target=-1e6 → ONE integration frame (or a big-elapsed frame after tab switch) → exponential blowup → velocity ±MAX → caret transform -3.4e38 → frozen + blink dead.
FIX: integration dt must be in SECONDS, not frame units. ax = wn²*(t-c) - 2ζwn*v; v += ax*s; c += v*s where s = min(elapsed, maxStep) in seconds. Also keep wn=22 as-is (per-second units). Optionally clamp velocity magnitude as belt-and-braces.

## ROOT FIX APPLIED + VERIFIED (08:21)
Fix: sub-step loop dt now in SECONDS (`v += ax*s; x += v*s`, s = min(elapsed, 0.016666)s); wn=22 rad/s stable (wn*dt=0.37). Velocity clamps MAX_VEL 4000 px/s. Sculpting coefficients re-scaled for px/s velocities (stretch 0.0003, lean 0.0006, fallSquash 0.0005).
Verified on prod build (localhost:4000, fresh hashed bundle):
- t0 = 101.266px correct after focus
- mid-burst: transform finite (367.324px), midBad=false ✓
- idle blink: 10 off frames / 24 samples (0.8s period working) ✓
- big-dt frame (150ms busy-wait simulating tab switch): postBad=false ✓
- select-all: caret hidden (display none) ✓
- caretRestored showed 'none' after SIMULATED mouse event (no real selection set) — expected, needs real range selection check which threw IndexSizeError (p has only 1 child: caret element?). Use first text node with length check.
Remaining: finish real-selection restore check (use text node of length ≥5, else use execCommand), mobile viewport test 375px, checkpoint, deliver.
Prod serve cmd: cd /home/ubuntu/royscript-tsr/dist/public && python3 -m http.server 4000 (session main)
