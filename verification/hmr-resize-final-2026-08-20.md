# Managed Preview HMR and Floating Resize Verification Notes

## Fresh transport verification

After the restart, the local development document returned `Cache-Control: no-store, no-cache, max-age=0, must-revalidate` and contained zero `/@vite/client` references. A direct request to `/@vite/client` returned the intended 44-byte no-op JavaScript module with the same no-store policy, proving the stale-client route guard is active before Vite middleware.

## Browser observation

The first fresh local navigation still listed one historical `/@vite/client` resource even though the document script list and the transformed `main.tsx` module contained no Vite client or hot-context import. The route returned the no-op module, not Vite's socket client. The initial React mount point was empty at that instant and had no console error; this must be rechecked after the browser has completed module loading before treating it as a transport or application regression.

A second pass confirmed the mount point remained empty even though the application entry and imported React dependency both returned HTTP 200. The application entry still had no Vite-client or hot-context import, while `/@vite/client` returned only the 44-byte guard module. The browser console did not surface an error, so server and browser instrumentation logs are the next diagnostic source.

The instrumentation log identified the hidden startup failure precisely: Vite-transformed stylesheet modules import `createHotContext` from `/@vite/client`. The pure empty shim therefore prevented the app from mounting, even though it successfully eliminated socket code. The safeguard must be upgraded to a transport-free compatibility module that provides Vite's client-facing helper exports without opening a WebSocket.

After the compatibility module was installed and the service restarted, a fresh local navigation restored the React mount (`2` root children; `44,457` characters of rendered markup). The only Vite-client resource was the lightweight compatibility response (1,789 bytes), and it was not injected as a document script. This resolves the prior missing-export startup failure while retaining the socket-free route boundary.

## Live Scanner preparation

The fully mounted workspace was confirmed visually after the compatibility restart, and the Scanner was opened through its normal toolbar entry point. Its floating content shell measured `860 × 650` at the time of inspection. The next check is a direct pointer trace against the shared edge and corner resize handles rather than a simulated state-only probe.

The Scanner exposes the expected enlarged hit targets: `8px` edge zones and `20px` corner zones. The first event trace intentionally revealed a probe-selection issue rather than an interaction failure: each handle’s direct parent is a zero-height positioning wrapper, not the DOM node receiving direct geometry writes. The visual dialog did not move under that measurement target. The next trace will climb to the actual geometry shell before judging cursor-coupling accuracy.

Using the actual `data-scanner-modal-shell`, both 80-step traces measured at most `0.875px` geometry error immediately after each pointer move—evidence that the direct geometry path is cursor-coupled. However, the shell and persisted Scanner geometry returned to the original `860 × 650` bounds after release. That isolates the remaining defect to the intermediate React-state synchronization path, which can reapply stale declarative dimensions during an active resize or release. The final refinement will keep React entirely out of the live interaction path and commit the single final geometry only when the pointer interaction ends.

The exact live shell was verified as the `motion.div[data-scanner-modal-shell]` carrying the inline width, height, left, and top values. It is the handle grandparent; the intermediate handle wrapper has zero layout height by design. The prior frame-batched commits are therefore the sole remaining source of the release rollback. The shared hook will retain direct writes for every move, retain the final pending geometry in a ref, and perform exactly one declarative state commit at release.

After removing the mid-resize frame-batched state commits and restarting the service, the application again completed a clean local mount. The next live trace uses the same fresh document and the same geometry shell target, ensuring the before-and-after comparison is directly comparable.

The repeated 80-step Scanner trace again held per-move geometry within `0.875px`, which confirms the direct DOM path remains intact. The persisted value nevertheless stayed at the pre-trace factory geometry after the synthetic `mouseup`. Before treating this as a product defect, the next controlled probe will dispatch the move and release lifecycle directly on `window`—the same target on which the hook installs listeners—to remove any ambiguity from browser-console event bubbling through `document`.

Dispatching synthetic events directly on `window` and, separately, calling the mounted React `onMouseDown` callback confirmed that the callback is present but that console-created pointer events do not enter this browser session’s global listener lifecycle. This is a harness limitation, not proof of a release rollback. The final resize check will therefore use actual browser pointer input rather than artificial page events.

The genuine DevTools input harness confirmed the key result: actual pointer moves update the Scanner shell at the expected direct-geometry cadence, while release restores the saved geometry. The mounted component ancestry was also confirmed: the active shell belongs to `DocumentScannerModal` beneath the expected animation-presence wrappers. The remaining diagnosis is limited to the hook state handoff at native release; Scanner content and pointer capture are not implicated.

## Resize correction applied

North and west edges now derive both dimension and anchor position from the original pointer-down geometry on every move, including at the minimum size. All Scanner, Library, and Dashboard resize hit zones were enlarged invisibly from 4px edges / 16px corners to 8px edges / 20px corners, preserving visual appearance while increasing capture tolerance.

## Final Scanner genuine-input result

The final DevTools-level genuine-input trace completed two 80-step resizes without a release rollback. Southeast resizing ended at the exact expected `1010 × 760` bounds with **0 px final error** and persisted `{"width":1010,"height":760,"x":210,"y":225}`. Northwest anchored resizing ended at the exact expected left/top/size of `(90, 145, 1130 × 840)` with **0 px final error** and persisted the same final geometry. Peak sampled deviation during motion was below `0.875 px`, consistent with browser layout rounding; all 160 native move events and both native mouse-up events reached the page listener. The Scanner’s automatic content-fit effect is now permanently bypassed after an intentional manual move or resize, so it cannot overwrite the user’s released geometry.

## Library live-shell preparation

The Library was opened through the normal toolbar path in a fresh local browser. Its direct geometry shell measured `840 × 610` at `(220, 245)`. The current shared hit targets were confirmed in the rendered DOM: each edge is `8 px`, while each corner is `20 × 20 px`, including the southeast and northwest handles selected for the genuine-input trace.

## Final Library genuine-input result

The same two 80-step DevTools-level traces completed with retained post-release geometry. Southeast resizing reached the exact expected `960 × 700` bounds with **0 px final error**. Northwest anchored resizing then reached the exact expected `(130, 185, 1050 × 760)` geometry with **0 px final error**. Peak per-move variance was below `0.875 px`; `lexkit_window_library_v2` persisted the final released bounds, confirming that the shared direct-geometry path behaves identically in the Library.

## Final Dashboard genuine-input result

The Dashboard retained direct pointer coupling and persisted its released geometry through both live corner traces. Its southeast trace stopped `2 px` before the unconstrained mathematical target because the window reached the intentional viewport boundary; this is a bounds clamp rather than interpolation or a release rollback. The northwest anchored trace then reached the exact expected `(20, 140, 1268 × 848)` geometry with **0 px final error**, and `lexkit_window_workspace_dashboard_v4` persisted those released bounds. Peak non-clamped trace variance was below `0.875 px`.

## Factory-reset result

After deliberately persisting non-default Scanner, Library, and Dashboard bounds through the three genuine-input traces, the normal **Settings → Reset settings** control was activated. A live browser inspection then returned an empty object for every `lexkit_window_*` local-storage key. This confirms the global reset clears all floating-window geometry as intended.
