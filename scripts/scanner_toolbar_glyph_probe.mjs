// Verifies that the scanner toolbar sheet uses the Lucide printer glyph's actual
// top paper holder and lower output tray while staying invisible inside the body.
import { mkdirSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const evidenceDir = process.argv[2] || "/tmp/scanner-toolbar-paper-front-tray";
const reportPath = process.argv[3] || `${evidenceDir}/report.json`;
const results = [];
const failures = [];
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function ok(label, detail = {}) {
  results.push({ ok: true, label, ...detail });
  console.log(`PASS  ${label}`);
}

function fail(label, detail = {}) {
  failures.push({ ok: false, label, ...detail });
  console.error(`FAIL  ${label}`, JSON.stringify(detail));
}

async function readFrame(page) {
  return page.evaluate(() => {
    const entry = document.querySelector("[data-scanner-toolbar-paper-entry]");
    const output = document.querySelector("[data-scanner-toolbar-paper-output]");
    const exit = document.querySelector("[data-scanner-toolbar-paper-exit]");
    const printer = document.querySelector("[data-scanner-toolbar-icon] svg");
    const topHolder = document.querySelector("[data-scanner-toolbar-paper-top-holder]");
    const outputTray = document.querySelector("[data-scanner-toolbar-paper-output-tray]");
    const exitWindow = document.querySelector("[data-scanner-toolbar-paper-exit-window]");
    if (!entry || !output || !exit || !printer || !topHolder || !outputTray || !exitWindow) return null;

    const readElement = (element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        animationName: style.animationName,
        backgroundColor: style.backgroundColor,
        opacity: Number(style.opacity),
        top: Number(box.top).toFixed(2),
        bottom: Number(box.bottom).toFixed(2),
      };
    };
    const printerBox = printer.getBoundingClientRect();
    const printerStyle = getComputedStyle(printer);
    return {
      entry: readElement(entry),
      output: readElement(output),
      exit: readElement(exit),
      topHolder: readElement(topHolder),
      outputTray: readElement(outputTray),
      exitWindow: readElement(exitWindow),
      printerTop: Number(printerBox.top).toFixed(2),
      printerBottom: Number(printerBox.bottom).toFixed(2),
      printerColor: printerStyle.color,
    };
  });
}

async function saveToolbarCapture(page, button, destination) {
  await page.evaluate(() => {
    document
      .querySelectorAll("[data-scanner-toolbar-paper-entry], [data-scanner-toolbar-paper-output], [data-scanner-toolbar-paper-exit]")
      .forEach((paper) => {
        if (paper instanceof HTMLElement) paper.style.animationPlayState = "paused";
      });
  });
  await button.screenshot({ path: destination });
  await page.evaluate(() => {
    document
      .querySelectorAll("[data-scanner-toolbar-paper-entry], [data-scanner-toolbar-paper-output], [data-scanner-toolbar-paper-exit]")
      .forEach((paper) => {
        if (paper instanceof HTMLElement) paper.style.animationPlayState = "";
      });
  });
}

function intersects(segment, window) {
  return Number(segment.bottom) > Number(window.top) && Number(segment.top) < Number(window.bottom);
}

function isVisibleInTopHolder(frame) {
  return Boolean(frame && frame.entry.opacity > 0.3 && intersects(frame.entry, frame.topHolder));
}

function isFullyHiddenInside(frame) {
  return Boolean(frame && frame.entry.opacity <= 0.01 && frame.output.opacity <= 0.01 && frame.exit.opacity <= 0.01);
}

function isVisibleInOutputTray(frame) {
  return Boolean(frame && frame.output.opacity > 0.3 && intersects(frame.output, frame.outputTray));
}

function isVisibleLeavingOutputTray(frame) {
  return Boolean(frame && frame.exit.opacity > 0.3 && intersects(frame.exit, frame.exitWindow));
}

mkdirSync(evidenceDir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--window-size=1280,720"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);

const logs = [];
page.on("console", (message) => logs.push(message.text()));
page.on("pageerror", (error) => fail("page error", { message: error.message }));
await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60_000 });
await sleep(1_000);

