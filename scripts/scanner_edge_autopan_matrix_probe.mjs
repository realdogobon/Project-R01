import puppeteer from "/tmp/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:3000";
const fixturePath = process.argv[3] || "/tmp/royscript-scanner-fixture.png";
const outputPath = process.argv[4] || "/tmp/scanner_edge_autopan_matrix_probe.json";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1440, height: 960 },
});

const cases = ["left", "right", "top", "bottom"];
const results = [];

const readGeometry = async (page, label) => page.evaluate((snapshotLabel) => {
  const viewport = document.querySelector("#scanner-viewport");
  const selection = viewport?.querySelector("[data-crop-selection]");
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
    selection: rect(selection),
  };
}, label);

const drag = async (page, from, to, steps = 180) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button: "left" });
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    await page.mouse.move(from.x + (to.x - from.x) * progress, from.y + (to.y - from.y) * progress);
  }
  await page.mouse.up({ button: "left" });
  await sleep(180);
};

const clickTitle = async (page, title) => {
  await page.waitForSelector(`[title="${title}"]`, { timeout: 15000 });
  await page.click(`[title="${title}"]`);
  await sleep(120);
};

for (const direction of cases) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  try {
    await page.goto(`${url.replace(/\/$/, "")}/?scannerEdgeMatrix=${direction}-${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
    await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
    await page.click('[title="AI Scanner"]');
    await page.waitForSelector("#scanner-viewport", { timeout: 20000 });
    const inputs = await page.$$('input[type="file"]');
    if (!inputs.length) throw new Error("No scanner file input found");
    await inputs.at(-1).uploadFile(fixturePath);
    await page.waitForFunction(() => Boolean(document.querySelector('#scanner-viewport img[alt="Scanned Document Paper Element"]')), { timeout: 30000 });
    await sleep(400);
    for (let index = 0; index < 20; index += 1) await clickTitle(page, "Increase Zoom (+5%)");
    await clickTitle(page, "Crop Tool");

    const ready = await readGeometry(page, `${direction}-ready`);
    const viewport = ready.viewport.rect;
    const start = { x: viewport.left + viewport.width * 0.45, y: viewport.top + viewport.height * 0.45 };
    const createTarget = { x: start.x + 160, y: start.y + 120 };
    await drag(page, start, createTarget);
    const created = await readGeometry(page, `${direction}-created`);
    const selection = created.selection;
    if (!selection) throw new Error("Selection was not created");

    const initialScroll = {
      left: created.viewport.scrollLeft,
      top: created.viewport.scrollTop,
    };
    if (direction === "left") {
      await page.evaluate(() => {
        const viewport = document.querySelector("#scanner-viewport");
        if (viewport) viewport.scrollLeft = viewport.scrollWidth - viewport.clientWidth;
      });
    }
    if (direction === "top") {
      await page.evaluate(() => {
        const viewport = document.querySelector("#scanner-viewport");
        if (viewport) viewport.scrollTop = viewport.scrollHeight - viewport.clientHeight;
      });
    }
    await sleep(120);
    const beforeMove = await readGeometry(page, `${direction}-before-move`);
    const currentSelection = beforeMove.selection;
    const moveStart = { x: currentSelection.left + currentSelection.width / 2, y: currentSelection.top + currentSelection.height / 2 };
    const moveTarget = {
      left: { x: beforeMove.viewport.rect.left - 100, y: moveStart.y },
      right: { x: beforeMove.viewport.rect.right + 100, y: moveStart.y },
      top: { x: moveStart.x, y: beforeMove.viewport.rect.top - 100 },
      bottom: { x: moveStart.x, y: beforeMove.viewport.rect.bottom + 100 },
    }[direction];
    await drag(page, moveStart, moveTarget, 220);
    const afterMove = await readGeometry(page, `${direction}-after-move`);
    results.push({
      direction,
      errors,
      initialScroll,
      beforeMove,
      afterMove,
      scrollDelta: {
        left: afterMove.viewport.scrollLeft - beforeMove.viewport.scrollLeft,
        top: afterMove.viewport.scrollTop - beforeMove.viewport.scrollTop,
      },
    });
  } catch (error) {
    results.push({ direction, errors: [...errors, `probe: ${error.message}`] });
  } finally {
    await page.close();
  }
}

const output = { url, fixturePath, results, generatedAt: new Date().toISOString() };
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(JSON.stringify({ outputPath, results: results.map((item) => ({ direction: item.direction, errors: item.errors, scrollDelta: item.scrollDelta })) }));
await browser.close();
