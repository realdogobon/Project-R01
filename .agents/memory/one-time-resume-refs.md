---
name: One-time resume snapshots must be explicitly consumed/cleared
description: A ref seeded from persisted state for a single "resume" hydrate must be nulled after first use, or later fresh-start flows silently reuse stale data.
---

When a parent component seeds a `useRef` from persisted/restored data specifically to hydrate a child on its *first* mount (e.g. "resume typing session after switching accounts"), the ref survives for the parent's entire lifetime unless explicitly cleared. If the child can later remount (e.g. user navigates away and starts a brand-new session without the parent remounting), the child's mount logic may see that same ref still populated and wrongly re-hydrate stale state (old cursor position, timer, mistakes) onto what should be a fresh instance.

**Why:** The mount guard on the child side often only checks "is this a fresh child instance," not "is this genuinely the first-ever resume." A stale ref makes every subsequent fresh mount look like a legitimate resume.

**How to apply:** Immediately after the parent's own mount effect fires (which runs after child mount effects have already consumed the ref, per React's child-before-parent effect ordering), set the ref to `null`. This guarantees the resume path fires exactly once per parent lifetime, and every later "start over" flow gets a truly clean slate.
