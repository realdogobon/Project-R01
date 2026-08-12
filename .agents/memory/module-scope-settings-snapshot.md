---
name: Module-scope settings snapshot resets on remount
description: A localStorage read captured once at module import time reseeds stale state every time the component remounts, not just on page load — looked like "settings reset when switching X" but was actually a remount bug.
---

A pattern like `const initialSettings = loadSettings();` at module scope,
used as a `useState` initializer inside a component, only reads
`localStorage` **once**, the first time the module is imported (effectively
once per page load). If the component that uses it can unmount and remount
during the same page life — switching between two variants of a feature,
an exam/session remount, any conditional render toggle — every remount
reseeds from that one stale snapshot instead of a fresh read, silently
discarding whatever changed since the page loaded.

**Why:** this was diagnosed as the root cause of a "keyboard settings reset
when switching keyboard models and back" report. The user's changes were
never lost from `localStorage` itself — the component just never looked at
localStorage again after the first mount, so remounting always seeded from
the original page-load values.

**How to apply:** if per-feature state needs to survive the owning
component unmounting for any reason (model/variant switches, route
changes, error-boundary remounts, crash-recovery remounts), don't try to
patch every individual remount trigger — lift the state into a context (or
other store) that is mounted once at the app root and never unmounts
alongside the feature component. This closes the whole class of "component
remount wipes state" bugs at once, rather than chasing each trigger
individually.
