---
name: Dual-purpose control repurposing
description: Pattern used to make the Das Keyboard's physical controls (knob, Sleep, Mute, media bar) mean two different things (RGB vs. Ambient Focus) depending on a mode flag.
---

When a physical control cluster needs to serve two different subsystems
(here: RGB lighting vs. Ambient Focus background sound), gate each branch
on a single boolean read via a ref (not just state) so imperative
mousemove/mouseup listeners added outside React's render cycle still see
the live mode value.

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
