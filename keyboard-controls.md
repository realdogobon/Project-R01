# Das Keyboard — Controls Manual

This document is the complete reference for every physical control on the
simulated Das Keyboard shown in the typing workspace: what each button,
knob, and switch does, every gesture it recognizes, every RGB lighting
effect available, and how the keyboard's shared controls work with RGB and
Ambient Focus (background sound) side by side. Nothing here is optional
trivia — if a control responds to something, it is documented below.

The keyboard has two independent control layers:

1. **The keys themselves** — physical typing input, always active.
2. **The control cluster** in the upper right — Sleep button, Mute button,
   RGB knob, and media bar. Sleep and Mute's single clicks always drive RGB
   directly. Everything else in the cluster — the knob, Sleep/Mute's
   double-click, and the whole media bar — acts on whichever subsystem
   currently has **control focus**: RGB or Ambient Focus (fully explained
   in "Control Focus" below).

All settings on this keyboard — switch type, every RGB setting, Ambient
Focus's own on/off state and volume, and which subsystem is currently
focused — persist automatically between sessions, and survive switching to
the Classic keyboard and back, starting or ending an exam, switching tabs,
or the app crashing and reloading. None of it is tied to this component
staying mounted (see section 7, Persistence).

---

## 1. Quick Reference

| Control | Gesture | Effect |
|---|---|---|
| Sleep button | Single click | Toggle RGB on/off (always, regardless of focus) |
| Sleep button | Double click | RGB focus: cycle RGB effect · Ambient focus: toggle Ambient Focus on/off |
| Mute button | Double click | RGB focus: cycle RGB color palette · Ambient focus: nudge ambient volume up |
| Knob | Drag up/down | RGB focus: adjust brightness (or hue, on the custom color slot) · Ambient focus: adjust ambient volume |
| Knob | Scroll up/down | Same as drag, in small steps (vertical scroll only) |
| Knob | Scroll left/right | RGB focus: cycle RGB color palette (trackpad swipe or tilt wheel) |
| Knob | Single click (no drag) | RGB focus: advance to next color in palette |
| Knob | Double click (no drag) | RGB focus: toggle RGB on/off · Ambient focus: mute/unmute ambient volume |
| Knob dot | — | Always shows current switch type (blue / brown / red) — read-only indicator |
| Media bar — Prev/Next | Click | RGB focus: step RGB effect · Ambient focus: step saved preset / ambient sound |
| Media bar — Play/Pause | Single click | Toggle the focused subsystem on/off (RGB or Ambient Focus) |
| Media bar — Play/Pause | Double click | Switch control focus between RGB and Ambient Focus |
| **ScrollLock key** | **Short press** | **Cycle switch type (blue → brown → red) — Das keyboard only** |
| **ScrollLock key** | **Long press (≥ 500 ms)** | **Toggle RGB on/off** |

Single clicks on Sleep always control RGB, with no exceptions.
Everything else in the table acts on whichever subsystem is currently
focused — see section 5.

---

## 2. Typing Keys

The key layout is a full-size board (function row, navigation cluster,
numpad) using accurate Cherry-MX-style press/release physics per key: each
keycap has its own down-travel and spring-back timing so multiple
keystrokes never look mechanically identical. This part of the keyboard is
purely visual/input feedback and is not affected by anything else in this
document.

### Lock indicators

Three small LEDs sit above the switch-type selector: **Num Lock**, **Caps
Lock**, and **Scroll Lock**. Num Lock and Caps Lock light up (a small white
glowing dot) when their corresponding lock is active. The Scroll Lock LED
stays off permanently — the ScrollLock key has been repurposed as the
switch-type cycling control (see section 3) and no longer acts as a lock
toggle.

---

## 3. Switch Type

The **ScrollLock key** on your physical keyboard is the dedicated switch-type
control on the Das Keyboard. It is Das-exclusive: it only activates when
the Das keyboard is mounted. Pressing it on the Classic keyboard does
nothing because the handler never registers.

**Short press** (release before 500 ms): advances the switch type in a
fixed rotation:

1. **Blue** — clicky tactile switch, the default.
2. **Brown** — tactile, quieter than blue, no audible click bar.
3. **Red** — linear, smooth throughout the keystroke, no tactile bump.

**Long press** (held 500 ms or more): toggles RGB lighting on or off as a
secondary action. The long-press fires while the key is still held; on
release the short-press action is skipped automatically so the two gestures
never collide.

Switch-type changes take effect on the fly — mid-typing, mid-RGB, mid-
Ambient, any time. Both the key-press physics (travel feel) and the typing
engine's sound profile update immediately, with no restart required.

The knob dot indicator (the small circle inside the knob body) always
shows the current switch type as a color: **blue** for Blue, **brown** for
Brown, **red** for Red. It is a pure read-only indicator and is not
connected to the RGB system.

