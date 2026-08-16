import fs from "node:fs";
import puppeteer from "/tmp/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";

const url = process.argv[2] || "http://127.0.0.1:3000";
const pdfPath = process.argv[3] || "/home/ubuntu/upload/Volume_02.pdf";
const outputPath = process.argv[4] || "/tmp/volume_02_pdf_stress_probe.json";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  ignoreHTTPSErrors: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1440, height: 960 },
});

const page = await browser.newPage();
const errors = [];
await page.evaluateOnNewDocument(() => {
  window.__volume02CanvasTrace = [];
  const originalToDataUrl = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function (...args) {
    try {
      const sample = document.createElement("canvas");
      sample.width = 32;
      sample.height = 32;
      const context = sample.getContext("2d", { willReadFrequently: true });
      if (context) {
        context.fillStyle = "#fff";
        context.fillRect(0, 0, sample.width, sample.height);
        context.drawImage(this, 0, 0, sample.width, sample.height);
        const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
        let nonWhite = 0;
        let darkest = 255;
        let lightest = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          const luminance = (pixels[index] * 0.2126) + (pixels[index + 1] * 0.7152) + (pixels[index + 2] * 0.0722);
          darkest = Math.min(darkest, luminance);
          lightest = Math.max(lightest, luminance);
          if (luminance < 247) nonWhite += 1;
        }
        window.__volume02CanvasTrace.push({ width: this.width, height: this.height, nonWhiteRatio: nonWhite / (pixels.length / 4), darkest, lightest });
        if (window.__volume02CanvasTrace.length > 120) window.__volume02CanvasTrace.shift();
      }
    } catch {
      window.__volume02CanvasTrace.push({ width: this.width, height: this.height, traceError: true });
    }
    return originalToDataUrl.apply(this, args);
  };
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});

const readVisiblePaint = async () => page.evaluate(() => {
  const viewport = document.querySelector("#scanner-viewport");
  const source = viewport?.querySelector('img[alt="Scanned Document Paper Element"]') || viewport?.querySelector("img, canvas");
  if (!source) return { source: null, painted: false };

  const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!width || !height) return { source: source.tagName, width, height, painted: false };

  const sample = document.createElement("canvas");
  sample.width = 64;
  sample.height = 64;
  const ctx = sample.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { source: source.tagName, width, height, painted: false };
  ctx.fillStyle = "rgb(255,255,255)";
  ctx.fillRect(0, 0, sample.width, sample.height);
  ctx.drawImage(source, 0, 0, sample.width, sample.height);
  const pixels = ctx.getImageData(0, 0, sample.width, sample.height).data;
  let nonWhite = 0;
  let nonTransparent = 0;
  let sum = 0;
  let min = 255;
  let max = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const luminance = (pixels[i] * 0.2126) + (pixels[i + 1] * 0.7152) + (pixels[i + 2] * 0.0722);
    sum += luminance;
    min = Math.min(min, luminance);
    max = Math.max(max, luminance);
    if (pixels[i + 3] > 4) nonTransparent += 1;
    if (luminance < 247) nonWhite += 1;
  }
  const count = pixels.length / 4;
  return {
    source: source.tagName,
    complete: source instanceof HTMLImageElement ? source.complete : true,
    width,
    height,
    painted: nonTransparent > count * 0.05 && (max - min > 6 || nonWhite > count * 0.01),
    nonWhiteRatio: nonWhite / count,
    nonTransparentRatio: nonTransparent / count,
    meanLuminance: sum / count,
    minLuminance: min,
    maxLuminance: max,
  };
});

