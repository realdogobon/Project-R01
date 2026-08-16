import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const previewUrl = process.argv[2] || process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const outputPath = process.argv[3] || "/tmp/scanner-live-gemini-ocr.json";
const fixturePath = "/tmp/royscript-scanner-fixture.png";
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) throw new Error("GEMINI_API_KEY is not configured for the live OCR validation");
if (!fs.existsSync(fixturePath)) throw new Error("The established scanner OCR fixture is unavailable");

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  defaultViewport: { width: 1280, height: 820 },
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const context = await browser.createBrowserContext();
const page = await context.newPage();
const result = { providerRequests: 0, providerPostRequests: 0, scanCompleted: false, deliveredToWorkspace: false, workspaceContentLength: 0, browserFailure: false };

try {
  await page.evaluateOnNewDocument((key) => {
    localStorage.setItem("royscript_ai_keys", JSON.stringify({ gemini: key }));
    localStorage.removeItem("ais_saved_scan_extracts");
  }, apiKey);
  page.on("request", (request) => {
    if (new URL(request.url()).hostname === "generativelanguage.googleapis.com") {
      result.providerRequests += 1;
      if (request.method() === "POST") result.providerPostRequests += 1;
    }
  });
  page.on("pageerror", () => { result.browserFailure = true; });

  await page.goto(`${previewUrl.replace(/\/$/, "")}/?scannerLiveGemini=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });

  const fileInput = await page.$('input[type=file][accept*=".pdf"]');
  if (!fileInput) throw new Error("The primary scanner file input was not found");
  await fileInput.uploadFile(fixturePath);
  await page.waitForSelector("[data-scanner-upload-selected]", { timeout: 10000 });
  await page.click("[data-scanner-local-upload]");
  await page.waitForFunction(
    () => [...document.querySelectorAll("#scanner-viewport img")].some((node) => {
      if (!(node instanceof HTMLImageElement) || !node.complete || node.naturalWidth <= 0) return false;
      const rect = node.getBoundingClientRect();
      return Number(getComputedStyle(node).opacity) > 0.1 && rect.width > 8 && rect.height > 8;
    }),
    { timeout: 60000 },
  );

  await page.click('[title="Crop Tool"]');
  await page.waitForFunction(
    () => [...document.querySelectorAll("#scanner-viewport img")].some((node) => {
      if (!(node instanceof HTMLImageElement) || !node.complete || node.naturalWidth <= 0) return false;
      const rect = node.getBoundingClientRect();
      return Number(getComputedStyle(node).opacity) > 0.1 && rect.width > 8 && rect.height > 8;
    }),
    { timeout: 10000 },
  );
  const bounds = await page.evaluate(() => {
    const visiblePage = [...document.querySelectorAll("#scanner-viewport img")].find((node) => {
      if (!(node instanceof HTMLImageElement) || !node.complete || node.naturalWidth <= 0) return false;
      const rect = node.getBoundingClientRect();
      return Number(getComputedStyle(node).opacity) > 0.1 && rect.width > 8 && rect.height > 8;
    });
    if (!(visiblePage instanceof HTMLImageElement)) return null;
    const rect = visiblePage.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  if (!bounds) throw new Error("The scanner document surface was not available for cropping");
  await page.mouse.move(bounds.x + bounds.width * 0.12, bounds.y + bounds.height * 0.12);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.88, bounds.y + bounds.height * 0.30, { steps: 10 });
  await page.mouse.up();
  await page.click('[title="Add Clip"]');
  await page.waitForFunction(() => document.body.innerText.includes("Queued Clips (1)"), { timeout: 10000 });

  await page.click('[title="Scan"]');
  await page.waitForSelector('button[title="Send extracted text"]', { timeout: 90000 });
  result.scanCompleted = result.providerPostRequests === 1;

  const destination = await page.evaluate(() => {
    const select = [...document.querySelectorAll("select")].find((node) => [...node.options].some((option) => option.value === "doc_editor"));
    if (!(select instanceof HTMLSelectElement)) return false;
    select.value = "doc_editor";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  });
  if (!destination) throw new Error("The scanner destination control was unavailable");
  await page.click('button[title="Send extracted text"]');
  await page.waitForFunction(() => !document.querySelector("#scanner-viewport"), { timeout: 15000 });
  result.deliveredToWorkspace = true;
  result.workspaceContentLength = await page.evaluate(() => document.querySelector('[contenteditable="true"]')?.textContent?.trim().length || 0);
} finally {
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  await context.close();
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
