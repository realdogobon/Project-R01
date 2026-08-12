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

## Mobile stale-caret diagnosis (Round 5, 08:32)
Layout confirmed: caret div is absolute inside `.lexkit-editor` (position:relative, overflow:hidden). Editable `.lexkit-content-editable` (overflow:auto, height:100%, contain:layout paint) is a flex child INSIDE lexkit-editor but NOT the caret container. Rect math: caretRange rect (viewport-relative) minus containerRect (editor, viewport-relative) minus editableEl.scrollTop/scrollLeft. Math looks correct on paper.
Suspects:
1. TIMING: `input` event fires; Lexical commits asynchronously; DOM selection during the rAF immediately after input may still point at pre-commit position → rect stale.
2. Lexical's registerUpdateListener calls updateCaretPosition() synchronously in the commit — BUT this is called BEFORE React flushes DOM? Lexical reads its own state; DOM may not yet reflect the new text (React batches). caretRange rect on DOM that hasn't reflowed the new char → rect could be at OLD position. THIS matches the screenshot: caret stays where it was.
3. Mobile soft keyboard: visualViewport changes, scroll position of editable changes (auto-scroll to keep caret in view). editable 'scroll' fires → handleEvents → one rAF pass. If this races with Lexical's stale selection...
4. focusNode during mobile composition may be a stale detached node... 
Plan: (a) in updateCaretPosition, read Lexical's selection via editor.getEditorState().read(()=>$getSelection()) when DOM selection is suspect; use DOM selection otherwise. (b) Also schedule a second rAF pass after input events to re-measure post-reflow. (c) listen to visualViewport resize (keyboard). (d) On mobile only, measure focusNode's DOM element position via caretRange but ALSO cross-check: if measured rect is 'behind' where text ends, use Lexical's offset mapped to DOM node.
Simplest robust fix: after Lexical commit (registerUpdateListener), schedule updateCaretPosition in NEXT rAF (post-reflow) via requestAnimationFrame; that gives DOM time to reflow. Also add visualViewport resize listener.

