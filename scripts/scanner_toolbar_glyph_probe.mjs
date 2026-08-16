// Verifies the workspace scanner toolbar printer glyph feeds paper from its top slot,
// through its body, and out below on every pointer entry. Captures both themes.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const evidenceDir = process.argv[2] || "/tmp/scanner-toolbar-paper-feed";
const reportPath = process.argv[3] || `${evidenceDir}/report.json`;

const results = [];
const failures = [];

function ok(label, detail = {}) {
  results.push({ ok: true, label, ...detail });
  console.log(`PASS  ${label}`);
}

function fail(label, detail = {}) {
  failures.push({ ok: false, label, ...detail });
  console.error(`FAIL  ${label}`, JSON.stringify(detail));
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function readFrame(page) {
  return page.evaluate(() => {
    const paper = document.querySelector("[data-scanner-toolbar-paper]");
    const printer = document.querySelector("[data-scanner-toolbar-icon] svg");
    if (!paper || !printer) return null;

    const paperBox = paper.getBoundingClientRect();
    const printerBox = printer.getBoundingClientRect();
    const paperStyle = getComputedStyle(paper);
    const printerStyle = getComputedStyle(printer);

    return {
      animationName: paperStyle.animationName,
      backgroundColor: paperStyle.backgroundColor,
      opacity: Number(paperStyle.opacity),
      paperCenterY: Number((paperBox.top + paperBox.bottom) / 2).toFixed(2),
      printerCenterY: Number((printerBox.top + printerBox.bottom) / 2).toFixed(2),
      printerTop: Number(printerBox.top).toFixed(2),
      printerBottom: Number(printerBox.bottom).toFixed(2),
      printerColor: printerStyle.color,
    };
  });
}

async function saveToolbarCapture(page, button, destination) {
  await page.evaluate(() => {
    const paper = document.querySelector("[data-scanner-toolbar-paper]");
    if (paper instanceof HTMLElement) paper.style.animationPlayState = "paused";
  });
  await button.screenshot({ path: destination });
  await page.evaluate(() => {
    const paper = document.querySelector("[data-scanner-toolbar-paper]");
    if (paper instanceof HTMLElement) paper.style.animationPlayState = "";
  });
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
  if (idle?.opacity === 0 && idle.animationName === "none") {
    ok("paper stays hidden before hover", { idle });
  } else {
    fail("paper stays hidden before hover", { idle });
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
      await sleep(80);
    };

    await hoverIcon();
    await sleep(350);
    const entering = await readFrame(page);

    await sleep(325);
    const throughBody = await readFrame(page);

    await sleep(525);
    const exiting = await readFrame(page);

    await leaveIcon();
    await hoverIcon();
    await sleep(350);
    await saveToolbarCapture(page, button, `${evidenceDir}/02-light-entering.png`);
    await leaveIcon();
    await hoverIcon();
    await sleep(675);
    await saveToolbarCapture(page, button, `${evidenceDir}/03-light-through-body.png`);
    await leaveIcon();
    await hoverIcon();
    await sleep(1_200);
    await saveToolbarCapture(page, button, `${evidenceDir}/04-light-exiting.png`);

    const feedCenters = [entering, throughBody, exiting].map((frame) => frame?.paperCenterY ?? NaN);
    const visibleFrames = [entering, throughBody, exiting].every((frame) => (frame?.opacity ?? 0) > 0.3);
    const travelsDownward = feedCenters.every((center, index) => index === 0 || center > feedCenters[index - 1]);
    const crossesPrinter =
      (entering?.paperCenterY ?? Infinity) < (throughBody?.printerCenterY ?? -Infinity) &&
      Math.abs((throughBody?.paperCenterY ?? Infinity) - (throughBody?.printerCenterY ?? -Infinity)) < 7 &&
      (exiting?.paperCenterY ?? -Infinity) > (exiting?.printerBottom ?? Infinity);

    if (visibleFrames && travelsDownward && crossesPrinter && throughBody?.animationName === "scanner-toolbar-paper-feed") {
      ok("paper enters above, crosses the printer body, and exits below", {
        entering,
        throughBody,
        exiting,
      });
    } else {
      fail("paper enters above, crosses the printer body, and exits below", {
        entering,
        throughBody,
        exiting,
        visibleFrames,
        travelsDownward,
        crossesPrinter,
      });
    }

    await sleep(180);
    const settled = await readFrame(page);
    if (settled?.opacity === 0) ok("paper hides after leaving the output tray", { settled });
    else fail("paper hides after leaving the output tray", { settled });

    await leaveIcon();
    await hoverIcon();
    await sleep(350);
    const interrupted = await readFrame(page);
    await leaveIcon();
    await hoverIcon();
    await sleep(675);
    const replay = await readFrame(page);
    await saveToolbarCapture(page, button, `${evidenceDir}/05-light-replay.png`);
    if (
      (interrupted?.opacity ?? 0) > 0.3 &&
      (replay?.opacity ?? 0) > 0.3 &&
      replay?.animationName === "scanner-toolbar-paper-feed"
    ) {
      ok("paper feed restarts cleanly after an interrupted hover", { interrupted, replay });
    } else {
      fail("paper feed restarts cleanly after an interrupted hover", { interrupted, replay });
    }

    const repeatedHovers = [];
    for (let cycle = 1; cycle <= 3; cycle += 1) {
      await leaveIcon();
      await hoverIcon();
      await sleep(675);
      repeatedHovers.push(await readFrame(page));
    }
    if (
      repeatedHovers.every(
        (frame) => (frame?.opacity ?? 0) > 0.3 && frame?.animationName === "scanner-toolbar-paper-feed"
      )
    ) {
      ok("paper feed reliably replays across repeated hovers", { repeatedHovers });
    } else {
      fail("paper feed reliably replays across repeated hovers", { repeatedHovers });
    }

    const libraryButton = await page.$('button[title="Library"]');
    const scannerButtonBox = await button.boundingBox();
    const libraryButtonBox = await libraryButton?.boundingBox();
    if (scannerButtonBox && libraryButtonBox) {
      const scannerTargetPoints = [
        { label: "upper-left", x: scannerButtonBox.x + 3, y: scannerButtonBox.y + 3 },
        { label: "upper-right", x: scannerButtonBox.x + scannerButtonBox.width - 3, y: scannerButtonBox.y + 3 },
        { label: "lower-left", x: scannerButtonBox.x + 3, y: scannerButtonBox.y + scannerButtonBox.height - 3 },
        { label: "lower-right", x: scannerButtonBox.x + scannerButtonBox.width - 3, y: scannerButtonBox.y + scannerButtonBox.height - 3 },
      ];
      const fullButtonReplays = [];
      for (const point of scannerTargetPoints) {
        await page.mouse.move(
          libraryButtonBox.x + libraryButtonBox.width / 2,
          libraryButtonBox.y + libraryButtonBox.height / 2
        );
        await sleep(90);
        await page.mouse.move(point.x, point.y);
        await sleep(675);
        fullButtonReplays.push({ point: point.label, frame: await readFrame(page) });
      }
      if (
        fullButtonReplays.every(
          ({ frame }) => (frame?.opacity ?? 0) > 0.3 && frame?.animationName === "scanner-toolbar-paper-feed"
        )
      ) {
        ok("paper feed starts from every scanner-button hover zone after Library", { fullButtonReplays });
      } else {
        fail("paper feed starts from every scanner-button hover zone after Library", { fullButtonReplays });
      }
    } else {
      fail("toolbar scanner and Library buttons have measurable hover targets");
    }

    await sleep(400);
    await leaveIcon();
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await sleep(100);
    await hoverIcon();
    await sleep(675);
    const dark = await readFrame(page);
    await saveToolbarCapture(page, button, `${evidenceDir}/06-dark-through-body.png`);
    if (
      (dark?.opacity ?? 0) > 0.3 &&
      dark?.backgroundColor === dark?.printerColor &&
      dark?.animationName === "scanner-toolbar-paper-feed"
    ) {
      ok("paper inherits the printer color in dark mode", { dark });
    } else {
      fail("paper inherits the printer color in dark mode", { dark });
    }

    await sleep(400);
    await leaveIcon();
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await hoverIcon();
    await sleep(120);
    const reducedMotion = await readFrame(page);
    if (reducedMotion?.opacity === 0 && reducedMotion.animationName === "none") {
      ok("reduced-motion preference disables paper movement", { reducedMotion });
    } else {
      fail("reduced-motion preference disables paper movement", { reducedMotion });
    }
  }
}

const browserErrors = logs.filter((entry) => /failed to connect|uncaught|websocket/i.test(entry)).length;
if (browserErrors === 0) ok("no browser console errors", { logCount: logs.length });
else fail("no browser console errors", { browserErrors, logSample: logs.slice(-5) });

writeFileSync(reportPath, JSON.stringify({ results, failures, browserLogSample: logs.slice(0, 10) }, null, 2));
await browser.close();
if (failures.length > 0) process.exit(1);
