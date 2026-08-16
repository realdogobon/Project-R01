import { mkdirSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const base = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const evidenceDir = process.argv[2] || "/tmp/scanner-toolbar-proportion";
mkdirSync(evidenceDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 6 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await page.goto(`${base}/`, { waitUntil: "networkidle0", timeout: 60_000 });
await new Promise((r) => setTimeout(r, 800));

const button = await page.$('button[title="AI Scanner"]');
const box = await button.boundingBox();

function freeze(delayMs) {
  return page.evaluate((delay) => {
    const btn = document.querySelector('button[title="AI Scanner"]');
    const rect = btn.getBoundingClientRect();
    btn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }));
    return new Promise((resolve) => {
      const start = performance.now();
      const tick = () => {
        if (performance.now() - start < delay) return requestAnimationFrame(tick);
        document.querySelectorAll("[data-scanner-toolbar-paper-entry], [data-scanner-toolbar-paper-output], [data-scanner-toolbar-paper-exit]").forEach((el) => {
          const cs = getComputedStyle(el);
          if (cs.animationName && cs.animationName !== "none") {
            const t = cs.animationDelay ? parseFloat(cs.animationDelay) : 0;
            const d = parseFloat(cs.animationDuration);
            const elapsed = performance.now() - (Number(el.dataset.startT ?? performance.now()));
            el.style.transform = "none";
            el.dataset.frozen = String(((elapsed - t) / d) * 100);
          }
        });
        resolve();
      };
      // record start time on the sheet elements
      document.querySelectorAll("[data-scanner-toolbar-paper-entry], [data-scanner-toolbar-paper-output], [data-scanner-toolbar-paper-exit]").forEach((el) => {
        el.dataset.startT = String(performance.now());
      });
      tick();
    });
  }, delayMs);
}

// 1.5s into the 2.7s cycle — the sheet should be crossing the printer (hidden) but
// entry sheet at 40% is above holder; pick 900ms where entry is visible mid-descent.
await freeze(900);
await page.screenshot({ path: `${evidenceDir}/02-entry-mid.png`, clip: { x: box.x - 10, y: box.y - 10, width: box.width + 20, height: box.height + 20 } });

const entryGeo = await page.evaluate(() => {
  const icon = document.querySelector("[data-scanner-toolbar-icon]");
  const entry = document.querySelector("[data-scanner-toolbar-paper-entry]");
  return {
    icon: icon.getBoundingClientRect(),
    entryVisibleRect: entry.getBoundingClientRect(),
    entryStyle: { width: getComputedStyle(entry).width, height: getComputedStyle(entry).height },
  };
});
console.log(JSON.stringify({ entry: entryGeo, progressPct: 900 / 2700 }, null, 2));

// freeze at 2350ms when the tray sheet is visible
await page.evaluate(() => {
  document.querySelectorAll("[data-scanner-toolbar-paper-entry], [data-scanner-toolbar-paper-output], [data-scanner-toolbar-paper-exit]").forEach((el) => {
    el.style.transform = "";
  });
});
await new Promise((r) => setTimeout(r, 300));
await freeze(2350);
await page.screenshot({ path: `${evidenceDir}/04-tray-mid.png`, clip: { x: box.x - 10, y: box.y - 10, width: box.width + 20, height: box.height + 20 } });

const trayGeo = await page.evaluate(() => {
  const icon = document.querySelector("[data-scanner-toolbar-icon]");
  const out = document.querySelector("[data-scanner-toolbar-paper-output]");
  return {
    icon: icon.getBoundingClientRect(),
    trayVisibleRect: out.getBoundingClientRect(),
    trayStyle: { width: getComputedStyle(out).width, height: getComputedStyle(out).height },
  };
});
console.log(JSON.stringify({ tray: trayGeo, progressPct: 2350 / 2700 }, null, 2));

writeFileSync(`${evidenceDir}/report.json`, JSON.stringify({ entry: entryGeo, tray: trayGeo }, null, 2));
await browser.close();
