# LexKit Reliability Audit — Source Notes

## Initial Local-Repository Findings

The local LexKit repository is present at `/home/ubuntu/lexkit`. Its project overview identifies LexKit as a React-facing, extensible editor layer built on Meta Lexical. The maintained integration exposes typed commands and state through `createEditorSystem`, with extensions defining the available command surface. The source overview explicitly calls out history, command palette, floating toolbar, context menus, images (including upload, paste, and alignment), tables, and HTML/Markdown/JSON import-export as built-in capabilities relevant to the audit matrix.

The comparison must separate **LexKit core/editor behavior** from RoyScript's surrounding workspace state, tab persistence, Practice constraints, and Exam sealing. A surface difference is only a confirmed reliability gap when the equivalent supported editor operation differs under an identical, reproducible flow.

## Primary Local and Public Sources

1. Local LexKit overview: `/home/ubuntu/lexkit/README.md`.
2. LexKit demonstration: https://lexkit.dev/demo
3. LexKit documentation: https://lexkit.dev/docs
4. LexKit source repository: https://github.com/novincode/lexkit

## Audit Guardrails

No RoyScript production behavior is to be changed during the audit. Browser behavior, source architecture, and repeatability are to be measured first; only confirmed gaps will enter the later hardening backlog.

## Editor-System Lifecycle Findings

LexKit centralizes editor setup in `packages/editor/src/core/createEditorSystem.tsx`. The editor system is constructed from a stable editor configuration and extension registry, while the public context exposes the active Lexical editor instance, command registry, read-only state, editable ref, floating-menu state, and an explicit update generation counter. The implementation captures and restores focus through the editable element rather than relying on a transient DOM selection, which is relevant when comparing toolbar/popover actions that should return users to the same authoring context.

The system also wires a top-level error boundary around the composable editor body and creates the content/editor relationship through one provider chain. For the audit, this establishes a source-level hypothesis—not yet a production finding—that LexKit's predictable feel may come from its centralized editor lifecycle and focus contracts. RoyScript's use of the same template must therefore be assessed for extra parent rerenders, persistence hydration, overlay behavior, and workspace-mode gates that can weaken those guarantees.

## RoyScript Template Inventory

RoyScript imports the same central `@lexkit/editor` system and enables a broad extension set: marks, links with automatic linking, tables, history, images, block formatting, HTML and Markdown conversion, code, embedded HTML, floating toolbar, context menu, command palette, and draggable blocks. Its public template ref additionally provides injection, serialization, selection, read-only, and focus operations for the surrounding workspace.

RoyScript adds application-owned layers around core LexKit behavior. These include custom image upload, image URL/caption prompts, a hand-positioned portal floating toolbar that polls state every 150ms, custom dialogs/dropdowns, extra keyboard-command registration, workspace callbacks, status reporting, and mode locks. This is an architectural risk area for the audit: it can add latency, selection loss, duplicate event paths, or divergent behavior even where the underlying LexKit command is sound. The upload handler currently contains a browser alert fallback; that must be classified separately against RoyScript's silent-failure product requirement rather than assumed to be representative of LexKit core behavior.

## Public Demo Inventory

