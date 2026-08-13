import puppeteer from "/tmp/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:3000";
const fixturePath = process.argv[3] || "/tmp/royscript-scanner-fixture.png";
const outputPath = process.argv[4] || "/tmp/scanner_flat_crop_probe.json";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = await puppeteer.launch({ executablePath: "/usr/bin/chromium", headless: "new", args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"], defaultViewport: { width: 1440, height: 960 } });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });

const readLayout = async (label) => page.evaluate((snapshotLabel) => {
  const viewport = document.querySelector("#scanner-viewport");
  const stage = viewport?.querySelector("[data-scanner-stage]");
  const deck = viewport?.querySelector("[class*='h-[380px]'], [class*='h-[480px]']");
  const selection = viewport?.querySelector("[data-crop-selection]");
  const rect = (element) => {
    if (!element) return null;
    const value = element.getBoundingClientRect();
    return { left: value.left, top: value.top, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
  };
  return {
    label: snapshotLabel,
    viewport: viewport ? { rect: rect(viewport), scrollLeft: viewport.scrollLeft, scrollTop: viewport.scrollTop, scrollWidth: viewport.scrollWidth, scrollHeight: viewport.scrollHeight, clientWidth: viewport.clientWidth, clientHeight: viewport.clientHeight } : null,
    stage: rect(stage),
    deck: rect(deck),
    selection: rect(selection),
    modal: rect(document.querySelector("[data-scanner-modal-shell]")),
    cropQueueCount: document.querySelectorAll("[title='Clip Page']").length,
  };
}, label);

try {
  await page.goto(`${url.replace(/\/$/, "")}/?scannerFlatCropProbe=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });
  const inputs = await page.$$('input[type="file"]');
  await inputs.at(-1).uploadFile(fixturePath);
  await page.waitForFunction(() => Boolean(document.querySelector('#scanner-viewport img[alt="Scanned Document Paper Element"]')), { timeout: 30000 });
  await sleep(300);
  for (let index = 0; index < 20; index += 1) await page.click('[title="Increase Zoom (+5%)"]');
  await page.click('[title="Crop Tool"]');
  const before = await readLayout("before-flat-crop");
  const surface = await page.$("[data-scanner-document-surface]");
  const surfaceBox = await surface.boundingBox();
  const start = { x: surfaceBox.x + surfaceBox.width * 0.12, y: surfaceBox.y + surfaceBox.height * 0.48 };
  const end = { x: surfaceBox.x + surfaceBox.width * 0.88, y: surfaceBox.y + surfaceBox.height * 0.52 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down({ button: "left" });
  for (let index = 1; index <= 220; index += 1) {
    const progress = index / 220;
    await page.mouse.move(start.x + (end.x - start.x) * progress, start.y + (end.y - start.y) * progress);
  }
  await page.mouse.up({ button: "left" });
  await sleep(160);
  const selected = await readLayout("after-flat-crop");
  await page.click('[title="Add Clip"]');
  await sleep(160);
  const queued = await readLayout("after-queue");
  const buttonState = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button")).map((button) => ({ text: button.textContent?.trim() || "", title: button.getAttribute("title"), disabled: button.hasAttribute("disabled") }));
    const button = buttons.find((candidate) => candidate.text === "Scan" || candidate.text.endsWith("Scan")) || buttons.find((candidate) => candidate.title === "Scan");
    return { buttons, foundScan: Boolean(button) };
  });
  if (!buttonState.foundScan) throw new Error(`Scan button not found after queueing flat crop; buttons=${JSON.stringify(buttonState.buttons)}`);
  await page.evaluate(() => Array.from(document.querySelectorAll("button")).find((candidate) => (candidate.textContent?.trim() || "").endsWith("Scan"))?.click());
  await page.waitForFunction(() => /Scanning clip|Scan completed|Transcribing document/.test(document.body.innerText), { timeout: 15000 }).catch(() => {});
  await sleep(220);
  const scanned = await readLayout("during-flat-crop-scan");
  const result = { url, fixturePath, errors, buttonState, before, selected, queued, scanned, generatedAt: new Date().toISOString() };
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ outputPath, errors, viewport: scanned.viewport, deck: scanned.deck }));
} catch (error) {
  const result = { url, fixturePath, errors: [...errors, `probe: ${error.message}`], generatedAt: new Date().toISOString() };
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.error(JSON.stringify({ outputPath, errors: result.errors }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
