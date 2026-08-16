import { mkdirSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const base = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const evidenceDir = process.argv[2] || "/tmp/scanner-toolbar-exit-velocity";
mkdirSync(evidenceDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--window-size=1280,720"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 5 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await page.goto(`${base}/`, { waitUntil: "networkidle0", timeout: 60_000 });

const button = await page.$('button[title="AI Scanner"]');
if (!button) throw new Error("Scanner button not found");
const box = await button.boundingBox();
if (!box) throw new Error("Scanner button has no bounding box");

await page.mouse.move(20, 680);
await new Promise((resolve) => setTimeout(resolve, 120));
const startedAt = performance.now();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

const milestones = (process.env.MILESTONES || "2150,2250,2350,2450,2550,2650")
  .split(",")
  .map((value) => Number(value.trim()));
const captureMilestones = new Set(
  (process.env.CAPTURE_MILESTONES || "2350,2550,2650")
    .split(",")
    .map((value) => Number(value.trim())),
);
const samples = [];

for (const targetMs of milestones) {
  const elapsed = performance.now() - startedAt;
  if (targetMs > elapsed) await new Promise((resolve) => setTimeout(resolve, targetMs - elapsed));
  const sample = await page.evaluate(() => {
    const read = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const transform = new DOMMatrixReadOnly(style.transform);
      return {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        opacity: Number(style.opacity),
        translateY: transform.m42,
      };
    };
    return { tray: read("[data-scanner-toolbar-paper-output]"), exit: read("[data-scanner-toolbar-paper-exit]") };
  });
  samples.push({
    atMs: Number((performance.now() - startedAt).toFixed(1)),
    requestedAtMs: targetMs,
    ...sample,
  });
  if (captureMilestones.has(targetMs)) {
    await button.screenshot({ path: `${evidenceDir}/${targetMs}.png` });
  }
}

const withVelocity = samples.map((sample, index) => {
  if (index === 0) return { ...sample, trayVelocityPxPerSecond: null, exitVelocityPxPerSecond: null };
  const previous = samples[index - 1];
  const deltaSeconds = (sample.atMs - previous.atMs) / 1_000;
  return {
    ...sample,
    trayVelocityPxPerSecond: Number(((sample.tray.translateY - previous.tray.translateY) / deltaSeconds).toFixed(2)),
    exitVelocityPxPerSecond: Number(((sample.exit.translateY - previous.exit.translateY) / deltaSeconds).toFixed(2)),
  };
});

writeFileSync(`${evidenceDir}/report.json`, JSON.stringify(withVelocity, null, 2));
console.log(JSON.stringify(withVelocity, null, 2));
await browser.close();
