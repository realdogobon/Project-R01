import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const url = process.argv[2] || process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const outputPath = process.argv[3] || "/tmp/scanner-contract-audit.json";
const root = "/tmp/scanner-audit/fixtures";
const assets = {
  jpeg: path.join(root, "supported.jpg"),
  png: "/home/ubuntu/upload/pasted_file_mn5PFv_image.png",
  webp: path.join(root, "supported.webp"),
  pdf: "/home/ubuntu/upload/file-example_PDF_1MB.pdf",
  multipagePdf: "/home/ubuntu/upload/Volume_02.pdf",
  markdown: path.join(root, "supported.md"),
  html: path.join(root, "supported.html"),
  belowTextLimit: path.join(root, "below-2MB.md"),
  exactTextLimit: path.join(root, "exact-2MB.md"),
  aboveTextLimit: path.join(root, "above-2MB.md"),
  aboveVisualLimit: path.join(root, "above-20MiB.md"),
  largePdf: "/tmp/scanner-audit/cp43-complete-issue.pdf",
  malformedPdf: path.join(root, "malformed.pdf"),
  unsupported: path.join(root, "unsupported.svg"),
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const report = { url, assets, cases: [], errors: [], generatedAt: new Date().toISOString() };

for (const filePath of Object.values(assets)) {
  if (!fs.existsSync(filePath)) throw new Error(`Audit fixture missing: ${filePath}`);
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1440, height: 960 },
});

const attachProviderMock = async (page, requests, linkedAsset = null) => {
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const target = new URL(request.url());
    if (linkedAsset && target.hostname === "scanner-audit.local") {
      void request.respond({
        status: 200,
        contentType: "text/markdown",
        headers: { "Access-Control-Allow-Origin": "*", "Content-Length": String(fs.statSync(linkedAsset).size) },
        body: fs.readFileSync(linkedAsset),
      }).catch(() => undefined);
      return;
    }
    if (target.hostname !== "generativelanguage.googleapis.com") {
      void request.continue().catch(() => undefined);
      return;
    }
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
    if (request.method() === "OPTIONS") {
      void request.respond({ status: 204, headers }).catch(() => undefined);
      return;
    }
    requests.push({ url: request.url(), body: request.postData() || "" });
    void request.respond({
      status: 200,
      contentType: "application/json",
      headers,
      body: JSON.stringify({ candidates: [{ content: { parts: [{ text: "Scanner contract audit text." }] } }] }),
    }).catch(() => undefined);
  });
};

