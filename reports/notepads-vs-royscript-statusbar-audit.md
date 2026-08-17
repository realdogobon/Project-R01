# Notepads vs RoyScript Status-Bar Audit

**Prepared:** 17 August 2026  
**Scope:** Source-led comparison of the cloned Notepads status bar and RoyScript’s current live workspace status bar. This is an audit only. **No application code, styling, configuration, saved workspace content, Git commit, or project checkpoint was changed.**

## Executive finding

Notepads treats the status bar as a compact **desktop-editor command surface**. Most visible cells are context-aware click targets: they open a flyout, a contextual menu, or a focused editor action. RoyScript currently treats its footer as a **read-only contextual dashboard**. It does a good job exposing typing-oriented information that Notepads does not show—document character/word counts and exam WPM—but its zoom, line-ending, and encoding fields are presentational text rather than controls. The two products therefore share visual vocabulary, but they do not yet share interaction depth. [1] [2] [3]

The most important functional finding is unrelated to visual polish: RoyScript’s footer label `Col` is **not calculating the caret’s column**. It currently renders the document-wide count of non-whitespace characters. The inspected live document showed `Chars 41` and `Col 36`, and the source uses `charsNoSpaces` for that column field. This is a semantic mismatch, not merely a styling difference. [3] [4]

> **Audit correction:** the inspected Notepads status-bar markup and controller do **not** contain Tab/Space indentation-mode or indentation-size controls. Those capabilities should not be presented as existing Notepads status-bar parity targets without a separate source location.

## Evidence and method

The review covered the complete Notepads status-bar XAML grid, its controller-side lifecycle and command handlers, RoyScript’s `Workspace.tsx` state/rendering code, and the live RoyScript preview. The audit does not infer behavior from screenshots alone: interactive claims below are tied to click handlers, contextual flyouts, and state-update code. [1] [2] [3]

| Evidence set | What it establishes |
|---|---|
| Notepads markup | Cell order, geometry, hover treatment, tap affordances, menu and flyout composition. |
| Notepads controller | State updates, menu routing, zoom range, encoding population, line-ending mutation, and editor-focus restoration. |
| RoyScript workspace source | Footer fields, View-menu actions, visibility toggle, text-stat calculation, zoom range, and interaction affordances. |
| RoyScript live preview | Actual field order and values; 32 px footer height; Segoe UI Variable 12 px type; 16 px horizontal container padding; zero interactive descendants in the footer. |

## Surface-by-surface comparison

