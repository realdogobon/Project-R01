# Modal Interaction Audit

## Scope

This audit covers the three modal components currently present in the client source: `SettingsModal`, `DocumentScannerModal`, and `AuthModal`, plus the Workspace-owned fallback and signature overlays.

## Findings

`SettingsModal` is the only modal with a multi-step internal navigation model. It owns a category route, a nested Settings view, a projected microtask-coalesced navigation queue, a title-row back action, and a standalone reset action. The reset action correctly resets preference values through `resetToDefaults()`, but its navigation reducer previously converted every reset into `{ category: "appearance", view: "main" }`. That was the source of the visible jump back to Appearance.

`DocumentScannerModal` has a separate interaction model: document loading, crop gestures, zoom, queueing, scanning, cancellation, and modal close. It does not have category or submenu route transitions, so the Settings route queue should not be copied into it. Its scan cancellation state machine already owns its own interaction sequencing.

`AuthModal` is a form modal with a local register/login mode switch, loading state, success state, and close behavior. It does not have nested route transitions or competing animated panels that share a layout flow. A Settings-style route intent queue would add complexity without an evidence-backed benefit.

Workspace-owned fallback and signature overlays are open/close overlays, not nested navigation modals. Their appropriate consistency boundary is idempotent open/close handling rather than a route queue.

## Approved correction boundary

The minimal correction is to preserve the current Settings category and nested view when the reset intent is reduced. Reset continues to update all preference values, while navigation remains unchanged. The provider-key storage remains excluded from reset as before.

No queue has been added to the scanner, authentication, fallback, or signature overlays because their state machines do not exhibit the Settings-specific flow-overlap problem. They remain candidates for separate stress probes if future live evidence shows lost open/close or form-mode intents.

## Live evidence after the reset correction

The stabilized reset probe passed at 1280px and 375px. Appearance, Keyboard & Typing, Practice, Ambient Focus, Performance, and AI Setup each retained their active category after reset. Themes and Font retained their nested route and back affordance. Settled views had one visible child and stable top geometry; both reports contained zero application errors.

The non-Settings interaction probe also passed at 1280px and 375px with zero application errors. Scanner open/close bursts completed without invoking scanning, Library opened and closed after its category interaction burst, and Auth completed its sign-up/sign-in mode burst without a stale modal state. These surfaces do not currently show the Settings-specific flow-overlap defect, so no additional queue was justified by the evidence.
