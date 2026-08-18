# Final LexKit-versus-RoyScript Editor Reliability Stress Audit

**Status:** Active audit. No production behavior or styling changes are authorized by this document.

## Clean baseline

On 18 August 2026, the browser’s all-time history, cookies/site data, cached files, and downloads were deleted before either editor was loaded for this audit. RoyScript was then opened at `http://127.0.0.1:3000/` and presented its clean initial state: one empty tab, a single paragraph, `Ln 1, Col 1`, `Chars 0, Words 0`, and no retained workspace content.

## Test matrix

| Family | Core flows | Stress or edge condition | Evidence to record |
|---|---|---|---|
| Authoring and selections | Type, replace, paste, paragraphs, cross-block selection, repeat spaces | Long text and rapid selection/edit cycles | Text preservation, caret landing, status synchronization |
| Inline and block formatting | Bold, italic, underline, strike, inline code, headings, paragraph, quote, code block, lists | Repeated toggles, collapsed and selected ranges, start/end block positions | Single predictable transform and correct toolbar state |
| Links and focus | Insert, edit, remove, linked selection, palette and toolbar actions | Palette focus transfer and Undo/Redo | Link persistence and selection ownership |
| Media and structural controls | Image insertion, node selection, exposed alignment/resizing/caption/removal controls, rules, tables | Repeated commands and boundaries around media | Presence/absence of parity features and stable node targeting |
| Commands and shortcuts | Toolbar, block selector, command palette, keyboard shortcuts, Escape/outside click | Rapid open-close/repeat execution | One action per intent, no stuck overlay or focus loss |
| History and tabs | Undo/Redo chains, return after tab switch, new/close tab behavior | Multi-step structural changes and large text | Exact visible-history order and no stale overwrite |
| Input caret styling | Command Palette and link-related inputs in both products | Light/dark themes where exposed | Computed `caret-color`, focus behavior, and visual comparison |
| Console health | Every test family | Fresh session after each high-risk group | No new reproducible browser errors or visible failure states |

## Guardrails

The audit will compare only functions each editor currently exposes. RoyScript-specific Practice, Exam, Just Look, scanner, Settings, and multi-tab behavior are not to be redesigned or altered in this pass. Any confirmed discrepancy will be recorded with a reproducible sequence and source-level hypothesis; no correction will be applied without separate approval.

## Early observations

| Test | Result | Classification |
|---|---|---|
| RoyScript fresh initialization after all-time browser reset | One empty workspace tab, one empty paragraph, and zeroed status metrics loaded without retained content. | Baseline confirmed |
| LexKit fresh initialization after the same reset | The public reference loaded its demonstration editor with the expected toolbar, command-palette entry point, text, block, list, table, image, HTML embed, history, and theme controls. | Baseline confirmed |
| LexKit Command Palette input | The palette opened immediately from its toolbar entry point and received focus. Computed input `caret-color` and foreground color were both `rgb(237, 237, 237)` on LexKit’s dark reference surface. | Reference styling baseline |
| LexKit palette closure and editor return | Pressing Escape closed the palette without leaving a visible overlay; the editor could immediately receive focus again for the next operation. | Parity baseline for closure/focus handoff |

**Audit note:** LexKit renders visible heading text in an inline span inside the block node. Subsequent scripted selection checks will target that nested text node; this is a test-fixture detail, not a product observation.

**Reference-session recovery:** A scripted selection followed by the toolbar link activation caused the automation click to time out, after which the browser control session became temporarily unavailable. Reloading `https://lexkit.dev/` restored the unmodified reference editor. This automation interruption is not recorded as a LexKit product defect and the link-input comparison will be retried by a separate, less invasive path.

| RoyScript Command Palette opening | From a freshly cleared profile and empty workspace, RoyScript’s palette opened once, rendered its complete command inventory, and focused the search field without a visible error. | Measurement pending |

