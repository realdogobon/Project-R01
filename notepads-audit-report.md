# Notepads UWA Repository Audit for RoyScript TSR

**Audit type:** Read-only repository and design-pattern review  
**Audited repository:** [0x7c13/Notepads](https://github.com/0x7c13/Notepads)  
**Audited snapshot:** `master` at commit `6ec270c134b115d6bff38bc3966784e8893a419c`  
**RoyScript scope:** React 19, Lexical/LexKit, browser-hosted typing trainer and workspace  
**Code changes made to RoyScript:** None

> **Licensing note:** I am an AI, not a lawyer. The licensing discussion below is a practical engineering assessment, not formal legal advice. A qualified attorney should review any distribution plan that copies source code, assets, or third-party dependencies.

## Executive assessment

Notepads is a useful **product-pattern reference** for RoyScript, but it is not a drop-in implementation source. The repository is a Windows UWP application written in C# and XAML, with a native text editor, a custom control library, Windows storage and activation services, and WinUI/Fluent visual materials. Its strongest transferable ideas are the tab/document model, session restoration, command-oriented keyboard behavior, inline find/replace, persistent editor metadata, Markdown split preview, side-by-side diff preview, and an interactive status bar. These concepts can be recreated in React and Lexical without importing the Windows-specific implementation.

The recommended approach is therefore **behavioral recreation, not 1:1 source transplantation**. RoyScript should preserve its existing visual language and current scanner/workspace UI. If the user approves a Notepads-inspired feature set later, implementation should begin with state and command infrastructure, then add narrowly scoped workspace affordances. No Notepads feature should be added during this audit.

## 1. Repository and license findings

The README describes Notepads as a modern, lightweight Windows text editor with a minimalist design. Its documented feature set includes Fluent design, a built-in tab system, command-line launch, multiline handwriting support, Markdown live preview, a diff viewer, session snapshots, and multiple instances. The README also documents the primary shortcuts for tabs, zoom, text-flow direction, Markdown preview, and diff preview [1].

The repository’s `LICENSE.txt` grants broad permission to copy, modify, publish, distribute, sublicense, and sell the software, subject to retaining the copyright and permission notices in copies or substantial portions. It also includes the standard “as is” warranty disclaimer [2]. This is an MIT-style license grant and is generally compatible with recreating behavior in a separate application.

| Reuse question | Audit conclusion | Engineering implication |
|---|---|---|
| Can RoyScript recreate the documented behaviors? | Yes, as independent React/Lexical behavior. | Model the interaction contract and state, not the UWP classes. |
| Can RoyScript copy substantial portions of Notepads source code? | The repository license permits this subject to notice preservation, but this is not the recommended path. | Avoid copying C#/XAML code into a different architecture; preserve attribution if any source is reused. |
| Can RoyScript copy the app icon, screenshots, or branding? | Not automatically. The README credits separate icon designers and contributors, and third-party assets may have separate rights [1]. | Do not reuse the Notepads name, logo, screenshots, or artwork without checking their individual rights. |
| Can RoyScript copy third-party dependency code or assets? | Not from the Notepads MIT notice alone. | Audit each dependency’s license independently before bundling or adapting it. |
| Does the MIT license guarantee legal clearance for every repository asset? | No. A repository-wide license does not remove trademark, attribution, third-party, or asset-specific questions. | Keep a provenance record for any future borrowed asset or code fragment. |

The README names Windows Community Toolkit, XAML Controls Gallery, Windows UI Library, ColorCode Universal, UTF.Unknown, DiffPlex, and Win2D as dependencies or references [1]. The application project also declares UWP, XAML behavior, JSON, encoding, DiffPlex, and Microsoft platform packages [3]. This creates a practical compatibility boundary: the **ideas** are reusable, while the exact native dependencies are not suitable for the current browser bundle.

## 2. Architecture findings

The main project targets the UWP platform, uses `AppContainerExe`, packages appx bundles for x86, x64, and ARM64, and references a separate `Notepads.Controls` UWP library [3]. The controls project contains reusable native controls including drop shadows, splitters, in-app notifications, and a custom Markdown text block. This is a layered desktop architecture rather than a web component tree.

At the application layer, startup handles normal launch, file activation, protocol activation, and command-line activation. It initializes application and theme settings, supports multiple instances through a named mutex, extends content into the Windows title bar, and reacts to application suspension [4]. The product behaviors are conceptually portable, but their implementation is not: UWP activation events, the Windows title bar, named mutexes, clipboard flush, and app suspension have no exact browser equivalent.

The main page composes an edge-to-edge shell around a `SetsView` tab strip. The shell exposes a left menu/new-tab area, a horizontal tab surface, a right overlay settings pane, and a bottom status bar. The settings pane is a right-side `SplitView` with a shadow and acrylic-backed surface [5]. This decomposition is especially relevant to RoyScript because it separates the editor viewport from tab state, contextual commands, settings, and status metadata without requiring a page-level navigation change.

The session layer serializes a versioned session object, restores all recoverable editors, reselects the previously active tab, and restores tab-strip scroll position. Per-editor metadata includes file identity, saved encoding and line ending, modification state, selection bounds, word wrapping, font zoom, horizontal and vertical scroll offsets, Markdown preview state, and diff-preview state [6] [7]. The implementation also stores backup file paths and Windows FutureAccessList tokens so that real files can be reopened after an application restart. RoyScript can reproduce the document-state portion with browser persistence, but it cannot reproduce the UWP file-token behavior exactly.

## 3. Editor and interaction patterns worth recreating

The editor command layer is the most valuable portability reference. It binds find, replace, go-to, Markdown preview, diff preview, next/previous search, and Escape behavior to keyboard commands. The state-restoration path re-applies encoding, line ending, text content, word wrapping, font zoom, selection, and scroll offsets. Markdown preview opens as a split view; diff preview temporarily disables editing and renders a comparison against the last saved snapshot [8].

The find/replace engine supports forward and backward search, case-sensitive or case-insensitive matching, whole-word matching, regular expressions, single replacement, and replace-all. It also uses the current selection as a useful search starting point when no explicit search phrase has been entered [9]. The underlying text algorithms are independent of UWP and can be implemented with Lexical editor state plus a command/context layer.

The status bar is a strong design pattern because it turns otherwise hidden document state into compact, contextual controls. Notepads exposes the file path, modification state, line and column information, zoom, line ending, and encoding. Several indicators open actions such as reload, copy path, rename, open containing folder, preview changes, revert changes, go-to, zoom, line-ending selection, and encoding selection [5] [10]. RoyScript can reproduce the metadata and command affordances, while browser file-system actions must be adapted to file handles, downloads, local persistence, or application-internal documents.

## 4. Visual and layout patterns from the screenshots

The reference screenshots show a compact, edge-to-edge editor shell rather than a centered card. The dark theme uses a restrained dark surface, a compact menu affordance, a horizontal tab strip, a new-tab action, an inline find/replace overlay, and a bottom status bar. The Markdown screenshot preserves the shell while dividing the editor and rendered preview into adjacent panes. The diff screenshot uses two aligned panes labeled “Before your changes” and “After your changes,” with strong inline backgrounds for changed content. The light-theme screenshot keeps the same shell structure and opens a right-side personalization pane.

The visual lesson is not “copy the Fluent skin.” The more durable pattern is **stable shell geometry with contextual overlays**: tabs remain available while preview/settings appear, status metadata remains visible, and secondary modes do not force the user into unrelated routes. Acrylic, native title-bar integration, Windows reveal effects, and WinUI control styling should be treated as optional visual references only. RoyScript’s existing UI constraints explicitly require preserving its current design, so these patterns are not a license to redesign the app.

## 5. Portability map for RoyScript

| Notepads capability | Portability | Recommended RoyScript interpretation |
|---|---:|---|
| Multi-document tabs with close/reorder | High | Use a stable document model keyed by tab ID, with active-tab state and explicit dirty state. |
| New document and tab keyboard shortcuts | High | Add Lexical/editor commands only after the existing shortcut map is inventoried to avoid collisions. |
| Session restore | High | Persist active tab, open documents, selection, scroll, zoom, wrap mode, and preview mode in versioned local storage or IndexedDB. |
| Unsaved-change indicator and last-saved snapshot | High | Keep a saved editor snapshot and derive dirty state from document identity/version rather than from a visual-only badge. |
| Find/replace | High | Implement as a Lexical command service with case, whole-word, regex, next/previous, replace, and replace-all modes. |
| Go-to line | High | Map line/column targets to Lexical offsets and preserve selection semantics. |
| Word wrap and zoom | High | Use existing editor layout controls; persist settings per document or workspace according to product intent. |
| Line numbers and current-line highlight | High | Implement as editor decorations or a synchronized gutter; validate large-document performance before enabling by default. |
| Markdown live preview | High, if desired | Use a web Markdown renderer in a split pane, with sanitization and a resize handle. |
| Side-by-side diff viewer | High | Use a browser diff library or a carefully isolated renderer; keep editing disabled while the diff mode is active. |
| Interactive status bar | High | Show application-relevant metadata such as destination, word/character count, line/column, mode, and save state. |
| Encoding and line-ending display | Medium | Useful for imported text files, but requires explicit browser file decoding and export policy; do not imply native filesystem parity. |
| Recent files | Medium | Recreate as browser-local recent documents or explicit handles. The exact Windows MRU mechanism is not portable. |
| Command-line launch and file activation | Medium | Approximate with drag/drop, file input, share/open URL routes, and File System Access API where supported. |
| Windows compact overlay and title-bar integration | Low | Do not attempt 1:1 parity in the browser; use existing app shell constraints. |
| Acrylic/Mica material and Windows accent integration | Low to medium | CSS blur and theme tokens can approximate the material, but not the OS composition or system accent pipeline. |
| Windows Jump List, shell context, and OS notifications | Low | Keep out of the web implementation unless a browser-appropriate alternative is explicitly designed. |
| Native multiline handwriting | Low | A browser canvas or pointer-input feature would be a new product capability, not a direct editor-port. |

## 6. Compatibility and implementation risks

The first risk is **architecture mismatch**. Notepads’ editor sits on a native rich text control and receives native selection, scrolling, focus, clipboard, file, and keyboard events. Lexical provides a different document and selection model. Any recreation must translate the behavior into Lexical commands and editor state rather than trying to imitate native control internals.

The second risk is **state persistence complexity**. Notepads restores more than text: it restores tab identity, active tab, selection, scroll offsets, zoom, wrapping, preview mode, diff mode, file metadata, and recovery information. A partial implementation that only stores text could create surprising restore behavior. RoyScript should use a versioned schema and add migration tests before persisting new editor state.

The third risk is **browser file-system variance**. Notepads can reopen files using Windows storage tokens, inspect modification times, rename files, open containing folders, and use MRU/Jump List services. Browser support varies by browser, permission state, and whether the user supplied a File System Access handle. Those behaviors must be presented honestly as browser capabilities, not as identical Windows integration.

The fourth risk is **performance**. Notepads explicitly documents a 1 MB file-size limitation [1]. RoyScript already has a richer workspace and scanner pipeline, so adding line numbers, search decorations, diff rendering, Markdown preview, and session serialization should be gated by measured performance on realistic documents. Large-document tests should include typing latency, selection movement, search time, preview synchronization, and restore time.

The fifth risk is **dependency and attribution drift**. Even though the main repository is MIT-licensed, named dependencies and contributed assets can carry separate obligations. Any future reuse should record the exact upstream commit, copied files, copyright notices, and dependency licenses in a project provenance note. The Notepads brand, icon, screenshot imagery, and designer credits should not be treated as generic UI assets.

## 7. Proposed implementation priority after approval

The first phase should be a **behavioral foundation**: stable document IDs, explicit active-tab state, dirty-state derivation, last-saved snapshots, keyboard command routing, and versioned session persistence. This phase has the highest leverage and the lowest visual risk. It should not change the current RoyScript layout until the state behavior is verified.

The second phase should add **editor productivity commands**: find/replace, go-to line, word-wrap persistence, line/column metadata, and a compact status surface using existing RoyScript patterns. Each command should have keyboard and pointer paths, and each should be tested against selection, undo, focus, and tab-switching behavior.

The third phase should add **optional derived views**: Markdown split preview and side-by-side diff against the last saved snapshot. These should be isolated so that a preview or diff failure cannot corrupt the editable Lexical state. The diff renderer should be treated as a separate read-only surface, following the Notepads pattern.

The fourth phase should consider **file interoperability**: encoding detection, line-ending display, browser-supported file handles, import/export, and recent-document history. This phase should be explicitly scoped to browser capabilities and should not promise Windows-shell parity.

## Final recommendation

Approve the Notepads repository as a **design and behavior reference**, not as a source for immediate code copying. The strongest shortlist for RoyScript is: tab/document state, session restore, unsaved-change snapshots, find/replace, go-to, line numbers, word wrap, compact status metadata, Markdown split preview, and side-by-side diff. Defer or exclude Windows Jump Lists, UWP activation, FutureAccessList storage tokens, native title-bar behavior, system notifications, and exact acrylic/Mica integration.

No RoyScript UI, UX, scanner behavior, extraction math, or source code was changed during this audit. Implementation should begin only after the user approves the shortlist and the compatibility boundaries above.

## References

[1]: https://github.com/0x7c13/Notepads/blob/6ec270c134b115d6bff38bc3966784e8893a419c/README.md "Notepads README at audited commit"

[2]: https://github.com/0x7c13/Notepads/blob/6ec270c134b115d6bff38bc3966784e8893a419c/LICENSE.txt "Notepads license at audited commit"

[3]: https://github.com/0x7c13/Notepads/blob/6ec270c134b115d6bff38bc3966784e8893a419c/src/Notepads/Notepads.csproj "Notepads UWP project metadata"

[4]: https://github.com/0x7c13/Notepads/blob/6ec270c134b115d6bff38bc3966784e8893a419c/src/Notepads/App.xaml.cs "Notepads application startup and lifecycle"

[5]: https://github.com/0x7c13/Notepads/blob/6ec270c134b115d6bff38bc3966784e8893a419c/src/Notepads/Views/MainPage/NotepadsMainPage.xaml "Notepads main shell markup"

[6]: https://github.com/0x7c13/Notepads/blob/6ec270c134b115d6bff38bc3966784e8893a419c/src/Notepads/Core/SessionManager.cs "Notepads session manager"

[7]: https://github.com/0x7c13/Notepads/blob/6ec270c134b115d6bff38bc3966784e8893a419c/src/Notepads/Controls/TextEditor/TextEditorStateMetaData.cs "Notepads editor-state metadata"

[8]: https://github.com/0x7c13/Notepads/blob/6ec270c134b115d6bff38bc3966784e8893a419c/src/Notepads/Controls/TextEditor/TextEditor.xaml.cs "Notepads editor commands and preview modes"

[9]: https://github.com/0x7c13/Notepads/blob/6ec270c134b115d6bff38bc3966784e8893a419c/src/Notepads/Controls/TextEditor/TextEditorCore.FindAndReplace.cs "Notepads find-and-replace engine"

[10]: https://github.com/0x7c13/Notepads/blob/6ec270c134b115d6bff38bc3966784e8893a419c/src/Notepads/Views/MainPage/NotepadsMainPage.StatusBar.cs "Notepads status-bar interactions"
