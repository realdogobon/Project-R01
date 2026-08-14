# Practice Generator Glyph Research

**Date:** 2026-08-14 UTC

## Recommendation

Use **Lucide `NotebookPen`** as the Practice generator trigger and the modal title-bar glyph. It communicates a notebook or study session being authored, which fits RoyScript’s typing and document vocabulary without implying a branded AI assistant. It also stays within the application’s existing `lucide-react` dependency, so it does not add a font download, external asset, or new visual system.

## Candidate comparison

| Candidate | Meaning | Fit for RoyScript | Decision |
| --- | --- | --- | --- |
| `NotebookPen` | Notebook, study, writing, research, homework | Strongly connects generation to a practice notebook rather than an AI brand | **Selected** |
| `FilePenLine` | Editing or annotating a file | Clear, but reads more like editing an existing document than creating practice material | Reserve |
| `TextCursorInput` | Text entry and selection | Relevant to typing, but too technical and control-like for a primary action | Reserve |
| `ScrollText` | Long-form text, script, document | Relevant to generated passages, but less clearly an action | Reserve |
| Material Symbols `auto_stories` / `edit_note` | Google-style learning or note editing | Apache-2.0 and highly configurable, but adds a separate font/icon vocabulary to a Lucide-based app | Not selected |

## Source findings

Lucide describes `NotebookPen` with writing, reading, study, research, homework, and planner associations and provides a React component named `NotebookPen`. The project is an open-source icon toolkit with 1,600+ vector icons and an ISC license. Source: [Lucide NotebookPen](https://lucide.dev/icons/notebook-pen) and [Lucide GitHub repository](https://github.com/lucide-icons/lucide).

Lucide’s `FilePenLine`, `TextCursorInput`, and `ScrollText` pages confirm the alternative semantics used in the comparison table: file editing, text layout/input, and document/script text respectively. Sources: [FilePenLine](https://lucide.dev/icons/file-pen-line), [TextCursorInput](https://lucide.dev/icons/text-cursor-input), and [ScrollText](https://lucide.dev/icons/scroll-text).

Google Material Symbols are a credible alternative: Google documents more than 2,500 glyphs, adjustable fill/weight/grade/optical-size axes, Apache License 2.0 availability, and the official `google/material-design-icons` repository. The same documentation notes that specifying icon names can reduce a web-font payload, but using it here would introduce a second icon system for one control. Sources: [Material Symbols guide](https://developers.google.com/fonts/docs/material_symbols) and [Google Material Design Icons](https://github.com/google/material-design-icons).

## Implementation boundary

The selected glyph replaces the current sparkle in the standalone Practice trigger and the Practice text modal title bar. The approved modal structure, fields, and controls remain unchanged. The trigger and title glyph now inherit the active RoyScript theme accent rather than a hard-coded blue AI accent; the modal action controls retain their existing theme behavior. No external font or downloaded asset was added.

## Verification note

The no-credit browser smoothness probe confirmed on desktop and mobile that the spinner uses the scoped `practice-generation-spin` animation and advances across successive animation frames. It also confirmed that the `NotebookPen` stroke color matches the active theme accent in both viewports. TypeScript, production build, and the deterministic Practice regression probe passed after the change.
