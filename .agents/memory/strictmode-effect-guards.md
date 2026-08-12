---
name: StrictMode effect guards must compare values, not just "first run"
description: Why a boolean "has this effect run before" ref is unsafe for skip-on-mount guards, and the correct pattern.
---

A `useRef(false)` "have I run yet" flag used to skip an effect's body on mount only protects the *first* of React StrictMode's two dev-only back-to-back invocations of every effect after mount. The second invocation sees the flag already flipped and runs the body for real, even though nothing the user did actually changed.

**Why:** This is especially dangerous for effects that watch several config-like dependencies and regenerate derived state (e.g. "regenerate preview text when mode/settings change"). Right after a restore-from-storage mount, the guard's second StrictMode firing silently re-derives and clobbers the just-restored value, while unrelated state that isn't touched by that effect stays correctly restored — producing a confusing "only some fields don't restore" bug.

**How to apply:** Replace the boolean mount guard with a ref that stores the *actual previous dependency values* and compare them element-wise. Skip the body when `prev === null` (true first run) OR when every dependency is unchanged from last run (covers StrictMode's harmless duplicate). Only run the body when a value genuinely differs from the last observed run.
