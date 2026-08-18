# LexKit-versus-RoyScript Reliability Comparison

**Audit state:** Phase 5 evidence synthesis. This comparison is observational only; no production editor code, scanner behavior, Practice Mode, Exam Mode, Just Look behavior, tab mechanics, or Settings behavior has been changed.

## Comparison conclusion so far

The audit does **not** support a conclusion that RoyScript’s editor core is generally unreliable. In a normal editable workspace tab, its direct toolbar formatting, mark composition, block/list transformation, link insertion, table insertion, horizontal-rule insertion, image-dialog opening, and basic history all matched the reliable public LexKit reference at the tested surface.

The evidence instead isolates a narrow but serious reliability problem in **RoyScript’s command-palette execution path**. The public LexKit palette correctly transforms the intended block and restores the editor. RoyScript opens and filters its palette reliably, but invoking a block command can split the active paragraph at the caret, remove a selected inline link, and leave history unable to restore the original block type. That failure is structural rather than visual, and it directly explains part of the “resistance” and unpredictability described in the audit objective.

| Interaction family | LexKit public reference | RoyScript workspace observation | Classification | Confidence / next action |
|---|---|---|---|---|
| Direct authoring in editable document | Fixture entered and retained paragraph boundaries. | Normal editable tab accepted the fixture and synchronized status counts. | **Parity confirmed** | High. Synthetic multiline blank blocks require source review, not immediate remediation. |
| Sealed post-exam document | Not applicable to reference demo. | Correctly refuses focus and input via an explicit read-only contract. | **Intentional difference** | High. This must remain untouched. |
| Toolbar marks and selection | Bold, italic, underline, strike, and code compose without selection loss. | Same semantic composition, same selection retention, and no focus leak. | **Parity confirmed** | High. |
| Mark-history reversal | Reverses adjacent marks in correct order. | Four successive toolbar undos reversed marks in correct order while retaining selection. | **Parity confirmed** | High. |
| Direct block and list transforms | Selected blocks convert deterministically among heading, lists, and code. | Heading/list/code transitions matched and retained selection. | **Parity confirmed** | High. |
| Structural history reversal | Three toolbar undos precisely reversed code → numbered → bullet → heading. | First undo restored the code block to the ordered list; the immediate second undo had no observable transition. | **Needs reproduction** | Medium. Inspect command/history registration before assigning a backlog item. |
| Table insertion and cell focus | Explicit dialog, predictable placement, direct cell entry. | Same explicit dialog, predictable placement, and pointer cell focus. | **Parity confirmed at insertion surface** | Medium. Cell typing requires manual verification because automation replaces the whole editor root. |
| Horizontal-rule insertion | Inserts after target paragraph with a following editable paragraph. | Same adjacent placement; table and editability stayed intact. | **Parity confirmed** | High. |
| Link dialog and insertion | Dialog confirmation was not verifiable because the remote automation session dropped. | Modal preserves selection; safe URL wraps only the selected word without navigation. | **RoyScript success; reference unverified** | Medium. Confirm reference manually/source-level rather than infer a gap. |
| Command-palette open and filter | Opens immediately, focuses search, filters to one command, and executes safely. | Opens and filters immediately with no selection loss. | **Parity confirmed for discovery** | High. |
| Command-palette execution | Enter converts the intended block and restores editor focus without content loss. | Repeatedly splits the active paragraph; when an inline link is selected, removes that selected link/text and divides the source around it. | **Confirmed gap — critical** | High. Root-cause inspection required before any fix. |
| Command-palette undo | Reference preserves exact operation order. | Undo merges the split paragraph but leaves it as a heading rather than restoring Paragraph. | **Confirmed gap — high** | High. Treat as coupled history integrity failure. |
| Image source affordance | Source menu opens; URL path unverified after remote runner interruption. | Source menu and URL/alt-text modal open and cancel cleanly. | **Parity confirmed for opening/cancel** | Medium. Remote image, alignment, caption, and removal remain source/manual-review items. |
| HTML embed | Not exercised successfully in public demo. | Toolbar immediately inserts a default editable HTML block before user supplies content; one Undo removes it. | **Product-contract decision** | Medium. Decide whether quick-insert is intentional or violates user-intent expectations. |
| Focus yield and return | Safely yields focus on neutral click and restores a valid caret on re-entry. | Toolbar paths preserve editor focus; normal editable tab remains enterable. | **Partially confirmed** | Medium. Run an equivalent neutral-page focus loop only after source inspection identifies focus ownership. |
| Visual / HTML / Markdown representation | Stock content round-trips Visual → HTML → Markdown → Visual without loss. | Application does not expose those switches in the audited workspace surface. | **Feature-surface difference** | High. Not a reliability defect unless the product intends the views to be available. |
| Keyboard shortcuts, clipboard, word navigation | Browser runner remapped modifier keys and invalidated shortcut/clipboard evidence. | Same automation limitation applies. | **Not scored** | High qualification. Use source contracts plus the final manual checklist. |

## Confirmed reproduction: command-palette structural corruption

> **Precondition:** Open an ordinary editable RoyScript workspace tab and place a collapsed caret inside a normal paragraph such as `Third block for insertion`.

Open Command Palette, filter to `Heading 1`, and press Enter. Instead of transforming the one containing paragraph into a single Heading 1, RoyScript produces two Heading 1 blocks split at the caret (`Third` and `block for insertion`). One toolbar Undo reunifies the text, but leaves it as Heading 1 rather than restoring its original Paragraph type.

The selected-inline variant is more severe. Select a linked word inside a paragraph, use Command Palette to run Heading 2, and press Enter. The selected linked word disappears and the surrounding fragments become separate Heading 2 blocks. A single Undo restored the text/link in the tested fixture, but the behavior is still destructive and cannot be considered acceptable.

## Severity framing for the next phase

| Priority | Candidate issue | User-visible risk | Evidence status |
|---|---|---|---|
| P0 | Command-palette execution segments or removes content. | Direct data/structure loss from a normal command. | Reproduced in two distinct selection contexts. |
| P1 | Palette undo does not restore original block semantics. | User cannot trust history to reverse an accidental command. | Reproduced after the collapsed-caret case. |
| P2 | Direct structural-history second Undo may not execute. | Affects confidence in multi-step reversal. | Needs source corroboration and one clean repetition. |
| P2 | Immediate HTML quick-insert mutates before user chooses content. | Unclear intent and accidental document changes. | Observed once; requires product-contract decision. |
| Verification only | Synthetic multiline blank blocks, table-cell typing, shortcuts, clipboard, remote image actions, and focus-yield loop. | No confirmed defect yet. | Browser-runner limitation or remote interruption. |

## Methodological qualification

The modifier-key and clipboard probes were deliberately excluded from severity scoring because this browser runner translates several `Control` combinations to `Meta` combinations and sometimes inserts literal characters. Likewise, its general text-input primitive replaces the complete Lexical root when aimed at a table cell. Those are tools-of-measurement limitations, not evidence of editor failures. The final implementation plan should contain manual verification for those cases rather than speculative fixes.

## References

[1] [Reliability audit charter](./lexkit-reliability-audit-charter.md)

[2] [Architecture and live-observation notes](./lexkit-reliability-audit-source-notes.md)