| Command Palette input caret | **Confirmed style gap.** RoyScript’s focused palette input computed to `caret-color: rgb(59, 130, 246)` while its text was `rgb(15, 23, 42)`. LexKit’s equivalent dark-reference palette used its text color for the caret (`rgb(237, 237, 237)`). Source inspection shows RoyScript globally forces this blue caret on every `input` and `textarea` using `!important`, overriding the component’s inherited foreground token. | Confirmed gap — styling only |

| Escape after transient editor dialog | **Confirmed keyboard-routing defect.** Closing the custom Insert Link dialog with Escape, in a second controlled attempt, also opened the Settings/Appearance pane. The same unexpected Settings transition occurred after closing the Command Palette. This is independent of dialog contents and means Escape is leaking to a broader Workspace shortcut handler after modal dismissal. | Confirmed functional gap |

**Source confirmation:** `Workspace.tsx` registers a capture-phase global key handler. Outside Practice/Exam it explicitly treats `isCtrlK || isEscape` as the same shortcut and toggles Settings. This explains the repeated Escape behavior and also means the documented `Ctrl+K` Command Palette shortcut is intercepted by Workspace instead of opening the palette. This is a reproducible reliability defect, not a styling preference; corrective design must preserve Escape ownership for transient overlays and reserve Ctrl+K for Command Palette.

| RoyScript Ctrl+K Command Palette shortcut | **Failed reproducibly.** From a neutral fresh editor state, Ctrl+K opened Settings/Appearance rather than the Command Palette. The toolbar button remains a functioning alternative entry point but does not satisfy the documented shortcut contract. | Confirmed functional gap |

| RoyScript link URL entry | The toolbar opens a custom modal dialog containing an autofocus `#link-url` input, rather than a browser-native prompt. It is focused on open and computed to the same forced blue caret (`rgb(59, 130, 246)`) against dark text (`rgb(15, 23, 42)`). | **Confirmed same shared style gap** |

**Caret diagnosis:** Both reported caret instances derive from the same global `input, textarea { caret-color: #3b82f6 !important; }` rule in `client/src/index.css`. The local LexKit LinkExtension source uses a non-theme-specific prompt path, while RoyScript’s wrapper provides a custom URL dialog. Therefore the right corrective scope, if approved, is the narrowly scoped RoyScript global caret override—not an editor-command or link-behavior change.

| Authoring baseline fixture | A three-line fixture rendered with all text preserved and status values updating. The automation’s multiline input route materialized five paragraph positions (two visibly blank) and `Ln 5`; this route is not equivalent to a user pressing Enter and will be rechecked with discrete keystrokes before any defect classification. | Inconclusive automation artifact |

**Automation note:** The browser controller translated its `Control+A` command to `Meta+A` and inserted the character `A` rather than selecting the editor contents. This is a remote-input mapping limitation, not a RoyScript defect. For the remaining selection-sensitive checks, the audit uses a native DOM Range, confirmed to select only `alpha` while the Lexical editable surface remains focused.

**Further selection limitation:** Although the native DOM Range updates the visible selection counter, clicking Bold did not modify Lexical text formatting (`font-weight` remained `400`). This shows the browser automation’s DOM selection is not always a valid Lexical model selection. It is therefore unsuitable for classifying selected-text formatting behavior; subsequent inline tests will use browser-native keyboard selection and real pointer interaction where available. This is not recorded as a product defect.

| Native pointer caret and navigation | A real click placed the editor caret in the first paragraph (`Ln 1, Col 9`); End then moved it to the exact paragraph boundary (`Ln 1, Col 17`) without changing content or opening an overlay. | Passed |

| Native keyboard selection | Two genuine Shift+Left keystrokes from the first-paragraph end selected exactly two characters (`Ln 1, Col 15`, `2 chars selected`) and exposed the contextual formatting strip without moving focus, changing text, or opening Settings. | Passed |

