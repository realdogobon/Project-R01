import puppeteer from "/tmp/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:3000";
const fixturePath = process.argv[3] || "/tmp/royscript-scanner-fixture.png";
const outputPath = process.argv[4] || "/tmp/scanner_edge_autopan_creation_probe.json";
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

const read = async (label) => page.evaluate((snapshotLabel) => {
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

const clickTitle = async (title) => {
  await page.waitForSelector(`[title="${title}"]`, { timeout: 15000 });
  await page.click(`[title="${title}"]`);
  await sleep(120);
};

const drag = async (from, to, steps = 240) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button: "left" });
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    await page.mouse.move(from.x + (to.x - from.x) * progress, from.y + (to.y - from.y) * progress);
  }
  await page.mouse.up({ button: "left" });
  await sleep(180);
};

try {
  await page.goto(`${url.replace(/\/$/, "")}/?scannerCreationEdgeProbe=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });
  const inputs = await page.$$('input[type="file"]');
  if (!inputs.length) throw new Error("No scanner file input found");
  await inputs.at(-1).uploadFile(fixturePath);
  await page.waitForFunction(() => Boolean(document.querySelector('#scanner-viewport img[alt="Scanned Document Paper Element"]')), { timeout: 30000 });
  await sleep(400);
  for (let index = 0; index < 20; index += 1) await clickTitle("Increase Zoom (+5%)");
  await clickTitle("Crop Tool");

  const before = await read("before-corner-creation");
  const viewport = before.viewport.rect;
  const start = { x: viewport.left + viewport.width * 0.45, y: viewport.top + viewport.height * 0.45 };
  const target = { x: viewport.right + 100, y: viewport.bottom + 100 };
  await drag(start, target);
  const after = await read("after-corner-creation");
  const result = {
    url,
    fixturePath,
    errors,
    before,
    after,
    scrollDelta: {
      left: after.viewport.scrollLeft - before.viewport.scrollLeft,
      top: after.viewport.scrollTop - before.viewport.scrollTop,
    },
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ outputPath, errors, scrollDelta: result.scrollDelta, selection: after.selection }));
} catch (error) {
  const result = { url, fixturePath, errors: [...errors, `probe: ${error.message}`], generatedAt: new Date().toISOString() };
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.error(JSON.stringify({ outputPath, errors: result.errors }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
