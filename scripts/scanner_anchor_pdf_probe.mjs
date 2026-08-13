import fs from "node:fs";
import puppeteer from "/tmp/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";

const url = process.argv[2] || "http://127.0.0.1:3000";
const imagePath = process.argv[3] || "/tmp/royscript-scanner-fixture.png";
const pdfPath = process.argv[4] || "/tmp/royscript-pdf-fixture.pdf";
const outputPath = process.argv[5] || "/tmp/scanner_anchor_pdf_probe.json";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1440, height: 960 },
});

const page = await browser.newPage();
const errors = [];
const measurements = {};
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});

const readGeometry = async () => page.evaluate(() => {
  const viewport = document.querySelector("#scanner-viewport");
  const surface = viewport?.querySelector("[data-scanner-document-surface]");
  const image = viewport?.querySelector('img[alt="Scanned Document Paper Element"]') || viewport?.querySelector("img");
  const counter = [...document.querySelectorAll("span")].find((node) => /^\d+\/\d+$/.test(node.textContent?.trim() || ""));
  const rect = (element) => {
    if (!element) return null;
    const value = element.getBoundingClientRect();
    return { left: value.left, top: value.top, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
  };
  return {
    zoom: [...document.querySelectorAll("span")].find((node) => /^\d+%$/.test(node.textContent?.trim() || ""))?.textContent?.trim() || null,
    page: counter?.textContent?.trim() || null,
    viewport: viewport ? {
      rect: rect(viewport),
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
      scrollWidth: viewport.scrollWidth,
      scrollHeight: viewport.scrollHeight,
      clientWidth: viewport.clientWidth,
      clientHeight: viewport.clientHeight,
    } : null,
    surface: rect(surface),
    image: rect(image),
  };
});

const clickTitle = async (title) => {
  await page.waitForSelector(`[title="${title}"]`, { timeout: 20000 });
  await page.click(`[title="${title}"]`);
  await sleep(180);
};

const upload = async (path) => {
  const inputs = await page.$$('input[type="file"]');
  if (!inputs.length) throw new Error("No scanner file input found");
  await inputs.at(-1).uploadFile(path);
  await page.waitForFunction(() => Boolean(document.querySelector("#scanner-viewport img, #scanner-viewport canvas")), { timeout: 40000 });
  await sleep(700);
};

const drag = async (from, to, steps = 100, button = "left") => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button });
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    await page.mouse.move(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
  }
  await page.mouse.up({ button });
  await sleep(160);
};

