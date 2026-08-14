# Settings Detail Spacing Findings

## Reproduction

Captured the live Settings detail views at 1280×720 using the repository-owned browser probe:

- `settings-keyboard-profile-before.png`: `Choose Clicky Sounds`
- `settings-soundscape-before.png`: `Atmosphere`

## Verified Finding

The fixed right-side Settings shell has a title row and divider, but the independent detail scroll frame begins immediately beneath it. The `profiles` and `atmosphere` detail views do not begin with the shared `Section` helper, so they receive no equivalent top inset. Their first heading/content line therefore rides too close to the title divider. The same structural gap can affect other nested detail views.

## Minimal Fix Boundary

Add top breathing room to the detail frame for nested views, rather than changing individual Soundscape or Keyboard controls. Preserve all existing state, persistence, navigation, reset behavior, provider-key behavior, and control styling. Re-run the two focused screenshots after the correction and compare the first content baseline against the title divider.

## Nested-View Confirmation

The focused probe was extended to enter the actual `Keyboard Sounds` profile page rather than stopping at the `Choose Clicky Sounds` hub. The resulting `Keyboard Sounds` and `Atmosphere` screenshots confirm the shared issue: their first content heading begins immediately under the title divider. The correction should therefore target the shared detail scroll frame, not either individual submenu.

## Final Verification After Correction

The actual desktop Keyboard Sound Profile now starts below the title divider with visible breathing room; the Classic Switches and Premium Hardware sections remain readable and do not collide with the header. The Atmosphere view shows the Profiles and Sounds rows beginning below the divider with the same shared top clearance, while the rail remains aligned.

The focused probe now waits for the Sound Centre content, enters the actual Keyboard Sound Profile, captures Atmosphere, and passes at desktop and 375px mobile widths with zero browser errors.

The final 375px captures confirm the same top clearance on Keyboard Sounds and Atmosphere without clipping the title row, rail, first content headings, or scrollable lists. The narrow layout remains usable and the shared inset does not distort the existing controls.
