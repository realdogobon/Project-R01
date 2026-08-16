import { mkdirSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const base = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const evidenceDir = process.argv[2] || "/tmp/scanner-toolbar-tail-storyboard";
const moments = [2_350, 2_430, 2_480, 2_540, 2_600, 2_660, 2_700];
mkdirSync(evidenceDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--window-size=1280,720"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 8 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await page.goto(`${base}/`, { waitUntil: "networkidle0", timeout: 60_000 });
await page.addStyleTag({
  content: `
    .scanner-paper-sheet--feeding {
      animation-play-state: paused !important;
      animation-delay: var(--scanner-toolbar-freeze-time, 0ms) !important;
    }
  `,
});

const button = await page.$('button[title="AI Scanner"]');
if (!button) throw new Error("Scanner button not found");
const box = await button.boundingBox();
if (!box) throw new Error("Scanner button has no bounding box");

const frames = [];
for (const moment of moments) {
  await page.evaluate((currentMoment) => {
    document.documentElement.style.setProperty("--scanner-toolbar-freeze-time", `-${currentMoment}ms`);
  }, moment);
  await page.mouse.move(20, 680);
  await new Promise((resolve) => setTimeout(resolve, 40));
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await new Promise((resolve) => setTimeout(resolve, 80));

  const snapshot = await page.evaluate(() => {
    const read = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        opacity: Number(style.opacity),
        transform: style.transform,
        top: rect.top,
        bottom: rect.bottom,
      };
    };
    return {
      output: read("[data-scanner-toolbar-paper-output]"),
      exit: read("[data-scanner-toolbar-paper-exit]"),
    };
  });

  await button.screenshot({ path: `${evidenceDir}/${moment}.png` });
  frames.push({ moment, ...snapshot });
}

writeFileSync(`${evidenceDir}/report.json`, JSON.stringify(frames, null, 2));
console.log(JSON.stringify(frames, null, 2));
await browser.close();
