# Workspace First-Key Neon and Multi-Tab Proposal

## Purpose

This document records the completed investigation only. **No workspace multi-tab behavior or neon animation has been changed as part of this assessment.** The goal is to establish a safe, evidence-based approach before touching two interconnected but high-risk workspace systems.

## 1. First-key neon-bar jitter: confirmed root cause

The reported spark is reproducible in a clean live workspace session, and it is **not caused by the tab-to-title-bar seam correction or by tab geometry**. The active tab remains stable at 176 × 40 px during the first keystroke.

On the first editor change, the current handler performs two conflicting state transitions in the same interaction:

1. It immediately marks the tab as `hasGlowedOnce: true`, making the static, fully lit neon outline eligible to render.
2. It calls `fireTabGlow`, which deliberately clears `glowingTabId` and restores it on the next animation frame, remounting the animated neon paths.

For that intervening frame, the static tube and newly mounted CSS paths exchange control. The animated trail starts at a zero-length opaque path while the pulse appears at 3% of its path length. The result is the visible **spark → off → sweep** discontinuity reported on the first key. Subsequent keys do not reproduce the same lifecycle conflict because the tab is already marked as having glowed once.

| Finding | Evidence | Meaning |
| --- | --- | --- |
| The fault happens only on the first keystroke. | Fresh-session live frames show a discontinuity before the first normal sweep. | The first-run state transition is the relevant scope. |
| The tab’s rectangle is stable. | Live measurement remains 176 × 40 px through the transition. | Do not alter title-bar/tab layout to solve this. |
| The static and animated paths temporarily overlap/hand off. | `hasGlowedOnce` is set before the animation remount settles. | The fix belongs to state sequencing, not visual redesign. |

### Recommended correction

> Keep the initial tube in its existing off state until the first pulse has completed; only then promote it to its current steady, fully-lit state.

This is a narrow lifecycle correction. It would preserve the current colors, path shape, duration, and later glow behavior. The implementation would remove the first-run handoff frame rather than redesigning the animation.

## 2. OpenEditor multi-tab system: what it actually does

The OpenEditor reference treats a tab as a **document-backed workspace object**, not merely a header element. Its `EditorTab` ties together an `OpenDocument`, editor host, and native `TabViewItem`. Explicit methods create, activate, close, and reorder that object, keeping model state and UI order synchronized.

Most importantly for RoyScript, OpenEditor keeps two distinct tab-strip controls reachable independently of tab width:

| OpenEditor component | Behavior | Why it matters for RoyScript |
| --- | --- | --- |
| Native add-tab action | Creates a new document. | New-tab creation never disappears with horizontal overflow. |
| `TabsOverflowButton` | Opens a floating overview of **all** tabs. | Provides a permanent escape route to activate any open tab. |
| Overview flyout | Shows title, dirty state, active state, and a preview; clicking an item activates it. | The correct desktop mental model for many documents. |
| Overview reorder | Synchronizes the durable tab list and visual strip in one operation. | Avoids model/UI order drift. |
| Close workflow | Defers actual removal until dirty-document handling completes. | Aligns with RoyScript’s existing unsaved-content protection. |

### Important fidelity note about the glyph

>The supplied OpenEditor archive contains the complete **behavioral** implementation for `TabsOverflowButton` and its overview flyout, but it does **not** include the corresponding `MainWindow.xaml` markup where the vector/icon is declared. Therefore, I can reproduce the exact **control role, fixed placement, interactions, and Windows tab-overview behavior**, but I should not claim to know the exact vector path from this archive alone. If you want literal 1:1 vector fidelity, I will need the XAML file or a close screenshot of that glyph before implementation.

## 3. Why RoyScript’s current tab strip breaks

RoyScript’s current document state is already a workable browser model: each item in `tabs` keeps the serialized Lexical content, title, dirty state, file handle, exam state, and glow metadata. The problem is the **strip shell**:

```text
[tab 176px] [tab 176px] [tab 176px] ... [tab 176px] [+]
<---------------------------- one horizontally scrolling area ---------------------------->
```

The fixed-width tabs and the `+` control all belong to one horizontally scrolling container. When enough tabs exist, the `+` is pushed off-screen. There is no overflow/overview control, no automatic reveal of the active tab, and no fixed action region. This is exactly the failure you observed.

## 4. Safe integration proposal

The proposal is intentionally smaller than a full Windows-editor clone. It transfers OpenEditor’s robust architectural ideas while preserving RoyScript’s existing tab visuals, Lexical editor integration, exam restrictions, unsaved-close flow, and user-approved workspace design.

### Phase A — Correct the first-key state handoff

Apply the narrow lifecycle sequencing fix described above. No new visual design, no timing redesign, and no tab-strip changes.

### Phase B — Stabilize the tab-strip shell

Move the existing new-tab action into a fixed trailing action zone outside the horizontal tab scroller. The visible tab cards remain visually unchanged. The new structure becomes:

```text
[ horizontally scrolling existing tabs                                         ][ overview ][ + ]
```

Both controls remain reachable at every tab count. The tab row continues to scroll only the tab cards.

### Phase C — Add the OpenEditor-inspired overview

Add a compact, permanently visible **tab overview** control next to `+`. Its initial menu should be deliberately restrained:

- Each row shows the existing file glyph, document title, active state, dirty marker, and close control.
- Selecting a row uses the existing safe `switchTab` flow.
- Closing uses the existing unsaved-work confirmation flow.
- The active item is marked clearly and is scrollable into view.
- The overview is keyboard navigable and supports Escape to close.

No fabricated previews, no drag reorder, no pinning, no tear-out, and no other desktop-only features in the first implementation. Those are separate product decisions—not consequences of fixing overflow.

### Phase D — Active-tab visibility and stress verification

When a tab is created or selected from the overview, scroll that tab smoothly into the visible horizontal strip. Then test 1, 2, 8, 20, and long-named documents across light/dark themes, document creation, keyboard shortcuts, dirty closes, exam locks, and rapid switching.

## 5. Decision required before coding

Please confirm these three decisions:

| Decision | Recommended answer | Reason |
| --- | --- | --- |
| Correct the first-key neon lifecycle first? | **Yes** | It is isolated, small, and does not depend on the tab overhaul. |
| Adopt OpenEditor’s fixed overview + fixed add-control architecture? | **Yes** | It removes the inaccessible `+` failure and scales to many tabs. |
| Proceed with the restrained overview first, deferring previews/reorder/pinning/tear-out? | **Yes** | It delivers the durable core without adding unrequested complexity or altering the tab design. |

If approved, I will begin with a reversible, test-covered implementation and stop for manual review after the first visual checkpoint—before any final save or Git operation.
