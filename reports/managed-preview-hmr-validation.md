# Managed Preview HMR Validation

## Initial investigation — 2026-08-19

The reported managed-preview error showed the Vite client attempting to connect to `localhost:5173` from the public HTTPS preview, which cannot succeed outside the sandbox. The current `vite.config.ts` already specifies secure proxy-compatible HMR (`wss` with client port `443`). A direct HTTPS load of the current managed preview rendered normally and produced no Vite client console error, while the development log confirmed the active application server is listening on port `3000` and processing HMR updates.

The remaining validation step is a managed server refresh followed by a new HTTPS preview load and console inspection. No application behavior or design has been changed during this investigation.

## Post-restart verification — 2026-08-19

The managed development server was restarted to reload the proxy-compatible HMR configuration. A fresh direct HTTPS load of the managed preview completed successfully, rendered the full workspace, and produced no browser-console output—including no Vite WebSocket failure. The effective configuration remains secure WebSocket HMR through client port `443`, preventing the browser from targeting the unreachable sandbox-local `localhost:5173` endpoint.

## Root cause and live socket probe — 2026-08-19

The application’s Vite bootstrap attached the shared Express upgrade server by replacing the entire `hmr` configuration object. That discarded the secure `clientPort: 443` setting from `vite.config.ts`, causing the preview client to have no usable public socket port and to fall back to `localhost:5173`.

The bootstrap now merges the configured HMR client values before attaching the shared server. The freshly served Vite client resolves its primary socket to the managed preview hostname using `wss` on port `443`. Its `localhost:5173` string remains only Vite’s dormant direct-fallback diagnostic template; because `hmrPort` is now `443`, that fallback branch cannot execute. A harmless `index.css` timestamp update produced a live Vite HMR update event in the server log, and the managed-preview console emitted no Vite connection error.
