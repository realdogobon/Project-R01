import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const previewUrl = process.argv[2] || "http://127.0.0.1:3000";
const outputPath = process.argv[3] || "/tmp/scanner-capacity-boundary.json";
const sourcePdf = "/home/ubuntu/upload/Volume_02.pdf";
const underLimitPdf = "/tmp/scanner-capacity-24mb.pdf";
const overLimitPdf = "/tmp/scanner-capacity-50mb-plus.pdf";
const MB = 1_000_000;

function ensureSizedPdf(targetPath, targetBytes) {
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).size === targetBytes) return;
  fs.copyFileSync(sourcePdf, targetPath);
  const handle = fs.openSync(targetPath, "r+");
  fs.ftruncateSync(handle, targetBytes);
  fs.closeSync(handle);
}

if (!fs.existsSync(sourcePdf)) throw new Error("The established multipage PDF fixture is unavailable");
ensureSizedPdf(underLimitPdf, 24 * MB);
ensureSizedPdf(overLimitPdf, 50 * MB + 1);

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  defaultViewport: { width: 1280, height: 820 },
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
const result = { accepted24Mb: false, rejectedOver50MbSilently: false, finalState: null, providerRequests: 0, browserFailure: false };

try {
  page.on("request", (request) => {
    if (new URL(request.url()).hostname === "generativelanguage.googleapis.com") result.providerRequests += 1;
  });
  page.on("pageerror", () => { result.browserFailure = true; });
  await page.goto(`${previewUrl.replace(/\/$/, "")}/?scannerCapacityBoundary=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });

  const input = await page.$('input[type=file][accept*=".pdf"]');
  if (!input) throw new Error("Primary scanner document input was not found");
  await input.uploadFile(underLimitPdf);
  await page.waitForSelector("[data-scanner-upload-selected]", { timeout: 15000 });
  result.accepted24Mb = true;

  await page.click("[data-scanner-remove-selected-upload]");
  await page.waitForFunction(() => !document.querySelector("[data-scanner-upload-selected]"), { timeout: 10000 });
  await input.uploadFile(overLimitPdf);
  await page.waitForSelector("[data-scanner-upload-selected]", { timeout: 10000 });
  await page.click("[data-scanner-local-upload]");
  await new Promise((resolve) => setTimeout(resolve, 1100));
  result.finalState = await page.evaluate(() => {
    const visibleErrorLabels = [...document.querySelectorAll("[role=alert]")].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
    }).map((element) => element.textContent?.trim() || "");
    return {
      emptyState: Boolean(document.querySelector("[data-scanner-empty-upload-state]")),
      selectedState: Boolean(document.querySelector("[data-scanner-upload-selected]")),
      pendingState: Boolean(document.querySelector("[data-scanner-upload-pending]")),
      visibleAlertLabels: visibleErrorLabels,
    };
  });
  result.rejectedOver50MbSilently = Boolean(result.finalState.emptyState) && !result.finalState.selectedState && !result.finalState.pendingState && result.finalState.visibleAlertLabels.length === 0;
} finally {
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  await browser.close();
}

if (!result.accepted24Mb || !result.rejectedOver50MbSilently || result.providerRequests !== 0 || result.browserFailure) {
  throw new Error(`Scanner 50 MB boundary failed: ${JSON.stringify(result)}`);
}
console.log(JSON.stringify(result, null, 2));
