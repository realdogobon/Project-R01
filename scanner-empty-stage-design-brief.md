# Scanner Empty Stage — Research-Led Redesign Brief

## Purpose

Rebuild the scanner’s empty upload stage as a **native part of the RoyScript scanner modal**, not as a standalone upload widget. The outcome must feel quiet, centered, immediately understandable, and visually coherent with the existing left action rail and fixed bottom toolbar.

## Evidence Reviewed

| Source | Relevant guidance | Design consequence |
|---|---|---|
| [Apple HIG: Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | Group related information, give essential content sufficient space, align components to communicate organization, keep controls distinct from content, and avoid crowding nonessential details around primary content. | Treat the empty state as one vertically centered content group; use whitespace rather than a card, border, divider, or layered container to establish the group. |
| [Apple HIG: Typography](https://developer.apple.com/design/human-interface-guidelines/typography) | Typography should communicate hierarchy through a small set of size, weight, and color differences; avoid light weights and internally inconsistent typographic voices; match meaningful symbols to surrounding text. | Use the modal’s existing sans-serif voice, one modest semibold title, one subdued supporting line, and lightweight metadata. The cloud glyph must match the text’s visual weight. |
| [Apple HIG: Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) | Sheets serve focused tasks; their size should suit the task, and the presentation should preserve the parent context. | The upload stage must respect the left rail and footer as persistent scanner context instead of competing with them through a large independent call-to-action composition. |

## Live Context Diagnosis

The live desktop workspace was captured at 1280×720 before analysis. The scanner is a dense, tool-like modal: a narrow icon rail on the left, a focused central stage, and a compact fixed toolbar below. The upload stage currently reads as a separate mini-product because its call-to-action and typographic treatment use more visual weight than the surrounding scanner controls. It also lacks a single, optical center shared by its glyph, title, copy, and actions.

## Binding Visual Contract

| Area | Decision |
|---|---|
| **Canvas** | No card, no dotted boundary, no ornamental divider. The stage background remains visually continuous with the scanner canvas. |
| **Centering** | One vertical group is mathematically centered within the usable area above the fixed footer, then optically adjusted a small amount upward to account for the heavier footer. All group elements share one center axis. |
| **Glyph** | Use a single modest cloud-upload glyph, centered above the title. It should be neutral and close in stroke weight to the scanner rail icons, not framed in a raised tile. |
| **Typography** | A short action-oriented title, one muted supporting sentence, and a low-emphasis capabilities line. No monospaced or oversized display treatment. |
| **Primary action** | One compact, native-looking action with normal scanner control height; no large filled slab, no gradient, and no competing icon tile. |
| **Secondary routes** | Keep `From link` and `Image sequence` as quiet text actions on a shared row, visually subordinate to the local-file action. |
| **States** | Drag-active, selected-file, pending, success, and silent-reset states retain the same central axis and restrained hierarchy. The state may change content, not the visual language. |
| **Functional boundaries** | Preserve local file validation, explicit confirmation, drag/drop, silent failures, URL import, image-sequence ingestion, crop, Scan/Stop, and workspace Send exactly as currently verified. |

## Reference Success Criteria

1. At first glance, the stage reads as **empty space with one clear invitation**, not a card or embedded uploader.
2. The cloud glyph, title, copy, action, routes, and metadata sit on one calm vertical axis.
3. The primary action is smaller and quieter than the scanner’s overall geometry, never visually louder than the footer’s Scan control.
4. The empty group clears the left rail and footer with deliberate, symmetric space.
5. Every transient upload state remains centered, legible, and free of red error copy.

