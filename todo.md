# Mobile Caret Fix — Surgery Plan

## Symptom (from user's phone screenshot, 13:59)
Text: "Hhh jii jj h..." but caret renders at line START under "Hhh" — stale position, doesn't follow the typed text. Mobile soft-keyboard typing.

## Hypotheses
- H1: On mobile, `input` events fire and Lexical commits, but selection measurement happens BEFORE DOM reflow → caretRange rect reports the OLD line-start position.
- H2: `focusNode` during mobile input may point at a stale/merged text node; caretRange on it gives stale rect.
- H3: Mobile keyboard appearance changes layout/scroll without firing editable 'scroll'; caret container coords stale.
- H4: Caret measured from DOM selection while Lexical's internal state selection is elsewhere (focusNode of document.getSelection vs Lexical's $getSelection anchor).

## Diagnosis steps
- [ ] Re-read updateCaretPosition rect logic + listener wiring
- [ ] Check caret container's positioning context (which parent is it absolute to? scroll compensation?)
- [ ] Check whether focusNode during mobile input resolves to stale node
- [ ] Reproduce in mobile emulation: input-event bursts, then verify caret transform vs text-end position
- [ ] Check Lexical update listener: does custom caret get refreshed inside Lexical's own commit?

## Fix
- [ ] Double-shot measurement: measure immediately + again after requestAnimationFrame (post-reflow)
- [ ] Prefer measurement right after Lexical commits
- [ ] Watch resize for keyboard layout shifts
- [ ] Ensure caret follows $getSelection from Lexical, not only DOM selection

## Verify
- [ ] Mobile emulation (375x812): burst input events → caret at text end
- [ ] Desktop: typing still smooth, blink works
- [ ] Select-all hide + restore, scroll behavior

## Deliver
- [ ] Checkpoint + report
