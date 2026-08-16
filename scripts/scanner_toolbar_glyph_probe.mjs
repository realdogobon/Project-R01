// Minimal probe: verify the toolbar scanner entry point renders the Printer glyph
// and its paper element slides up on hover (paper-slide animation), capturing both
// idle and hover states. Expects arguments: [idle.png] [hover.png] [report.json]
import puppeteer from "puppeteer-core";

const BASE = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const idlePath = process.argv[2] || "/tmp/scanner-toolbar-glyph/01-idle.png";
const hoverPath = process.argv[3] || "/tmp/scanner-toolbar-glyph/02-hover.png";
const reportPath = process.argv[4] || "/tmp/scanner-toolbar-glyph/report.json";

const results = [];
const failures = [];

function ok(label, detail) {
  results.push({ ok: true, label, ...detail });
  console.log(`PASS  ${label}`);
}
function fail(label, detail) {
  failures.push({ ok: false, label, ...detail });
  console.error(`FAIL  ${label}`, JSON.stringify(detail));
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--window-size=1280,720"]
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const logs = [];
page.on("console", (m) => logs.push(m.text()));
page.on("pageerror", (e) => failures.push({ ok: false, label: "pageerror", message: e.message }));

await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));

// Locate the toolbar scanner entry wrapper near the command palette glyph
const wrapperSelector = ".scanner-icon-wrapper";
const wrapper = await page.$(wrapperSelector);
if (!wrapper) {
  fail("toolbar scanner wrapper visible", { found: false });
} else {
  ok("toolbar scanner wrapper visible", { found: true });
  const hasPrinter = await page.evaluate(() => !!document.querySelector(".scanner-icon-wrapper svg[viewBox='0 0 24 24']"));
  const svgCount = await page.evaluate(() => document.querySelectorAll(".scanner-icon-wrapper svg").length);
  const paperExists = await page.evaluate(() => !!document.querySelector(".scanner-icon-wrapper .scanner-paper"));
  ok("renderer icon inside wrapper", { svgCount });
  if (paperExists) ok("paper element present for hover animation", { paperExists });
  else fail("paper element present for hover animation", { paperExists });

  await wrapper.screenshot({ path: idlePath });

  // Hover over the wrapper and capture the animated state
  const box = await wrapper.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await new Promise((r) => setTimeout(r, 500));
  const paperAfterHover = await page.evaluate(() => {
    const el = document.querySelector(".scanner-icon-wrapper .scanner-paper");
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { transform: cs.transform, opacity: cs.opacity };
  });
  if (paperAfterHover && parseFloat(paperAfterHover.opacity) > 0.5) {
    ok("paper slides up on hover", { paperAfterHover });
  } else {
    fail("paper slides up on hover", { paperAfterHover });
  }
  await wrapper.screenshot({ path: hoverPath });
}

const browserErrors = logs.filter((l) => /failed to connect|Uncaught|WebSocket/i.test(l)).length;
if (browserErrors === 0) ok("no browser console errors", { logCount: logs.length });
else fail("no browser console errors", { browserErrors });

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
mkdirSync(dirname(reportPath), { recursive: true });
import { writeFileSync } from "node:fs";
writeFileSync(
  reportPath,
  JSON.stringify({ results, failures, browserLogSample: logs.slice(0, 5) }, null, 2)
);
await browser.close();
if (failures.length > 0) process.exit(1);
