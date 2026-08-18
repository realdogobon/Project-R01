# LexKit-versus-RoyScript Editor Reliability Audit Charter

**Status:** In progress — audit only. No production editor behavior is to change until the findings and hardening sequence are approved.

## Objective

Evaluate whether RoyScript’s writing workspace delivers the same dependable interaction model as LexKit’s reference editor. The target is not visual replication. The target is **interaction confidence**: a user should be able to predict what every click, shortcut, selection change, formatting command, media action, and mode transition will do, and observe that result without a hesitation, lost focus, unintended state change, or inconsistent repeat behavior.

## Scope and comparison rules

The audit will compare equivalent user-visible flows in LexKit’s public editor and the RoyScript workspace. RoyScript Practice and Exam functionality will be treated as controlled extensions around the editor core; their domain-specific restrictions will not be scored as defects when they are intentional. Every confirmed gap must have a reproduction path, observed outcome, severity, and—where possible—a source-level explanation.

| Area | User journeys to test | Reliability signals | Out of scope for this pass |
|---|---|---|---|
| Plain-text authoring | Type, select, replace, paste, line breaks, paragraphs, repeated spaces | Caret remains stable; text lands once; metrics/state remain synchronized | Copy redesigns |
| Formatting commands | Bold, italic, underline, strike-through, blocks, lists, links, clear/undo | One activation produces one predictable document change; toolbar reflects selection | New formatting features unless a parity blocker is proven |
| Selection and focus | Mouse selection, keyboard selection, selection across blocks, opening/closing menus | Selection is preserved or restored intentionally; no accidental focus theft | Non-editor modal styling |
| Keyboard shortcuts | Common formatting, undo/redo, navigation, Tab/Shift+Tab, Escape | Shortcut is recognized once and its expected default is intentionally preserved or prevented | OS-level shortcuts that a browser cannot support safely |
| Media | Image insertion, selection, resize/alignment/caption/removal where each product exposes it | Controls target the intended media node and remain stable over repeated interactions | Inventing media controls RoyScript does not currently support |
| Structural editing | Headings, paragraphs, lists, block transitions, line movement where exposed | Commands affect the intended block; caret lands predictably afterward | Large document-performance benchmarking without a realistic fixture |
| Menus and commands | Toolbar buttons, dropdowns, contextual controls, command palette | Single click opens/executes once; outside click/Escape closure is consistent | Visual rebranding |
| Undo/redo and persistence | Repeated edit → undo → redo; tab switch/return; reload where browser-safe | History matches visible change order; no stale-state overwrite | Desktop-only native file semantics |
| RoyScript extensions | Practice start/exit; active/ended Exam; Just Look and tab boundary behavior | Editor contract stays intact inside each intended permission boundary | Changing approved practice/exam product rules |
| Robustness | Rapid repeated clicks, input during transitions, opening/closing menus, error-silent paths | No duplicate actions, stuck overlays, thrown errors, or broken focus | Synthetic throughput claims without reproducible evidence |

## Test protocol

Each candidate flow will be performed at least once normally and then repeated when it is high-frequency or state-sensitive. Browser console output will be checked after each test family. When a difference is observed, the same minimal sequence will be rerun to distinguish a repeatable product gap from a transient test artifact. User-provided documents or images may be used only when an equivalent product flow accepts them; no uploaded content will be sent to an external service as part of this audit.

## Evidence format

The final report will classify observations as follows:

| Classification | Meaning |
|---|---|
| **Parity confirmed** | Equivalent flow is predictably reliable in both products within their intentional product boundaries. |
| **Intentional difference** | RoyScript differs for a documented Practice/Exam/browser constraint, with no reliability failure. |
| **Confirmed gap** | A repeatable RoyScript interaction failure, inconsistency, or missing prerequisite causes loss of confidence compared with the reference. |
| **Needs reproduction** | A possible difference that did not reproduce consistently and must not drive implementation yet. |

## Completion criteria

The audit will be ready for a production-hardening decision when the coverage matrix has evidence for every applicable row, all confirmed gaps have reproduction paths and severity ratings, and the proposed backlog is sequenced to preserve existing scanner, Practice, Exam, Just Look, tabs, and status-bar behavior.
