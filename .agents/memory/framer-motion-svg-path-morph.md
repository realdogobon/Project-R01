---
name: Framer Motion SVG path (d) morphing needs explicit initial
description: A motion.path animating the `d` attribute without an explicit `initial` intermittently sets d to undefined on mount, causing a browser console error.
---

Any `motion.path` (Framer/Motion) that animates the `d` attribute (path morphing) must
declare an explicit `initial={{ d: "<same string as the static d prop>" }}`.

**Why:** Motion can read a DOM fallback starting value for CSS-backed props (opacity,
transform, etc.) via computed style, but `d` is a raw SVG attribute with no such
fallback. Without `initial`, the very first animation frame resolves the "from" value
to `undefined`, and the browser's SVG parser rejects it with:
`Error: <path> attribute d: Expected moveto path command ('M' or 'm'), "undefined".`
This fires on mount even if the animate target itself is a valid static string, and
independent of spring vs. tween transition type.

**How to apply:** Whenever adding/reviewing a `motion.path`/`motion.svg` element that
puts `d` inside `animate`, always pair it with a matching `initial.d`. Also: `d`
morphing only works with tween/duration-based transitions, not spring (springs
interpolate numbers, not path-command strings).
