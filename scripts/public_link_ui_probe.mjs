import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const previewUrl = process.argv[2] || process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const documentUrl = process.argv[3] || "https://blogmedia.testbook.com/blog/wp-content/uploads/2022/03/best-4000-smart-question-bank-ssc-general-knowledge-in-english-next-generation-smartbook-by-testbook-and-s-chand-026cc109.pdf";
const outputDir = process.argv[4] || "/tmp/public-link-ui-probe";
fs.mkdirSync(outputDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  defaultViewport: { width: 1280, height: 820 },
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const context = await browser.createBrowserContext();
const page = await context.newPage();
const report = { previewUrl, documentUrl, requests: [], responses: [], rpcOk: null, errors: [], imported: false, fileType: null, status: null };

page.on("console", (message) => {
  if (message.type() === "error") report.errors.push(message.text());
});
page.on("pageerror", (error) => report.errors.push(error.message));
page.on("request", (request) => {
  if (request.url().includes("/api/trpc/")) report.requests.push({ method: request.method(), url: request.url() });
});
page.on("response", (response) => {
  if (response.url().includes("/api/trpc/")) {
    report.responses.push({ status: response.status(), url: response.url() });
  }
});

const importResponseResult = (payload) => {
  const batchEntry = Array.isArray(payload) ? payload[0] : payload;
  const data = batchEntry?.result?.data;
  return data?.json ?? data ?? null;
};

try {
  await page.goto(`${previewUrl.replace(/\/$/, "")}/?publicLinkUiProbe=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90_000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 30_000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 30_000 });

  const urlButton = "[data-scanner-import-url]";
  if (!await page.$(urlButton)) throw new Error("URL import button was not found");

  const importResponse = page.waitForResponse(
    (response) => response.url().includes("/api/trpc/scanner.importPublicLink") && response.request().method() === "POST",
    { timeout: 30_000 },
  );
  page.once("dialog", (dialog) => void dialog.accept(documentUrl));
  await page.click(urlButton);
  const response = await importResponse;
  const result = importResponseResult(await response.json());
  report.rpcOk = typeof result?.ok === "boolean" ? result.ok : null;

  if (report.rpcOk !== false) {
    await page.waitForFunction(
      () => Boolean(document.querySelector("[data-scanner-stage] canvas, [data-scanner-stage] img")),
      { timeout: 90_000 },
    ).catch(() => undefined);
  }

  const state = await page.evaluate(() => ({
    hasLoadedPreview: Boolean(document.querySelector("[data-scanner-stage] canvas, [data-scanner-stage] img")),
    text: document.body.innerText,
    selects: [...document.querySelectorAll("select")].map((select) => ({ value: select.value, options: [...select.options].map((option) => option.textContent) })),
  }));
  report.imported = state.hasLoadedPreview;
  report.fileType = state.selects.find((select) => select.options.some((option) => option?.toLowerCase().includes("pdf")))?.value ?? null;
  report.status = report.rpcOk === false ? "unavailable" : state.hasLoadedPreview ? "imported" : "no-visible-result";
  await page.screenshot({ path: path.join(outputDir, "scanner-public-link-result.png"), fullPage: false });
} finally {
  fs.writeFileSync(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
  await context.close();
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
