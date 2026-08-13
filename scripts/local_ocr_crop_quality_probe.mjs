import fs from "node:fs";
import puppeteer from "/tmp/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";

const url = process.argv[2] || "http://127.0.0.1:3000";
const fixturePath = process.argv[3] || "/tmp/ocr-audit/crops/volume02-printed-right.png";
const outputPath = process.argv[4] || "/tmp/ocr-audit/local_ocr_crop_quality.json";
const destination = process.argv[5] || "doc_editor";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  userDataDir: "/tmp/ocr-audit/crop-chromium-profile",
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1440, height: 960 },
});
const page = await browser.newPage();
const errors = [];
const cloudProviderRequests = [];
const ocrAssetRequests = [];

page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  const text = message.text();
  if (message.type() === "error" && !/onnxruntime.*Unknown CPU vendor/i.test(text)) {
    errors.push(`console: ${text}`);
  }
});
page.on("request", (request) => {
  const requestUrl = request.url();
  if (/generativelanguage\.googleapis\.com|api\.groq\.com|api\.openai\.com/.test(requestUrl)) {
    cloudProviderRequests.push(requestUrl);
    void request.abort().catch(() => undefined);
    return;
  }
  if (/tesseract|tessdata|traineddata|\.wasm|worker\.min\.js/i.test(requestUrl)) {
    ocrAssetRequests.push(requestUrl);
  }
});

await page.evaluateOnNewDocument(() => {
  localStorage.setItem("royscript_ai_keys", "{}");
  localStorage.removeItem("ais_saved_scan_extracts");
});

const report = {
  url,
  fixturePath,
  destination,
  errors,
  cloudProviderRequests,
  ocrAssetRequests,
  queuedClips: 0,
  scanStatus: [],
  extractedText: "",
  editorText: "",
  generatedAt: new Date().toISOString(),
};

try {
  await page.goto(`${url.replace(/\/$/, "")}/?localOcrCropQuality=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 30000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 30000 });

  const inputs = await page.$$('input[type="file"]');
  const input = inputs.at(-1);
  if (!input) throw new Error("Scanner file input not found");
  await input.uploadFile(fixturePath);
  await page.waitForFunction(
    () => Boolean(document.querySelector('#scanner-viewport img[alt="Scanned Document Paper Element"]')),
    { timeout: 60000 },
  );
  await sleep(250);

  await page.click('[title="Crop Tool"]');
  const surface = await page.$("[data-scanner-document-surface]");
  const surfaceBox = await surface?.boundingBox();
  if (!surfaceBox) throw new Error("Scanner document surface not found");

  const start = { x: surfaceBox.x + surfaceBox.width * 0.05, y: surfaceBox.y + surfaceBox.height * 0.05 };
  const end = { x: surfaceBox.x + surfaceBox.width * 0.95, y: surfaceBox.y + surfaceBox.height * 0.95 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down({ button: "left" });
  for (let index = 1; index <= 80; index += 1) {
    const progress = index / 80;
    await page.mouse.move(
      start.x + (end.x - start.x) * progress,
      start.y + (end.y - start.y) * progress,
    );
  }
  await page.mouse.up({ button: "left" });
  await sleep(180);
  await page.click('[title="Add Clip"]');
  await sleep(250);

  report.queuedClips = await page.evaluate(() => {
    const label = Array.from(document.querySelectorAll("body *"))
      .map((element) => element.textContent?.trim() || "")
      .find((text) => /^Queued Clips \(\d+\)$/.test(text));
    return Number(label?.match(/\d+/)?.[0] || 0);
  });
  if (report.queuedClips !== 1) throw new Error(`Expected one queued clip, got ${report.queuedClips}`);

  await page.click('button[title="Scan"]');
  await page.waitForFunction(
    () => Boolean(document.querySelector('button[title="Send extracted text"]')),
    { timeout: 180000 },
  );
  report.scanStatus = await page.evaluate(() => Array.from(document.querySelectorAll("body *"))
    .map((element) => element.textContent?.trim() || "")
    .filter((text) => /Scanning clip|Scan completed|Preparing scan/i.test(text))
    .slice(-8));

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ais_saved_scan_extracts") || "[]"));
  report.extractedText = saved.at(-1)?.content || "";

  await page.evaluate((selectedDestination) => {
    const select = Array.from(document.querySelectorAll("select"))
      .find((candidate) => Array.from(candidate.options).some((option) => option.value === "doc_editor"));
    if (!select) return;
    select.value = selectedDestination;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, destination);
  await page.waitForFunction(
    (selectedDestination) => Array.from(document.querySelectorAll("select")).some((select) => select.value === selectedDestination),
    { timeout: 5000 },
    destination,
  );
  await page.click('button[title="Send extracted text"]');
  await sleep(700);
  report.editorText = await page.evaluate(() => Array.from(document.querySelectorAll('[contenteditable="true"]'))
    .map((element) => element.textContent || "")
    .filter(Boolean)
    .join("\n\n"));
  report.finalBodyText = await page.evaluate(() => document.body.innerText.slice(-6000));
  report.practiceModeSeen = destination === "typing_practice"
    ? await page.evaluate(() => {
      const body = document.body.innerText;
      const hasPracticeShell = body.includes("Reference Text") && body.includes("Start Practice") && body.includes("Configure Session");
      const hasTextField = Array.from(document.querySelectorAll("textarea, input"))
        .some((element) => ((element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) ? element.value : "").trim().length > 100);
      return hasPracticeShell && hasTextField;
    })
    : false;
} catch (error) {
  errors.push(`probe: ${error.message}`);
} finally {
  await browser.close();
}

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  outputPath,
  errors,
  cloudProviderRequestCount: cloudProviderRequests.length,
  ocrAssetRequestCount: ocrAssetRequests.length,
  queuedClips: report.queuedClips,
  extractedChars: report.extractedText.length,
  editorChars: report.editorText.length,
}, null, 2));

if (errors.length > 0 || report.queuedClips !== 1 || (destination === "doc_editor" && !report.editorText.trim()) || (destination === "typing_practice" && !report.practiceModeSeen)) {
  process.exitCode = 1;
}
