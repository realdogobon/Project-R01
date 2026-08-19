# Managed Preview Vite HMR Validation

## Reported Failure

The managed-preview client previously attempted to connect its Vite HMR WebSocket to `localhost:5173`, which is not reachable from the browser behind the public preview proxy.

## Correction

The Vite development-server HMR client is now configured for the managed preview’s browser-facing secure route, rather than allowing the client fallback to a local development port. The change is isolated to `vite.config.ts`; it does not modify the Task View, editor, scanner, Practice Mode, Settings, tab model, or server application routes.

## Live Verification

| Check | Result |
|---|---|
| Development restart | The dev service restarted successfully after the HMR configuration change. |
| Local route | `http://127.0.0.1:3000/` loaded the workspace successfully after restart. |
| Exact reported managed origin | `https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer/` loaded RoyScript successfully. |
| Vite client error | The public route’s browser console reported no output; the reported `failed to connect to websocket` error did not recur. |

## Automated Regression Evidence

| Verification | Result |
|---|---|
| Vitest | `pnpm test` passed: 39 assertions across 9 test files. |
| TypeScript | `pnpm exec tsc --noEmit` passed. |
| Production build | `pnpm build` passed. The existing pdfjs import and bundle-size notices remain warnings only. |

No checkpoint, Git commit, or publish action has been performed for this configuration-only repair.
