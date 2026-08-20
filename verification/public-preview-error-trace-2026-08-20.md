# Public Preview Error Trace — 2026-08-20

- A fresh managed-preview navigation rendered the RoyScript workspace normally.
- The transformed `/src/main.tsx` module contained neither `/@vite/client` nor `createHotContext`.
- The browser resource list later contained `/@vite/client` only because the diagnostic probe explicitly fetched that route; this is not evidence that the application module graph imported it.
- The preview injects `/__manus__/debug-collector.js`, so the next diagnostic step is a clean-navigation console trace and inspection of the collector’s error-reporting path.
