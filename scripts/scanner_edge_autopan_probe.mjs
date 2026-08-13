import puppeteer from "/tmp/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:3000";
const fixturePath = process.argv[3] || "/tmp/royscript-scanner-fixture.png";
const outputPath = process.argv[4] || "/tmp/scanner_edge_autopan_probe.json";
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

const measurements = [];
const geometry = async (label) => {
  const value = await page.evaluate((snapshotLabel) => {
    const viewport = document.querySelector("#scanner-viewport");
    const selection = viewport?.querySelector("[data-crop-selection]");
    const image = viewport?.querySelector('img[alt="Scanned Document Paper Element"]') || viewport?.querySelector("img");
    const rect = (element) => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return { left: value.left, top: value.top, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
    };
    return {
      label: snapshotLabel,
      viewport: viewport ? {
        rect: rect(viewport),
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
        scrollWidth: viewport.scrollWidth,
        scrollHeight: viewport.scrollHeight,
        clientWidth: viewport.clientWidth,
        clientHeight: viewport.clientHeight,
      } : null,
      image: rect(image),
      selection: rect(selection),
    };
  }, label);
  measurements.push(value);
  return value;
};

const drag = async (from, to, steps = 160) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button: "left" });
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    await page.mouse.move(from.x + (to.x - from.x) * progress, from.y + (to.y - from.y) * progress);
  }
  await page.mouse.up({ button: "left" });
  await sleep(180);
};

const clickTitle = async (title) => {
  await page.waitForSelector(`[title="${title}"]`, { timeout: 15000 });
  await page.click(`[title="${title}"]`);
  await sleep(120);
};

try {
  await page.goto(`${url.replace(/\/$/, "")}/?scannerEdgeProbe=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });
  const inputs = await page.$$('input[type="file"]');
  if (!inputs.length) throw new Error("No scanner file input found");
  await inputs.at(-1).uploadFile(fixturePath);
  await page.waitForFunction(() => Boolean(document.querySelector('#scanner-viewport img[alt="Scanned Document Paper Element"]')), { timeout: 30000 });
  await sleep(500);

  for (let index = 0; index < 20; index += 1) await clickTitle("Increase Zoom (+5%)");
  await clickTitle("Crop Tool");
  const ready = await geometry("zoomed-crop-ready");
  if (!ready.viewport?.rect || !ready.image) throw new Error("Zoomed crop geometry was not measurable");

  const viewport = ready.viewport.rect;
  const image = ready.image;
  const visibleLeft = Math.max(viewport.left + 24, image.left + 24);
  const visibleTop = Math.max(viewport.top + 24, image.top + 24);
  const visibleRight = Math.min(viewport.right - 24, image.right - 24);
  const visibleBottom = Math.min(viewport.bottom - 24, image.bottom - 24);
  const start = { x: visibleLeft + (visibleRight - visibleLeft) * 0.35, y: visibleTop + (visibleBottom - visibleTop) * 0.35 };
  const end = { x: start.x + 180, y: start.y + 140 };
  await drag(start, end);
  await geometry("selection-created");

  const created = measurements.at(-1)?.selection;
  if (!created) throw new Error("Selection was not created");
  const moveStart = { x: created.left + created.width / 2, y: created.top + created.height / 2 };
  const moveTarget = { x: viewport.right + 100, y: moveStart.y };
  await drag(moveStart, moveTarget, 220);
  await geometry("selection-dragged-past-right-edge");

  const moved = measurements.at(-1)?.selection;
  if (!moved) throw new Error("Moved selection was not measurable");
  const resizeStart = { x: moved.right, y: moved.bottom };
  const resizeTarget = { x: viewport.right + 100, y: viewport.bottom + 100 };
  await drag(resizeStart, resizeTarget, 220);
  await geometry("handle-resized-past-bottom-right-edge");

  const result = {
    url,
    fixturePath,
    errors,
    measurements,
    interpretation: {
      nativeExpectation: "When an active crop move or resize reaches a visible viewport edge on a zoomed document, the viewport should auto-pan while the pointer remains attached to the document point and the crop stays coherent with the page.",
      observedScrollChanges: measurements.slice(1).map((item) => ({ label: item.label, scrollLeft: item.viewport?.scrollLeft ?? null, scrollTop: item.viewport?.scrollTop ?? null })),
    },
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ outputPath, errors, labels: measurements.map((item) => item.label) }));
} catch (error) {
  const result = { url, fixturePath, errors: [...errors, `probe: ${error.message}`], measurements, generatedAt: new Date().toISOString() };
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.error(JSON.stringify({ outputPath, errors: result.errors, labels: measurements.map((item) => item.label) }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