| Contextual Bold on selected text | The contextual Bold command transformed only the keyboard-selected `ma` into a lexical `<strong class="lexkit-text-bold">` node at computed `font-weight: 700`; surrounding text and the five currently tracked paragraph positions were preserved. | Passed |

| Stacked inline command selection ownership | The selected range remained visibly selected (`2 chars selected`, `Ln 1, Col 15`) after contextual Italic, Underline, and Strikethrough actions, with no focus loss, content deletion, overlay, or workspace navigation. Bold/italic/underline render correctly. **Defect reproduced:** the combined underline-plus-strikethrough state creates `lexkit-text-underlineStrikethrough`, which does not have the expected visual decoration (`text-decoration: none`). Source inspection identifies the malformed combined class token in `client/src/components/lexkit/theme.ts:31`; the actual standalone style uses `lexkit-text-strikethrough` in `styles.css:631`. | Reproducible P1 defect |

| Inline history integrity | One toolbar Undo removed only the latest defective strikethrough transition. The selected text returned to the exact prior `lexkit-text-bold lexkit-text-italic lexkit-text-underline` state with computed underline decoration, preserving selection and surrounding content. | Passed |

| Inline Code with existing styles | Contextual Inline Code wrapped only the maintained selected `ma` in a lexical `<code>` node and retained the prior bold/code/italic/underline format tokens on its nested text node. No text was lost and no extra paragraph was created. | Passed |

| Structural-test isolation | A new disposable workspace tab opened cleanly and accepted the single `structural test line` fixture as one paragraph (`Ln 1, Col 21`, `Chars 20, Words 3`). This keeps block-format, list, indentation, and history checks isolated from the inline-format stress document. | Passed |

| Direct Heading 1 conversion | The direct block-format chooser converted the isolated paragraph to exactly one `<h1>` block with the entire source text preserved and no empty sibling paragraph. The visible selector updated to Heading 1 and the caret remained at `Ln 1, Col 21`. | Passed |

| Direct block history integrity | One toolbar Undo restored exactly one paragraph (`Chars 20, Words 3`) with no additional block. One toolbar Redo restored exactly one Heading 1 (`Chars 22, Words 4` due to exported heading markers). | Passed |

| Bullet-list conversion | The Heading 1 fixture converted to one semantic `<ul><li>` containing the exact text. The selector reset to Paragraph as expected for a list node, and no stray block was introduced. | Passed |

| List indentation | One Indent List action transformed the active item into a semantic nested `<ul><li>` hierarchy. One Outdent List action restored the exact original one-level `<ul><li>` structure, preserving text and caret. | Passed |

| Numbered-list transition | The active one-level bullet converted cleanly to exactly one semantic `<ol><li>`, with correct visible ordinal marker and no duplicate content or sibling block. | Passed |

| Code-block transition | The active numbered-list item converted to one semantic code block with the complete original text preserved and no duplicate list or paragraph sibling. | Passed |

| Quote transition | The code-block fixture converted to exactly one semantic `<blockquote>` with its original content and a stable active caret. | Passed |

| Horizontal-rule insertion | Inserting a horizontal rule after the quote created the expected separator plus a new editable quote-positioned block beneath it. The original quote was preserved; no content was lost. | Passed |

| Table configuration dialog | The table action opened a focused, dismissible configuration dialog with editable rows, columns, header toggle, cancel, and insert controls. Both values accepted the compact `2 × 2` test configuration without visual or keyboard failure. | Passed |

| Table insertion and active-cell controls | Inserting the configuration created one semantic `2 × 2` table with four editable cell paragraphs and preserved the existing quote and rule. Selecting a cell exposed the expected row-movement controls, including up/down actions, without destabilizing the document. Native text insertion into the focused first cell was accepted without document-wide replacement. The exposed down-row control closed cleanly after activation and retained all table data and document structure; the identical table appearance is expected for a two-row headed table with only one populated row. | Passed |

