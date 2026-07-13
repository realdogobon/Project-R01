# Das Keyboard — Controls Manual

This document is the complete reference for every physical control on the
simulated Das Keyboard shown in the typing workspace: what each button,
knob, and switch does, every gesture it recognizes, every RGB lighting
effect available, and how the keyboard's controls temporarily change
purpose when Ambient Focus (background sound) is active. Nothing here is
optional trivia — if a control responds to something, it is documented
below.

The keyboard has two independent control layers:

1. **The keys themselves** — physical typing input, always active.
2. **The control cluster** in the upper right — Sleep button, Mute button,
   RGB knob, and media bar. This cluster natively drives the keyboard's RGB
   lighting system. When Ambient Focus is switched on in Settings, part of
   this cluster's behavior temporarily repoints at ambient sound instead
   (fully explained in "Ambient Focus Mode" below).

All settings on this keyboard — switch type and every RGB setting — persist
automatically between sessions. Ambient Focus's own on/off state, volume,
and saved sound mixes are controlled from Settings and are shared with the
keyboard, not owned by it.

---

## 1. Quick Reference

| Control | Gesture | RGB mode (default) | Ambient Focus mode (only while it's on) |
|---|---|---|---|
| Sleep button | Single click | Toggle RGB on/off | Toggle RGB on/off (unchanged) |
| Sleep button | Double click | Cycle RGB effect | Turn Ambient Focus off |
| Mute button | Single click | Step RGB brightness (25% → 50% → 75% → 100% → repeat) | Step RGB brightness (unchanged) |
| Mute button | Double click | Cycle RGB color palette | Nudge ambient volume up from its current position |
| Knob | Drag up/down | Adjust RGB brightness (or hue, on the custom color slot) | Adjust ambient volume |
| Knob | Scroll | Adjust RGB brightness in small steps | Adjust ambient volume in small steps |
| Knob | Double click (no drag) | Toggle RGB on/off | Mute / unmute ambient volume |
| Knob | Press and hold ~3 seconds | Cycle switch type (blue → brown → red) | Cycle switch type (unchanged) |
| Media bar — Prev | Click | Previous RGB effect | Previous saved preset / ambient sound |
| Media bar — Play/Pause | Click | Toggle RGB on/off | Turn Ambient Focus off |
| Media bar — Next | Click | Next RGB effect | Next saved preset / ambient sound |

Single clicks on Sleep and Mute always control RGB, in both modes, with no
exceptions. Only Mute's double-click, the knob's drag/scroll/double-click,
and the entire media bar change meaning, and only for as long as Ambient
Focus stays on. The instant Ambient Focus is switched off — from Settings,
or from the keyboard itself — every one of those controls reverts to pure
RGB control immediately, with no lingering ambient state.

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
Lock**, and **Scroll Lock**. Each lights up (a small white glowing dot)
when its corresponding lock is active, and goes dark when it isn't. These
are read-only indicators — they reflect lock state, they don't trigger
anything themselves.

---

## 3. Switch Type

The knob's **press-and-hold for about three seconds** gesture cycles the
keyboard's switch type in a fixed rotation:

1. **Blue** — clicky tactile switch, the default.
2. **Brown** — tactile, quieter than blue, no audible click bar.
3. **Red** — linear, smooth throughout the keystroke, no tactile bump.

Switch type changes only the sound/feel character the rest of the app
associates with keystrokes on this board; it has no interaction with RGB or
Ambient Focus, and this gesture behaves identically whether Ambient Focus
is on or off. Holding the knob always starts the 3-second timer regardless
of mode; if you release before three seconds and hadn't dragged the knob,
that release counts as a click/double-click on whichever control is
described below.

---

## 4. RGB Lighting System

RGB is the keyboard's native, always-available lighting layer. Every RGB
control described here is the same whether Ambient Focus is on or off,
with the sole exception that the *double-click* actions on Mute, Sleep, the
knob, and the media bar are borrowed by Ambient Focus while it's active
(see section 5).

### Master on/off

- **Sleep button, single click** — toggles RGB lighting on or off.
- **Media bar Play/Pause, click (RGB mode only)** — also toggles RGB on or
  off; provided as a second, equally valid path to the same action.
- **Knob, double-click (no drag in between), RGB mode only** — also toggles
  RGB on or off.

All three controls always agree — turning RGB off through any one of them
turns off the same single RGB state that the other two read from.

### RGB effects

Sleep button double-click and the media bar's Prev/Next buttons (in RGB
mode) step through the same ordered list of seven lighting effects:

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
"track" button is expected to produce an audible/visible result
immediately.

### RGB color palette

Mute button double-click steps through a fixed palette of 16 preset colors,
plus one additional 17th slot reserved for a fully custom color:

Red, Green, Blue, Cyan, Magenta, Yellow, Orange, Purple, Pink, Mint, Gold,
Ice, Ember, Lime, Indigo, White, then **Custom**.

Like the effect cycle, this only advances while RGB is on.

### RGB brightness

Mute button **single click** steps brightness through four fixed levels —
25%, 50%, 75%, 100% — wrapping back to 25% after 100%. This is a coarse,
predictable control meant for quick adjustments and, unlike the palette and
effect cycling, it always runs regardless of whether RGB is currently on,
so the brightness value is ready and correct the next time RGB is switched
on.

