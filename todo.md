# RoyScript TSR — Caret Surgery Round 3

## Diagnosis (done)
Caret invisibility cause: the JS physics loop writes `opacity` inline while `.animate-caret-blink` CSS animation ALSO animates `opacity` — the animation keyframes fight the inline value and the caret gets stuck at opacity 0, exactly during active typing. Secondary: focus check relies on `document.hasFocus()` + activeElement which is unreliable during mobile IME/soft-keyboard sessions; and no `input`/`composition` listeners exist (key* events alone don't cover mobile typing bursts).
Mobile selection: no blocking user-select/touch rules found on the editable, but the caret/scrollbar overlays plus Lexical's own touch handling need confirmation; ensure the editable explicitly allows selection and that `touch-action` is not restricted.

## Phase 2: Fix (done)
- [x] Remove `.animate-caret-blink` CSS animation; blink modulation inside the JS physics loop
- [x] Add `input`, `compositionstart`, `compositionupdate`, `compositionend`, `touchend` listeners on the editable
- [x] Relax focus check for mobile (liveCollapsedTyping)
- [x] `user-select: auto`, `touch-action: auto` on `.lexkit-content-editable`
- [x] Sub-step spring integration ≤16.67ms; poison/Infinity guard (sentinel -1e6, hide while poisoned)
- [x] Loop keeps ticking while visible (blink at idle)

## Phase 4: Verify & Deliver (in progress)
- [ ] Stale-caret-element hypothesis: after remount, check for multiple .custom-smooth-caret divs; probe says rect math is clean (0 bad in 32) yet transform reads -3.4e38 sentinel → browser likely reading an OLD hidden caret node
- [ ] Desktop: burst typing → caret transform finite + on last line + idle blink fires
- [ ] Desktop: select-all / drag-select → caret hidden, highlight shows
- [ ] Mobile viewport (375px): touch-drag selection works, typing caret visible
- [ ] Remove debug probe (window.__caretLog) before checkpoint
- [ ] TypeScript clean, checkpoint, report with publish note
