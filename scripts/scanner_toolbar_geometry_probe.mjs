import { mkdirSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const base = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const evidenceDir = process.argv[2] || "/tmp/scanner-toolbar-geometry";
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
await new Promise((resolve) => setTimeout(resolve, 800));

const button = await page.$('button[title="AI Scanner"]');
if (!button) throw new Error("Scanner button not found");
const buttonBox = await button.boundingBox();
if (!buttonBox) throw new Error("Scanner button has no bounding box");

async function capture(label, delay) {
  await page.mouse.move(20, 680);
  await new Promise((resolve) => setTimeout(resolve, 120));
  await page.mouse.move(buttonBox.x + buttonBox.width / 2, buttonBox.y + buttonBox.height / 2);
  await new Promise((resolve) => setTimeout(resolve, delay));
  const geometry = await page.evaluate(() => {
    const printer = document.querySelector("[data-scanner-toolbar-icon] svg");
    const entry = document.querySelector("[data-scanner-toolbar-paper-entry]");
    const output = document.querySelector("[data-scanner-toolbar-paper-output]");
    const read = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const full = element.getBoundingClientRect();
      const clipRects = Array.from(element.getClientRects()).map((r) => ({ top: r.top, left: r.left, bottom: r.bottom, right: r.right }));
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, widthPx: rect.width, heightPx: rect.height, clipRects, computedWidth: style.width, computedHeight: style.height, opacity: style.opacity, transform: style.transform };
    };
    return { svg: printer?.outerHTML ?? null, printer: read(printer), entry: read(entry), output: read(output) };
  });
  await page.evaluate(() => {
    document.querySelectorAll("[data-scanner-toolbar-paper-entry], [data-scanner-toolbar-paper-output]").forEach((segment) => {
      if (segment instanceof HTMLElement) segment.style.animationPlayState = "paused";
    });
  });
  await button.screenshot({ path: `${evidenceDir}/${label}.png` });
  await page.evaluate(() => {
    document.querySelectorAll("[data-scanner-toolbar-paper-entry], [data-scanner-toolbar-paper-output]").forEach((segment) => {
      if (segment instanceof HTMLElement) segment.style.animationPlayState = "";
    });
  });
  return geometry;
}

const report = {
  entry: await capture("01-entry", 900),
  inside: await capture("02-inside", 1_900),
  tray: await capture("03-tray", 2_350),
  exit: await capture("04-exit", 2_580),
};
writeFileSync(`${evidenceDir}/report.json`, JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report, null, 2));
