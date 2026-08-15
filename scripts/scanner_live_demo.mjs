import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const previewUrl = process.argv[2] || process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const outDir = process.argv[3] || "/tmp/scanner-live-demo";
const fixtures = {
  image: "/home/ubuntu/upload/pasted_file_mn5PFv_image.png",
  jpeg: "/tmp/scanner-audit/fixtures/supported.jpg",
  webp: "/tmp/scanner-audit/fixtures/supported.webp",
  largePdf: "/tmp/scanner-audit/cp43-complete-issue.pdf",
  markdown: "/tmp/scanner-audit/fixtures/supported.md",
};
const publicTextUrl = "https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore";
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

for (const [name, fixture] of Object.entries(fixtures)) {
  if (!fs.existsSync(fixture)) throw new Error(`Live demo fixture missing: ${name}`);
}
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  defaultViewport: { width: 1280, height: 820 },
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const context = await browser.createBrowserContext();
const page = await context.newPage();
const errors = [];
const providerRequests = [];

page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
await page.evaluateOnNewDocument(() => {
  localStorage.setItem("royscript_ai_keys", JSON.stringify({ gemini: "live-demo-mock-key" }));
  localStorage.removeItem("ais_saved_scan_extracts");
});
await page.setRequestInterception(true);
page.on("request", (request) => {
  const target = new URL(request.url());
  if (target.hostname === "generativelanguage.googleapis.com") {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
    if (request.method() === "OPTIONS") {
      void request.respond({ status: 204, headers }).catch(() => undefined);
      return;
    }
    providerRequests.push(request.url());
    void request.respond({
      status: 200,
      contentType: "application/json",
      headers,
      body: JSON.stringify({ candidates: [{ content: { parts: [{ text: "Live scanner demo text: crop, queue, scan, and send all completed through the normal workflow." }] } }] }),
    }).catch(() => undefined);
    return;
  }
  void request.continue().catch(() => undefined);
});

const capture = async (name) => {
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
};
const openScanner = async (suffix) => {
  await page.goto(`${previewUrl.replace(/\/$/, "")}/?scannerLiveDemo=${suffix}-${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });
};
const primaryInput = async () => {
  const input = await page.$('input[type=file][accept*=".pdf"]');
  if (!input) throw new Error("Primary scanner uploader was not found");
  return input;
};
const visualReady = () => page.waitForFunction(
  () => [...document.querySelectorAll("#scanner-viewport img, #scanner-viewport canvas")]
    .some((candidate) => candidate instanceof HTMLImageElement && candidate.complete && candidate.naturalWidth > 0),
  { timeout: 60000 },
);

const report = { previewUrl, outDir, providerRequests: 0, errors, steps: [] };
try {
  await openScanner("empty");
  await capture("01-empty-scanner.png");
  report.steps.push("empty-scanner");

  const normalInput = await primaryInput();
  await normalInput.uploadFile(fixtures.image);
  await visualReady();
  await capture("02-image-uploaded.png");
  report.steps.push("image-upload-preview");

  await page.click('[title="Crop Tool"]');
  const surface = await page.$("[data-scanner-document-surface]");
  const bounds = await surface?.boundingBox();
  if (!bounds) throw new Error("Crop surface was not available");
  await page.mouse.move(bounds.x + bounds.width * 0.22, bounds.y + bounds.height * 0.22);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * 0.76, { steps: 14 });
  await page.mouse.up();
  await page.click('[title="Add Clip"]');
  await page.waitForFunction(() => document.body.innerText.includes("Queued Clips (1)"), { timeout: 10000 });
  await capture("03-crop-and-queued-clip.png");
  report.steps.push("crop-and-clip");

  await page.click('[title="Scan"]');
  await page.waitForSelector('[title="Stop scan"]', { timeout: 10000 });
  await capture("04-scan-to-stop-preflight.png");
  await page.click('[title="Stop scan"]');
  await page.waitForSelector('[title="Scan"]', { timeout: 10000 });
  report.steps.push("scan-to-stop-preflight");

  await page.click('[title="Scan"]');
  await page.waitForSelector('button[title="Send extracted text"]', { timeout: 60000 });
  await capture("05-scan-complete.png");
  report.steps.push("scan-complete-with-mock-provider");

  const destination = await page.evaluate(() => {
    const selector = [...document.querySelectorAll("select")].find((candidate) => [...candidate.options].some((option) => option.value === "doc_editor"));
    if (!selector) return null;
    selector.id = "scanner-live-demo-destination";
    return "#scanner-live-demo-destination";
  });
  if (!destination) throw new Error("Destination selector was not available");
  await page.select(destination, "doc_editor");
  await page.click('button[title="Send extracted text"]');
  await page.waitForFunction(() => !document.querySelector("#scanner-viewport"), { timeout: 10000 });
  await capture("06-sent-to-workspace.png");
  report.steps.push("send-to-workspace");

  await openScanner("limits-and-imports");
  const oversizeInput = await primaryInput();
  await oversizeInput.uploadFile(fixtures.largePdf);
  await sleep(800);
  const oversizeRejected = await page.evaluate(() => !document.querySelector("#scanner-viewport img[alt='Scanned Document Paper Element']") && document.body.innerText.includes("Images & PDFs: 20 MB per file"));
  if (!oversizeRejected) throw new Error("100 MB PDF did not remain outside the scanner ingestion path");
  await capture("07-100mb-rejected-at-limit.png");
  report.steps.push("100mb-pdf-rejected-before-render");

  const urlButton = await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === "Upload document from URL");
    if (!button) return null;
    button.id = "scanner-live-demo-url";
    return "#scanner-live-demo-url";
  });
  if (!urlButton) throw new Error("URL import control was not found");
  page.once("dialog", (dialog) => void dialog.accept(publicTextUrl));
  await page.click(urlButton);
  await page.waitForSelector('button[title="Send extracted text"]', { timeout: 60000 });
  await capture("08-url-imported-markdown.png");
  report.steps.push("url-import-markdown");

  await openScanner("image-sequence");
  const sequenceButton = await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === "Extract text from image sequences");
    if (!button) return null;
    button.id = "scanner-live-demo-sequence";
    return "#scanner-live-demo-sequence";
  });
  if (!sequenceButton) throw new Error("Image-sequence control was not found");
  const chooserPromise = page.waitForFileChooser({ timeout: 10000 });
  await page.click(sequenceButton);
  const chooser = await chooserPromise;
  await chooser.accept([fixtures.jpeg, fixtures.webp]);
  await visualReady();
  await page.waitForFunction(() => /\b1\/2\b/.test(document.body.innerText), { timeout: 30000 });
  await capture("09-image-sequence-two-pages.png");
  report.steps.push("image-sequence-two-page-pdf");
} finally {
  report.providerRequests = providerRequests.length;
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  await context.close();
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
