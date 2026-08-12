# Round 6 — Robust Caret Measurement Rebuild

## Symptom (screenshot 14:05)
Text: "Jjjnnnb...nnnn" at bottom + "Hhh" visible; caret floats in EMPTY space, dead-center of the viewport, NOT at the text. Mobile + desktop.

## Key insight from screenshot
Caret x ≈ screen-width/2, y ≈ middle. No text near it. This matches the FALLBACK path geometry: when caretRange rect is zero/empty, the node-element fallback gives a position at the center of a container, OR the caretRects[0] zero-area rect at (0,0) → gets subtracted containerRect → weird pos. ALSO possibly: rect.left===0 && rect.top===0 check: after scrolling on mobile, a rect CAN legitimately have left/top==0 — the guard then wrongly takes the WRONG fallback (element rect of the TEXT NODE parent = whole paragraph? → center-ish).

## Candidate root causes
- C1: `!rect || (rect.left === 0 && rect.top === 0)` — WRONG heuristic. A legitimately visible caret at (0,0) viewport coords triggers the fallback, which measures the PARENT element's rect (e.g. empty-space fallback to paragraph start) → stale/centered caret.
- C2: caretRange.getClientRects() on a collapsed range at the END of a line can return a 0-width rect at line START in some Chrome versions under contain:layout paint.
- C3: `focusNode` during composition/insert is a detached/stale node → rect zero → fallback to element rect of stale node → wrong.
- C4: The caret container (lexkit-editor) is offset from the editable; scrollTop subtraction uses editableEl.scrollTop but the container rect includes header/toolbar offsets — fine, but the fallback path (element rect) may not subtract scrollTop at all? CHECK: fallback left/top computed with elRect - containerRect — NOT subtracting scrollTop! The editable content is scrolled; element rects are relative to editable padding box... Actually getBoundingClientRect of inner elements includes scroll offset of editable (it's relative to viewport). Then we subtract containerRect (editor). That's correct for BOTH paths. So scroll not the issue.

## Fix plan (rebuild measurement)
- F1: Drop the `left===0 && top===0` heuristic entirely. Use ONLY caretRange.getClientRects()[0]; fallback to getBoundingClientRect; then fallback to caretRange.startContainer element + offset. Never use zero-detection fallback based on coords.
- F2: Validate rects: width can legitimately be 0 (collapsed) but left/top must be finite; if any rect is finite, use it.
- F3: On composition (isComposing), prefer measurement from compositionend; during composing, keep last good position visible (don't hide).
- F4: Cross-check with Lexical selection if DOM selection is detached (node not in editable) → use Lexical focus to map to DOM node via editorState.read + getDOMTextNode.
- F5: Keep double-shot + visualViewport + rAF-after-commit from Round 5.

## Verify
- Desktop: type fast → caret at text end; mid-text click → caret follows; select-all hide
- Mobile emulation 375px: burst typing + simulate keyboard-open resize → caret at end, not center
- Verify fallback paths manually by forcing zero rects

## Deliver
- Checkpoint + report + publish reminder
