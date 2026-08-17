# Close-all Tabs — Browser-safe Verification

## Reported failure

In ordinary Preview, the browser ignored the best-effort `window.close()` request. The prior implementation had already removed every workspace tab, leaving a mounted editable surface with a zero-tab strip. This was a real invalid workspace state.

## Corrected contract

The **Close all tabs** action now renders only when the host supplies `window.__royscriptExit` before the workspace loads. This explicit bridge is the contract a packaged Electron preload or Tauri initialization layer provides. In ordinary browser Preview, the action is absent, so users cannot enter a zero-tab editor state.

When the packaged bridge is available, the existing consolidated unsaved-changes dialog remains authoritative. **Cancel** retains every tab and does not contact the bridge. **Don't Save** calls the native exit bridge, dispatches the shell-exit event, and only then clears the in-memory tab state; a real desktop wrapper exits before that state is user-visible.

## Evidence

The updated live probe passed all 18 checks. It confirmed a normal Preview creates and retains three tabs, hides the close-all action, and never enters the zero-tab editor state. With an injected desktop bridge it confirmed clean close-all bridge/event delivery, dirty consolidated confirmation, Cancel retention without exit, and Don't Save bridge/event delivery. Static verification passed TypeScript, 17 Vitest assertions, the production build, and whitespace validation. The established multi-tab regression passed all 15 checks and the fixed-control/TaskView probe passed all 8 checks without browser errors.

> The zero-tab capture obtained while simulating a desktop bridge is intentional test evidence only: the fake bridge records the exit request but does not terminate Chromium. In Electron or Tauri, the real bridge closes the application at that point.
