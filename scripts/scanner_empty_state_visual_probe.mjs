import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const previewUrl = process.argv[2] || process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const mode = process.env.PROBE_THEME === "dark" ? "dark" : "light";
const viewport = {
  width: Number(process.env.PROBE_WIDTH || 1280),
  height: Number(process.env.PROBE_HEIGHT || 820),
};
const outputDir = process.argv[3] || `/tmp/scanner-empty-state-${mode}-${viewport.width}`;
fs.mkdirSync(outputDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  defaultViewport: viewport,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const context = await browser.createBrowserContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("requestfailed", (request) => {
  const failure = request.failure()?.errorText;
  if (failure) errors.push(`request: ${failure} ${request.url()}`);
});

const report = { previewUrl, mode, viewport, errors, emptyState: null, status: "started" };
try {
  await page.goto(`${previewUrl.replace(/\/$/, "")}/?scannerEmptyStateProbe=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90_000 });
  await page.evaluate((theme) => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, mode);
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 30_000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("[data-scanner-empty-upload-state]", { timeout: 30_000 });

  report.emptyState = await page.evaluate(() => {
    const rect = (element) => {
      const value = element?.getBoundingClientRect();
      return value ? { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height } : null;
    };
    const state = document.querySelector("[data-scanner-empty-upload-state]");
    const modal = document.querySelector("[data-scanner-modal-shell]");
    const actionBar = document.querySelector("[data-scanner-action-bar]");
    const local = document.querySelector("[data-scanner-local-upload]");
    const link = document.querySelector("[data-scanner-import-url]");
    const sequence = document.querySelector("[data-scanner-image-sequence]");
    const stateRect = rect(state);
    const modalRect = rect(modal);
    const actionBarRect = rect(actionBar);
    const controls = [local, link, sequence].map(rect);
    const withinState = controls.every((control) => Boolean(control && stateRect && control.left >= stateRect.left && control.right <= stateRect.right && control.top >= stateRect.top && control.bottom <= stateRect.bottom));
    const withinModal = Boolean(stateRect && modalRect && stateRect.left >= modalRect.left && stateRect.right <= modalRect.right && stateRect.top >= modalRect.top && stateRect.bottom <= modalRect.bottom);
    const clearOfActionBar = Boolean(stateRect && actionBarRect && stateRect.bottom <= actionBarRect.top);
    const computed = state ? getComputedStyle(state) : null;
    return {
      stateRect,
      modalRect,
      actionBarRect,
      controls,
      withinState,
      withinModal,
      clearOfActionBar,
      className: state?.className ?? null,
      computedLayout: computed
        ? { height: computed.height, minHeight: computed.minHeight, marginTop: computed.marginTop, marginBottom: computed.marginBottom }
        : null,
      text: state?.textContent?.replace(/\s+/g, " ").trim() ?? null,
    };
  });
  await page.screenshot({ path: path.join(outputDir, "scanner-empty-state.png"), fullPage: false });
  if (!report.emptyState?.withinState || !report.emptyState?.withinModal || !report.emptyState?.clearOfActionBar) throw new Error("Empty-state controls overflow their integrated surface");
  if (errors.length > 0) throw new Error(`Unexpected browser errors: ${errors.join(" | ")}`);
  report.status = "passed";
} finally {
  fs.writeFileSync(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
  await context.close();
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
