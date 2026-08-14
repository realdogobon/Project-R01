# Settings Animation and Rapid-Switch Audit

## Scope

This audit covers the six Settings categories, the Themes, Font, Choose Clicky Sounds, Keyboard Sounds, Error Sounds, and Atmosphere submenus, normal transitions, rapid category sweeps, rapid nested open/back switching, and desktop/mobile final states. Production code was not changed during the initial stress run.

## Initial stress evidence

The evidence-only harness completed ten rapid category sweeps and eight nested rapid-switch cycles at 1280×720 and 375×812. The final screenshots show the Settings panel returning to the Appearance main view with the rail, title row, detail frame, and mobile bottom edge intact. The entering detail views sampled at the expected frame-relative positions: main content began at the title-frame boundary, while nested content began 24px lower because of the intentional `pt-6` detail inset.

The harness observed up to three temporarily mounted motion children during deliberately aggressive 12–18ms nested switching. This is expected while `AnimatePresence` completes interrupted exits; the children were absolutely positioned after the previous transition correction, so they did not push the entering view downward. The final settled state returned to one visible content child with `scrollTop: 0` on both viewports.

The stress harness also recorded 32 missing-back states per viewport during the intentionally faster-than-human nested burst. These occurred when a back action was issued roughly 12ms after an interrupted category/nested update, before the new title branch had mounted. This is recorded as a stress-boundary observation rather than a confirmed user-facing bug; it requires a targeted confirmation run with a real rapid category-only sequence and slightly less artificial nested timing before any production change is considered.

The browser console also reported `net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin` for an external resource in both viewport runs. This was isolated from the Settings interaction evidence and did not produce a React exception, test error, stale final view, or geometry failure.

## Expanded submenu coverage

The normal-paced audit covered Themes, Font, Choose Clicky Sounds, Atmosphere, Keyboard Sounds, and Error Sounds. Each nested view settled at the same 24px detail-frame inset (`top: 84px` in the 720px desktop and mobile captures), with one mounted content child and `scrollTop: 0`. During the 35ms transition sample, two children could be mounted at the same top coordinate while the old view faded out; this is intentional absolute-positioned crossfade behavior and does not create a vertical layout jump.

The rapid category sweep completed ten full passes across Appearance, Keyboard & Typing, Practice, Ambient Focus, Performance, and AI Setup on both viewports. It returned to Appearance with one mounted child and no active-category drift. The deeper Keyboard Sounds and Error Sounds paths also completed normally.

The nested burst remains intentionally harsher than normal human input: it changes category, opens a submenu, and presses back at roughly 12ms intervals. It produced temporary missing-back observations before the new title branch could mount, but no production exception or final layout corruption. The evidence does not justify another production animation change at this point; a future stress harness can add a queued-intent policy if the product needs to guarantee every impossible-speed click is honored.

## Captures

The final post-stress captures are `/home/ubuntu/settings-rapid-switch-desktop.png` and `/home/ubuntu/settings-rapid-switch-mobile.png`.
