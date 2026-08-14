# Settings Transition Audit — Pre-Fix Evidence

## Reproduced behavior

The live desktop captures reproduce the reported behavior when navigating from a main category into a nested view and when switching directly between nested views. The entering view is initially laid out after the exiting view in normal document flow, so its content appears lower in the scroll frame with a large empty upper region. Once the exiting motion element is unmounted, the entering view reflows to the top of the frame in a visible jump.

The geometry probe measured the detail frame beginning at `top: 60px` and the intended content origin at `top: 84px`. During `appearance-to-themes`, the new Themes view first appeared at `top: 84px` while the old main view was fading, then moved to `top: 281.75px` after the old view’s layout position became the remaining flow block, and finally returned to `top: 84px` after the old view unmounted. During `fonts-to-sound-centre`, the same pattern was larger: the new Sound Centre view reached `top: 488.46875px` before returning to `top: 84px` after exit cleanup.

The issue is therefore not a missing top inset or a scroll position chosen by the user. It is a transition-layout interaction: the shared detail frame renders multiple `motion.div` children at once while `AnimatePresence` waits for the exiting child, and the frame is not taking those children out of normal flow during the overlap.

## Screenshots

The pre-fix desktop captures are retained at:

- `/home/ubuntu/settings-transition-desktop-appearance-to-themes.png`
- `/home/ubuntu/settings-transition-desktop-fonts-to-sound-centre.png`

The first shows the Themes list in its settled state after the transient lower placement. The second shows the Sound Centre view and confirms the same transition family affects category and nested navigation more broadly than one individual list.

## Scope for the next step

The production correction should be limited to transition ownership/layout in the shared Settings detail frame. Controls, settings state, provider-key storage, labels, spacing tokens, and unrelated application surfaces should remain unchanged. The correction must be checked at desktop and 375px mobile widths in both light and dark themes, with immediate, mid-transition, and settled geometry sampled again.

## Post-fix evidence

The shared detail frame now uses a positioned context and `AnimatePresence mode="popLayout"`. The entering child remains at the intended content origin while the previous child fades: the live probe measured `top: 84px` for the entering nested body throughout the overlap on desktop and mobile, instead of the prior `281.75px` or `488.46875px` lower-flow positions. The exiting child is removed without causing a visible reflow jump. Category-to-AI Setup transitions also retain the title/detail origin correctly.

The post-fix desktop Themes capture and mobile Choose Clicky Sounds capture show the lists seated directly beneath the title row with the existing 24px detail inset, without the former empty upper gap. The probe reported zero browser errors at both viewport sizes.

The final dark desktop Appearance capture preserves the compact rail and title/detail relationship without a visible layout break. The final dark mobile AI Setup capture remains readable at 375px: the title, Cloud providers section, helper copy, and three provider fields stay within the detail frame, with the key glyph and active indicator aligned to the existing rail. The dark comparison also completed with zero browser errors.
