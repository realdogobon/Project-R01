---
name: Per-account state ownership
description: Pattern for fixing bugs where child-owned session state gets wiped by a parent's competing persistence layer during account/context switches.
---

When a child component already has its own rich session-persistence mechanism (localStorage snapshot, exact resume state, etc.) but a parent component *also* tries to snapshot/restore a subset of the same state, the two sources of truth fight each other — the parent's stale/narrower snapshot silently overwrites or gates the child's more complete one.

**Why:** In RoyScript's Workspace/PracticeMode, Workspace.tsx kept its own `practiceText`/`practiceConfig` snapshot per account AND force-remounted `<PracticeMode>` on every prop change (via a key containing volatile text/title), even though PracticeMode already had a complete per-session localStorage mechanism (word index, cursor, replay log, timer) that just wasn't scoped per-account. The parent's restore gate (`if (snap.practiceText)`) also wrongly required non-empty custom text, so default word/quote-mode sessions never restored at all.

**How to apply:** When you find a component with its own persistence mechanism being clobbered by a parent:
1. Scope the child's storage key to the actual isolation boundary (e.g. `key_${accountId}`) so switching contexts can't leak/overwrite another context's session.
2. Make the child restore synchronously (e.g. `useMemo`/lazy `useState` initializer reading localStorage) rather than in a post-paint `useEffect`, so there's no flash of default state.
3. Stabilize the parent's `key`/props so it only forces a remount on genuine identity changes (e.g. account switch or an explicit "load new content" action via a nonce), never on every incidental state change the child already persists itself.
4. Make the parent defer to the child's own restored value instead of feeding it a competing stale snapshot — the parent should just route/gate (e.g. "which screen to show"), not own the child's internal fields.
5. If the child has live in-progress state inside a sub-engine (e.g. a typing engine tracking keystrokes), add a flush-before-unmount hook so a context switch doesn't lose the last few seconds of unsaved progress before the next periodic autosave tick.