**Why ScrollLock?** It is the only full-size key on the Das Keyboard that:
(a) has no OS-level intercept on any platform (the browser always sees the
event), (b) is never used during normal typing, (c) can be fully
intercepted with `e.preventDefault()` so no lock state, no character, and
no browser shortcut ever fires alongside the switch change.

Previous switch-type mechanism (for historical context only): the knob's
triple-click gesture used to cycle switch type. It was replaced because a
sustained multi-click sequence proved unreliable — the knob's drag
threshold, momentary focus loss, or an imprecise release could all silently
cancel it. ScrollLock has none of these failure modes.

---

## 4. Control Focus

RGB and Ambient Focus are two fully independent subsystems — each has its
own on/off state, and each keeps running (or stays off) regardless of what
the other is doing. They share one physical control cluster, though, so the
keyboard needs to know which one the knob, Sleep/Mute's double-click, and
the media bar should currently act on. That's **control focus**: a simple
RGB-or-Ambient flag, decoupled from whether either subsystem is actually
on.

This is what lets both systems be used together instead of one locking out
the other: Ambient Focus can keep playing in the background while focus
sits on RGB to tweak color and effect, then flip back to nudge the volume —
without ever having to turn Ambient Focus off just to reach RGB's controls,
or vice versa.

- **Switching focus** — double-click the media bar's Play/Pause button.
  This is the only way to change which subsystem the shared controls point
  at; every other gesture in the cluster acts on the current focus without
  changing it.
- **Seeing the current focus** — the media bar itself is the indicator.
  It is lit when the focused subsystem is on. While focus is on **Ambient**
  it glows **white** (neutral, unambiguous "sound is active"). While focus
  is on **RGB** it glows in the **current RGB color** at the current
  brightness level, so the media bar feels like a physical extension of the
  same lighting system as the keycaps. Dark when the focused subsystem is
  off.

Single clicks on Sleep are never affected by focus — they always mean
exactly what section 5 says.

---

## 5. RGB Lighting System

RGB is the keyboard's native lighting layer, always available regardless of
control focus.

### Master on/off

- **Sleep button, single click** — toggles RGB lighting on or off. Always
  available, regardless of focus.
- **Media bar Play/Pause, single click, while focus is on RGB** — also
  toggles RGB on or off.
- **Knob, double-click (no drag in between), while focus is on RGB** —
  also toggles RGB on or off.
- **ScrollLock key, long press (≥ 500 ms)** — also toggles RGB on or off
  (Das keyboard only).

All four controls always agree — toggling RGB through any one of them
toggles the same single RGB state the others read from.

### RGB effects

Sleep button double-click (only while focus is on RGB) and the media bar's
Prev/Next buttons (while focus is on RGB) step through the same ordered
list of seven lighting effects:

1. **Static** — a single solid color across all keys.
2. **Wave** — a color wave travels across the board continuously.
3. **Ripple** — pressing a key sends an expanding ripple of light outward
   from that key.
4. **Breathing** — the whole board fades brightness up and down smoothly.
5. **Reactive** — each keypress flashes that key and fades out.
6. **Spectrum** — a continuous rainbow cycle across the whole board.
7. **Rain** — randomized per-key droplet falloff, like light rain falling
   across the keys.

