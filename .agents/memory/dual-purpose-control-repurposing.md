---
name: Dual-purpose control repurposing
description: Pattern used to make the Das Keyboard's physical controls (knob, Sleep, Mute, media bar) mean two different things (RGB vs. Ambient Focus), superseding a single on/off flag with an explicit focus concept.
---

When a physical control cluster needs to serve two independent subsystems
that can each be on or off at the same time (here: RGB lighting vs. Ambient
Focus background sound), don't gate shared-control behavior on "is the
secondary subsystem currently on" — that makes the two subsystems mutually
exclusive by construction (whichever is on locks out the other's controls,
and there's no way to reach the "off" one's controls to turn it back on).
Instead, introduce an explicit **focus** flag (which subsystem the shared
controls currently target), independent of either subsystem's own on/off
state. Switch focus with its own dedicated gesture (here: double-clicking
the existing Play/Pause button — reusing a control's own click-count layer
rather than adding a new control). This lets both subsystems run
simultaneously and remain reachable: one can keep operating in the
background while focus sits on the other.

Read the focus flag (and every other value a handler depends on) via a ref,
not just state, so imperative mousemove/mouseup listeners added outside
React's render cycle still see the live value.

**Why:** the knob's drag handlers are attached imperatively to `document`
inside a `useCallback` with an empty dep array; without a ref, they'd close
over a stale mode flag from mount time.

**How to apply:** keep single-click behavior on any shared button
unconditionally pinned to the "primary"/default subsystem (never move) —
only double-click / drag / secondary gestures should switch meaning. When a
control needs to express a magnitude that was already set by a continuous
gesture (e.g. a knob drag), don't reintroduce a fixed step ladder for a
secondary "step" action on top of it — derive the step from the control's
actual current value (`current + fixedDelta`, wrapped) so a double-click
nudges from wherever the knob really is instead of snapping to a canned
percentage. Add a very subtle, short-lived glow (outline, not layout
box-shadow, so it never reflows) as feedback for actions in the secondary
subsystem that would otherwise have no visible confirmation.