| Image-insertion entry paths | The image trigger exposed both URL and upload routes. The URL route opened a focused, dismissible dialog with explicit image-URL and optional alt-text inputs plus cancel/insert controls. The controlled lightweight source inserted as an image node without corrupting the surrounding table or quote. Selecting it exposed alignment (left/center/right) and caption controls. Left, center, and right alignment each moved the same selected node to the expected position and preserved the node, its controls, surrounding content, and the editor’s selected-media state. The caption editor accepted and persisted the controlled caption without altering the image, table, or quote. | Passed |
| Selected-text link preparation | The browser automation layer maps `Control` word-selection gestures to a platform `Meta` gesture, so selection highlighting cannot be treated as evidence by itself. The audit will use a precise DOM-range setup only to establish the selected-text fixture, then exercise RoyScript’s normal visible link dialog and inspect the resulting semantic link node. | Test-method note |
| Selected-text Insert Link — scripted route | A browser-scripted selection followed by the primary toolbar action did not reveal the expected dialog. Because that injected selection was not a reliable Lexical model selection, this observation is retained only as a test-method limitation. | Inconclusive automation artifact |
| Selected-text Insert Link — native route | A real pointer caret followed by `End` and genuine keyboard-expanded selection opened the contextual **Insert Link** dialog. Entering `https://example.com/reliability` retained the selected text, created a semantic `<a>` node, and correctly exposed **Remove Link**. | Passed |
| Link removal and history | The contextual **Remove Link** action returned the selected range to plain text without deleting it. One toolbar Undo restored the exact `<a href="https://example.com/reliability">` node and retained the selected range. | Passed |
| HTML embed insertion and preview | The HTML embed command inserted one editable custom-HTML node with its source textarea and preview action. Preview rendered the expected source as an isolated block; Edit returned cleanly to source mode without affecting the document around it. | Passed |
| HTML embed source edit — automated route | The browser controller reported a textarea replacement, but the node’s rendered source retained its original value after the automated handoff. This is not classified as a product defect because the same controller has already shown selection/input mismatches with controlled Lexical nodes. Manual source editing remains a targeted user-verification item. | Inconclusive automation artifact |
| Left-edge node position control | The selected embed exposed the requested left-edge move-up/move-down controls. Activating move-up reordered the embed ahead of the adjacent blank paragraph without data loss, deselection instability, or an overlay failure. | Passed |
| Large plain-text document | A focused isolated editor accepted one controlled 5,000-word plain-text insertion (47,249 characters) and immediately rendered the populated document with synchronized status values (`Chars 47249`, `Words 5000`). The editor remained responsive enough to expose the full toolbar and status controls after rendering. | Passed |
| Large-document history | One toolbar Undo returned the large-text tab to exactly one empty paragraph (`Chars 0`, `Words 0`). One toolbar Redo restored the full 47,249-character, 5,000-word fixture as one operation without a duplicate, blank sibling, or visible error. | Passed |

| Keyboard formatting shortcut probe | The browser controller translated `Control+B` into `Meta+B`; rather than exercising RoyScript’s documented Windows-style `Ctrl+B` handler, it replaced the active selection with the character `B`. This is the same controller-level modifier mapping limitation observed earlier with `Control+A`, not evidence of a RoyScript shortcut defect. Toolbar and contextual Bold commands have already passed on the same genuine selection path; native Windows shortcut verification remains a manual-validation item. | Test-method limitation |

| Command Palette table command outside a table | **Defect reproduced.** The palette lists `Insert Row Above` while the selection is an ordinary paragraph. Pressing Enter closes the palette but leaks the activation Enter into the editor, creating a new empty paragraph (`Ln 2, Col 1`) rather than remaining a no-op. No visible error appeared, but a context-invalid command must be hidden or disabled and its activation must never mutate document structure. | Reproducible P1 functional gap |
| LexKit reference control: table command outside a table | LexKit exposes the same table-row command in its palette when ordinary document text is active. Under the same focused filter-and-Enter path, its palette closed and the pre-existing reference document showed no visible extra paragraph or structural mutation. RoyScript therefore should retain the command if desired but must match this safe no-op behavior. Source: `https://lexkit.dev/` live reference, 18 August 2026. | Reference control passed |
| Command Palette self-referential command | **Defect reproduced.** On an ordinary one-paragraph document, filtering `Show Command Palette` and pressing Enter closed the palette but leaked the activation Enter into the editor, creating a blank second paragraph (`Ln 2, Col 1`). The result matches the context-invalid table-command failure, indicating a shared palette activation-event boundary defect rather than command-specific behavior. | Reproducible P1 functional gap |

