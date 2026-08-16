import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const previewUrl = process.argv[2] || process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const outputDir = process.argv[3] || "/tmp/scanner-upload-animation";
const imageFixture = "/home/ubuntu/upload/pasted_file_mn5PFv_image.png";
const pdfFixture = "/home/ubuntu/upload/file-example_PDF_1MB.pdf";
const publicPdfUrl = "https://pdfobject.com/pdf/sample.pdf";
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

if (!fs.existsSync(imageFixture)) throw new Error(`Image fixture missing: ${imageFixture}`);
if (!fs.existsSync(pdfFixture)) throw new Error(`PDF fixture missing: ${pdfFixture}`);
fs.mkdirSync(outputDir, { recursive: true });
const oversizeFixture = path.join(outputDir, "silent-rejection.bin");
fs.writeFileSync(oversizeFixture, Buffer.alloc(20 * 1024 * 1024 + 1));

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  defaultViewport: { width: 1280, height: 820 },
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const context = await browser.createBrowserContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("requestfailed", (request) => {
  const failure = request.failure()?.errorText;
  if (failure) errors.push(`request: ${failure} ${request.url()}`);
});

const report = { previewUrl, outputDir, errors, states: {}, status: "started" };
const capture = async (name) => page.screenshot({ path: path.join(outputDir, name), fullPage: false });
const openScanner = async (label) => {
  await page.goto(`${previewUrl.replace(/\/$/, "")}/?scannerUploadAnimation=${label}-${Date.now()}`, { waitUntil: "networkidle2", timeout: 90_000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 30_000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("[data-scanner-empty-upload-state]", { timeout: 30_000 });
};
const primaryInput = async () => {
  const input = await page.$('input[type="file"][accept*=".pdf"]');
  if (!input) throw new Error("Primary scanner uploader was not found");
  return input;
};
const measureState = async () => page.evaluate(() => {
  const rect = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const value = element.getBoundingClientRect();
    return { left: value.left, top: value.top, width: value.width, height: value.height };
  };
  return {
    empty: rect("[data-scanner-empty-upload-state]"),
    dropzone: rect("[data-scanner-upload-dropzone]"),
    selected: rect("[data-scanner-upload-selected]"),
    pending: rect("[data-scanner-upload-pending]"),
    urlImportPending: rect("[data-scanner-url-import-pending]"),
    success: rect("[data-scanner-upload-success]"),
    actionBar: rect("[data-scanner-action-bar]"),
    visibleErrorText: [...document.querySelectorAll("[role=alert], [data-error], .error")]
      .map((element) => element.textContent?.replace(/\s+/g, " ").trim())
      .filter(Boolean),
  };
});
const measureFieldTypography = async () => page.evaluate(() => {
  const fingerprint = (element) => {
    const styles = getComputedStyle(element);
    return {
      fontFamily: styles.fontFamily,
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight,
      letterSpacing: styles.letterSpacing,
      lineHeight: styles.lineHeight,
      fontStyle: styles.fontStyle,
      textTransform: styles.textTransform,
      textDecorationLine: styles.textDecorationLine,
    };
  };
  const reference = document.querySelector('label');
  const surfaces = [...document.querySelectorAll('[data-scanner-typography="field"]')];
  if (!reference || surfaces.length === 0) throw new Error('Scanner field typography surfaces were not found');
  return { reference: fingerprint(reference), surfaces: surfaces.map(fingerprint) };
});
const measureScannerStyleSpecification = async () => page.evaluate(() => {
  const text = (selector, predicate = () => true) => [...document.querySelectorAll(selector)].find((element) => predicate(element.textContent?.replace(/\s+/g, " ").trim() || ""));
  const fingerprint = (element) => {
    if (!element) return null;
    const styles = getComputedStyle(element);
    return {
      fontFamily: styles.fontFamily,
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight,
      letterSpacing: styles.letterSpacing,
      lineHeight: styles.lineHeight,
      fontStyle: styles.fontStyle,
      textTransform: styles.textTransform,
      textDecorationLine: styles.textDecorationLine,
      color: styles.color,
    };
  };
  const controlFingerprint = (element) => {
    if (!element) return null;
    const styles = getComputedStyle(element);
    return {
      ...fingerprint(element),
      height: styles.height,
      borderRadius: styles.borderRadius,
      backgroundColor: styles.backgroundColor,
      borderTopColor: styles.borderTopColor,
      boxShadow: styles.boxShadow,
    };
  };
  const fileType = document.querySelector("[data-scanner-file-type]");
  const footerScan = text("button", (value) => value === "Scan");
  const helper = text('[data-scanner-typography="field"]', (value) => value.includes("Up to 50 MB"));
  const fields = [...document.querySelectorAll('[data-scanner-typography="field"]')];
  const selected = document.querySelector("[data-scanner-upload-selected]");
  const selectedLines = selected ? [...selected.querySelectorAll('span')].filter((element) => element.textContent?.trim()) : [];
  return {
    reference: fingerprint(text("label", (value) => value === "Scanner")),
    normalSurfaces: {
      model: fingerprint(document.querySelector("[data-scanner-model-selector]")),
      fileType: fingerprint(fileType),
      resolution: fingerprint([...document.querySelectorAll("select")].find((element) => element.value === "200 dpi")),
      canvasPrimary: fingerprint(fields.find((element) => ["Drop a document", "Document selected"].includes(element.textContent?.trim() || ""))),
      canvasSecondary: fingerprint(fields.find((element) => ["or choose a file from this device", "Ready for the scanner"].includes(element.textContent?.trim() || ""))),
      canvasHelper: fingerprint(helper),
      footerZoom: fingerprint(fields.find((element) => (element.textContent || "").includes("%"))),
      footerPage: fingerprint(document.querySelector("[data-scanner-page-jump]")),
      footerScan: fingerprint(footerScan),
      selectedTitle: fingerprint(selectedLines[0]),
      selectedMetadata: fingerprint(selectedLines[1]),
    },
    fieldControls: {
      fileType: controlFingerprint(fileType?.parentElement),
      model: controlFingerprint(document.querySelector("[data-scanner-model-selector]")),
      resolution: controlFingerprint([...document.querySelectorAll("select")].find((element) => element.value === "200 dpi")),
    },
    accents: {
      railSelection: getComputedStyle(text("label", (value) => value === "Colour")?.querySelector("div") || document.body).borderTopColor,
      canvasPrimaryAction: fingerprint(document.querySelector("[data-scanner-local-upload]"))?.color || null,
      canvasUtilityAction: fingerprint(document.querySelector("[data-scanner-import-url]"))?.color || null,
      canvasGlyph: getComputedStyle(document.querySelector("[data-scanner-upload-dropzone] svg") || document.body).color,
    },
  };
});
const assertScannerStyleSpecification = (specification, theme, { selected = false } = {}) => {
  const required = ["model", "fileType", "resolution", "canvasPrimary", "canvasSecondary", "canvasHelper", "footerZoom", "footerScan"];
  if (specification.normalSurfaces.footerPage) required.push("footerPage");
  if (selected) required.push("selectedTitle", "selectedMetadata");
  for (const surface of required) {
    const actual = specification.normalSurfaces[surface];
    if (!actual) throw new Error(`${theme} scanner style audit could not locate ${surface}`);
    const { color: _color, ...metrics } = actual;
    const { color: _referenceColor, ...referenceMetrics } = specification.reference;
    if (JSON.stringify(metrics) !== JSON.stringify(referenceMetrics)) {
      throw new Error(`${theme} scanner typography diverged at ${surface}: ${JSON.stringify({ reference: referenceMetrics, actual: metrics })}`);
    }
  }
  const stripIntentionalControlTextColor = ({ color: _color, ...control }) => control;
  const { fileType, model, resolution } = specification.fieldControls;
  const referenceControl = stripIntentionalControlTextColor(fileType);
  if (JSON.stringify(stripIntentionalControlTextColor(model)) !== JSON.stringify(referenceControl) || JSON.stringify(stripIntentionalControlTextColor(resolution)) !== JSON.stringify(referenceControl)) {
    throw new Error(`${theme} scanner field-control geometry or styling diverged from File type: ${JSON.stringify({ fileType, model, resolution })}`);
  }
};
const assertFieldTypography = (state, theme, minimumSurfaces = 3) => {
  if (state.surfaces.length < minimumSurfaces) throw new Error(`${theme} theme did not expose enough scanner field typography surfaces`);
  for (const surface of state.surfaces) {
    if (JSON.stringify(surface) !== JSON.stringify(state.reference)) {
      throw new Error(`${theme} scanner field typography diverged: ${JSON.stringify({ reference: state.reference, surface })}`);
    }
  }
};

try {
  await openScanner("success");
  report.states.idle = await measureState();
  report.states.lightTypography = await measureFieldTypography();
  assertFieldTypography(report.states.lightTypography, "light");
  report.states.lightStyleSpecification = await measureScannerStyleSpecification();
  assertScannerStyleSpecification(report.states.lightStyleSpecification, "light");
  await capture("01-idle.png");

  const idleHoverBefore = await page.evaluate(() => {
    const dropzone = document.querySelector("[data-scanner-upload-dropzone]");
    if (!dropzone) throw new Error("Scanner upload dropzone was not found");
    const styles = getComputedStyle(dropzone);
    return { backgroundColor: styles.backgroundColor, boxShadow: styles.boxShadow, transform: styles.transform };
  });
  await page.hover("[data-scanner-upload-dropzone]");
  await sleep(120);
  report.states.idleHover = {
    ...(await measureState()),
    before: idleHoverBefore,
    after: await page.evaluate(() => {
      const dropzone = document.querySelector("[data-scanner-upload-dropzone]");
      if (!dropzone) throw new Error("Scanner upload dropzone was not found");
      const styles = getComputedStyle(dropzone);
      return { backgroundColor: styles.backgroundColor, boxShadow: styles.boxShadow, transform: styles.transform };
    }),
  };
  await capture("01a-idle-hover.png");

  await page.evaluate(() => {
    const target = document.querySelector("[data-scanner-empty-upload-state]");
    if (!target) throw new Error("Reference upload surface was not found");
    target.dispatchEvent(new DragEvent("dragenter", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true }));
  });
  await sleep(80);
  report.states.dragActive = await measureState();
  await capture("02-drag-active.png");
  await page.evaluate(() => document.querySelector("[data-scanner-empty-upload-state]")?.dispatchEvent(new DragEvent("dragleave", { bubbles: true, cancelable: true })));

  const successfulInput = await primaryInput();
  await successfulInput.uploadFile(imageFixture);
  await page.waitForSelector("[data-scanner-upload-selected]", { timeout: 5_000 });
  await page.waitForSelector("[data-scanner-upload-thumbnail]", { timeout: 5_000 });
  report.states.selectedTypography = await measureFieldTypography();
  assertFieldTypography(report.states.selectedTypography, "light selected-file", 5);
  report.states.selectedStyleSpecification = await measureScannerStyleSpecification();
  assertScannerStyleSpecification(report.states.selectedStyleSpecification, "light selected-file", { selected: true });
  report.states.selected = { ...(await measureState()), hasLocalThumbnail: true };
  await capture("03-selected-file.png");
  await page.click("[data-scanner-local-upload]");
  await page.waitForSelector("[data-scanner-upload-pending]", { timeout: 5_000 });
  await sleep(80);
  report.states.pending = await measureState();
  await capture("04-pending.png");

  await page.waitForSelector("[data-scanner-upload-success]", { timeout: 20_000 });
  report.states.success = await measureState();
  await capture("05-success.png");
  await sleep(760);
  const previewReady = await page.evaluate(() => [...document.querySelectorAll("#scanner-viewport img, #scanner-viewport canvas")]
    .some((candidate) => candidate instanceof HTMLImageElement && candidate.complete && candidate.naturalWidth > 0));
  report.states.settled = { ...(await measureState()), previewReady };

  if (!report.states.dragActive.dropzone) throw new Error("Drag-active upload surface did not render");
  if (JSON.stringify(report.states.idleHover.before) !== JSON.stringify(report.states.idleHover.after)) {
    throw new Error("Idle hover changed the upload canvas visual treatment");
  }
  if (!report.states.selected.selected) throw new Error("Selected-file row did not render before upload");
  if (!report.states.selected.hasLocalThumbnail) throw new Error("Image selection did not render a local thumbnail");
  if (!report.states.pending.pending) throw new Error("Pending upload row did not render");
  if (!report.states.success.success) throw new Error("Transient success overlay did not render");
  if (report.states.settled.success) throw new Error("Success overlay did not dismiss after its transient handoff");
  if (!previewReady) throw new Error("Loaded document preview was not visible after success handoff");

  await openScanner("pdf-thumbnail");
  const pdfInput = await primaryInput();
  await pdfInput.uploadFile(pdfFixture);
  await page.waitForSelector("[data-scanner-upload-selected]", { timeout: 5_000 });
  await page.waitForFunction(() => {
    const thumbnail = document.querySelector("[data-scanner-upload-thumbnail]");
    return thumbnail instanceof HTMLImageElement && thumbnail.src.startsWith("data:image/");
  }, { timeout: 15_000 });
  report.states.pdfSelected = {
    ...(await measureState()),
    thumbnail: await page.$eval("[data-scanner-upload-thumbnail]", (thumbnail) => ({ tagName: thumbnail.tagName, src: thumbnail.getAttribute("src") })),
    label: await page.$eval("[data-scanner-upload-selected]", (row) => row.textContent?.replace(/\s+/g, " ").trim()),
  };
  await capture("05a-selected-pdf-thumbnail.png");

  await openScanner("url-import");
  page.once("dialog", (dialog) => { void dialog.accept(publicPdfUrl); });
  await page.click("[data-scanner-import-url]");
  await page.waitForSelector("[data-scanner-url-import-pending]", { timeout: 5_000 });
  report.states.urlImportPending = await measureState();
  await capture("05b-url-import-pending.png");
  await page.waitForFunction(() => [...document.querySelectorAll("#scanner-viewport img, #scanner-viewport canvas")]
    .some((candidate) => candidate instanceof HTMLImageElement && candidate.complete && candidate.naturalWidth > 0), { timeout: 60_000 });
  report.states.urlImportSettled = {
    ...(await measureState()),
    format: await page.$eval("[data-scanner-file-type]", (badge) => badge.textContent?.trim()),
  };
  await capture("05c-url-import-settled.png");

  if (report.states.pdfSelected.thumbnail.tagName !== "IMG" || !report.states.pdfSelected.thumbnail.src?.startsWith("data:image/")) {
    throw new Error("PDF selection did not render a first-page thumbnail");
  }
  if (!report.states.pdfSelected.label?.includes("PDF")) throw new Error("PDF selection did not display a PDF label");
  if (!report.states.urlImportPending.urlImportPending) throw new Error("URL import did not expose its in-canvas loading state");
  if (report.states.urlImportSettled.format !== "PDF") throw new Error(`URL-imported PDF did not retain format metadata: ${report.states.urlImportSettled.format}`);

  await page.evaluate(() => localStorage.setItem("theme", "dark"));
  await openScanner("dark-typography");
  await page.waitForFunction(() => document.documentElement.classList.contains("dark"), { timeout: 5_000 });
  report.states.darkTypography = await measureFieldTypography();
  assertFieldTypography(report.states.darkTypography, "dark");
  report.states.darkStyleSpecification = await measureScannerStyleSpecification();
  assertScannerStyleSpecification(report.states.darkStyleSpecification, "dark");
  await capture("05d-dark-typography.png");

  await openScanner("silent-rejection");
  const rejectedInput = await primaryInput();
  await rejectedInput.uploadFile(oversizeFixture);
  await page.waitForSelector("[data-scanner-upload-selected]", { timeout: 5_000 });
  await page.click("[data-scanner-local-upload]");
  await page.waitForSelector("[data-scanner-upload-pending]", { timeout: 5_000 });
  await sleep(1_150);
  report.states.silentFailure = await measureState();
  await capture("06-silent-failure-returned-to-idle.png");

  if (!report.states.silentFailure.empty) throw new Error("Silent failure did not return to the idle upload surface");
  if (report.states.silentFailure.pending || report.states.silentFailure.success || report.states.silentFailure.selected) throw new Error("Silent failure left an upload state visible");
  if (report.states.silentFailure.visibleErrorText.length > 0) throw new Error(`Silent failure exposed an error surface: ${report.states.silentFailure.visibleErrorText.join(" | ")}`);
  if (errors.length > 0) throw new Error(`Unexpected browser errors: ${errors.join(" | ")}`);

  report.status = "passed";
} finally {
  fs.writeFileSync(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
  await context.close();
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
