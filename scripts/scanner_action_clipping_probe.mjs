import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const previewUrl = process.argv[2] || process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const documentUrl = process.argv[3] || "https://blogmedia.testbook.com/blog/wp-content/uploads/2022/03/best-4000-smart-question-bank-ssc-general-knowledge-in-english-next-generation-smartbook-by-testbook-and-s-chand-026cc109.pdf";
const localFilePath = process.env.LOCAL_FILE || null;
const viewport = {
  width: Number(process.env.PROBE_WIDTH || 1280),
  height: Number(process.env.PROBE_HEIGHT || 820),
};
const outputDir = process.argv[4] || "/tmp/scanner-action-clipping";
fs.mkdirSync(outputDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  defaultViewport: viewport,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const context = await browser.createBrowserContext();
const page = await context.newPage();
const report = { previewUrl, documentUrl, localFilePath, viewport, rpcOk: null, loaded: false, geometry: null, errors: [] };

page.on("console", (message) => {
  if (message.type() === "error") report.errors.push(message.text());
});
page.on("pageerror", (error) => report.errors.push(error.message));

const getResult = (payload) => {
  const entry = Array.isArray(payload) ? payload[0] : payload;
  return entry?.result?.data?.json ?? entry?.result?.data ?? null;
};

try {
  await page.goto(`${previewUrl.replace(/\/$/, "")}/?scannerActionProbe=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90_000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 30_000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 30_000 });

  if (localFilePath) {
    const input = await page.$('input[type="file"][accept*=".pdf"]');
    if (!input) throw new Error("Primary scanner file input was not found");
    await input.uploadFile(localFilePath);
    report.rpcOk = true;
  } else {
    const urlTrigger = "[data-scanner-import-url]";
    if (!await page.$(urlTrigger)) throw new Error("URL import trigger was not found");

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/trpc/scanner.importPublicLink") && response.request().method() === "POST",
      { timeout: 30_000 },
    );
    page.once("dialog", (dialog) => void dialog.accept(documentUrl));
    await page.click(urlTrigger);
    const response = await responsePromise;
    const result = getResult(await response.json());
    report.rpcOk = typeof result?.ok === "boolean" ? result.ok : null;
    if (report.rpcOk !== true) throw new Error("Public document did not import");
  }

  await page.waitForFunction(
    () => Boolean(document.querySelector("[data-scanner-stage] canvas, [data-scanner-stage] img")),
    { timeout: 90_000 },
  );
  report.loaded = true;
  report.geometry = await page.evaluate(() => {
    const rect = (element) => {
      const value = element?.getBoundingClientRect();
      return value ? { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height } : null;
    };
    const shell = document.querySelector("[data-scanner-modal-shell]");
    const scan = document.querySelector("[data-scanner-primary-action]");
    const footer = document.querySelector("[data-scanner-action-bar]");
    const shellRect = rect(shell);
    const scanRect = rect(scan);
    const footerRect = rect(footer);
    return {
      shell: shellRect,
      scan: scanRect,
      footer: footerRect,
      footerScrollWidth: footer?.scrollWidth ?? null,
      footerClientWidth: footer?.clientWidth ?? null,
      scanFullyVisible: Boolean(shellRect && scanRect && scanRect.left >= shellRect.left && scanRect.right <= shellRect.right && scanRect.top >= shellRect.top && scanRect.bottom <= shellRect.bottom),
      scanText: scan?.textContent?.trim() ?? null,
      pageCounter: [...document.querySelectorAll("span")].find((element) => /^\d+\/\d+$/.test(element.textContent?.trim() || ""))?.textContent?.trim() ?? null,
    };
  });
  await page.screenshot({ path: path.join(outputDir, "scanner-action-clipping.png"), fullPage: false });
} finally {
  fs.writeFileSync(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
  await context.close();
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