| Command Palette table command in a valid context | After inserting a 3-column table through the palette and focusing a real data cell, `Insert Row Above` created exactly one additional 3-cell row. The original paragraph, table, and expected editable paragraph below the table remained intact, with no visible error. The table command adapter is therefore working when the current selection is valid; only the palette eligibility and activation boundary outside valid context need correction. | Passed |
| Command Palette `Insert Row Below` in a valid context | With a real table-cell selection, `Insert Row Below` expanded the table from four to five rows while preserving the expected three-column shape, the original text paragraph, and the trailing editable block. No overlay, duplicated paragraph, or visible error appeared. | Passed |
| Command Palette `Insert Column Left` in a valid context | With the same valid cell selection, `Insert Column Left` expanded every table row from three to four cells. The table remained editable and structurally uniform, while surrounding document blocks and the status bar remained stable. | Passed |
| Command Palette `Insert Column Right` in a valid context | With a valid table-cell selection, `Insert Column Right` expanded the same table from four to five columns across all five rows. The document retained its original text and trailing editable paragraph; no stale overlay or visible error occurred. | Passed |
| Command Palette `Delete Row` in a valid context | With a data cell selected, `Delete Row` removed only the active row, leaving the header, remaining three data rows, five-column geometry, surrounding text, and trailing editable paragraph intact. | Passed |
| Command Palette `Delete Column` in a valid context | With a data cell selected, `Delete Column` reduced the same table from five to four columns across the header and remaining data rows. The source paragraph, table structure, and trailing editable paragraph stayed intact. | Passed |

| Image-node removal and one-step history | In an isolated fresh workspace, a deterministic local image was inserted through the exposed URL dialog, selected, and removed with the standard `Delete` key. The image disappeared cleanly, leaving only the expected editable paragraphs and no overlay failure or visible error. One toolbar Undo restored the selected image, its alignment controls, and its source/alt metadata in one history step. Image alignment, caption editing, and left-edge move controls had already passed earlier in the matrix. | Passed |

| `components.tsx` surface review | The local override file contains only the reusable Select, Dropdown, and Dialog shells; it owns no image-node, caption, alignment, movement, or deletion behavior. The observed media controls are supplied by the installed LexKit editor surface. No additional RoyScript-specific editor reliability gap was found in this file. The custom Dialog confirms the broader Escape routing concern already recorded below, because it registers its own close handler while Workspace also globally captures Escape. | No additional gap |

## Final coverage conclusion

The final matrix now covers native pointer caret placement; keyboard selection and contextual inline formatting; structural block/list conversions; direct and palette-mediated history; link creation/removal; horizontal rules; tables and all valid-context row/column operations; image insertion, alignment, captions, positioning, keyboard removal, and history; HTML embeds; a 47,249-character / 5,000-word paste plus one-step Undo/Redo; and Command Palette selection restoration. No uncaught browser exception or visible error state was observed during the final image removal cycle. Development-console warnings from Chrome's contenteditable-in-flex advisory and Lexical's deferred `updateEditorSync` advisory remain non-user-visible and are not counted as a reproduced functional failure in this audit.

Four reproducible P1 gaps remain approval-gated: the global blue caret override, the Ctrl+K/Escape routing collision, palette Enter propagation after a command closes, and malformed underline-plus-strikethrough styling. No production source was modified by this audit entry.
