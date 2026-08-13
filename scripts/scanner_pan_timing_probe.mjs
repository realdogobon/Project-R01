import puppeteer from "/tmp/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:3000";
const fixturePath = process.argv[3] || "/tmp/royscript-scanner-fixture.png";
const outputPath = process.argv[4] || "/tmp/scanner_pan_timing_probe.json";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = await puppeteer.launch({ executablePath: "/usr/bin/chromium", headless: "new", args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"], defaultViewport: { width: 1440, height: 960 } });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });

try {
  await page.goto(`${url.replace(/\/$/, "")}/?scannerPanTimingProbe=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });
  const inputs = await page.$$('input[type="file"]');
  await inputs.at(-1).uploadFile(fixturePath);
  await page.waitForFunction(() => Boolean(document.querySelector('#scanner-viewport img[alt="Scanned Document Paper Element"]')), { timeout: 30000 });
  await sleep(300);
  for (let index = 0; index < 60; index += 1) {
    await page.click('[title="Increase Zoom (+5%)"]');
  }
  await page.click('[title="Crop Tool"]');
  const viewport = await page.$("#scanner-viewport");
  const box = await viewport.boundingBox();
  await page.evaluate(() => {
    const viewport = document.querySelector("#scanner-viewport");
    if (!viewport) return;
    const vr = viewport.getBoundingClientRect();
    const candidates = Array.from(document.querySelectorAll("[data-scanner-document-surface]"));
    candidates.forEach((candidate) => candidate.removeAttribute("data-probe-visible-surface"));
    const visible = candidates
      .map((candidate) => {
        const rect = candidate.getBoundingClientRect();
        const intersection = Math.max(0, Math.min(rect.right, vr.right) - Math.max(rect.left, vr.left)) * Math.max(0, Math.min(rect.bottom, vr.bottom) - Math.max(rect.top, vr.top));
        return { candidate, intersection };
      })
      .sort((a, b) => b.intersection - a.intersection)[0];
    visible?.candidate.setAttribute("data-probe-visible-surface", "true");
  });
  const surface = await page.$("[data-probe-visible-surface]");
  const surfaceBox = await surface.boundingBox();
  const x = Math.min(surfaceBox.x + surfaceBox.width - 20, box.x + box.width - 24);
  const y = Math.max(box.y + 2, Math.min(surfaceBox.y + surfaceBox.height / 2, box.y + box.height - 2));
  const hitStack = await page.evaluate(({ x, y }) => document.elementsFromPoint(x, y).slice(0, 10).map((element) => ({ tag: element.tagName, id: element.id, className: element.className, title: element.getAttribute("title"), crop: element.hasAttribute("data-crop-selection"), surface: element.hasAttribute("data-scanner-document-surface") })), { x, y });
  await page.evaluate(() => {
    window.__scannerPanSamples = [];
    window.__scannerPanEvents = [];
    const viewport = document.querySelector("#scanner-viewport");
    const surfaces = document.querySelectorAll("[data-scanner-document-surface]");
    surfaces.forEach((surface) => {
      surface.addEventListener("pointerdown", (event) => window.__scannerPanEvents.push({ type: "surface-down", button: event.button, clientX: event.clientX, clientY: event.clientY }), { passive: true });
      surface.addEventListener("pointermove", (event) => window.__scannerPanEvents.push({ type: "surface-move", button: event.button, clientX: event.clientX, clientY: event.clientY }), { passive: true });
    });
    viewport?.addEventListener("scroll", () => window.__scannerPanEvents.push({ type: "scroll", scrollLeft: viewport.scrollLeft, scrollTop: viewport.scrollTop }), { passive: true });
  });
  await page.mouse.move(x, y);
  await page.mouse.down({ button: "left" });
  const samples = [];
  const started = Date.now();
  while (Date.now() - started < 520) {
    samples.push(await page.evaluate(() => {
      const viewport = document.querySelector("#scanner-viewport");
      return viewport ? { t: performance.now(), scrollLeft: viewport.scrollLeft, scrollTop: viewport.scrollTop } : null;
    }));
    await sleep(16);
  }
  const measured = { samples: samples.filter(Boolean) };
  await page.mouse.up({ button: "left" });
  const geometry = await page.evaluate(() => {
    const viewport = document.querySelector("#scanner-viewport");
    const surface = document.querySelector("[data-scanner-document-surface]");
    const rect = (element) => element ? (() => { const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; })() : null;
    return { viewport: rect(viewport), surface: rect(surface), scrollLeft: viewport?.scrollLeft ?? null, scrollTop: viewport?.scrollTop ?? null };
  });
  const events = await page.evaluate(() => window.__scannerPanEvents || []);
  const result = { url, fixturePath, errors, viewport: box, geometry, pointer: { x, y }, hitStack, events, measured, generatedAt: new Date().toISOString() };
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ outputPath, errors, sampleCount: measured.samples.length }));
} catch (error) {
  const result = { url, fixturePath, errors: [...errors, `probe: ${error.message}`], generatedAt: new Date().toISOString() };
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.error(JSON.stringify({ outputPath, errors: result.errors }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