Sleep double-click only advances the effect if RGB is currently on (it
won't silently turn RGB on just to change the effect). The media bar's
Prev/Next buttons behave differently: stepping the effect through them
turns RGB on automatically if it was off, since pressing what looks like a
"track" button is expected to produce a visible result immediately.

### RGB color palette

There are three ways to cycle through colors, all while focus is on RGB
and RGB is on:

- **Knob single-click** — advances one step forward through the palette.
  The 350 ms settle window means the action fires about a third of a second
  after you click, which is imperceptible for a deliberate single-click but
  gives time for a second click to register as a double-click instead.
- **Knob horizontal scroll** (trackpad left/right swipe, or a tilt-wheel
  mouse) — swipe right = next color, swipe left = previous color. The
  dominant axis is used, so a diagonal swipe always resolves cleanly to
  color cycling or brightness, never both.
- **Mute button double-click** (while focus is on RGB) — advances one step
  forward through the palette.

All three cycle through the same fixed palette of 16 preset colors, plus
one additional 17th slot reserved for a fully custom color:

Red, Green, Blue, Cyan, Magenta, Yellow, Orange, Purple, Pink, Mint, Gold,
Ice, Ember, Lime, Indigo, White, then **Custom**.

Like the effect cycle, color cycling only runs while RGB is on.

### RGB brightness

The knob gives continuous brightness control while focus is on RGB:

- **Drag up/down** — continuously adjusts brightness (or, when the palette
  is parked on the Custom slot, adjusts hue instead — see below).
- **Scroll up/down** (vertical scroll only) — nudges brightness in small
  (~2%) increments per scroll tick, for precise fine-tuning.

### Custom hue (knob "hue mode")

When the color palette is sitting on the Custom slot (the 17th position),
RGB is on, and focus is on RGB, the knob's drag gesture switches from
controlling brightness to controlling hue: dragging sweeps a full 360°
color wheel, and the RGB color updates live at full saturation as you drag.
Releasing leaves the color at wherever you stopped. This mode is
exclusively a knob-drag behavior — it does not apply to vertical scroll or
to any other control.

---

## 6. Ambient Focus Mode

Ambient Focus is the app's background-sound feature — looping ambient
tracks (rain, a coffee shop, waves, and so on) that can be mixed together
and saved as named presets. Its own on/off state and volume are a real,
independent two-way toggle: turning it off from the keyboard and back on
again (or vice versa) always works, from either the keyboard or Settings.
There is no one-way "off" path anywhere in this cluster.

While control focus is on **Ambient**, the knob's drag/scroll, Sleep and
Mute's double-click, and the whole media bar act on Ambient Focus instead
of RGB. Switch focus back to RGB (double-click Play/Pause) at any time —
Ambient Focus keeps playing at whatever volume it was left at; switching
focus away from it doesn't pause or stop it.

Single clicks on Sleep are never affected by any of this — they always
mean exactly what section 5 says, in both focus states.

### Knob — ambient volume

- **Drag up/down** — continuously adjusts Ambient Focus's master volume
  from 0% to 100%, following the same up-is-louder direction as RGB
  brightness.
- **Scroll up/down** (vertical scroll only) — nudges master volume in
  small (~2%) increments per scroll tick.
- **Double-click (no drag in between)** — mutes Ambient Focus if it's
  currently audible, or restores it to whatever volume it was at before
  muting if it's currently silent. Muting and unmuting this way never
  changes the Ambient Focus on/off switch itself — it only zeroes and
  restores the volume.

### Sleep button — ambient on/off

- **Single click** — unchanged: toggles RGB on/off.
- **Double click** — toggles Ambient Focus on or off (a real two-way
  toggle, not a one-way shutdown). The same action is also reachable from
  the media bar's Play/Pause single-click while focus is on Ambient; the
  redundancy is intentional, mirroring how RGB's own on/off is reachable
  from multiple controls in section 5.

### Mute button — ambient volume nudge

- **Double click** — nudges Ambient Focus's volume up by a fixed amount
  from wherever it currently sits, wrapping back down near 0% once it
  passes 100%. This is deliberately not a fixed four-step ladder: because
  the knob can be dragged to any arbitrary volume (11%, 22%, 63%, anything),
  Mute's double-click always steps from that exact value rather than
  snapping to a canned percentage. Drag the knob to roughly where you want,
  then double-click Mute to fine-nudge from there.

### Media bar — ambient browser

While focus is on Ambient, the media bar becomes a browser over your
ambient sounds:

- **Prev / Next** — step through one continuous list: your saved Ambient
  Focus presets first, most recently saved first, followed by every
  individual ambient sound (Coffee Shop, Rain, Waves, and so on), and then
  wraps back around to the start. If you have no saved presets, Prev/Next
  simply step through the individual sounds directly. Each step replaces
  whatever mix is currently playing outright — it behaves like switching
  tracks, not layering more sound on top of what's already active. Like
  RGB's Prev/Next, stepping a track turns Ambient Focus on automatically if
  it was off, since pressing what looks like a track button is expected to
  produce audible sound immediately.
- **Single click** — toggles Ambient Focus on or off.
- **Double click** — switches control focus back to RGB (see section 4).

### Feedback

Because muting, nudging volume, or switching an ambient track produces no
lighting change the way RGB actions do, each ambient action briefly rings
the control that triggered it with a very subtle glow — a soft, low-opacity
outline that fades in and back out over roughly a quarter of a second. It's
intentionally minimal: a quiet confirmation that the action registered, not
a notification or a toast. You'll see it on the knob, Sleep, Mute, or the
media bar depending on which one you used. The same glow also confirms a
successful control-focus switch (Play/Pause double-click).

### Discoverability

Every control's tooltip (shown on hover) updates its wording to reflect
whichever subsystem currently has control focus, so hovering any control
while focus is on Ambient will describe its ambient behavior rather than
its RGB one. There is no separate onboarding walkthrough for this — the
tooltips, plus the media bar's persistent white/color coding (section 4),
are the intended way to learn the mapping.

---

## 7. Persistence

Switch type, every RGB setting (on/off, effect, palette position, custom
hue, and brightness), Ambient Focus's on/off state and volume, and which
subsystem currently has control focus all live in the app's shared settings
state — not in this keyboard component itself. That state is created once
when the app loads and never unmounts alongside the keyboard, so none of it
resets when the keyboard component does: switching to the Classic keyboard
and back, starting or ending an exam, switching tabs, or the app crashing
and reloading all leave every setting exactly as you left it. Ambient
Focus's saved sound mixes/presets are persisted the same way.