const setup = async (suffix, { mockProvider = false, linkedAsset = null } = {}) => {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("royscript_ai_keys", JSON.stringify({ gemini: "scanner-audit-mock-key" }));
    localStorage.removeItem("ais_saved_scan_extracts");
  });
  if (mockProvider || linkedAsset) await attachProviderMock(page, requests, linkedAsset);
  await page.goto(`${url.replace(/\/$/, "")}/?scannerContractAudit=${suffix}-${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });
  return { context, page, errors, requests };
};

const scannerFileInput = async (page) => {
  const input = await page.$('input[type=file][accept*=".pdf"]');
  if (!input) throw new Error("Scanner file input was not found");
  return input;
};

const loadedVisualDocument = (page) => page.waitForFunction(
  () => [...document.querySelectorAll("#scanner-viewport img, #scanner-viewport canvas")]
    .some((candidate) => candidate instanceof HTMLImageElement && candidate.complete && candidate.naturalWidth > 0),
  { timeout: 60000 },
);

const textIsReady = (page) => page.waitForSelector('button[title="Send extracted text"]', { timeout: 60000 });

const recordFileCase = async (label, filePath, expectation) => {
  const session = await setup(label);
  const startedAt = Date.now();
  const item = { label, filePath, sizeBytes: fs.statSync(filePath).size, expectation, elapsedMs: null, outcome: null, errors: session.errors };
  try {
    const input = await scannerFileInput(session.page);
    await input.uploadFile(filePath);
    if (expectation === "visual") {
      await loadedVisualDocument(session.page);
      item.outcome = "visual-preview-ready";
    } else if (expectation === "text") {
      await textIsReady(session.page);
      item.outcome = "text-ready";
    } else if (expectation === "rejected") {
      await sleep(750);
      item.outcome = await session.page.evaluate(() => ({
        sendReady: Boolean(document.querySelector('button[title="Send extracted text"]')),
        documentLoaded: Boolean(document.querySelector('#scanner-viewport img[alt="Scanned Document Paper Element"]')),
        limitCopyVisible: document.body.innerText.includes("Images & PDFs: 20 MB per file · Text: 2 MB per file"),
      }));
      if (item.outcome.sendReady || item.outcome.documentLoaded || !item.outcome.limitCopyVisible) throw new Error("Oversize file was not rejected before scanner ingestion");
    } else {
      await sleep(700);
      item.outcome = await session.page.evaluate(() => ({
        sendReady: Boolean(document.querySelector('button[title="Send extracted text"]')),
        documentLoaded: Boolean(document.querySelector('#scanner-viewport img[alt="Scanned Document Paper Element"]')),
        visibleText: document.body.innerText.includes("Unsupported format"),
      }));
    }
  } catch (error) {
    item.outcome = `error: ${error.message}`;
  } finally {
    item.elapsedMs = Date.now() - startedAt;
    report.cases.push(item);
    await session.context.close();
  }
};

try {
  for (const [label, filePath, expectation] of [
    ["supported-PNG", assets.png, "visual"],
    ["supported-JPEG-extension", assets.jpeg, "visual"],
    ["supported-WEBP", assets.webp, "visual"],
    ["supported-small-PDF", assets.pdf, "visual"],
    ["supported-multi-page-PDF", assets.multipagePdf, "visual"],
    ["supported-Markdown", assets.markdown, "text"],
    ["supported-HTML", assets.html, "text"],
    ["below-2MB-Markdown", assets.belowTextLimit, "text"],
    ["exact-2MB-Markdown", assets.exactTextLimit, "text"],
    ["above-2MB-Markdown", assets.aboveTextLimit, "rejected"],
    ["above-20MB-visual-document", assets.aboveVisualLimit, "rejected"],
    ["publisher-100MB-PDF", assets.largePdf, "rejected"],
    ["malformed-PDF", assets.malformedPdf, "unsupported"],
    ["unsupported-SVG", assets.unsupported, "unsupported"],
  ]) await recordFileCase(label, filePath, expectation);

  {
    const session = await setup("functional-import-controls", { linkedAsset: assets.markdown });
    try {
      const urlSelector = await session.page.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === "Upload document from URL");
        if (!button) return null;
        button.id = "scanner-audit-url-import";
        return "#scanner-audit-url-import";
      });
      if (!urlSelector) throw new Error("URL import control unavailable");
      session.page.once("dialog", (dialog) => void dialog.accept("https://scanner-audit.local/linked.md"));
      await session.page.click(urlSelector);
      await textIsReady(session.page);
      report.cases.push({ label: "URL-import-Markdown", outcome: "text-ready", errors: session.errors });
    } finally {
      await session.context.close();
    }
  }

  {
    const session = await setup("image-sequence");
    try {
      const sequenceSelector = await session.page.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === "Extract text from image sequences");
        if (!button) return null;
        button.id = "scanner-audit-image-sequence";
        return "#scanner-audit-image-sequence";
      });
      if (!sequenceSelector) throw new Error("Image sequence control unavailable");
      const chooserPromise = session.page.waitForFileChooser({ timeout: 10000 });
      await session.page.click(sequenceSelector);
      const chooser = await chooserPromise;
      await chooser.accept([assets.jpeg, assets.webp]);
      await loadedVisualDocument(session.page);
      const totalPages = await session.page.evaluate(() => document.body.innerText.match(/\b\d+\/(\d+)\b/)?.[1] || "");
      if (totalPages !== "2") throw new Error(`Expected a 2-page image sequence PDF, received ${totalPages || "unknown"} pages`);
      report.cases.push({ label: "image-sequence-two-page-PDF", outcome: { totalPages }, errors: session.errors });
    } finally {
      await session.context.close();
    }
  }

  {
    const session = await setup("crop-scan-send", { mockProvider: true });
    const item = { label: "crop-scan-send-editor-handoff", outcome: null, errors: session.errors, providerRequests: 0 };
    try {
      const input = await scannerFileInput(session.page);
      await input.uploadFile(assets.png);
      await loadedVisualDocument(session.page);
      await session.page.click('[title="Crop Tool"]');
      const surface = await session.page.$("[data-scanner-document-surface]");
      const bounds = await surface?.boundingBox();
      if (!bounds) throw new Error("Crop surface unavailable");
      await session.page.mouse.move(bounds.x + bounds.width * 0.18, bounds.y + bounds.height * 0.2);
      await session.page.mouse.down();
      await session.page.mouse.move(bounds.x + bounds.width * 0.82, bounds.y + bounds.height * 0.78, { steps: 15 });
      await session.page.mouse.up();
      await session.page.click('[title="Add Clip"]');
      await session.page.waitForFunction(() => document.body.innerText.includes("Queued Clips (1)"), { timeout: 10000 });
      await session.page.click('[title="Scan"]');
      await textIsReady(session.page);
      const destinationSelector = await session.page.evaluate(() => {
        const select = [...document.querySelectorAll("select")]
          .find((candidate) => [...candidate.options].some((option) => option.value === "doc_editor"));
        if (!select) return null;
        const id = "scanner-contract-audit-destination";
        select.id = id;
        return `#${id}`;
      });
      if (!destinationSelector) throw new Error("Scanner destination selector unavailable");
      await session.page.select(destinationSelector, "doc_editor");
      await session.page.click('button[title="Send extracted text"]');
      await session.page.waitForFunction(() => !document.querySelector("#scanner-viewport"), { timeout: 10000 });
      const editorText = await session.page.evaluate(() => [...document.querySelectorAll('[contenteditable=true]')].map((node) => node.textContent || "").join("\n"));
      item.providerRequests = session.requests.length;
      item.outcome = { queued: true, sentToEditor: editorText.includes("Scanner contract audit text."), editorChars: editorText.length };
    } catch (error) {
      item.outcome = `error: ${error.message}`;
    } finally {
      report.cases.push(item);
      await session.context.close();
    }
  }
} catch (error) {
  report.errors.push(`probe: ${error.message}`);
} finally {
  await browser.close();
}

report.passed = report.errors.length === 0 && report.cases.every((entry) => !entry.errors?.length && !String(entry.outcome).startsWith("error:"));
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outputPath, passed: report.passed, cases: report.cases.map(({ label, outcome }) => ({ label, outcome })), errors: report.errors }, null, 2));
if (!report.passed) process.exitCode = 1;
