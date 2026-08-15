# Scanner Empty Stage — Screenshot-Based Current-State Audit

**Date:** 15 August 2026  
**Source:** Live desktop scanner capture at 1280 × 820, saved as `/tmp/scanner-current/01-idle.png` during the reported review.

## What the live capture shows

The user’s criticism is accurate. The current state is still a familiar vertical uploader widget placed in the center of the scanner canvas: a small cloud glyph, a title, a caption, a text action, utility links, and a capability line. The revision adjusted its position and restraint, but **not its composition**. It therefore continues to read as the same previous design, merely centered and softened.

The control group is only about 360 × 303 pixels inside a much larger, otherwise empty document stage. Its visual weight is too low to establish a new focal composition, while its action hierarchy remains structurally identical to the rejected design. The small cloud, stacked copy, `Choose a file` control, and two inline utility routes still form a conventional generic upload panel rather than a scanner-native empty canvas.

## Required departure for the next design

The replacement must not reuse that icon-title-caption-action-link stack. It will instead use a **document-canvas composition**: a large soft cloud/document mark with a quiet spatial anchor, a compact integrated action row, and utility routes repositioned as tool-level affordances. The stage must feel intentionally designed around the scanner viewport rather than like a centered uploader component.

No behavior is changed by this audit. The existing local selection, drag/drop, pending, success, silent failure, public-link import, image sequence, crop, Scan/Stop, and Send contracts remain the preservation boundary.

## Research direction used for the replacement

Apple’s layout guidance calls for controls to be visually distinct from content, aligned to communicate hierarchy, spaced in logical groups, and kept separate when unrelated.[1] The capture reveals the opposite structural problem: every element belongs to a single generic uploader stack, so moving that stack does not establish a different content-versus-control relationship.

The replacement will treat the document area as the **primary content canvas**, not an empty card. The cloud becomes a large, low-contrast in-canvas watermark anchored to the document stage. A compact command strip becomes the only interactive control group, set lower in the canvas and visually aligned to the scanner’s existing bottom toolbar. The main file action will be a restrained pill-sized command rather than a line in a vertical text stack. `From link` and `Image sequence` move into an adjoining utility group with tool-like spacing and no central divider.

This is a compositional change, not a typography or centering adjustment: the former vertically stacked uploader is removed. The new stage is intentionally asymmetric across the canvas, with a large document mark supplying content presence and a small scanner-native control rail supplying interaction. Pending, success, and silent failure will preserve this same in-canvas/command-strip relationship.

## References

[1]: https://developer.apple.com/design/human-interface-guidelines/layout "Apple Human Interface Guidelines — Layout"

## Live redesign verification

The new idle capture at `/tmp/scanner-material-redesign/01-idle.png` is visibly distinct from the captured baseline. The former compact upload widget has been replaced by a **full document-canvas treatment**: an oversized, low-contrast cloud watermark occupies the visual center while file selection and the two utility routes live in one small scanner command rail below it. There is no enclosing uploader card, dashed boundary, separate title block, or conventional vertical action stack.

The selected-file capture at `/tmp/scanner-material-redesign/03-selected-file.png` preserves that hierarchy. It uses the same cloud-led canvas, adds the selected document as a quiet contextual line above the command rail, and changes the primary affordance to `Add to scanner`. The pending state uses the command rail as its progress surface rather than reinstating the old vertically stacked filename/progress component. The live probe completed every state with no browser error or visible error message.