The knob gives finer control:

- **Drag up/down** — continuously adjusts brightness (or, when the palette
  is parked on the Custom slot, adjusts hue instead — see below).
- **Scroll** — nudges brightness in small (about 2%) increments per scroll
  tick, for precise fine-tuning.

### Custom hue (knob "hue mode")

When the color palette is sitting on the Custom slot (the 17th position)
and RGB is on, the knob's drag gesture switches from controlling brightness
to controlling hue: dragging sweeps a full 360° color wheel, and the RGB
color updates live at full saturation as you drag. Releasing leaves the
color at wherever you stopped. This mode is exclusively a knob-drag
behavior — it does not apply to scroll or to any other control.

---

## 5. Ambient Focus Mode

Ambient Focus is the app's background-sound feature — looping ambient
tracks (rain, a coffee shop, waves, and so on) that can be mixed together
and saved as named presets, controlled from Settings. While Ambient Focus
is switched **on**, the keyboard's control cluster temporarily lends its
double-click gestures, its knob drag/scroll, and its entire media bar to
controlling that sound, because at that moment there is real audio for a
volume knob and a media bar to be useful for. The moment Ambient Focus is
switched **off** again — from Settings or from the keyboard itself — every
one of these controls reverts instantly and completely to the RGB behavior
described in section 4. Nothing about RGB's own state (its on/off, effect,
color, or brightness) is touched or remembered any differently because of
Ambient Focus; the two systems' states are entirely independent, only the
*controls* are shared.

Single clicks on Sleep and Mute are never affected by any of this — they
always mean exactly what section 4 says, in both modes.

### Knob — ambient volume

- **Drag up/down** — continuously adjusts Ambient Focus's master volume
  from 0% to 100%, following the same up-is-louder direction as RGB
  brightness.
- **Scroll** — nudges master volume in small (about 2%) increments per
  scroll tick.
- **Double-click (no drag in between)** — mutes Ambient Focus if it's
  currently audible, or restores it to whatever volume it was at before
  muting if it's currently silent. Muting and unmuting this way never
  changes the Ambient Focus on/off switch itself — it only zeroes and
  restores the volume.
- **Press and hold ~3 seconds** — unchanged: still cycles switch type, the
  same as in RGB mode.

### Sleep button — ambient shutdown

- **Single click** — unchanged: toggles RGB on/off.
- **Double click** — turns Ambient Focus off entirely (the same action as
  the media bar's Play/Pause button in this mode; the redundancy is
  intentional, mirroring how RGB's own on/off is reachable from three
  different controls).

### Mute button — ambient volume nudge

- **Single click** — unchanged: steps RGB brightness through its usual
  25/50/75/100% ladder.
- **Double click** — nudges Ambient Focus's volume up by a fixed amount
  from wherever it currently sits, wrapping back down near 0% once it
  passes 100%. This is deliberately **not** a fixed four-step ladder like
  RGB brightness: because the knob can be dragged to any arbitrary volume
  (11%, 22%, 63%, anything), Mute's double-click always steps from that
  exact value rather than snapping to a canned percentage. Drag the knob to
  roughly where you want, then double-click Mute to fine-nudge from there.

### Media bar — ambient browser

The media bar becomes a browser over your ambient sounds:

- **Prev / Next** — step through one continuous list: your saved Ambient
  Focus presets first, most recently saved first, followed by every
  individual ambient sound (Coffee Shop, Rain, Waves, and so on), and then
  wraps back around to the start. If you have no saved presets, Prev/Next
  simply step through the individual sounds directly. Each step replaces
  whatever mix is currently playing outright — it behaves like switching
  tracks, not layering more sound on top of what's already active.
- **Play/Pause** — turns Ambient Focus off. There is no separate "paused
  but still armed" ambient state to resume into with this button; once
  Ambient Focus is off, the whole cluster is back to pure RGB control, and
  turning ambient sound back on is done from Settings (or by re-enabling it
  there, which restores the keyboard's ambient controls again).

### Feedback

Because muting, nudging volume, or switching an ambient track produces no
lighting change the way RGB actions do, each ambient action briefly rings
the control that triggered it with a very subtle glow — a soft, low-opacity
outline that fades in and back out over roughly a quarter of a second. It's
intentionally minimal: a quiet confirmation that the action registered, not
a notification or a toast. You'll see it on the knob, Sleep, Mute, or the
media bar depending on which one you used.

### Discoverability

Every control's tooltip (shown on hover) updates its wording to reflect
whichever mode is currently active, so hovering any control while Ambient
Focus is on will describe its ambient behavior rather than its RGB one.
There is no separate onboarding walkthrough for this — the tooltips are the
intended way to learn the mapping.

---

## 6. Persistence

Switch type and every RGB setting (on/off, effect, palette position, custom
hue, and brightness) are saved automatically and restored the next time the
keyboard loads. Ambient Focus's on/off state, master volume, active sound
mix, and saved presets are owned by the app's Settings rather than the
keyboard, and are equally persisted there — the keyboard simply reads and
writes the same shared state.
