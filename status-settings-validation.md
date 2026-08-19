# Status and Settings Live Verification Notes

The initial live workspace load rendered the status bar with `Ln 1, Col 1` and `Chars 39, Words 1`. Opening Settings exposed the three-mode theme capsule in its settled first-open state, with no persistent offset visible in the rendered frame.

The user-triggered dark-theme selection completed normally, preserving the intended interactive transition. The Settings font chooser then opened successfully and presented the existing application font options. Remaining verification is to select an alternate application font and confirm the status-metric container resolves to that same live font family.

Georgia was selected through the live Settings UI. The rendered editor and the `data-statusbar-live-metrics` container both resolved to the computed font family `Georgia`, while the status content remained `Ln 1, Col 1` and `Chars 39, Words 1`. This confirms the requested status-bar font inheritance in a non-default font selection.

After the comparison, the Settings view was returned to the original font picker so the live test session can be restored to its prior Geist Mono selection before handoff.

The original Geist Mono selection was restored. A second computed-style comparison confirmed that both the editor and the live status-metric container resolve to `"Geist Mono", ui-monospace, "Cascadia Code", monospace`.

The original system theme selection was also restored after confirming the user-triggered dark-mode transition. The workspace returned to its initial light-rendered system state.

Settings was closed and reopened from that restored system-theme state. On this clean modal mount, the theme capsule rendered directly in its settled position; no opening-time moon shift was visible in the live frame.

The same check is now prepared with dark mode selected: Settings was closed after the user-triggered dark-mode selection so the next mount can verify the moon-specific opening path before the session is restored.

Settings was reopened with dark mode already selected. The moon-specific capsule rendered in its settled dark-mode position with no visual shift in the live frame. A supplemental DOM probe could not map the browser-reported control hint to a CSS selector, so it did not add a separate animation-count measurement; the visual clean-open observation remains valid.

The system theme was restored and Settings was closed. The live workspace is now back in its original light-rendered system-theme state, ready for manual verification.
