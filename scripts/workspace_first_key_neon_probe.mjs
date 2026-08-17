import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const previewUrl = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const outputDir = "/tmp/workspace-first-key-neon";
const sampleDelays = [0, 16, 50, 120, 250, 500, 4500];

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

await page.goto(previewUrl, { waitUntil: "networkidle2" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle2" });

const editorSelector = '[contenteditable="true"]';
await page.waitForSelector(editorSelector, { timeout: 10_000 });
await page.click(editorSelector);

const capture = async (label) => {
  const sample = await page.evaluate(() => {
    const trail = document.querySelector(".tab-neon-trail-path");
    const pulse = document.querySelector(".tab-neon-pulse-path");
    const readPath = (element) => {
      if (!element) return null;
      const styles = getComputedStyle(element);
      return {
        opacity: styles.opacity,
        strokeDasharray: styles.strokeDasharray,
        strokeDashoffset: styles.strokeDashoffset,
        animationName: styles.animationName,
        animationPlayState: styles.animationPlayState,
        animationDelay: styles.animationDelay,
        animationDuration: styles.animationDuration,
      };
    };
    const tab = document.querySelector('[data-workspace-active-tab]') || document.querySelector('.group.relative.h-full.w-44');
    const tabRect = tab?.getBoundingClientRect();
    return {
      atMs: performance.now(),
      trail: readPath(trail),
      pulse: readPath(pulse),
      tab: tabRect ? { x: tabRect.x, y: tabRect.y, width: tabRect.width, height: tabRect.height } : null,
    };
  });
  await page.screenshot({ path: path.join(outputDir, `${label}.png`) });
  return { label, ...sample };
};

const samples = [await capture("before-key")];
await page.keyboard.type("a");
for (const delay of sampleDelays) {
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  samples.push(await capture(`after-${delay}ms`));
}

await fs.writeFile(
  path.join(outputDir, "report.json"),
  JSON.stringify({ previewUrl, samples, consoleErrors }, null, 2),
);

console.log(JSON.stringify({ outputDir, samples, consoleErrors }, null, 2));
await browser.close();
