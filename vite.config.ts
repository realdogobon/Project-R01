import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map((entry) => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

function vitePluginStorageProxy(): Plugin {
  return {
    name: "manus-storage-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/manus-storage", async (req, res) => {
        const key = req.url?.replace(/^\//, "");
        if (!key) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing storage key");
          return;
        }

        const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
        const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

        if (!forgeBaseUrl || !forgeKey) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Storage proxy not configured");
          return;
        }

        try {
          const forgeUrl = new URL("v1/storage/presign/get", forgeBaseUrl + "/");
          forgeUrl.searchParams.set("path", key);

          const forgeResp = await fetch(forgeUrl, {
            headers: { Authorization: `Bearer ${forgeKey}` },
          });

          if (!forgeResp.ok) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Storage backend error");
            return;
          }

          const { url } = (await forgeResp.json()) as { url: string };
          if (!url) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Empty signed URL");
            return;
          }

          res.writeHead(307, { Location: url, "Cache-Control": "no-store" });
          res.end();
        } catch {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end("Storage proxy error");
        }
      });
    },
  };
}

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector(), vitePluginStorageProxy(), reactNamedExportsPlugin()];

// Dev-only shim: Vite can pre-bundle React as a default CJS export while
// application source imports named hooks. Expose those named properties from
// the same shared React object so dependency bundles cannot create a second
// hook dispatcher.
function reactNamedExportsPlugin(): Plugin {
  const re = /node_modules\/\.vite\/deps\/react(_jsx-dev-runtime|_jsx-runtime|_dom_client)?\.js(?:\?.*)?$/;
  return {
    name: "react-named-exports",
    enforce: "post",
    transform(code: string, id: string) {
      if (!re.test(id) || code.includes("// react-named-exports-shim")) return;
      const namedExports = id.includes("react_jsx-dev-runtime")
        ? ["Fragment", "jsxDEV"]
        : id.includes("react_jsx-runtime")
          ? ["Fragment", "jsx", "jsxs"]
          : [
              "Children", "Component", "Fragment", "Profiler", "PureComponent", "StrictMode", "Suspense",
              "cloneElement", "createContext", "createElement", "createFactory", "createRef", "forwardRef",
              "isValidElement", "lazy", "memo", "startTransition", "unstable_Activity", "unstable_DebugTracingMode",
              "unstable_SuspenseList", "unstable_cacheSignal", "unstable_getCacheForType", "unstable_useCacheRefresh",
              "use", "useActionState", "useCallback", "useContext", "useDebugValue", "useDeferredValue", "useEffect",
              "useEffectEvent", "useId", "useImperativeHandle", "useInsertionEffect", "useLayoutEffect", "useMemo",
              "useOptimistic", "useReducer", "useRef", "useState", "useSyncExternalStore", "useTransition", "version",
            ];
      const patched = code.replace(
        /export default require_react\(\);/,
        "const __vite_react_default = require_react();\nexport default __vite_react_default;\n" +
          namedExports.map((name) => `export const ${name} = __vite_react_default.${name};`).join("\n") +
          "\n// react-named-exports-shim",
      );
      if (patched === code) return;
      return { code: patched, map: null };
    },
  };
}

export default defineConfig({
  plugins,
  optimizeDeps: {
    // Eagerly pre-bundle every dep that imports React (directly or
    // transitively) so dev-time source imports resolve to the SAME
    // pre-bundled instance — eliminating the duplicate-React
    // "Cannot read properties of null (reading 'useState')" crash.
    include: [
      // CJS subpath that @lexkit/editor's bundled dist imports with named
      // exports ({ renderToStaticMarkup }); pre-bundling gives it a proper
      // ESM export map via needsInterop, otherwise Vite serves raw CJS and
      // the whole shell throws.

      "react",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom/server.browser",
      "motion",
      "motion/react",
      "framer-motion",
      "lucide-react",
      "react-image-crop",
    ],
    dedupe: ["react", "react-dom", "react-dom/client"],
  },
  resolve: {
    // React is a peer of the editor, motion, and Lexical packages. Explicit
    // resolver dedupe prevents pnpm's symlink paths from becoming separate
    // browser module URLs during Vite development.
    dedupe: ["react", "react-dom"],
    alias: [
      // Built-in dedupe covers app-source resolution; the optimizer plugin
      // above covers dep bundles. Kept for any deep-import edge cases.
      { find: "@", replacement: path.resolve(import.meta.dirname, "client", "src") },
      { find: "@shared", replacement: path.resolve(import.meta.dirname, "shared") },
      { find: "@assets", replacement: path.resolve(import.meta.dirname, "attached_assets") },
    ],
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false, // Will find next available port if 3000 is busy
    host: true,
    headers: {
      // Never cache prebundled optimized deps or Vite internals in dev —
      // stale query-hash chunks are the root cause of the dual-React
      // "Cannot read properties of null (reading 'useState')" error seen in
      // cached preview sessions.
      "Cache-Control": "no-store",
    },
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
