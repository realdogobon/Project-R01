# RoyScript TSR wordmark refinement verification

## Initial prominence refinement

The existing RoyScript wordmark was preserved. Only the compact **TSR** suffix was adjusted: its desktop size increased from 12px to 15px, its baseline offset was reduced slightly, and its tracking was tightened modestly so it feels more like an integrated designation than an isolated tag.

## Previous serif-signature treatment

TSR is now a small italic serif signature rather than a conventional sans-serif uppercase tag. It visually echoes the serif `R` that begins RoyScript, remains in the existing theme accent color, and uses restrained negative tracking so the three letters read as one compact designation.

## Final calligraphic TSR signature treatment

TSR now uses the dedicated **Allura** calligraphic face with a concise 23px desktop footprint. The lettering remains in the existing theme accent color and is isolated to this one suffix; the logo artwork and the primary RoyScript lettering are unchanged. Platform-appropriate script fallbacks preserve the treatment if the web font is unavailable.

## Automated validation

| Check | Result |
|---|---:|
| Vitest regression suite | 72/72 passing |
| Strict TypeScript validation | Passing |
| Production build | Passing |

## Live desktop verification

The managed preview rendered the unchanged logo and RoyScript wordmark with the final calligraphic TSR signature. The live DOM probe confirmed that Allura is loaded, that TSR resolves to the intended Allura-first family stack, and that the calligraphic suffix renders at 23px with a compact 33.7px width. Its bottom coordinate is `43.27`, preserving a visually grounded relationship with the main RoyScript lettering rather than turning it into a floating badge.
