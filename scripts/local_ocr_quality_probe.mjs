import puppeteer from "/tmp/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "node:fs";
import path from "node:path";

const url = process.argv[2] || "http://127.0.0.1:3000";
const outputPath = process.argv[3] || "/tmp/local_ocr_quality_probe.json";
const fixturePaths = process.argv.slice(4).length > 0
  ? process.argv.slice(4)
  : [
      "/home/ubuntu/upload/thumb_1200_1696.png",
      "/tmp/ocr-audit/file-example-page1.png",
      "/tmp/ocr-audit/volume02-page1.png",
    ];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  userDataDir: "/tmp/ocr-audit/chromium-profile",
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1440, height: 960 },
});
const page = await browser.newPage();
const errors = [];
const warnings = [];
const requests = [];

page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  const text = message.text();
  if (/onnxruntime.*Unknown CPU vendor|Estimating resolution as \d+/i.test(text)) {
    warnings.push(`console: ${text}`);
  } else if (message.type() === "error") {
    errors.push(`console: ${text}`);
  }
});
page.on("request", (request) => {
  const requestUrl = request.url();
  if (/generativelanguage\.googleapis\.com|api\.groq\.com|api\.openai\.com/.test(requestUrl)) {
    requests.push({ kind: "cloud-provider", url: requestUrl, method: request.method() });
    void request.abort().catch(() => undefined);
    return;
  }
  if (/tesseract|tessdata|traineddata|\.wasm|worker\.min\.js|ppu-paddle-ocr-models|ppocr.*dict/i.test(requestUrl)) {
    requests.push({ kind: "ocr-asset", url: requestUrl, method: request.method() });
  }
});

await page.evaluateOnNewDocument(() => {
  localStorage.setItem("royscript_ai_keys", "{}");
  localStorage.removeItem("ais_saved_scan_extracts");
});

const waitForScanner = async () => {
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 30000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 30000 });
};

const waitForDocument = async () => {
  await page.waitForFunction(
    () => Boolean(document.querySelector('#scanner-viewport img[alt="Scanned Document Paper Element"]')),
    { timeout: 60000 },
  );
  await page.waitForFunction(
    () => {
      const button = document.querySelector('button[title="Scan"]');
      return button && !button.hasAttribute("disabled");
    },
    { timeout: 30000 },
  );
};

const readSavedExtract = (filePath) => page.evaluate((expectedTitle) => {
  const saved = JSON.parse(localStorage.getItem("ais_saved_scan_extracts") || "[]");
  const match = saved.find((entry) => entry?.title === expectedTitle);
  return match?.content || saved[0]?.content || "";
}, path.basename(filePath));

const readEditorText = () => page.evaluate(() => Array.from(document.querySelectorAll('[contenteditable="true"]'))
  .map((element) => element.textContent || "")
  .filter(Boolean)
  .join("\n\n"));

const results = [];
try {
  await page.goto(`${url.replace(/\/$/, "")}/?localOcrQualityProbe=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });

  for (const [fixtureIndex, fixturePath] of fixturePaths.entries()) {
    const title = path.basename(fixturePath);
    const requestStart = requests.length;
    if (fixtureIndex > 0) {
      await page.goto(`${url.replace(/\/$/, "")}/?localOcrQualityProbe=${Date.now()}-${fixtureIndex}`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
    }
    await waitForScanner();
    const inputs = await page.$$('input[type="file"]');
    const input = inputs.at(-1);
    if (!input) throw new Error(`Scanner file input not found for ${title}`);
    await input.uploadFile(fixturePath);
    await waitForDocument();
    await sleep(250);

    const startedAt = Date.now();
    await page.click('button[title="Scan"]');
    await page.waitForFunction(
      () => Boolean(document.querySelector('button[title="Send extracted text"]')),
      { timeout: 180000 },
    );
    const completedAt = Date.now();
    await page.waitForFunction(
      () => JSON.parse(localStorage.getItem("ais_saved_scan_extracts") || "[]")
        .some((entry) => Boolean(entry?.content?.trim())),
      { timeout: 10000 },
    ).catch(() => undefined);
    const extractedText = await readSavedExtract(fixturePath);

    let editorText = "";
    const destination = await page.$('select');
    if (destination && extractedText.trim()) {
      await page.evaluate(() => {
        const select = Array.from(document.querySelectorAll("select"))
          .find((candidate) => Array.from(candidate.options).some((option) => option.value === "doc_editor"));
        if (!select) return;
        select.value = "doc_editor";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await page.waitForFunction(() => Array.from(document.querySelectorAll("select"))
        .some((select) => select.value === "doc_editor"), { timeout: 5000 }).catch(() => undefined);
      await page.click('button[title="Send extracted text"]');
      await sleep(500);
      editorText = await readEditorText();
      await page.waitForFunction(() => !document.querySelector("#scanner-viewport"), { timeout: 10000 }).catch(() => undefined);
    }

    results.push({
      fixturePath,
      title,
      elapsedMs: completedAt - startedAt,
      extractedText,
      extractedChars: extractedText.length,
      editorText,
      editorChars: editorText.length,
      requests: requests.slice(requestStart),
    });
  }
} catch (error) {
  errors.push(`probe: ${error.message}`);
} finally {
  await browser.close();
}

const report = {
  url,
  fixturePaths,
  errors,
  warnings,
  cloudProviderRequests: requests.filter((request) => request.kind === "cloud-provider"),
  ocrAssetRequests: requests.filter((request) => request.kind === "ocr-asset"),
  results,
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  outputPath,
  errors,
  warnings,
  cloudProviderRequestCount: report.cloudProviderRequests.length,
  ocrAssetRequestCount: report.ocrAssetRequests.length,
  results: results.map(({ title, extractedChars, editorChars, elapsedMs }) => ({ title, extractedChars, editorChars, elapsedMs })),
}, null, 2));
if (errors.length > 0 || results.length !== fixturePaths.length) process.exitCode = 1;
