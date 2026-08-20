import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const viteConfigPath = path.resolve(import.meta.dirname, "../vite.config.ts");
const viteBridgePath = path.resolve(import.meta.dirname, "_core/vite.ts");

describe("managed preview HMR transport contract", () => {
  it("disables the unavailable managed-preview HMR socket instead of emitting a broken fallback route", () => {
    const config = fs.readFileSync(viteConfigPath, "utf8");

    expect(config).toContain("hmr: false");
  });

  it("preserves an explicit HMR disable while retaining the shared-server setup for future environments", () => {
    const bridge = fs.readFileSync(viteBridgePath, "utf8");

    expect(bridge).toContain("const configuredServer = viteConfig.server ?? {};");
    expect(bridge).toContain("const hmr = configuredServer.hmr === false");
    expect(bridge).toContain("...configuredServer,");
    expect(bridge).toContain("hmr,");
    expect(bridge).toContain("server,");
    expect(bridge).toContain("server: serverOptions,");
  });

  it("removes Vite's injected client bootstrap from the served document when HMR is explicitly disabled", () => {
    const bridge = fs.readFileSync(viteBridgePath, "utf8");

    expect(bridge).toContain("const responsePage = hmr === false");
    expect(bridge).toContain("/@vite/client");
    expect(bridge).toContain(".end(responsePage)");
  });

  it("serves a no-op Vite client before Vite middleware so stale preview documents cannot open a socket", () => {
    const bridge = fs.readFileSync(viteBridgePath, "utf8");
    const clientGuardIndex = bridge.indexOf('app.use("/@vite/client"');
    const viteMiddlewareIndex = bridge.indexOf("app.use(vite.middlewares)");

    expect(clientGuardIndex).toBeGreaterThan(-1);
    expect(viteMiddlewareIndex).toBeGreaterThan(clientGuardIndex);
    expect(bridge).toContain('"Cache-Control": "no-store, no-cache, max-age=0, must-revalidate"');
    expect(bridge).toContain("MANAGED_PREVIEW_VITE_CLIENT_COMPAT");
    expect(bridge).toContain("export function createHotContext(ownerPath)");
    expect(bridge).toContain("export function updateStyle(id, css)");
    expect(bridge).toContain("export function removeStyle(id)");
    expect(bridge).not.toContain("new WebSocket");
  });
});
