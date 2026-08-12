---
name: Crash-recovery architecture (typing app)
description: How pixel-perfect crash recovery was designed across Practice, Exam, and the document editor — read before touching autosave/restore or the recovery overlay.
---

## Exam Mode is not the typing engine
"Exam Mode" is the rich-text document editor (Workspace.tsx, lexkit) running under a timer/fullscreen-lock overlay (`examStatus`, `examRemainingSeconds`, `examReplayLogRef`), not the Practice/TypingScreen `TypingEngine`. Any exam-related restore logic belongs in Workspace.tsx's own snapshot system, not in `typing-engine.ts`.

**Why:** easy to assume "Exam" reuses Practice's engine.hydrate() pattern; it doesn't, and building recovery against the wrong subsystem wastes a full implementation pass.

## Shared recovery overlay is presentational-only
`SessionRecoveryOverlay` (src/components/typing/SessionRecoveryOverlay.tsx) takes a controlled `remaining` prop and renders only — it owns no timer. Each caller (TypingScreen, Workspace) ticks its own countdown state and passes it in.

**Why:** TypingScreen already had its own countdown-then-gate-engine-creation mechanism; giving the overlay its own internal interval would create two competing timers ticking the same countdown.

**How to apply:** when adding a new "resume after crash" surface, tick a local `remaining` state (5→0) in the host component, freeze the real session timer/hydrate call until that reaches 0, then flip to the live state.

## Snapshot-consumed timing must be gated by an explicit callback, not a mount effect
Any one-shot "restore snapshot" ref (e.g. `pendingSnapshotRef`) must be cleared via an explicit `onXConsumed` callback invoked at the exact moment the snapshot is actually applied (e.g. right after `engine.hydrate()`), never via a generic mount effect — the recovery countdown delays the real hydrate/resume by several seconds, so a mount-effect-clears-ref approach nulls the data before it's used.

## Browser fullscreen re-entry needs a user gesture
`document.documentElement.requestFullscreen()` cannot be silently re-triggered on page load/reload — browsers require it inside a user-gesture handler (click/keydown). Exam crash-recovery treats this as best-effort (try, catch, continue without blocking); don't assume the exam can be restored fully fullscreen-locked automatically after a crash.