| Surface | Notepads | RoyScript today | Audit conclusion |
|---|---|---|---|
| **Status-bar lifecycle** | User setting can show or hide a lazily created bar; the bar is refreshed when the selected editor changes. | A View-menu checkbox shows or hides the footer through local component state. | Both support visibility control. Notepads is document/application-setting driven; RoyScript is session/component-state driven. [2] [3] |
| **External file-state indicator** | Leading icon appears for an externally modified file or a renamed/moved/deleted file. When appropriate, it exposes reload-from-disk. | Not present. | Expected for a browser-first workspace with no disk-file watch layer, but it is a deliberate desktop-editor capability gap. [1] [2] |
| **Path / file identity** | Flexible-width path cell displays the editing path or a placeholder; it opens commands for reload, copy path, open containing folder, and rename. | Not present in the footer. Tab identity is shown elsewhere in the workspace UI. | Notepads prioritizes file-system workflows; RoyScript prioritizes workspace-tab workflows. [1] [2] [3] |
| **Unsaved-change indicator** | Separate modification cell appears only when text is changed. Its menu offers preview changes and revert all changes. | No dedicated footer dirty-state cell. A small dirty dot exists on Task View cards, not in the status bar. | RoyScript has the state elsewhere, but not a status-bar command surface for it. [1] [2] [3] |
| **Cursor position** | `Ln/Col` is live cursor data. Clicking it opens the editor’s Go To control. | Shows `Ln …, Col …`, but `Col` is wired to total non-whitespace characters, not selection/caret column. The live `Col 36` matched the document’s 36 non-whitespace characters. | RoyScript needs a real lexical selection/caret calculation before it can claim native line/column parity. [2] [3] [4] |
| **Selection information** | When text is selected, the same line/column cell adds the selected-character count and singular/plural wording. | Shows document-wide `Chars` and `Words`; no selection count. | RoyScript offers useful writing metrics but does not expose selection context. These are complementary, not substitutes. [2] [3] |
| **Document metrics** | No document-wide character or word counter was found in the inspected status-bar implementation. | Always shows total characters including spaces and total words. | A genuine RoyScript advantage for typing training and writing feedback. [1] [2] [3] |
| **Exam metric** | No equivalent. | During running/countdown exam states, adds a live WPM field. | A purpose-built RoyScript advantage; this should remain distinct from any Notepads-inspired desktop polish. [3] |
| **Zoom entry point** | Percentage cell is clickable. It opens a borderless flyout with Zoom Out, a slider, Zoom In, 10% and 500% end labels, live percentage, and Restore Default Zoom. | `Zoom 100%` is display-only. The View menu separately has Zoom In, Zoom Out, and Restore Default Zoom. | RoyScript supports zoom commands, but not status-bar-native zoom control. [1] [2] [3] [4] |
| **Zoom range and increments** | Slider accepts **10–500%**. Buttons move to the next/previous 10% boundary; reset returns to 100%. | View-menu operations change zoom by **10%**, clamp at **20–300%**, and reset to 100%. | Both have a reset and 10% command steps. Notepads adds fast continuous direct access and a wider range. [1] [2] [3] |
| **Line ending** | Clickable field opens Windows (CRLF), Macintosh (CR), and Unix (LF); selection updates the document’s line-ending state. | `Windows (CRLF)` is a non-clickable static label. | RoyScript currently communicates a fixed default, not an editable document property. [1] [2] [3] [4] |
| **Encoding** | Clickable field opens nested **Reopen with Encoding** and **Save with Encoding** menus. It includes auto-detect, system/culture ANSI candidates, UTF-8, UTF-8 BOM, UTF-16 LE BOM, UTF-16 BE BOM, and additional supported ANSI encodings. | `UTF-8` is a non-clickable static label. | This is a major operational difference. Encoding mutation/reopen semantics have not been implemented in RoyScript’s browser workspace. [1] [2] [3] [4] |
| **Additional app state** | A trailing shadow-window indicator appears only in secondary-instance conditions and explains that state on activation. | No equivalent. | Not applicable to the current web deployment. [1] [2] |
| **Block type** | Not in the inspected status bar. | `Paragraph` is exposed in the editor toolbar, above—not inside—the footer. | RoyScript provides richer text-format context, but it should be documented as a toolbar feature rather than status-bar parity. [3] [4] |
| **Tab count** | Not in the inspected status bar. | `6 tabs` was shown in the toolbar’s workspace-control area, above—not inside—the footer. | Useful workspace context, but architecturally separate from the footer. [3] [4] |
| **Indentation mode / size** | Not present in the inspected status-bar XAML/controller. | Not present in the footer. | There is no source evidence for a Notepads status-bar indentation advantage in the audited version. |

## Interaction model and user feedback

The difference in interaction model is clear in the code. Notepads assigns a hand cursor to every status cell reviewed, uses either a low-reveal hover background or a restrained opacity shift, and explicitly routes taps to the matching command. Its borderless presenters preserve a single native Windows surface rather than creating disconnected popovers. When a menu closes, focus returns to the selected text editor. [1] [2]

RoyScript’s footer has no buttons, links, inputs, role-button elements, or focusable descendants in the live DOM. The observed direct cells use `cursor-default`; source markup attaches no click handlers to the footer labels. This is intentional display-only architecture, not an inaccessible menu that failed to load. Zoom remains available through the main View menu, and the complete footer can be hidden from that menu. [3] [4]

| Interaction detail | Notepads | RoyScript | Practical effect |
|---|---|---|---|
| Hover affordance | Low Windows reveal background for most cells; path uses a subtle opacity transition. | No status-cell hover affordance. | Notepads teaches users that status information is actionable; RoyScript currently teaches that it is informational. |
| Focus loop | Returns focus to editor after a status flyout closes. | No status flyouts to close. | Important if RoyScript later adds status-bar menus: focus restoration should be designed in from the start. |
| Go To | Click `Ln/Col` to open the editor’s Go To control. | A separate Edit-menu `Go To…` prompt exists, but it currently collects a number without a visible navigation action in the inspected handler. | Even aside from the footer, this should be treated as a separate functional audit item if Go To becomes a parity target. [2] [3] |
| Error/no-op treatment | Command availability varies by file state; for example, re-open with encoding is disabled where inappropriate. | Display fields cannot execute an invalid action. | Any future RoyScript controls must preserve the project requirement for silent, non-disruptive failure paths. |

## Visual system: typography, spacing, and layout