try {
  await page.goto(`${url.replace(/\/$/, "")}/?scannerAnchorProbe=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });
  await upload(imagePath);
  measurements.imageLoaded = await readGeometry();

  for (let i = 0; i < 20; i += 1) await clickTitle("Increase Zoom (+5%)");
  measurements.zoom200 = await readGeometry();
  const zoomed = measurements.zoom200;
  if (!zoomed.viewport || !zoomed.surface) throw new Error("Zoomed surface geometry unavailable");
  if (zoomed.viewport.scrollWidth <= zoomed.viewport.clientWidth && zoomed.viewport.scrollHeight <= zoomed.viewport.clientHeight) {
    throw new Error("Zoomed document did not create viewport overflow");
  }

  const viewportRect = zoomed.viewport.rect;
  const anchor = { x: viewportRect.left + viewportRect.width * 0.72, y: viewportRect.top + viewportRect.height * 0.31 };
  const beforeAnchor = await page.evaluate(({ x, y }) => {
    const surface = document.querySelector("#scanner-viewport [data-scanner-document-surface]");
    const rect = surface?.getBoundingClientRect();
    return rect ? { u: (x - rect.left) / rect.width, v: (y - rect.top) / rect.height } : null;
  }, anchor);
  await page.mouse.move(anchor.x, anchor.y);
  await page.keyboard.down("Control");
  await page.mouse.wheel({ deltaY: -100 });
  await page.keyboard.up("Control");
  await sleep(260);
  measurements.cursorZoom = await readGeometry();
  const afterAnchor = await page.evaluate(({ x, y }) => {
    const surface = document.querySelector("#scanner-viewport [data-scanner-document-surface]");
    const rect = surface?.getBoundingClientRect();
    return rect ? { u: (x - rect.left) / rect.width, v: (y - rect.top) / rect.height } : null;
  }, anchor);
  measurements.cursorZoomAnchor = { before: beforeAnchor, after: afterAnchor, delta: beforeAnchor && afterAnchor ? { u: afterAnchor.u - beforeAnchor.u, v: afterAnchor.v - beforeAnchor.v } : null };
  if (!beforeAnchor || !afterAnchor || Math.abs(afterAnchor.u - beforeAnchor.u) > 0.02 || Math.abs(afterAnchor.v - beforeAnchor.v) > 0.02) {
    throw new Error("Cursor-anchored zoom moved the document point by more than 2%");
  }

  const maxScroll = await page.evaluate(() => {
    const viewport = document.querySelector("#scanner-viewport");
    if (!viewport) return null;
    viewport.scrollLeft = viewport.scrollWidth - viewport.clientWidth;
    viewport.scrollTop = viewport.scrollHeight - viewport.clientHeight;
    return { left: viewport.scrollLeft, top: viewport.scrollTop, maxLeft: viewport.scrollWidth - viewport.clientWidth, maxTop: viewport.scrollHeight - viewport.clientHeight };
  });
  await sleep(120);
  measurements.maxScroll = { requested: maxScroll, observed: (await readGeometry()).viewport };

  await clickTitle("Flip Horizontal");
  await clickTitle("Rotate Anti-clockwise");
  await clickTitle("Crop Tool");
  const transformed = await readGeometry();
  if (!transformed.surface || transformed.surface.width <= 0 || transformed.surface.height <= 0) throw new Error("Transformed crop surface is not measurable");
  const cropViewport = transformed.viewport.rect;
  await drag(
    { x: cropViewport.left + cropViewport.width * 0.18, y: cropViewport.top + cropViewport.height * 0.18 },
    { x: cropViewport.left + cropViewport.width * 0.52, y: cropViewport.top + cropViewport.height * 0.48 },
    140,
  );
  measurements.transformedCrop = await page.evaluate(() => {
    const selection = document.querySelector("#scanner-viewport [data-crop-selection]");
    const surface = document.querySelector("#scanner-viewport [data-scanner-document-surface]");
    const selectionRect = selection?.getBoundingClientRect();
    const surfaceRect = surface?.getBoundingClientRect();
    return selectionRect && surfaceRect ? { selection: { left: selectionRect.left, top: selectionRect.top, right: selectionRect.right, bottom: selectionRect.bottom }, surface: { left: surfaceRect.left, top: surfaceRect.top, right: surfaceRect.right, bottom: surfaceRect.bottom } } : null;
  });
  if (!measurements.transformedCrop) throw new Error("Transformed crop selection was not created");
  await page.goto(`${url.replace(/\/$/, "")}/?scannerPdfProbe=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });
  await upload(pdfPath);
  await page.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), { timeout: 40000 });
  measurements.pdfPage1 = await readGeometry();
  const nextButton = await page.evaluateHandle(() => {
    const counter = [...document.querySelectorAll("span")].find((node) => /^1\/\d+$/.test(node.textContent?.trim() || ""));
    return counter?.parentElement?.querySelectorAll("button")?.[1] || null;
  });
  if (!nextButton) throw new Error("PDF next-page button not found");
  await nextButton.click();
  await sleep(900);
  await page.waitForFunction(() => /\b2\/\d+\b/.test(document.body.innerText), { timeout: 20000 });
  measurements.pdfPage2 = await readGeometry();
  await clickTitle("Crop Tool");
  const page2Viewport = measurements.pdfPage2.viewport.rect;
  await drag(
    { x: page2Viewport.left + page2Viewport.width * 0.22, y: page2Viewport.top + page2Viewport.height * 0.22 },
    { x: page2Viewport.left + page2Viewport.width * 0.58, y: page2Viewport.top + page2Viewport.height * 0.54 },
    120,
  );
  measurements.pdfPage2Crop = await page.evaluate(() => Boolean(document.querySelector("#scanner-viewport [data-crop-selection]")));
  if (!measurements.pdfPage2Crop) throw new Error("Page-two PDF crop selection was not created");

  fs.writeFileSync(outputPath, JSON.stringify({ url, errors, measurements, generatedAt: new Date().toISOString() }, null, 2));
  console.log(JSON.stringify({ outputPath, errors, checks: Object.keys(measurements) }));
} catch (error) {
  fs.writeFileSync(outputPath, JSON.stringify({ url, errors: [...errors, `probe: ${error.message}`], measurements, generatedAt: new Date().toISOString() }, null, 2));
  console.error(JSON.stringify({ outputPath, errors: [...errors, `probe: ${error.message}`], checks: Object.keys(measurements) }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