const wrapper = await page.$("[data-scanner-toolbar-icon]");
const button = await page.$('button[title="AI Scanner"]');
if (!wrapper || !button) {
  fail("scanner toolbar entry is visible", { wrapper: Boolean(wrapper), button: Boolean(button) });
} else {
  ok("scanner toolbar entry is visible");
  const idle = await readFrame(page);
  await saveToolbarCapture(page, button, `${evidenceDir}/01-light-idle.png`);
  if (isFullyHiddenInside(idle) && idle?.entry.animationName === "none" && idle.output.animationName === "none" && idle.exit.animationName === "none") {
    ok("all paper segments stay hidden before hover", { idle });
  } else {
    fail("all paper segments stay hidden before hover", { idle });
  }

  const wrapperBox = await wrapper.boundingBox();
  if (!wrapperBox) {
    fail("scanner toolbar entry has a measurable pointer target");
  } else {
    const hoverIcon = async () => {
      await page.mouse.move(wrapperBox.x + wrapperBox.width / 2, wrapperBox.y + wrapperBox.height / 2);
    };
    const leaveIcon = async () => {
      await page.mouse.move(20, 680);
      await sleep(100);
    };
    const capturePhase = async (delay, destination) => {
      await leaveIcon();
      await hoverIcon();
      await sleep(delay);
      const frame = await readFrame(page);
      await saveToolbarCapture(page, button, destination);
      return frame;
    };

    const entering = await capturePhase(850, `${evidenceDir}/02-light-entering.png`);
    const inside = await capturePhase(1_900, `${evidenceDir}/03-light-inside-hidden.png`);
    const inTray = await capturePhase(2_400, `${evidenceDir}/04-light-output-tray.png`);
    const exiting = await capturePhase(2_620, `${evidenceDir}/05-light-exiting.png`);
    if (isVisibleInTopHolder(entering) && isFullyHiddenInside(inside) && isVisibleInOutputTray(inTray) && isVisibleLeavingOutputTray(exiting)) {
      ok("paper enters the front holder, stays hidden inside, and exits through the lower tray", { entering, inside, inTray, exiting });
    } else {
      fail("paper enters the front holder, stays hidden inside, and exits through the lower tray", { entering, inside, inTray, exiting });
    }

    const interrupted = await capturePhase(1_300, `${evidenceDir}/06-light-interrupted.png`);
    const replay = await capturePhase(1_300, `${evidenceDir}/07-light-replay.png`);
    if (isVisibleInTopHolder(interrupted) && isVisibleInTopHolder(replay) && replay?.entry.animationName === "scanner-toolbar-paper-entry") {
      ok("entry feed restarts cleanly after an interrupted hover", { interrupted, replay });
    } else {
      fail("entry feed restarts cleanly after an interrupted hover", { interrupted, replay });
    }

    const libraryButton = await page.$('button[title="Library"]');
    const scannerButtonBox = await button.boundingBox();
    const libraryButtonBox = await libraryButton?.boundingBox();
    if (scannerButtonBox && libraryButtonBox) {
      const points = [
        { label: "upper-left", x: scannerButtonBox.x + 3, y: scannerButtonBox.y + 3 },
        { label: "upper-right", x: scannerButtonBox.x + scannerButtonBox.width - 3, y: scannerButtonBox.y + 3 },
        { label: "lower-left", x: scannerButtonBox.x + 3, y: scannerButtonBox.y + scannerButtonBox.height - 3 },
        { label: "lower-right", x: scannerButtonBox.x + scannerButtonBox.width - 3, y: scannerButtonBox.y + scannerButtonBox.height - 3 },
      ];
      const replays = [];
      for (const point of points) {
        await page.mouse.move(libraryButtonBox.x + libraryButtonBox.width / 2, libraryButtonBox.y + libraryButtonBox.height / 2);
        await sleep(100);
        await page.mouse.move(point.x, point.y);
        await sleep(1_300);
        replays.push({ point: point.label, frame: await readFrame(page) });
      }
      if (replays.every(({ frame }) => isVisibleInTopHolder(frame) && frame?.entry.animationName === "scanner-toolbar-paper-entry")) {
        ok("entry feed starts from every scanner-button hover zone after Library", { replays });
      } else {
        fail("entry feed starts from every scanner-button hover zone after Library", { replays });
      }
    } else {
      fail("toolbar scanner and Library buttons have measurable hover targets");
    }

    await leaveIcon();
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await sleep(100);
    const dark = await capturePhase(2_400, `${evidenceDir}/08-dark-output-tray.png`);
    if (isVisibleInOutputTray(dark) && dark?.output.backgroundColor === dark.printerColor) {
      ok("output paper inherits the printer color in dark mode", { dark });
    } else {
      fail("output paper inherits the printer color in dark mode", { dark });
    }

    await leaveIcon();
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await hoverIcon();
    await sleep(120);
    const reducedMotion = await readFrame(page);
    if (isFullyHiddenInside(reducedMotion) && reducedMotion?.entry.animationName === "none" && reducedMotion.output.animationName === "none" && reducedMotion.exit.animationName === "none") {
      ok("reduced-motion preference disables every paper segment", { reducedMotion });
    } else {
      fail("reduced-motion preference disables every paper segment", { reducedMotion });
    }
  }
}

const browserErrors = logs.filter((entry) => /failed to connect|uncaught|websocket/i.test(entry)).length;
if (browserErrors === 0) ok("no browser console errors", { logCount: logs.length });
else fail("no browser console errors", { browserErrors, logSample: logs.slice(-5) });

writeFileSync(reportPath, JSON.stringify({ results, failures, browserLogSample: logs.slice(0, 10) }, null, 2));
await browser.close();
if (failures.length > 0) process.exit(1);