Notepads is compact in the classic Windows-editor sense. Its shared status text style is **25 px high**, **11 px normal-weight**, and padded **8 px horizontally / 4 px vertically**. It uses the Windows system medium-high foreground color, with a flexible path column and six trailing auto-size columns after the leading state cell. The geometry concentrates document identity and state into one narrow desktop strip. [1]

RoyScript is deliberately roomier. Its live footer measured **32 px high**, uses a **Segoe UI Variable / Segoe UI system stack at 12 px**, normal letter spacing, 16 px container-side padding, and a 1 px top separator. Individual fields receive additional small internal padding and `font-medium` styling. It lays out two semantic groups with `justify-between`: live writing/exam metrics on the left and zoom/format labels on the right. [3] [4]

| Visual attribute | Notepads | RoyScript | Design interpretation |
|---|---|---|---|
| Height | 25 px | 32 px | RoyScript has roughly 28% more vertical footprint and reads more like an app dashboard than a tightly native editor strip. |
| Text | 11 px, normal, Windows system foreground brush | Segoe UI Variable/Segoe UI, 12 px, normal tracking; inner fields use medium weight | The approved RoyScript typography is Windows-aligned, but slightly larger/heavier and more spacious. |
| Horizontal padding | 8 px per shared text cell; path cell begins at 4 px | 16 px at the bar edge plus 8 px on fields | RoyScript’s groups have more breathing room. This supports clarity, but it is less 1:1 native-Notepads dense. |
| Column structure | Eight-column grid: state, flexible path, then six auto-sized state/control cells | Two flex groups: metrics left; zoom, line ending, encoding right | Notepads gives each operational status its own cell; RoyScript combines related writing metrics. |
| Hover and boundary | Per-cell Windows reveal feedback; borderless flyouts | Light top border; static cells; no footer menus | RoyScript’s static footer is visually calmer, while Notepads makes commandability discoverable. |

## Functional interpretation

RoyScript should **not** blindly copy every Notepads cell. File-system reload, full-path copy, containing-folder launch, cross-process modification warnings, and shadow-window state only make sense when the product has an Electron/Tauri or native file-document contract to support them. Adding those visuals without their corresponding data and action semantics would produce the kind of misleading UI the project has consistently avoided.

The strongest Notepads-inspired candidates are the elements that map cleanly to RoyScript’s existing workspace model: a true caret/selection position surface, an in-footer zoom flyout that reuses the existing `editorZoom` state, and—only if documents gain real per-tab encoding/line-ending metadata—interactive format controls. RoyScript’s own `Chars`, `Words`, and exam-only WPM should be retained because they serve the typing-trainer purpose better than a generic clone would.

## Recommended decision order — no implementation undertaken

| Priority | Decision to make | Why it should be decided first |
|---|---|---|
| **1** | Correct `Ln/Col` semantics and decide whether selected-character count should appear there. | The current footer labels a document aggregate as cursor position, which is more consequential than any visual mismatch. |
| **2** | Decide whether the footer remains an informational dashboard or becomes a selective command surface. | This determines hover states, pointer affordance, keyboard/focus behavior, menu architecture, and test scope. |
| **3** | If interactive, choose the smallest honest scope: begin with Zoom only, or include line ending/encoding only after those become real per-tab document properties. | Prevents display-only labels from becoming non-functional mock controls. |
| **4** | Decide visual target: preserve RoyScript’s roomier 32 px strip or adopt Notepads’ dense 25 px system. | This is a design direction decision, not an implementation detail. The current approved Segoe UI 12 px treatment can survive either choice. |
| **5** | Treat native file-state/path/shadow controls as a future desktop-packaging scope, not a web-footer redesign. | Avoids copying UI that cannot be meaningfully supported in the present runtime. |

## Verification boundary

The live preview confirmed RoyScript’s visible fields (`Ln 1, Col 36`, `Chars 41, Words 6`, `Zoom 100%`, `Windows (CRLF)`, and `UTF-8`), style measurements, and absence of footer-native interactive controls. The full Notepads feature inventory is source verified. I did not alter the sealed exam tab, create a tab, change a setting, or invoke a workspace action during this audit.

## References

[1]: https://github.com/0x7c13/Notepads/blob/master/src/Notepads/Views/MainPage/NotepadsMainPage.xaml "Notepads status-bar markup"

[2]: https://github.com/0x7c13/Notepads/blob/master/src/Notepads/Views/MainPage/NotepadsMainPage.StatusBar.cs "Notepads status-bar controller"

[3]: https://github.com/realdogobon/Project-R01/blob/main/client/src/pages/Workspace.tsx "RoyScript Workspace source"

[4]: https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer/ "RoyScript live preview observed during the audit"
