import puppeteer from "/tmp/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:3000";
const outputPath = process.argv.at(-1) || "/tmp/scanner_pdf_render_matrix.json";
const pdfPaths = process.argv.slice(3, -1);
const files = pdfPaths.length ? pdfPaths : ["/tmp/royscript-pdf-fixture.pdf", "/tmp/crop-multipage-fixture.pdf"];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1440, height: 960 },
});

const results = [];

const readCounter = async (page) => page.evaluate(() => {
  const node = [...document.querySelectorAll("span")].find((candidate) => /^\d+\/\d+$/.test(candidate.textContent?.trim() || ""));
  return node?.textContent?.trim() || null;
});

const readPreview = async (page) => page.evaluate(async () => {
  const candidates = [...document.querySelectorAll('#scanner-viewport img[alt="Scanned Document Paper Element"], #scanner-viewport img')];
  const image = candidates.find((candidate) => candidate.complete && candidate.naturalWidth > 0 && candidate.naturalHeight > 0);
  if (!image) return { ready: false, reason: "no-ready-preview-image" };
  const sampleCanvas = document.createElement("canvas");
  const width = Math.min(160, image.naturalWidth);
  const height = Math.min(160, image.naturalHeight);
  sampleCanvas.width = width;
  sampleCanvas.height = height;
  const context = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { ready: true, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, readable: false };
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  let dark = 0;
  let nonWhite = 0;
  let sum = 0;
  let sumSquares = 0;
  const count = pixels.length / 4;
  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
    if (luminance < 120) dark += 1;
    if (luminance < 245) nonWhite += 1;
    sum += luminance;
    sumSquares += luminance * luminance;
  }
  const mean = sum / count;
  return {
    ready: true,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    readable: true,
    darkFraction: dark / count,
    nonWhiteFraction: nonWhite / count,
    luminanceMean: mean,
    luminanceVariance: Math.max(0, sumSquares / count - mean * mean),
    srcLength: image.currentSrc?.length || image.src?.length || 0,
  };
});

const clickNextPage = async (page) => page.evaluate(() => {
  const counter = [...document.querySelectorAll("span")].find((candidate) => /^\d+\/\d+$/.test(candidate.textContent?.trim() || ""));
  const buttons = counter?.parentElement ? [...counter.parentElement.querySelectorAll("button")] : [];
  const next = buttons.at(-1);
  if (!next || next.disabled) return false;
  next.click();
  return true;
});

const clickPreviousPage = async (page) => page.evaluate(() => {
  const counter = [...document.querySelectorAll("span")].find((candidate) => /^\d+\/\d+$/.test(candidate.textContent?.trim() || ""));
  const buttons = counter?.parentElement ? [...counter.parentElement.querySelectorAll("button")] : [];
  const previous = buttons[0];
  if (!previous || previous.disabled) return false;
  previous.click();
  return true;
});

for (const pdfPath of files) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  const documentResult = { pdfPath, errors, transitions: [] };
  try {
    await page.goto(`${url.replace(/\/$/, "")}/?scannerPdfMatrix=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
    await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
    await page.click('[title="AI Scanner"]');
    await page.waitForSelector("#scanner-viewport", { timeout: 20000 });
    const inputs = await page.$$('input[type="file"]');
    await inputs.at(-1).uploadFile(pdfPath);
    await page.waitForFunction(() => [...document.querySelectorAll("img")].some((candidate) => candidate.complete && candidate.naturalWidth > 0), { timeout: 50000 });
    await sleep(900);
    documentResult.initialCounter = await readCounter(page);
    documentResult.initial = await readPreview(page);

    for (let cycle = 0; cycle < 3; cycle += 1) {
      const movedForward = await clickNextPage(page);
      if (!movedForward) break;
      await sleep(900);
      documentResult.transitions.push({ direction: "next", counter: await readCounter(page), preview: await readPreview(page) });
      const movedBack = await clickPreviousPage(page);
      if (!movedBack) break;
      await sleep(900);
      documentResult.transitions.push({ direction: "previous", counter: await readCounter(page), preview: await readPreview(page) });
    }
  } catch (error) {
    documentResult.errors.push(`probe: ${error.message}`);
  } finally {
    await page.close();
  }
  results.push(documentResult);
}

await browser.close();
fs.writeFileSync(outputPath, JSON.stringify({ url, files, results, generatedAt: new Date().toISOString() }, null, 2));
console.log(JSON.stringify({ outputPath, documents: results.length, errors: results.flatMap((result) => result.errors), transitions: results.reduce((count, result) => count + result.transitions.length, 0) }));
