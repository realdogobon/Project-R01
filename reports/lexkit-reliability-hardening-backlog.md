# RoyScript Editor Reliability Hardening Backlog

**Status:** Recommendation only — **no implementation has been approved or started.**

**Prepared:** 2026-08-18 UTC  
**Scope:** RoyScript workspace editor reliability relative to the observed LexKit public-editor baseline.  
**Excluded surfaces:** Scanner modal, Practice Mode, Exam Mode, post-exam Just Look behavior, multi-tab mechanics, keyboard styling, Settings, mobile work, and local OCR.

## Executive assessment

The completed benchmark does not show a broad failure of the RoyScript editor core. In an ordinary editable workspace tab, typing, direct toolbar formatting, composed marks, selected-block conversions, lists, table insertion, horizontal rules, link insertion, image-dialog cancellation, and most history actions behaved predictably. The observed problem is narrower, but it is serious: **a Command Palette block action can mutate or remove content that the user did not intend to change.** [1] [2]

> **Decision point:** The first approved implementation should protect selection and history integrity around palette execution. It should not redesign the workspace, alter exam sealing, touch the scanner, or substitute a new editor framework.

| Priority | Backlog item | Evidence | User-facing outcome | Approval recommendation |
|---|---|---|---|---|
| **P0** | Establish a selection-safe Command Palette execution boundary. | Reproduced at a collapsed caret and on selected linked text. | Prevent paragraph splitting and content/link removal. | Approve as the first isolated change. |
| **P1** | Make palette history fully reversible. | One undo reunited text but did not restore the original block type. | Undo returns the document to its exact pre-command semantic state. | Include with P0, but verify separately. |
| **P2** | Confirm and correct the direct structural-history second-Undo observation only if reproduced in a clean loop. | Seen once after a mixed block sequence; not yet source-confirmed. | Prevent history confidence gaps without speculative changes. | Diagnose after P0/P1. |
| **P2** | Resolve the HTML-embed quick-insert contract. | Toolbar immediately inserts default content before user input. | Avoid unexpected document mutation or make the quick action explicit. | Requires product choice before code. |
| **Verification** | Validate keyboard, clipboard, table-cell typing, remote image operations, and focus-yield through manual testing. | Browser runner distorted modifier keys and root-level input. | Confirm native-feeling behavior in real user interaction. | Run after code changes, not before. |

## P0 — Selection-safe Command Palette execution

### Problem statement

The palette focuses a text input when it opens. On activation, it calls the selected command before it closes, but it does not save or restore the editor selection. The command adapter also forwards the action directly to the live LexKit command object. Block-format commands then read the **current** Lexical selection inside their update transaction. [2]

This creates an unsafe boundary: a user chooses a block action based on the text or paragraph that was active before opening the palette, while the editor command may execute against a changed or collapsed selection after the palette input owns focus. The observed results were structural fragmentation at a caret and content/link removal for selected inline content. [1]

### Implementation boundary

The approved correction should add one small, editor-owned dispatcher between palette activation and command execution. It should:

1. Capture a logical range-selection snapshot when the palette opens, including anchor and focus positions, affinity/type, and active formatting state where relevant.
2. Validate that the referenced nodes still exist when the user chooses a command. If the document changed while the palette was open, use a safe current-selection fallback rather than applying an invalid snapshot.
3. Close the palette and return focus ownership to the Lexical editor.
4. Restore the valid logical selection inside an editor transaction.
5. Execute the selected command only after the restoration boundary is complete, so block commands see the user’s intended range or containing block.
6. Treat a missing/invalid selection as a quiet no-op. RoyScript’s established requirement is silent failure: no alerts, visible error messages, or destructive fallback insertion.

The implementation must use a typed, explicit selection-snapshot helper rather than retaining a stale Lexical selection object in React state. It must preserve the existing toolbar path, direct keyboard shortcuts, tab persistence, sealed document behavior, and status-bar updates. In particular, it must not “fix” the issue by disabling the Command Palette, force-focusing the editor globally, or changing text when an Exam tab is sealed.

