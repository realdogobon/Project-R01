# Exam Mode Integrity Validation

## Live probe — verified after fresh render

The active timed Exam editor silently prevented native `copy`, `cut`, `paste`, `drop`, and `contextmenu` events. It also prevented the native `beforeinput` replacement route while allowing ordinary `insertText` input.

After a full page reload and normal timed-exam recovery, the browser-assistance guard was deliberately disrupted by removing `spellcheck`, `autocomplete`, `data-gramm`, and `data-lt-active` from the active editable element. Within 60 ms, the guard restored all Exam-only attributes:

| Attribute | Restored value |
|---|---|
| `spellcheck` | `false` |
| `autocorrect` | `off` |
| `autocapitalize` | `off` |
| `autocomplete` | `off` |
| `data-gramm` / `data-gramm_editor` | `false` |
| `data-enable-grammarly` | `false` |
| `data-lt-active` | `false` |

The same fresh-render matrix confirmed that clipboard, drop, and context-menu events were all prevented, native replacement was prevented, and normal typed input remained permitted.
