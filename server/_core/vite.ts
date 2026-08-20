import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

// Vite keeps importing these helpers from transformed CSS modules even when
// HMR is disabled. This deliberately supplies only that browser-facing API:
// it never creates a WebSocket, starts a reconnect loop, or reports a transport
// error to the managed preview collector.
const MANAGED_PREVIEW_VITE_CLIENT_COMPAT = `
const hotModules = new Map();

export function createHotContext(ownerPath) {
  let module = hotModules.get(ownerPath);
  if (!module) {
    module = { data: {}, listeners: new Map() };
    hotModules.set(ownerPath, module);
  }

  const on = (event, callback) => {
    const callbacks = module.listeners.get(event) || [];
    callbacks.push(callback);
    module.listeners.set(event, callbacks);
  };

  return {
    data: module.data,
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on,
    off(event, callback) {
      const callbacks = module.listeners.get(event) || [];
      module.listeners.set(event, callbacks.filter((candidate) => candidate !== callback));
    },
    send() {},
  };
}

export function injectQuery(url, query) {
  const [pathWithSearch, hash = ""] = url.split("#");
  const separator = pathWithSearch.includes("?") ? "&" : "?";
  return pathWithSearch + separator + query + (hash ? "#" + hash : "");
}

export function updateStyle(id, css) {
  if (typeof document === "undefined") return;
  let style = document.querySelector('style[data-vite-dev-id="' + id + '"]');
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("data-vite-dev-id", id);
    document.head.appendChild(style);
  }
  style.textContent = css;
}

export function removeStyle(id) {
  document.querySelector('style[data-vite-dev-id="' + id + '"]')?.remove();
}

export class ErrorOverlay extends HTMLElement {}
`;

export async function setupVite(app: Express, server: Server) {
  const configuredServer = viteConfig.server ?? {};
  const hmr = configuredServer.hmr === false
    ? false
    : {
        ...(typeof configuredServer.hmr === "object" ? configuredServer.hmr : {}),
        server,
      };
  const serverOptions = {
    // Keep the complete preview transport configuration from vite.config.ts.
    // Replacing the server block here silently drops host, proxy-safe headers,
    // and future HMR settings while the bridge attaches this shared HTTP server.
    ...configuredServer,
    middlewareMode: true,
    // Preserve an explicit HMR disable for the managed preview. If HMR is
    // enabled in a future environment, attach Vite to the shared HTTP server.
    hmr,
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  // A previously cached preview document can still request Vite's client even
  // after the transformed HTML has stopped injecting it. The managed proxy
  // cannot carry that long-lived socket, so guard the transport at the route
  // boundary before Vite's own middleware can serve its WebSocket client. The
  // compatibility exports keep Vite-transformed CSS modules executable.
  if (hmr === false) {
    app.use("/@vite/client", (_req, res) => {
      res
        .status(200)
        .set({
          "Content-Type": "application/javascript",
          "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
        })
        .end(MANAGED_PREVIEW_VITE_CLIENT_COMPAT);
    });
  }

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      // Vite injects /@vite/client into every transformed dev document even
      // when HMR is disabled. In the managed preview that client still opens
      // a socket and falls back to the browser's localhost, which is
      // unreachable. Remove only this transport bootstrap for the explicit
      // no-HMR configuration; all application modules continue to be served
      // by Vite as usual.
      const responsePage = hmr === false
        ? page.replace(/<script type="module" src="\/@vite\/client"><\/script>\s*/, "")
        : page;
      res.status(200).set({
        "Content-Type": "text/html",
        "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
      }).end(responsePage);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