### Acceptance matrix

| Scenario | Expected result after P0 | Must not happen |
|---|---|---|
| Collapsed caret in the middle of a paragraph → Palette → Heading 1 | The one containing paragraph becomes one H1, with all text retained. | Paragraph is split into two blocks. |
| Collapsed caret at paragraph start/end → Palette → Quote / Heading | The one target block transforms once. | Empty extra blocks or moved text appears. |
| Selected linked word → Palette → Heading 2 | The containing paragraph transforms; linked word and adjacent text remain. | Link text disappears, link is stripped, or fragments are created. |
| Selected plain inline text → Palette → list/code block | Text and selection semantics follow the same result as the direct toolbar command. | Selection is replaced or unrelated blocks change. |
| Document changes while palette is open | Selection snapshot is rejected safely; no destructive command is applied. | Stale node keys cause an exception, visible error, or mutation of another tab. |
| Sealed post-exam tab | Existing read-only behavior remains unchanged. | Palette bypasses the seal or acquires edit focus. |

## P1 — Exact history recovery for palette commands

The P0 repair must be paired with a history-integrity check, because the current collapsed-caret reproduction showed partial recovery: Undo rejoined text but preserved the newly applied Heading 1 rather than returning to the original Paragraph. [1]

The repair should ensure that one user-confirmed palette command becomes one coherent history entry. A single Undo must restore the pre-command editor JSON, block types, inline marks, links, and logical selection. One Redo must reapply exactly the intended command once. The implementation must avoid broad history clearing, manual document reconstruction, or state replacement from the workspace tab model.

| Test case | Required history contract |
|---|---|
| Paragraph → Palette Heading 1 → Undo | Restores the original Paragraph and its full text in one step. |
| Selected link paragraph → Palette Heading 2 → Undo | Restores the exact anchor, text, marks, and block type in one step. |
| Paragraph → Palette Quote → Undo → Redo | Undo/Redo are exact inverses with no duplicate blocks. |
| Direct toolbar conversion → Undo | Existing stable toolbar history remains unchanged. |
| Palette cancellation / Escape | Adds no history entry and preserves the original document. |

## P2 — Evidence-led follow-up work

### Direct structural-history second Undo

One isolated matched loop showed the first Undo restoring a code block to an ordered list and the immediate second Undo apparently producing no visible change. This is not yet strong enough to modify history registration: the fixture had prior synthetic interactions, and the scope includes a browser harness with known input limitations. [1]

After P0/P1 are stable, run a clean minimal loop containing only: Paragraph → Heading → Bullet List → Numbered List → Code Block → four Undo actions → four Redo actions. Capture editor JSON after every action. If the result fails outside the palette boundary, inspect the history extension registration and command tags; otherwise, classify the original observation as harness/fixture contamination rather than expand code scope.

### HTML-embed quick-insert contract

RoyScript’s HTML Embed button immediately inserts a default editable HTML block. The behavior is recoverable by Undo, but it changes the document before the user has supplied content. [1]

This requires an explicit product decision before implementation:

| Option | Interaction contract | Trade-off |
|---|---|---|
| **A. Preserve quick insert** | Rename/describe the action as inserting a default editable embed and retain current immediate insertion. | Fast for experienced users, but remains a mutating toolbar action. |
| **B. Configure before insert** | Open an explicit HTML-entry dialog and insert only after confirmation. | Stronger user-intent guarantee, but changes the established workflow. |

The audit recommends **Option B** if the product goal is the same one-click predictability demonstrated by the image and link flows. This is a recommendation, not an approved change.

### Package and portal parity check