const readState = async () => page.evaluate(() => {
  const viewport = document.querySelector("#scanner-viewport");
  const surface = viewport?.querySelector("[data-scanner-document-surface]");
  const pageInput = document.querySelector("[data-scanner-page-jump]");
  const totalPages = pageInput?.parentElement?.textContent?.trim().replace(/^.*\//, "") || null;
  const image = viewport?.querySelector('img[alt="Scanned Document Paper Element"]') || viewport?.querySelector("img, canvas");
  const rect = (element) => {
    if (!element) return null;
    const value = element.getBoundingClientRect();
    return { left: value.left, top: value.top, width: value.width, height: value.height };
  };
  return {
    counter: pageInput && totalPages ? `${pageInput.value}/${totalPages}` : null,
    loading: document.body.innerText.includes("Loading document"),
    errorText: document.body.innerText.includes("Unable to load this PDF") || document.body.innerText.includes("Failed to render PDF page"),
    viewport: viewport ? {
      clientWidth: viewport.clientWidth,
      clientHeight: viewport.clientHeight,
      scrollWidth: viewport.scrollWidth,
      scrollHeight: viewport.scrollHeight,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    } : null,
    surface: rect(surface),
    image: rect(image),
  };
});

const upload = async () => {
  const input = await page.$('input[type="file"][accept*=".pdf"]');
  if (!input) throw new Error("No primary scanner document input found");
  await input.uploadFile(pdfPath);
  await page.waitForSelector("[data-scanner-upload-selected]", { timeout: 15000 });
  await page.click("[data-scanner-local-upload]");
  await page.waitForFunction(() => {
    const pageInput = document.querySelector("[data-scanner-page-jump]");
    return pageInput?.value === "1" && /\/\d+/.test(pageInput.parentElement?.textContent || "");
  }, { timeout: 50000 });
  await page.waitForFunction(() => {
    const image = document.querySelector('#scanner-viewport img[alt="Scanned Document Paper Element"]') || document.querySelector("#scanner-viewport img, #scanner-viewport canvas");
    return image instanceof HTMLImageElement ? image.complete && image.naturalWidth > 0 : Boolean(image?.width && image?.height);
  }, { timeout: 50000 });
  await sleep(450);
};

const openScanner = async (query) => {
  await page.goto(`${url.replace(/\/$/, "")}/?${query}=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });
};

const getPageButton = async (index) => page.evaluateHandle((buttonIndex) => {
  const pageInput = document.querySelector("[data-scanner-page-jump]");
  return pageInput?.parentElement?.parentElement?.querySelectorAll("button")?.[buttonIndex] || null;
}, index);

const waitForCounter = async (value) => {
  await page.waitForFunction((expected) => {
    const pageInput = document.querySelector("[data-scanner-page-jump]");
    const total = pageInput?.parentElement?.textContent?.trim().replace(/^.*\//, "");
    return Boolean(pageInput && total && `${pageInput.value}/${total}` === expected);
  }, { timeout: 25000 }, value);
  await sleep(420);
  return { state: await readState(), paint: await readVisiblePaint() };
};

const navigateToCounter = async (target, direction) => {
  const expectedPage = Number(target.split("/")[0]);
  for (let step = 0; step < 60; step += 1) {
    const current = await readState();
    const currentPage = Number((current.counter || "0/").split("/")[0]);
    if (current.counter === target) return { state: current, paint: await readVisiblePaint() };
    if (!currentPage || (direction === "next" ? currentPage >= expectedPage : currentPage <= expectedPage)) {
      throw new Error(`Could not reach ${target} from ${current.counter || "unknown"}`);
    }
    const button = await getPageButton(direction === "next" ? 1 : 0);
    if (!button) throw new Error(`${direction} button not found while targeting ${target}`);
    await button.click();
    await page.waitForFunction((previous) => {
      const pageInput = document.querySelector("[data-scanner-page-jump]");
      const total = pageInput?.parentElement?.textContent?.trim().replace(/^.*\//, "");
      return pageInput && total ? `${pageInput.value}/${total}` !== previous : false;
    }, { timeout: 25000 }, current.counter);
    await sleep(120);
  }
  throw new Error(`Navigation exceeded 60 steps while targeting ${target}`);
};

const jumpToCounter = async (target) => {
  const expectedPage = target.split("/")[0];
  await page.click("[data-scanner-page-jump]", { clickCount: 3 });
  await page.keyboard.type(expectedPage);
  await page.keyboard.press("Tab");
  await sleep(600);
  const afterCommit = await readState();
  if (afterCommit.counter !== target) {
    throw new Error(`Direct page entry requested ${target}; input settled at ${afterCommit.counter || "unknown"}`);
  }
  return waitForCounter(target);
};

const isolatedPageRender = async (pageNumber, intent = "display") => page.evaluate(async ({ num, renderIntent }) => {
  const pdf = window.__royscriptPdfProbe;
  if (!pdf) return { available: false };
  const page = await pdf.getPage(num);
  const operatorList = await page.getOperatorList();
  const resolveObject = (store, id) => {
    try {
      if (!store?.has?.(id)) return null;
      const value = store.get(id);
      return {
        type: typeof value,
        keys: value && typeof value === "object" ? Object.keys(value).slice(0, 16) : [],
        width: value?.width ?? null,
        height: value?.height ?? null,
        kind: value?.kind ?? null,
        dataLength: value?.data?.length ?? null,
        dataType: value?.data?.constructor?.name ?? null,
      };
    } catch (error) {
      return { error: error.message };
    }
  };
  const operators = operatorList.fnArray.map((fn, index) => {
    const args = operatorList.argsArray[index];
    const first = Array.isArray(args) ? args[0] : null;
    return {
      fn,
      argCount: Array.isArray(args) ? args.length : null,
      firstType: first == null ? null : typeof first,
      firstKeys: first && typeof first === "object" ? Object.keys(first).slice(0, 12) : [],
      firstWidth: first?.width ?? null,
      firstHeight: first?.height ?? null,
      firstDataLength: first?.data?.length ?? null,
      objectId: typeof first === "string" ? first : null,
      pageObject: typeof first === "string" ? resolveObject(page.objs, first) : null,
      commonObject: typeof first === "string" ? resolveObject(page.commonObjs, first) : null,
    };
  });
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { available: true, context: false };
  await page.render({ canvasContext: context, viewport, intent: renderIntent }).promise;
  const sample = document.createElement("canvas");
  sample.width = 64;
  sample.height = 64;
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  sampleContext.fillStyle = "#fff";
  sampleContext.fillRect(0, 0, sample.width, sample.height);
  sampleContext.drawImage(canvas, 0, 0, sample.width, sample.height);
  const pixels = sampleContext.getImageData(0, 0, sample.width, sample.height).data;
  let nonWhite = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = (pixels[index] * 0.2126) + (pixels[index + 1] * 0.7152) + (pixels[index + 2] * 0.0722);
    if (luminance < 247) nonWhite += 1;
  }
  page.cleanup();
  return { available: true, context: true, width: canvas.width, height: canvas.height, nonWhiteRatio: nonWhite / (pixels.length / 4), operatorCount: operators.length, operators };
}, { num: pageNumber, renderIntent: intent });

const results = { sessions: [], transitions: [], errors };

try {
  await openScanner("volume02Stress");
  await upload();
  results.sessions.push({ name: "initial-open", state: await readState(), paint: await readVisiblePaint(), canvasTrace: await page.evaluate(() => window.__volume02CanvasTrace), appPdfTrace: await page.evaluate(() => window.__royscriptPdfProbeTrace), isolatedPage1: await isolatedPageRender(1), isolatedPage1Print: await isolatedPageRender(1, "print"), isolatedPage2: await isolatedPageRender(2), isolatedPage50: await isolatedPageRender(50), isolatedPage51: await isolatedPageRender(51) });

  // Volume_02 has an odd page count. Its last page must leave the preceding
  // spread and render as an independent 51/51 terminal sheet.
  for (const target of ["2/51", "4/51", "6/51", "8/51", "10/51", "12/51", "24/51", "50/51", "51/51"]) {
    results.transitions.push({ target, ...(await navigateToCounter(target, "next")), canvasTrace: await page.evaluate(() => window.__volume02CanvasTrace.slice(-8)) });
  }

  results.transitions.push({ target: "jump-37/51", ...(await jumpToCounter("37/51")), canvasTrace: await page.evaluate(() => window.__volume02CanvasTrace.slice(-8)) });
  results.transitions.push({ target: "jump-51/51", ...(await jumpToCounter("51/51")), canvasTrace: await page.evaluate(() => window.__volume02CanvasTrace.slice(-8)) });

  for (const target of ["50/51", "24/51", "12/51", "10/51", "8/51", "6/51", "4/51", "2/51", "1/51"]) {
    results.transitions.push({ target, ...(await navigateToCounter(target, "previous")), canvasTrace: await page.evaluate(() => window.__volume02CanvasTrace.slice(-8)) });
  }

  await page.keyboard.press("Escape");
  await sleep(350);
  results.sessions.push({ name: "after-close", state: await readState(), paint: await readVisiblePaint(), canvasTrace: await page.evaluate(() => window.__volume02CanvasTrace.slice(-8)) });
  await openScanner("volume02StressReopen");
  await upload();
  results.sessions.push({ name: "reopen", state: await readState(), paint: await readVisiblePaint(), canvasTrace: await page.evaluate(() => window.__volume02CanvasTrace.slice(-8)) });

  for (const cycle of [1, 2, 3]) {
    results.transitions.push({ target: `cycle-${cycle}-2/51`, ...(await navigateToCounter("2/51", "next")), canvasTrace: await page.evaluate(() => window.__volume02CanvasTrace.slice(-8)) });
    results.transitions.push({ target: `cycle-${cycle}-1/51`, ...(await navigateToCounter("1/51", "previous")), canvasTrace: await page.evaluate(() => window.__volume02CanvasTrace.slice(-8)) });
  }

  results.final = { state: await readState(), paint: await readVisiblePaint() };
  if (results.errors.length) throw new Error(`Browser errors: ${results.errors.join(" | ")}`);
  if (results.sessions.some((entry) => entry.state.errorText || !entry.paint.painted)) throw new Error("A session produced an error state or unpainted preview");
  if (results.transitions.some((entry) => entry.state.errorText || !entry.paint.painted)) throw new Error("A page transition produced an error state or unpainted preview");
  console.log(JSON.stringify({ outputPath, errors: results.errors, sessions: results.sessions.length, transitions: results.transitions.length, status: "pass" }));
} catch (error) {
  results.errors.push(`probe: ${error.message}`);
  console.error(JSON.stringify({ outputPath, errors: results.errors, sessions: results.sessions.length, transitions: results.transitions.length, status: "fail" }));
  process.exitCode = 1;
} finally {
  fs.writeFileSync(outputPath, JSON.stringify({ url, pdfPath, ...results, generatedAt: new Date().toISOString() }, null, 2));
  await browser.close();
}
