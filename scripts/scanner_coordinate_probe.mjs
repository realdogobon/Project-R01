import puppeteer from "/tmp/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:3000";
const fixturePath = process.argv[3] || "/tmp/royscript-scanner-fixture.png";
const outputPath = process.argv[4] || "/tmp/scanner_coordinate_probe.json";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1440, height: 960 },
});

const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});

const snapshots = [];
const snapshot = async (label) => {
  const value = await page.evaluate((snapshotLabel) => {
    const viewport = document.querySelector("#scanner-viewport");
    const image = viewport?.querySelector('img[alt="Scanned Document Paper Element"]') || viewport?.querySelector("img");
    const crop = viewport?.querySelector('[data-crop-selection]')?.parentElement;
    const cropSelection = viewport?.querySelector('[data-crop-selection]');
    const percentText = [...document.querySelectorAll("span")].find((node) => /^\d+%$/.test(node.textContent?.trim() || ""));
    const rect = (element) => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return { x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
    };
    const probe = window.__scannerCoordinateProbe || {};
    return {
      label: snapshotLabel,
      zoomText: percentText?.textContent?.trim() || null,
      viewport: viewport ? {
        rect: rect(viewport),
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
        scrollWidth: viewport.scrollWidth,
        scrollHeight: viewport.scrollHeight,
        clientWidth: viewport.clientWidth,
        clientHeight: viewport.clientHeight,
      } : null,
      imageRect: rect(image),
      imageNatural: image ? { width: image.naturalWidth, height: image.naturalHeight } : null,
      cropRect: rect(crop),
      selectionRect: rect(cropSelection),
      selectionStyle: cropSelection ? getComputedStyle(cropSelection).cssText : null,
      pointerEvents: probe.events || [],
      pointerCapture: probe.capture || [],
    };
  }, label);
  snapshots.push(value);
  await page.evaluate(() => {
    if (window.__scannerCoordinateProbe) {
      window.__scannerCoordinateProbe.events = [];
      window.__scannerCoordinateProbe.capture = [];
    }
  });
};

const installPointerTrace = async () => {
  await page.evaluate(() => {
    const probe = { events: [], capture: [] };
    window.__scannerCoordinateProbe = probe;
    const record = (event) => {
      const viewport = document.querySelector("#scanner-viewport");
      if (probe.events.length < 500) {
        probe.events.push({
          type: event.type,
          target: event.target instanceof Element ? event.target.tagName + "." + event.target.className : "unknown",
          clientX: event.clientX,
          clientY: event.clientY,
          buttons: event.buttons,
          button: event.button,
          scrollLeft: viewport?.scrollLeft ?? null,
          scrollTop: viewport?.scrollTop ?? null,
          time: performance.now(),
        });
      }
    };
    for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel"]) {
      document.addEventListener(type, record, true);
    }
    const originalSetPointerCapture = Element.prototype.setPointerCapture;
    const originalReleasePointerCapture = Element.prototype.releasePointerCapture;
    Element.prototype.setPointerCapture = function (pointerId) {
      if (probe.capture.length < 100) probe.capture.push({ type: "set", element: this.id || this.className || this.tagName, pointerId });
      return originalSetPointerCapture.call(this, pointerId);
    };
    Element.prototype.releasePointerCapture = function (pointerId) {
      if (probe.capture.length < 100) probe.capture.push({ type: "release", element: this.id || this.className || this.tagName, pointerId });
      return originalReleasePointerCapture.call(this, pointerId);
    };
  });
};

const clickTitle = async (title) => {
  const selector = `[title="${title}"]`;
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.click(selector);
  await sleep(120);
};

const drag = async (from, to, steps = 80, button = "left") => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button });
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    await page.mouse.move(from.x + (to.x - from.x) * progress, from.y + (to.y - from.y) * progress);
  }
  await page.mouse.up({ button });
  await sleep(120);
};

try {
  await page.goto(`${url.replace(/\/$/, "")}/?scannerProbe=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });
  await page.waitForSelector('input[type="file"]', { timeout: 20000 });
  const fileInputs = await page.$$('input[type="file"]');
  if (!fileInputs.length) throw new Error("No scanner file input found");
  await fileInputs[fileInputs.length - 1].uploadFile(fixturePath);
  await page.waitForFunction(() => {
    const viewport = document.querySelector("#scanner-viewport");
    return Boolean(viewport?.querySelector('img[alt="Scanned Document Paper Element"]'));
  }, { timeout: 30000 });
  await sleep(500);
  await installPointerTrace();
  await snapshot("loaded-default");

  const initial = snapshots.at(-1);
  const initialViewport = initial?.viewport?.rect;
  if (!initialViewport) throw new Error("Scanner viewport has no measurable bounds");
  const center = { x: initialViewport.x + initialViewport.width / 2, y: initialViewport.y + initialViewport.height / 2 };

  for (let index = 0; index < 8; index += 1) await clickTitle("Increase Zoom (+5%)");
  await snapshot("zoom-140");

  const zoomed = snapshots.at(-1);
  const zoomViewport = zoomed?.viewport?.rect;
  if (!zoomViewport) throw new Error("Zoomed viewport has no measurable bounds");
  await drag(
    { x: zoomViewport.x + zoomViewport.width * 0.75, y: zoomViewport.y + zoomViewport.height * 0.75 },
    { x: zoomViewport.x + zoomViewport.width * 0.25, y: zoomViewport.y + zoomViewport.height * 0.25 },
    120,
    "middle",
  );
  await snapshot("after-middle-pan");

  await clickTitle("Crop Tool");
  await sleep(150);
  await snapshot("crop-enabled");
  const cropStart = snapshots.at(-1);
  const cropViewport = cropStart?.viewport?.rect;
  if (!cropViewport) throw new Error("Crop viewport has no measurable bounds");
  await drag(
    { x: cropViewport.x + cropViewport.width * 0.2, y: cropViewport.y + cropViewport.height * 0.2 },
    { x: cropViewport.x + cropViewport.width * 0.65, y: cropViewport.y + cropViewport.height * 0.6 },
    160,
    "left",
  );
  await snapshot("after-selection-create");

  const selection = snapshots.at(-1)?.selectionRect;
  if (selection) {
    await drag(
      { x: selection.x + selection.width / 2, y: selection.y + selection.height / 2 },
      { x: selection.x + selection.width / 2 + 80, y: selection.y + selection.height / 2 + 50 },
      120,
      "left",
    );
  }
  await snapshot("after-selection-move");

  const movedSelection = snapshots.at(-1)?.selectionRect;
  if (movedSelection) {
    await drag(
      { x: movedSelection.right, y: movedSelection.bottom },
      { x: movedSelection.right - 70, y: movedSelection.bottom - 45 },
      120,
      "left",
    );
  }
  await snapshot("after-handle-resize");

  await page.evaluate(() => {
    const viewport = document.querySelector("#scanner-viewport");
    if (viewport) {
      viewport.scrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      viewport.scrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    }
  });
  await sleep(120);
  await snapshot("after-native-scroll");

  const result = { url, fixturePath, errors, snapshots, generatedAt: new Date().toISOString() };
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ outputPath, errors, snapshotLabels: snapshots.map((item) => item.label) }));
} catch (error) {
  const result = { url, fixturePath, errors: [...errors, `probe: ${error.message}`], snapshots, generatedAt: new Date().toISOString() };
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.error(JSON.stringify({ outputPath, errors: result.errors, snapshotLabels: snapshots.map((item) => item.label) }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