RoyScript consumes the published `@lexkit/editor` package at `^0.1.0`; the locally checked-out LexKit app uses its workspace package. RoyScript also renders its palette through `createPortal(document.body)`, while the checked-out template renders it in the normal component tree. The upstream template itself lacks a full selection-snapshot guard, so this is a shared design risk rather than proof that workspace persistence caused the defect. [2]

Before any wide refactor, the implementation branch should run two narrow comparisons: first, exercise the corrected dispatcher with the installed runtime; second, run the same reproduction against the reference-source build or an exact pinned runtime. Only if the corrected dispatcher cannot stabilize the installed package should portal placement or package alignment become an approved code change.

## Regression and verification protocol

The automated coverage should contain pure selection-snapshot validation and source-level contracts where those tests are meaningful, supplemented by controlled browser checks. The existing passing test suite is a baseline, not proof of the corrected user flow.

| Layer | Required verification | Result needed before requesting user review |
|---|---|---|
| Unit / contract | Snapshot validity, missing-node safe no-op, command execution order, and no palette execution for read-only editor state. | Tests pass without weakening existing expectations. |
| Editor integration | P0/P1 acceptance matrix in a clean ordinary workspace tab. | No split blocks, lost links, or history drift. |
| Workspace regression | Multi-tab switching, dirty-tab persistence, tab close prompts, Practice entry/exit, Exam entry/exit, and Just Look seal. | Existing controlled-mode behavior remains intact. |
| Browser health | No browser-console errors, no visible failure copy, and no new network noise. | Clean controlled session. |
| Build quality | TypeScript, full Vitest suite, and production build. | All pass before manual review. |
| Manual validation | Native Ctrl shortcuts, clipboard, click-drag selection, double/triple click, table-cell typing, image insert/alignment/removal, focus yield/re-entry, and repeated palette use. | User confirms behavior in a fresh session. |

The final manual run must begin from a clean browser/workspace state and must not use a sealed Exam document as the normal editor benchmark. The ordinary editable tab, Practice Mode, and sealed post-exam tab should each be checked as separate contexts rather than allowing a mode-specific restriction to look like an editor failure.

## Safe implementation sequence

| Step | Work item | Scope control | Exit criterion |
|---|---|---|---|
| 1 | Add failing regression tests for the two reproduced palette defects. | No visual or feature changes. | Both failures are deterministic in testable form. |
| 2 | Add the narrow selection-safe palette dispatcher. | Command Palette only; no scanner, tabs, or Exam code. | P0 matrix passes. |
| 3 | Stabilize one-command/one-history-entry behavior. | History integration only. | P1 Undo/Redo matrix passes. |
| 4 | Run the clean structural-history probe. | Diagnose before editing. | P2 is either fixed with evidence or closed as non-reproducible. |
| 5 | Resolve HTML-embed product choice. | Only after explicit user selection between A and B. | Chosen contract is implemented and tested. |
| 6 | Complete full regression, build, and manual verification session. | No checkpoint or Git action implied. | User confirms the fresh-session behavior. |
| 7 | Request explicit approval for checkpoint and Git synchronization. | Respect the project’s approval rule. | Only proceed if the user says to commit/checkpoint. |

## Approval request boundary

This audit recommends approving **Steps 1–4 only** as the first implementation batch. They are the smallest surgical path to remove the confirmed data/structure-risk defect while preserving the app’s existing design and controlled workspace modes. The HTML-embed decision, any portal adjustment, any LexKit version alignment, and all unrelated refinements should remain out of scope unless the first batch proves they are necessary.

The previously verified Stop-Exam hover correction remains intentionally uncommitted. This audit and its report files also do not authorize a Git commit or project checkpoint.

## References

[1] [Evidence-led LexKit versus RoyScript comparison matrix](./lexkit-reliability-comparison.md)

[2] [Architecture inventory, live observations, and palette source diagnosis](./lexkit-reliability-audit-source-notes.md)

[3] [Audit charter and interaction coverage matrix](./lexkit-reliability-audit-charter.md)
