# Status-Bar Audit — Working Evidence

## RoyScript live inspection — 17 Aug 2026

- The live workspace showed these status-bar fields, left to right: `Ln 1, Col 36`, `Chars 41, Words 6`, `Zoom 100%`, `Windows (CRLF)`, and `UTF-8`.
- The editor toolbar above the canvas separately showed the live block-type label `Paragraph` and a `6 tabs` workspace count.
- The current status-bar information is visible in the dedicated footer at the bottom of the workspace. It uses the previously approved Windows-oriented Segoe UI 12 px treatment.
- The active workspace was a sealed, completed exam tab during inspection. The footer itself did not expose direct buttons or controls in the browser's accessible-element inventory.
- Source inspection confirms that RoyScript provides zoom changes through the View menu (Zoom In, Zoom Out, Restore Default Zoom) and includes a toggle to show or hide the entire status bar. This is distinct from a native in-status-bar zoom slider/flyout.

## Evidence boundaries

- This note records observations only. No production code, styling, configuration, test, or workspace content was changed.
- The workspace menu's compact trigger was not exposed as an individual accessibility element in the current sealed live view, so its detailed interaction verification will be completed from source and, if feasible, a clean editable workspace state.