Source: [LexKit public homepage/editor](https://lexkit.dev/) — inspected 2026-08-18 UTC.

The public demo exposes Visual, HTML, and Markdown modes; formatting actions for bold, italic, underline, strikethrough, inline code, link, paragraph/block type, code block, bullet list, numbered list, horizontal rule, table, image, HTML embed, undo, redo, and command palette. The editable surface is a standard textbox-backed rich-text region. This makes it a useful behavioral baseline for direct authoring, selection-state, toolbar, media, undo/redo, and keyboard-shortcut comparisons. Public marketing claims such as “lightning fast” and “production ready” are not treated as audit evidence; the benchmark will rely on repeatable observed interactions and source review.

Observed live controls: all authoring commands are exposed as dedicated toolbar buttons with accessible names or hints; documented shortcuts include Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Shift+T, Ctrl+Z, Ctrl+Y, and Ctrl+K. The demo begins in Visual mode with preloaded rich content in one textbox. It provides a concrete, reachable baseline for controlled click and shortcut loops, but results still need to be compared with the local source and RoyScript rather than inferred from page marketing copy.

### Public-demo interaction surface detail

The public demo’s visible toolbar names and hints were captured directly from the accessible live page on 2026-08-18 UTC. Visual, HTML, and Markdown modes are represented as separate top-level switches. The toolbar exposes dedicated controls for Bold (`Ctrl+B`), Italic (`Ctrl+I`), Underline (`Ctrl+U`), Strikethrough, Inline Code, Insert Link, Paragraph/block type, Code Block, Bullet List, Numbered List, Horizontal Rule, Insert Table (`Ctrl+Shift+T`), Insert Image, Insert HTML Embed, Undo (`Ctrl+Z`), Redo (`Ctrl+Y`), and Command Palette (`Ctrl+K`).

The authoring document is a rich, preloaded sample with headings, paragraph text, strong text, list items, and inline spans. The upcoming benchmark will use this existing document plus controlled additions, so the audit can observe semantic content transformation and state restoration rather than merely toolbar activation.

### Latest live control verification

Source visited: https://lexkit.dev/ (public demo), 2026-08-18 UTC. The live accessible surface confirms a single `role="textbox"` visual editor, with `Visual`, `HTML`, and `Markdown` top-level modes and dedicated toolbar commands for Bold, Italic, Underline, Strikethrough, Inline Code, Link, Paragraph, Code Block, Bullet List, Numbered List, Horizontal Rule, Table, Image, HTML Embed, Undo, Redo, and Command Palette. The current benchmark will explicitly separate observed behavior from claims in the surrounding landing-page copy.

### Controlled authoring fixture — early observation

The public demo accepted a three-paragraph plain-text fixture in one direct overwrite and retained focus in the `textbox`. The resulting visual document preserved paragraph boundaries. A one-character left-arrow move shifted the text caret backward within the final paragraph without disrupting focus or changing document content. The automated browser maps `Control+ArrowLeft` to a platform `Meta+ArrowLeft` event in this environment; therefore, word-navigation parity will be recorded as **not directly conclusive** here rather than inferred from that key-mapping quirk.

### Controlled mark and focus observation

With a deterministic selection over the word `formatting`, the public Bold toolbar command converted exactly that word to a semantic `strong` node. Immediately afterward, the editor retained focus and the same text range remained selected. The associated contextual formatting palette appeared without moving the selected text or changing the rest of the fixture. This is a confirmed positive reference behavior for selection-preserving toolbar mark operations.

### Keyboard-harness qualification and history result

The browser automation translated `Control+B` to a platform `Meta+B` event and inserted `B` into the active selection while leaving the mark active. This is an automation-key mapping limitation in the benchmark environment, not a confirmed LexKit shortcut defect. The public toolbar Undo command immediately restored the full word `formatting`, its `strong` mark, the original selection range, and editor focus. Toolbar history behavior is therefore a confirmed positive reference; direct modified-key comparison will require a browser-event or manual-validation qualification.

### Repeated mark composition observation

Applying Italic and then Underline to the restored `formatting` selection kept the editor focused and kept that selection intact after each toolbar click. The resulting Lexical DOM retained one semantic text node with composed mark classes rather than splitting or moving the text. This establishes that repeated toolbar formatting actions are selection-stable in the public baseline; later comparison will check whether RoyScript's surrounding controls preserve the same behavior.

The same selected range also accepted Strikethrough followed by Inline Code without a focus loss or text movement. LexKit preserved the existing composed marks under the code representation, demonstrating deterministic composition in this public fixture. The audit will subsequently test whether undo can unwind these operations as a sequence and whether RoyScript preserves the same selection and focus contract.

### Block-format observation

With the second paragraph selected, the public Paragraph control exposed a direct chooser for Paragraph, Heading 1–6, and Quote. Choosing Heading 1 immediately converted only that block to an `h1`, retained its text selection, updated the toolbar’s active block label, and left the surrounding fixture intact. This is a confirmed reference flow for selection-preserving block conversion.

### List transformation observation

The selected Heading 1 converted to a single-item unordered list with the Bullet List command, and the controls immediately exposed list-specific indent and outdent operations. Switching to Numbered List converted the same item into an ordered list without altering its text or its surrounding blocks. The state transition was deterministic and directly reflected in the rendered `ul`/`ol` structure; no extra click or focus recovery was required.

### History reversal observation

The Code Block action converted the selected ordered-list item into a code block. Three consecutive toolbar Undo actions then restored the ordered list, the unordered list, and finally the Heading 1 in exact reverse order. Each transition retained the target text and returned the toolbar to the matching structural state. This confirms a reliable multi-level public-demo history baseline for adjacent structural transformations; later tests will include redo and insertion-created history entries.

### Table insertion observation

The Insert Table control opened a compact modal with explicit row count, column count, and header inclusion inputs, rather than an ambiguous grid picker. Inserting the default 3×3 configuration replaced the selected heading block with a nine-cell table at that exact location while leaving neighboring paragraphs intact. A direct cell-focus and entry probe placed `Cell A` into the first cell, and the rendered table structure immediately exposed the new cell text. The browser editing-command probe reports its DOM state synchronously before Lexical’s queued update flushes, so the visibly committed cell result—not that transient console snapshot—is the reliable observation.

### Horizontal rule and link-probe handling

With a collapsed caret in the trailing paragraph, Insert Horizontal Rule appended a rule directly after that paragraph and created a fresh following paragraph, preserving the table and existing inline marks. This was visually and structurally deterministic.

The public-demo link probe reached a valid active selection (`alpha`) but the remote browser action timed out while opening the link dialog, after which the browser session had to be reopened and the public demo reverted to its stock document. This is an automation-session interruption rather than evidence of a LexKit product defect or success; the audit will treat link-dialog application as unverified in this public-demo pass and assess its source integration during the later inspection phase.

### Representation switching observation

On the reopened stock document, Visual → HTML immediately replaced the editor UI with an editable HTML textarea containing a full structural serialization. HTML → Markdown immediately produced the expected Markdown serialization, including headings, bold content, lists, and the fenced code block. Markdown → Visual restored the editable Lexical surface with the same visible heading, paragraph, list, bold, and code-block structure. The three-view round trip completed without a reload, visible error, focus trap, or content loss in the baseline document.

### Command palette and image-menu probe

The Command Palette opened immediately from its toolbar entry point, placed focus into a searchable input, and listed categorized commands with their shortcut metadata. Filtering to `Heading 2` reduced the command list to one visible result. Pressing Enter executed it, dismissed the palette, restored the visual editor, and transformed the active trailing paragraph into an H2 with an empty following paragraph—an expected block-transition result with no apparent timing lag.

The Insert Image control opened a small two-option source menu (`From URL`, `Upload File`) cleanly. Activating its `From URL` sub-action timed out in the remote browser harness, followed by the same browser-session loss observed during the link dialog probe. This cannot be used as product-failure evidence; URL-image insertion and any image selection/alignment/removal controls remain unverified in the public-demo automation pass and are explicitly retained for source-level review.

### Focus yield and restoration baseline

Clicking a body paragraph focused the editable Lexical root directly and established a valid collapsed selection within that root. A subsequent click on neutral page chrome moved focus to the document body, cleared the editor-bound selection, and left the document text unchanged. This confirms that the editor yields focus without mutating content; the final return-to-editor focus-restoration check remains part of the current benchmark loop.

Returning to that same paragraph restored focus directly to the editable root and created a valid collapsed selection inside it. The open/close/re-entry loop therefore behaved deterministically in the public demo.

### Clipboard shortcut harness limitation

A deterministic `LexKit` word selection was created in the editor. The browser runner reported mapping `Control+C` to `Meta+C`, then inserted the literal character `C` in place of the selection. This is a runner modifier-key issue, not valid clipboard-product evidence; it mirrors the earlier shortcut distortion observed during this audit. The affected public fixture must be reset before further baseline observations. Native copy, paste, and paste-as-plain-text remain unverified by this remote automation channel and will be covered through integration/source inspection rather than classified as user-visible failures.

## RoyScript matched public-workspace observations

### Initial controlled authoring entry

On the active blank workspace tab, the browser runner's direct text-input operation created an empty paragraph but did not insert the supplied three-line fixture. The editable root was not focused after the operation, its text content remained empty, and no selection was present. This is a material contrast with the public LexKit demo's direct authoring path, but it is not yet classified as a RoyScript defect: the next step is a real pointer-focus sequence followed by a keyboard-entry probe, so the audit can distinguish an automation targeting limitation from a genuine first-keystroke/focus defect.

The follow-up pointer probe reproduced the same failure twice: clicking both the `role="textbox"` root and its rendered empty paragraph left the document body active, created no DOM selection, and supplied no text to the editor. Unlike the modifier-key issue observed on the remote LexKit page, this is occurring on the local controlled workspace and warrants rendered-state inspection before the remainder of the matched interaction sequence proceeds.

Rendered-state inspection showed that this first audit target was an intentionally sealed post-exam tab, not an ordinary writing workspace: it had `contenteditable="false"`, `aria-readonly="true"`, `tabindex="-1"`, reduced opacity, `user-select: none`, and the `lexkit-sealed-document` wrapper. The focus refusal was therefore correct controlled-mode behavior and must not be counted as an editor reliability gap. The task view confirmed seven persisted tabs and identified ordinary `New Document` cards; the audit has now switched into one of those non-exam tabs for the actual matched editing sequence.

The first empty `New Document` card still rendered the sealed-document contract after selection, so it was not suitable for free-authoring tests. Switching through the same task view to a populated `alpha b` workspace tab produced the expected active editor state: `contenteditable="true"`, normal opacity, text selection enabled, no `aria-readonly`, and the standard full toolbar. The matched RoyScript benchmark will use this editable tab without changing its pre-existing content beyond controlled audit actions.

### Controlled authoring fixture

After a real pointer focus on the editable `alpha b` tab, the identical direct input mechanism inserted the controlled fixture successfully and updated the status bar to 87 characters and 14 words. This confirms that normal RoyScript authoring works once the test is conducted on an editable tab. The multiline input produced seven line positions for four textual lines, with visibly empty paragraph nodes between each supplied newline; the audit will inspect the resulting DOM before classifying that as a product-level multiline-entry inconsistency rather than a browser-runner encoding artifact.

DOM inspection confirmed a seven-paragraph shape: each of the four intended text paragraphs is separated by a Lexical-managed empty `<p><br></p>`. The text-content serialization itself remains continuous, while the visible/status-bar line semantics expose the inserted blank blocks. This is retained as a source-review candidate, not a confirmed gap, because the same runner uses synthetic multiline input rather than a native clipboard paste.

The `alpha` word in the `Audit alpha beta gamma` paragraph was then selected deterministically. RoyScript moved focus to the editable root and maintained a valid in-editor selection, providing the correct baseline for the matched toolbar mark tests.

### Toolbar mark and focus restoration

The Bold toolbar control immediately wrapped the selected `alpha` word in `<strong class="lexkit-text-bold">`, retained the exact selection, preserved editor focus, and updated the status bar to report five selected characters. This matches the reliable public-LexKit mark-toggle pattern observed in Phase 3: a toolbar mutation does not discard the active range or strand focus in the toolbar.

Italic and Underline applied consecutively to the same live range without requiring reselection. RoyScript represented the combined result as one `<strong>` node with `lexkit-text-bold lexkit-text-italic lexkit-text-underline` classes; the selected text remained `alpha` and focus remained in the editor. This is the same deterministic, composable mark behavior demonstrated by the public LexKit baseline.

Strikethrough and Inline Code also applied on the preserved range. The final DOM uses a `<code>` wrapper around the same selected `<strong>` text, with combined `lexkit-text-underlineStrikethrough`, bold, italic, and code classes. The exact selection and editable focus remained stable after every toolbar action. No click resistance, lost selection, or focus leakage was reproduced in this mark-composition loop.

### Toolbar history

The first two toolbar Undo activations completed without visible error, retained the active five-character selection, and left the editor operable. DOM inspection confirmed that they reversed Inline Code and Strikethrough in order: the code wrapper was gone and the remaining classes were exactly Bold, Italic, and Underline. Two further Undo actions reversed Underline and Italic in order, leaving exactly `lexkit-text-bold`; `alpha` remained selected and the editable root remained focused. The mark-history behavior is therefore ordered, reversible, and stable through four consecutive toolbar undos.

### Block-format chooser

The full second fixture paragraph was selected in an ordinary editable tab before opening the block-format chooser. RoyScript surfaced Paragraph, Heading 1–6, and Quote options immediately; the selection stayed active (27 characters selected), and the status bar caret state remained valid while the chooser was open. This matches LexKit’s non-destructive block-menu opening behavior.

Heading 2 transformed the selected paragraph directly into an `<h2>` and updated the active block control label immediately, while preserving the exact 27-character selection. A following Bullet List action then transformed that heading into a `<ul><li>` structure without reselection, exposing the expected list indent/outdent controls and retaining the live selection. This sequential block-transition path behaved deterministically in the same way as the public LexKit benchmark.

The selected bullet item converted directly to `<ol><li>`, again retaining the full selected text and activating the expected list controls. Converting that ordered-list item to Code Block then produced a standalone block-level `<code>` element, dismissed list-only controls, and kept the selection active. The entire Heading 2 → bullet list → numbered list → code-block path completed through single actions with no visible recovery step, error, or focus loss.

The first toolbar Undo correctly restored the code block to the preceding ordered-list structure and retained the 27-character selection. A second immediate Undo activation produced no observable DOM or visual transition from that ordered list in the browser harness. This is recorded as a reproducible audit observation rather than a product conclusion until the command registrations and browser-event routing are inspected in Phase 6; the direct transform chain itself remained reliable.

### Insertion baseline

For the next matched insertion checks, a collapsed native selection was placed at the end of the trailing fixture paragraph via its rendered text node (RoyScript wraps editable text in spans). The editor retained native focus and exposed a valid collapsed caret; the resulting test baseline is independent of the unrelated selection-helper recovery needed to accommodate that expected wrapped text structure.

The table control opened a focused, explicit configuration dialog over the stable editor state. It exposed Rows (default 3), Columns (default 3), an Include headers checkbox, Cancel, and Insert Table; no content changed before confirmation. One browser-harness action initially opened the adjacent image-source menu because the rendered toolbar indices had changed after a prior state transition. It was immediately replaced by the intended table action and is not treated as product behavior; the table dialog itself opened deterministically.

Confirming the default configuration inserted a 3×3 table directly after the controlled trailing paragraph and returned the document to an editable state without a visible error. A direct pointer click inside the first empty cell produced the expected active table affordances (row movement controls and column handles) while leaving the document stable, matching the LexKit insertion/focus pattern at this surface level.

The browser automation input primitive clears the full Lexical editing root before entering replacement text, even when its visible target is an empty table-cell paragraph. It therefore replaced the whole fixture with `Cell A1` rather than simulating a cell-local keystroke. The following Undo stepped back to the empty initial root rather than restoring the fixture in one action. This is a limitation of the automation input primitive and an unreliable history setup, not evidence that a normal cell-local user edit deletes a document; direct keyboard-driven table-cell entry remains reserved for the later manual-verification checklist. The temporary audit tab is being restored separately before further benchmarks.

A second native Undo restored the complete fixture and its 3×3 table. The editor regained focus with a non-empty selection and exactly one table in its DOM, confirming that the original audit surface was recovered. Subsequent automatic typing inside a table cell is deliberately avoided because the browser primitive cannot represent real cell-local typing reliably.

With a collapsed caret directly after the trailing paragraph, Insert Horizontal Rule added a visible rule followed by a new empty paragraph before the table. The table remained intact, the document stayed editable, and no visible error or focus dead-end occurred. The adjacent-block placement matches the LexKit behavior observed in the public demo.

With the bold `alpha` word selected, RoyScript’s Insert Link command opened an explicit modal containing a URL field, Cancel, and Insert Link. The status bar still reported the five-character selection behind the modal, showing that selection context was preserved while the URL control received interaction focus. This matched the reliable dialog-opening stage observed in LexKit; a safe same-origin URL will be used for the confirmation stage rather than requesting a remote resource.

Entering `https://example.test/audit` and confirming transformed only the selected `alpha` word into a link while retaining its existing bold mark. The dialog closed, no navigation occurred, the selection remained active, and the toolbar switched from Insert Link to Remove Link. This is a deterministic success path and directly matches the expected semantic result.

RoyScript’s command-palette button opened immediately over the active editor and exposed grouped Format, Block, List, Insert, Table, Edit, and View commands, together with their declared shortcuts. Typing `Heading 2` reduced the result set to a single keyboard-selectable command without losing the document selection behind the palette. This opening and filtering behavior matches the LexKit reference pattern; execution and restoration are the remaining steps in this controlled loop.

**Reproduced reliability defect — palette execution after selected link:** pressing Enter on the single filtered Heading 2 command dismissed the palette and returned focus to the editor, but the selected linked word `alpha` was removed. The remaining source paragraph was split into two separate Heading 2 blocks (`Audit ` and ` beta gamma`), with no anchor remaining in the DOM. The editor did not crash and kept a collapsed caret, but this is destructive and non-deterministic relative to the user intent. It is a high-priority comparison and source-inspection item; no production change is being made during the audit.

One native Undo restored the link and its text as a single Heading 2 paragraph, showing that history can recover this particular destructive palette action. A separate collapsed-caret setup inside the unlinked `Third block for insertion` paragraph was then verified so the next command-palette probe can distinguish general palette behavior from the selected-inline-node failure. An initial DOM helper assumed a direct text child and failed harmlessly; the corrected deepest-text-node setup succeeded and did not alter document state.

In that isolated setup, the command palette again opened without visual delay and accepted the `Heading 1` query. The filter reduced exactly to the expected large-heading command while the underlying toolbar correctly reported the source block as Paragraph. The next benchmark action is the keyboard execution itself; the fixture remains intentionally recoverable through native history.

**Reproduced reliability defect — palette execution at a collapsed caret:** executing the isolated Heading 1 command dismissed the palette and retained editable focus, but incorrectly split the one source paragraph at its caret position. `Third block for insertion` became two consecutive Heading 1 blocks — `Third` and `block for insertion` — rather than one transformed Heading 1 block. This confirms the prior selected-link symptom is not limited to links: command-palette block transformations are incorrectly segmenting the active paragraph. This is high-priority because it creates structural changes from a simple deterministic command.

Native Undo then merged the two Heading 1 fragments back into a single Heading 1, but did **not** restore the original Paragraph block type. Consequently, history only partially reversed the palette operation. The text was recoverable, yet the document’s semantic structure remained changed. This turns the palette fault into a coupled history-integrity issue rather than a cosmetic conversion defect.

RoyScript’s image control opened a compact two-step media surface immediately: the trigger exposed explicit `From URL` and `Upload File` choices, and the URL path opened a modal with separate Image URL and optional Alt Text inputs plus Cancel and Insert Image actions. This establishes that the insertion affordance, accessible fields, and dialog focus path are present. No remote URL or file was submitted during the audit, preserving the user’s network constraint and separating availability from remote-image loading reliability.

Selecting Cancel dismissed the URL-image dialog cleanly with no document mutation, navigation, or visible error state. The editor and existing audit fixture remained rendered and accessible after closure.

**Observed behavior requiring product decision:** activating RoyScript’s Insert HTML Embed toolbar button did not open a configuration dialog. It immediately inserted a default editable HTML block at the active caret, containing a prefilled `<div>` template and a Preview action. The insertion did not crash and the new block was editable, but the toolbar click itself mutated the document before the user chose any HTML. This differs from the user-intent-preserving image path and should be classified during the final hardening backlog as either an intentional quick-insert contract requiring clearer affordance or an unwanted mutation requiring a modal/confirmation path.

One native Undo removed the automatically inserted HTML block and returned the rendered document to its preceding text/table structure without a browser-visible error. This verifies basic recoverability for the quick-insert path, while preserving the earlier distinction that the initial unintended mutation itself remains a user-intent concern.

### Audit-fixture cleanup

The temporary editable workspace tab was restored to its pre-audit content, `alpha b`, after the controlled interactions. Its rendered document now contains one normal paragraph, reports seven characters and two words in the status bar, and retains the ordinary editable-tab toolbar state. No production code or user-facing setting was changed during this evidence-gathering pass.

## Source-level diagnosis of the command-palette defect

The two destructive command-palette reproductions have a direct, source-supported mechanism. In RoyScript’s `CommandPalette.tsx`, opening the palette immediately moves browser focus into the search input. When a command is activated, the component calls `cmd.action()` first and only then calls `onClose()`; neither its keyboard path nor its pointer path captures the prior Lexical range selection, refocuses the editor, or restores that range before dispatch.

RoyScript’s `commands.ts` adds no protection at the adapter boundary: `commandsToCommandPaletteItems()` binds every palette item directly to the live command object. The formatting command itself subsequently reads Lexical’s *current* selection inside its update transaction. The inspected upstream `BlockFormatExtension` follows that same live-selection approach through `$getSelection()` and `$setBlocksType(...)`, rather than accepting an explicit saved selection. A palette backed by a focused text input can therefore dispatch a block conversion against a selection that has changed, collapsed, or no longer represents the user’s original block. That mechanism matches both observed outcomes: splitting a normal paragraph at a collapsed caret and removing a selected linked inline span while splitting the remaining text.

The inspected checked-out LexKit application template also lacks an explicit selection snapshot or `editor.focus()` restoration around palette command dispatch. Accordingly, this must **not** be described as a simple RoyScript workspace-persistence defect. The public LexKit demo did not reproduce destructive behavior in the single successful palette run, but its template lineage shares the same structural risk. RoyScript has one additional material divergence: its palette is rendered through `createPortal(document.body)`, whereas the checked-out reference template renders it in its normal component tree. That DOM/focus difference is a credible contributing factor, but it is not yet proven as the sole cause.

RoyScript also consumes the published `@lexkit/editor` package at `^0.1.0`, while the local LexKit application uses a workspace package from the cloned source tree. This is a second, bounded version-drift risk that must be resolved by inspecting the exact installed runtime before any corrective implementation is approved. The hardening plan should therefore treat selection preservation as the immediate safeguard, portal behavior and package parity as validation tracks, and workspace tab persistence as a separate regression boundary rather than mutate unrelated mode or tab behavior.

### Fresh direct-control parity check — 2026-08-18 UTC
After restarting the public LexKit demo from its stock document, a collapsed caret was placed at the exact start of the explanatory paragraph (`LexKit is a modern…`). Its direct Paragraph chooser was opened and the actual **Heading 1** option was selected. LexKit converted that same paragraph into exactly one `h1` with the complete original text and exposed no empty preceding or following sibling paragraph in the accessible DOM. This establishes the intended direct-control behavior for the start-of-block boundary. The RoyScript correction must therefore preserve the same one-block outcome for an equivalent Command Palette command, while leaving normal direct toolbar behavior out of scope unless a separate reproducible divergence is found.
