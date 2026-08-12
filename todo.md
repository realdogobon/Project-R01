# Option A — Eradicate custom caret, go native (LexKit 1:1)

## Phase 1: Study lexkit repo
- [ ] Clone novincode/lexkit repo
- [ ] Find editor CSS: caret color/width/animation, ::selection, focus styling
- [ ] Note how LexKit achieves smooth caret (transitions? none?)
- [ ] Note selection highlight colors/radius

## Phase 2: Eradicate + rebuild
- [ ] Remove custom caret div + physics loop from DefaultTemplate.tsx
- [ ] Remove caret-related refs (caretRef, caretPhysicsRef, onViewportResizeRef, etc.)
- [ ] Remove caret-related state + effects (setCaretFocused etc. — check usage)
- [ ] Remove smooth-caret listeners (selectionchange, input, composition*, touchend, visualViewport, idle re-sync) — keep needed ones only
- [ ] Remove custom caret CSS (.custom-smooth-caret) from styles.css
- [ ] Restore caret-color default (remove caret-color: transparent)
- [ ] Apply LexKit caret styling: color, width, opacity, animation
- [ ] Align ::selection highlight with LexKit style
- [ ] Check no leftover caret container markup (position:relative wrapper)
- [ ] Verify editor still works: typing, selection, select-all, scrolling

## Phase 3: Verify + deliver
- [ ] TypeScript clean, dev server healthy
- [ ] Desktop: typing, selection, blink rhythm
- [ ] Mobile emulation: tap to focus, typing, drag select
- [ ] Checkpoint (auto-publish live)
- [ ] Report to user
