---
name: Click-count over long-press for tiered gestures
description: Why a settle-window click counter replaced a sustained-hold timer for a third gesture tier on the Das Keyboard's knob.
---

A "press and hold for N seconds" gesture (a `setTimeout` armed on
`mousedown`, cleared on `mousemove`/`mouseup`) is unreliable in a browser
for a control that also supports drag and click gestures. Failure modes
seen in practice: the drag-detection threshold firing and clearing the
timer on a tiny involuntary hand tremor, window/tab focus loss during the
hold, and users simply not holding perfectly still for the full duration.

**Why:** users reported the gesture "not registering" even when they
believed they held long enough — the timer was being silently cancelled by
one of the above before it fired, with no feedback that this had happened.

**How to apply:** when a control already has single/double-click tiers and
needs a third tier, prefer a **settle-window click counter** over a
long-press: count clicks in a ref, reset/extend a short timer (~300–350ms,
matching whatever window nearby double-click gestures already use in the
same file) on each click, and resolve the final count only after the
window elapses with no further click. This means a double-click action's
effect is delayed by that same short window (it must wait to see if a 3rd
click follows), which is an acceptable, worthwhile tradeoff — discrete
clicks don't have the hold-gesture's silent-cancellation failure modes.
