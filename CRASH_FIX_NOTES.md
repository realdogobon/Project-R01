# Dual-React crash — current state (2026-08-12 14:30)

## Verified facts
- Headless Chromium (puppeteer-core, /usr/bin/chromium): 5/5 fresh loads of gateway URL + local 127.0.0.1:3000 load CLEAN: rootChildren=2, 0 pageErrors, 0 console errors, 0 404s. Scripts: /tmp/e2e_test.mjs <url>, /tmp/crash_test.mjs <url>, /tmp/e2e_404.mjs <url>.
- The preview-panel screenshot tool replays a STALE cached error image (130020 bytes, identical for hours) showing "Error Occurred / TypeError: Cannot read properties of null (reading 'useState') at exports.useState ... SettingsProvider ... renderRootSync". The image shows a NEWER react-dom hash (94103f4a) than current deps (6dfec778) — so it captures a REAL past crash in the embedded browser, then freezes/replays it.
- Production assets fix done: checkpoint 6bfb5517 saved & auto-published. All 272 static assets restored to client/public/assets; ambient mp3s (20) uploaded to webdev asset storage, useAmbientEngine.ts points to /manus-storage/ URLs; ambient mp3s removed from public; dist removed. Zero 404s verified on gateway.
- GitHub pushed: a2d20fb. Repo: realdogobon/Project-R01.

## Crash analysis (dual-React)
- Dev deps graph is SINGLE-instance: all 16 prebundles (react.js, react-dom_client.js, @lexkit_editor.js, framer-motion, motion_react, next-themes, recharts, lucide-react, react-image-crop, ...) import require_react from ONE shared chunk (currently chunk-H7AUDDOK.js). Only one __commonJS of react.development.js in .vite/deps.
- vite.config.ts currently: plugins react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector(), vitePluginStorageProxy(); optimizeDeps.dedupe ["react","react-dom","react-dom/client"]; server.headers Cache-Control no-store; esbuild optimizer plugin externalizeReactForOptimizer (onResolve /^react$/ -> project root node_modules/react/index.js).
- Crash is intermittent / only reproducible in the embedded preview browser (persistent profile, possibly during server-restart mid-load). My fresh loads always pass.

## Fix plan (current phase 2)
1. Add self-healing: wrap App in ErrorBoundary (create component at client/src/components/ErrorBoundary.tsx) that on fatal error auto-reloads (window.location.reload()) after a short delay, with a visible message. Mount in main.tsx.
2. Keep structural dedupe as-is.
3. Verify with checkpoint + screenshot + report to user.

## Key commands
- node /tmp/crash_test.mjs <url>        (5 runs, exit 2 if any crash)
- node /tmp/e2e_404.mjs <url>          (lists 404 URLs)
- Preview gateway: https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer
- Production: https://royscript-qeditcvm.manus.space
- User-facing: screenshot tool for "/" path; browser tool for full verification