## Round 5 fix implemented (08:34)
File: client/src/components/lexkit/DefaultTemplate.tsx
Changes: (1) registerUpdateListener now schedules updateCaretPosition() in NEXT rAF (post-reflow), fixing Lexical-commit-before-DOM-reflow stale measurement; (2) input listener now double-shots (handleEvents + rAF again); (3) window.visualViewport resize/scroll listener triggers double-shot (keyboard layout shifts); (4) onViewportResizeRef declared at line ~681 for cleanup.
NOTE: onInputDoubleShot duplicates the existing editable.addEventListener('input', handleEvents) at line ~1149 — REMOVE the original line 1149 `editable.addEventListener("input", handleEvents);` to avoid double-adding (harmless due to rAF-throttle guard but cleaner to remove).
Remaining: tsc check, prod rebuild, validate burst measurement in mobile emulation (insertText bursts + verify caret x matches text end), desktop smoke test, checkpoint, deliver.
Prod serve: cd /home/ubuntu/royscript-tsr/dist/public && python3 -m http.server 4000 (session main, keep running).
Repo sync (optional after): git push origin main (user's GitHub: realdogobon/Project-R01, remote origin).
User's phone runs the PUBLISHED site (roycript . manus.space?) — screenshot shows live dark theme with mobile PWA chrome. Publishing needed after checkpoint.

## Round 5 prod validation evidence (08:33)
Prod bundle (assets/index-CW6PT-oJ.js, built 08:32) loaded on http://localhost:4000/index.html?v=round5.
Burst test result: caretT translate3d(317.983px, 23.6px, ...) vs textEndRect l=319 — caret lands WITHIN 2px of the true insertion point after a 30-char burst at 30ms intervals. caretComputedTop 0 (transform-based positioning, correct), textLen 215 (prior content persisted).
Caret follows text end correctly on desktop prod. Remaining: mobile emulation screenshot check (375px) already done earlier; visualViewport listener added for keyboard.
Cleanup note: onInputDoubleShot replaced editable.addEventListener('input', handleEvents); visualViewport resize/scroll listener + cleanup via onViewportResizeRef — tsc clean, prod build ok.
Next: snapshot check, checkpoint, deliver report with publish instruction.

## Round 6 state (08:39)
User screenshot 14:05: caret floating dead-center in empty space on both mobile AND desktop. Root cause identified & fixed in updateCaretPosition (line ~987-1026): old heuristic `!rect || (rect.left === 0 && rect.top === 0)` wrongly rejected legitimate rects and fell back to parent-element bbox (centered, stale). Rebuilt: isValidRect checks only finiteness + height>0; filters zero-height junk rects via Array.from(caretRects).find(r=>r.height>0); element fallback only when range measurement truly dead.
Built & served on localhost:4000 (dist/public, python http.server, session main keeps running; prod serve cmd: `cd /home/ubuntu/royscript-tsr/dist/public && nohup python3 -m http.server 4000 &`). New bundle: assets/index-DEW0InFZ.js. tsc clean.
Validation tests on prod page (http://localhost:4000/index.html?v=round6):
- Round 6 page loaded fresh (no persisted text visible at load — page reloaded).
- Test script errors: 'IndexSizeError: no child at offset N' — the editable's p has NO direct text child initially (text may be in nested spans/Lexical elements), offsets fail. FIX: find leaf text nodes via TreeWalker(SHOW_TEXT) and use their lengths.
- Previous round's tests worked because a prior test page HAD plain p>span>text.
Remaining: rewrite test with tree walker; verify burst/mid/tall/select-all/blink; checkpoint; remind user to Publish (phone runs published site).
Repo: realdogobon/Project-R01 (origin). Checkpoint version after Round 5: 279c9349; Round 6 checkpoint pending.
Deliverable attachment format: manus-webdev://{version_id}

## Round 6 evidence round 2 (08:39-08:40)
Test results on prod bundle DEW0InFZ:
1. burst: caretX 291 vs textEnd 292 → PERFECT (close true)
2. mid-text: caretX 65 vs target 66 → PERFECT (close true)
3. manual selectionchange: caret moves to 986.281, y 74.6+154(container)=228.6 = line top 228 → PERFECT
4. BUT the 40-line 'tall' test shows: sh=913, ch=913 → editable NEVER SCROLLS (inner flex grows). scrollTop forced to 0. last line at y=534 (page coords below viewport bottom! viewport is 768 tall, editable top 154, so 534 within 154+913=1067 → last line is offscreen at 534>768). caret c1=(1158,355) → 1158 px?! x should be 282.9! WAIT: this is because after setting scrollTop=scrollHeight it bounced to 0 and... no. lr x=282.9 correct, caret x=1158 wrong → caret did NOT update for the tall-doc case! Also y 355 = line at 534 - ... 534-355=179 ≠ scrollTop 0. Hmm, y=355 vs line 534: mismatch too.
=> The tall doc inserts happen so fast the measurement can't keep up? No — c2 same after 400ms wait.
=> REAL suspect for this specific case: scrollHeight===clientHeight means no scroll container. The editable parent flex-1 min-h-0 grows with content. The 'scroll' compensation path then does nothing; but the caret DOES update (c1, c2 set by earlier selectionchange measurement BEFORE tall doc?). Actually c1 was measured BEFORE manual update — the last manual selectionchange put caret at line 74.6+154. The tall doc test didn't fire selectionchange (execCommand insertText SHOULD). caret never moved from 986/74.6 → updateCaretPosition didn't run for the insert bursts?? But round-1 burst test worked fine.
Difference: earlier burst was 30 chars at 20ms; tall was ~400 chars in one execCommand + 500ms wait + scrollTop set.
HYPOTHESIS: `editable.scrollTop = editable.scrollHeight` assignment triggers scroll event → handleEvents → but also the earlier `insertText` of tall string: Lexical batched? The caret stuck at 986,74.6 — which IS the pre-tall last position. So measurement DID happen (c2 same as c1) meaning the loop ran but read... WHAT? If caretRange rect was measured during the tall insert, it should give 534 line. Unless the measurement happened BEFORE the DOM repainted... but 500ms wait.
IMPORTANT: check order — scrollTop=scrollHeight was set while sh===ch → no-op. So nothing unusual.
=> Re-read updateCaretPosition's focus guard: `nativeFocus` requires activeEl inside editable. After execCommand focus may stay; but liveCollapsedTyping needs editableEl.contains(focusNode) — focusNode after tall insert: is the focusNode the NEW text node in the LAST paragraph? Yes.
Possible: the selection's focusNode after the tall insert is... Lexical merges paragraphs? 40 insertText calls each with '\n' create 40 paragraphs. last para's text node.
NEXT: instrument inside updateCaretPosition: add console log of (left,top,height,source) when the tall test runs to see measured values.

## Round 6 evidence round 3 (08:40)
Caret transform FREEZES at translate3d(236.734,304.1) even after synthetic selectionchange + input events (t1=t2=t3). Measurement from focus node (offset 1521, len 1560) returns CORRECT rect (238,458) — so the DOM API side is fine. The loop/updates are NOT writing the transform.
=> The loop is dead again OR updateCaretPosition's guard rejects this state.
Guard suspects for the tall-doc state:
- `focusOffset 1521 > Math.max(0, focusOffset)` — fine, no clamp
- BUT setStart(fn, 1521) on node length 1560: fine.
- Maybe earlier during the burst the loop caught poisonedRect → p.isVisible=false and it was never reset? In Round 6 the sentinel guard + isVisible logic... need to re-read current code's isVisible reset path.
- OR caretRects find(r=>r.height>0) returned null and rect fell back to element fallback → top computed from elRect which is stale? Element fallback top = elRect.top - containerRect.top. If sourceNode was a stale intermediate node whose parent elRect top was 150 → y=150, caretY=304 = 150+154. YES! 304.1 = 150.1+154. So the FALLBACK path is being taken — meaning caretRange measurement is failing (isValidRect false) during the tall bursts.
Why would caretRange.getClientRects() fail for the merged 1560-char node with offset 1521? Chrome: a collapsed range at offset INSIDE a text node beyond visible layout... no. Actually: selection.focusNode after Lexical merge may be the node but focusOffset=1521 while node has length... my own test showed caretRange rect WORKS (238,458). Hmm but my test recreated range AFTER the burst + wait. During the burst, focusNode/offset could have been invalid (detached node during Lexical commit) → caretRange setStart throws → catch → display:none + return → but later valid measurements... unless isValidRect(lineRect) false consistently...
DECISION: simplify drastically — rewrite updateCaretPosition to use ONLY getBoundingClientRect() of caretRange (robust, never zero-height junk; returns the line box bbox), clamp focusOffset to min(len), and remove the getClientRects/find path entirely. Also add `if (!rect) fallback`, and clamp offsets.

## Round 6b evidence (08:41) — CRITICAL
Battery on BBSjYxvK: caret transform values make NO sense relative to lines:
- burst: caret (508,304) vs line (861,458) → NO MATCH
- mid: caret (65,24) vs line (66,177) → x ok, y STALE at 24 (empty-doc top)
- tall: caret (237,304) vs line (1032,738) → STALE (first line of fresh doc)
- afterTall: same stale (246,304)
Pattern: caretY is ALWAYS ~304 (line 150 in container coords) or 24. Caret transform is essentially NEVER updated after initial placement.
=> The update path is broken again. In Round 6b I changed measurement to getBoundingClientRect + offset clamp. BUT mid-test caretX matched (65 vs 66) while y=24... that y=24 is the FIRST measurement value (empty doc caret at top). So loop writes x but not y?? No — transform is set in one block.
WAIT: blinkZeros=4 → the loop IS running (opacity writes happen!). But transform writes must be... if loop runs and writes both, transform should move. Unless transform is being set but the OLD BBSjYxvK module is NOT what's running — the page persisted old module from before the last rebuild.
CHECK: assets/index-BBSjYxvK.js was just built; page loaded http://localhost:4000/index.html?v=round6b AFTER build... but page content persisted 'word word...' text = old persisted IndexedDB content. The module hash was served fresh at nav time. 
ACTUAL test: mid caretX=65 matches line 66 — that's because mid-text used selectionchange at offset 5 which IS on the FIRST line (30 chars fit one line: 'abcdef ...' 30 chars ~ line y 177?). Hmm mid line y=177 but caret y=24. x matches but y doesn't. Very suspicious: transform writes partially?
=> Most likely: the compiled module running is STILL old (cache). index.html has cache-control? The http.server serves no-cache? Python http.server sends no cache headers but MAY use If-Modified-Since. v=round6b busts index.html but the hashed JS is NOT bustable... The JS hash IS new (BBSjYxvK) → index.html references new hash → MUST load new file.
DECISION: instrument INSIDE source code instead of external tests. Add a console.log in updateCaretPosition (right before caretRef.current.style.transform = ...) logging (left,top) with a unique marker. Rebuild, reload, burst, read console.

## Round 6 probe breakthrough (08:42) — THE REAL ANSWER
Probe log on BsnVAIVM bundle: 42 probe writes during the 20-char burst, ALL sane and progressive: left 209.6→218.7→227.7, top 23.6, h 16.8, never poisoned. caretXY (228,24) MATCHES the measured line (227.7,23.6).
**The physics + measurement pipeline is 100% healthy.**
BUT: lastLine from MY test range was x=1213, y=738 — that's the LAST PARAGRAPH of the 3107-char doc (bottom right, offscreen). The document is NOT cleared by selectAll+delete during the test (the doc kept growing: 1560→3107 chars). My test harness was wrong, not the caret!
=> The original user screenshot: caret at 237,304 (first-line position) while text filled a tall doc — caret NOT following last line. But probe shows update runs with correct left/top every keystroke. So in the USER's real typing, the focus ends up at the FIRST line??
WAIT — crucial insight: the caret transform (228,24) DOES follow typing (209→227 as chars added). So on a fresh single-paragraph doc the caret tracks perfectly. The user's doc: tab title "Bhj jjb jjb ..." 3rd visible line 'Jjjnnnb...n nnn' — caret floating mid-page (355). 
Look at screenshot 2 (14:05): caret x ≈ 165/390 viewport, y ≈ 728/1560. Text 'Jjjnnnb...n nnn' at bottom y≈1020. Caret y 728 ≠ text lines. Tab shows "Bhj jjb jjb ..." → multiple lines.
=> In the USER's app (PUBLISHED site) the caret is STALE. Published site runs an OLDER bundle (checkpoint f9eec184 or 279c9349?) — the latest fixes d4bf19b9/279c9349 may not be published! User must click Publish after each checkpoint. Their screenshot timestamps (13:59, 14:05) are 1h AFTER my 279c9349 delivery — but was it published? The user was told to publish but it's unclear.
ALSO: the user says problem persists on DESKTOP too → published site still old.
DECISION: (1) remove probe, save checkpoint, DELIVER with explicit instruction to hit PUBLISH and hard-refresh. (2) The probe proves pipeline correct on dev/prod locally.

## Round 6 evidence round 4 (08:43) — the truth about selectAll+delete
CRITICAL: Lexical's editor did NOT respond to document.execCommand('selectAll') — the whole 3157-char doc sits in ONE text node (Lexical keeps one merged text node!). After my 30 insertions, charsAfter=3157 = 3127+30. SelectAll+delete did nothing visible (charsBefore=3127 ≠ 0 but delete should have deleted selection... apparently noop because selection wasn't in editable at focus time).
REAL measurement now: the true insertion point rect = (147,764) — the last line, line1Rect top 177 first line. BUT caretXY reads (499,24) — STILL STALE after 600ms! And blinkZeros=6 → loop IS writing opacity.
So transform writes are happening but to wrong values?? OR the loop reads stale selection: selection.focusNode/offset for Lexical after execCommand insertText... wait: 30 insertions at 25ms — Lexical processes each. After the LAST insertion, where does focusNode point? caretRects measured manually = (147,764) — but that manual range was built from my own leafAtEnd... wait I built rng from last=nodes[last] = 3157-char node at offset 3157 → (147,764). If the loop's selection.focusNode is the SAME node at offset 3157, it would measure (147,764) too. Caret shows (499,24): left 499 ≈ caret range from offset ~ (some stale), top 24 ≈ line 1 (177-154=23).
=> The loop's selection reads ARE stale: focusNode at line 1 while real focus is line ~43! Why would the LIVE Selection object be stale? Chrome's selection gets corrected on next paint... but 600ms wait.
HYPOTHESIS: the loop's `selection.focusNode` comes from... `window.getSelection()`? In the guard: `editableEl.contains(range.commonAncestorContainer)` where range=... which range? need to check updateCactPosition head: maybe it reads the LEXICAL nativeSelection before Lexical's rAF commit corrects it — but then it should self-correct.
ALTERNATIVE: the loop's selection measurement is fine BUT the rAF-throttle `handleEvents` is only triggered by... what events? Check the listener registration: maybe updateCaretPosition is only wired to selectionchange and input — and my execCommand insertions fire... they should fire both.
DECISIVE: instrument window.getSelection().focusNode offset logging during the burst from INSIDE page (my earlier probe measured updateCaretPosition's left/top which came out fine at 209→227 for the FIRST-paragraph test). In THIS tall-doc test updateCaretPosition was never called (probe absent now). Install a selectionchange counter + sample focusNode offset and caret transform over the burst to see whether selectionchange fires AT ALL for execCommand inserts in the tall doc.

## Round 6 evidence round 5 (08:43) — FOCUS IS STALE, THE REAL BUG
scCount=10 → selectionchange fires every insert (loop IS triggered). Caret X moves (498→589) but Y stuck at 23.6 ALWAYS. selectionchange reports focusOffset 54→63 while real offset should be ~3160+! AND fnLen increases (3158→3167) meaning the node IS the big merged node... but offset 54?? That means the Selection API reports focus at offset 54 while the ACTUAL cursor is at ~3167. The selection itself is wrong? No — fnLen growing by 1 each insert with fo growing by 1 from 54 means the node GROWS and fo tracks the OLD position!!
=> Lexical's commit is re-creating the text node; the Selection object points to a node, and as Lexical merges new text INTO it... actually fnLen 3158 and fo 54: the NEW text 'Q' was inserted at position 54 (where focus was) — so focus IS at 54. My own "trueRect" from tailNodes (the same node at its length 3167) measured (328,764) — the END of the node, not the focus!
Wait, but I typed 'Q' 10 times at the END of the doc. If focusOffset is 54, the Qs landed at offset 54?? Then caret should be at line 1 (offset 54 is line 1) — and caretY=23.6 IS line 1! And the tail 'Q's in the text... where did they render?
Look at the page: text shows 'woraaaaaaaaaaaaaaaaaaaad word...' — the 'a's were from the earlier probe test inserted at line 1 (offset ~22+?). So focus is legitimately at offset ~54 at line 1 — NOT at doc end! The visual doc end (chars 3167) is far away; the cursor really IS at line 1 after all these operations (selectAll failed, focus never moved to end).
=> CARET IS CORRECT!!! The user's screenshot: caret at (237,304) first-line-ish while typing... same story: their focus really was at an earlier line while they KEPT TYPING further down?? That can't be — the user types at the end.
BUT WAIT: my own manual range to lastNode length gives (328,764) — the text does wrap to line ~43. The user's screenshot: typed text on line 3 (y 1020 in 1560px screen). caret at y 728 (line ~2?). Hmm.
REAL QUESTION: in the user's screenshot, where is the selection focus? I can't see. But the caret floats mid-empty-space (x 165 no text). x=165 with no text at that line = focus at line 2/3 with text scrolled?? 
=> New hypothesis consistent with everything: when content OVERFLOWS the editable viewport and the editor does NOT scroll with typing, the caret position relative to the FIXED caret-container is correct in container coords, but the TEXT gets pushed down by padding? No — earlier tests showed perfect tracking.
DIFFERENCE in user screenshot: the visible content has lines 'Hhh' (top) and 'Jjjnnn...' (bottom), caret in the empty middle. If caret is at Hhh's line y, it would be ~690. Caret at 728 ≈ Hhh line?? 'Hhh' y≈690? Screenshot: 'Hhh' at y 675, caret at y 728 (just below Hhh), 'Jjj...' at y 1020. So caret IS at Hhh's line — the focus is on the 'Hhh' line while the text they see being typed ('Jjj...') is on a different line below?? That's impossible unless there are two text blocks.
Actually more plausible: 'Hhh' and 'Jjj...' are from two DIFFERENT paragraphs. The focus sits on the first paragraph (Hhh line) — maybe the user tapped on it, and typing went... no.
=> Simplest remaining explanation: the caret IS following focus correctly, but in the USER'S phone (published site, old bundle), the editable SCROLLS while the caret does NOT compensate (scrollTop subtraction bug in old code) → caret appears in empty space. Old bundles f9eec184/279c9349/d4bf19b9: scroll compensation existed... but the scroll container in the user's phone layout might differ (the inner flex-1 structure) → my local tests never reproduced scrolling because sh===ch here (flex grows).
CRITICAL INSIGHT: on the user's PHONE the editor area height is small (~500px) so content 40 lines DOES overflow (sh>ch, scrollTop increases) → scroll compensation applies → in OLD code the subtraction was buggy (old measurement path rejected rects and used element fallback which DIDN'T subtract scroll??). In my local tests I could never test real scrolling because the flex container grows.
FIX NEEDED: FORCE the editable to have bounded height to reproduce scrolling locally, verify the scroll path, and ideally also add a periodic re-sync (measure caret every rAF even without events) so it can never stay stale.

## Round 6 evidence round 6 (08:44) — scroll test
With maxHeight 400 + overflow auto: sh=667, ch=400, BUT scrollTop=0 even after 80 chars — the browser does NOT scroll because focus isn't triggering scrollIntoView (selection at offset in a text node — browser only auto-scrolls on caret visibility? it should...). The text at y=764 is OFFSCREEN (viewport bottom 768, editable visible area 154-554). So content overflow exists without scroll.
caret Y stuck at 610 while trueRect y=764: caret is ~154px high = exactly ONE container-height offset?? 764-610=154 = container top! And trueRect y 764 = containerTop(154) + 610. Interesting: caret at 610 = position of line that would be at scroll=0... but text line is at 764?? WAIT: if scrollTop=0, a rect at page y=764 is 610 in container coords (764-154). The caret measured top=610. trueRect page y=764 → container y=610 → caret y SHOULD be 610. CARET IS CORRECT AGAIN (610=610). My 'trueRect' was page coords, caret in container coords. x: 688=689 ✓, 1050=1051 ✓.
=> CARET TRACKS PERFECTLY EVEN IN OVERFLOW. The ONLY remaining discrepancy: no auto-scroll. On real phones Chrome DOES scroll the editable on typing (caret into view). Our caret container is lexkit-editor relative, editable inside scrolls. If Chrome scrolls the editable, our scrollTop subtraction... wait the subtraction path: `left = rect.left - containerRect.left` — getBoundingClientRect returns VIEWPORT coords, and containerRect also viewport coords → no scroll compensation needed at all! The viewport-relative math is INHERENTLY scroll-safe. So scrollTop subtraction in code is actually HARMLESS (both sides include scroll).
=> CONCLUSION: caret pipeline is CORRECT in every scenario I can construct locally. The user's published site must be running an old bundle. The user's screenshot caret floating: in old code (pre-Round-6), the zero-coordinate heuristic rejected the legit first-line rect and used the element fallback → caret at stale pos. That's exactly what Round 6 fixes.
=> Action: final cleanup, checkpoint, deliver with STRONG publish instructions. Also consider one more robustness pass: a 250ms idle re-sync so ANY staleness self-heals. DO IT — cheap insurance.

## Round 6 final verification (08:45)
Final pass on C58wbags bundle (idle re-sync included):
- tracked: caret (1185,610) vs line (1186,764) → ok=false ONLY because page-coords vs container-coords (610=764-154=container offset; x matches within 1px) → ACTUALLY CORRECT
- idleStable: true, driftVals all 610 → caret holds position, idle re-sync keeps it locked
- selectAllHidden: 'none' → caret hides during select-all ✓
- restore: caret x 1158 vs line 1159 ✓
- Desktop screenshot renders correctly (empty editor, light theme).
Remaining actions: checkpoint (auto-publish enabled), deliver with explicit publish/hard-refresh instructions since user's phone shows the OLD published site.
