import fs from "node:fs";
import puppeteer from "puppeteer-core";

const previewUrl = process.argv[2] || "http://127.0.0.1:3000";
const outputPath = process.argv[3] || "/tmp/scanner-live-ocr-surface-debug.json";
const fixturePath = "/tmp/royscript-scanner-fixture.png";

if (!fs.existsSync(fixturePath)) throw new Error("The established scanner OCR fixture is unavailable");

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  defaultViewport: { width: 1280, height: 820 },
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const context = await browser.createBrowserContext();
const page = await context.newPage();

try {
  await page.goto(`${previewUrl.replace(/\/$/, "")}/?scannerSurfaceDebug=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });
  const fileInput = await page.$('input[type=file][accept*=".pdf"]');
  if (!fileInput) throw new Error("The primary scanner file input was not found");
  await fileInput.uploadFile(fixturePath);
  await page.waitForSelector("[data-scanner-upload-selected]", { timeout: 10000 });
  await page.click("[data-scanner-local-upload]");
  await new Promise((resolve) => setTimeout(resolve, 2500));
  await page.click('[title="Crop Tool"]');
  await new Promise((resolve) => setTimeout(resolve, 250));
  const summary = await page.evaluate(() => {
    const viewport = document.querySelector("#scanner-viewport");
    const describe = (node) => {
      const rect = node.getBoundingClientRect();
      return {
        tag: node.tagName,
        id: node.id,
        className: typeof node.className === "string" ? node.className : "",
        sourceKind: node instanceof HTMLImageElement ? (node.currentSrc || node.src).split(":", 1)[0] : undefined,
        naturalWidth: node instanceof HTMLImageElement ? node.naturalWidth : undefined,
        naturalHeight: node instanceof HTMLImageElement ? node.naturalHeight : undefined,
        complete: node instanceof HTMLImageElement ? node.complete : undefined,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        display: getComputedStyle(node).display,
        visibility: getComputedStyle(node).visibility,
        opacity: getComputedStyle(node).opacity,
      };
    };
    return {
      stage: "crop-active",
      viewport: viewport ? describe(viewport) : null,
      viewportImages: viewport ? [...viewport.querySelectorAll("img, canvas")].map(describe) : [],
      allVisibleImages: [...document.querySelectorAll("img")].map(describe).filter((item) => item.rect.width > 0 && item.rect.height > 0),
      text: viewport?.textContent?.trim().slice(0, 500) || "",
      bodySnippet: document.body.innerText.slice(0, 900),
    };
  });
  await page.screenshot({ path: "/tmp/scanner-live-ocr-surface-debug.png", fullPage: false });
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await context.close();
  await browser.close();
}
