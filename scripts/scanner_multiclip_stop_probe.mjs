import puppeteer from "/tmp/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:3000";
const pdf = process.argv[3] || "/home/ubuntu/upload/Volume_02.pdf";
const outputPath = process.argv[4] || "/tmp/scanner_multiclip_stop_probe.json";
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

const readState = async (label) => page.evaluate((snapshotLabel) => {
  const viewport = document.querySelector("#scanner-viewport");
  const stage = viewport?.querySelector("[data-scanner-stage]");
  const rect = (element) => {
    if (!element) return null;
    const value = element.getBoundingClientRect();
    return {
      left: value.left,
      top: value.top,
      width: value.width,
      height: value.height,
      right: value.right,
      bottom: value.bottom,
    };
  };
  const buttons = [...document.querySelectorAll("button")].map((button) => ({
    text: button.textContent?.trim() || "",
    title: button.getAttribute("title"),
    disabled: button.hasAttribute("disabled"),
  }));
  const scanButton = buttons.find((button) =>
    button.title === "Scan" ||
    button.title === "Stop scan" ||
    button.title === "Stopping scan" ||
    button.title === "Send extracted text",
  ) || buttons.find((button) => /^(?:\d+)?(?:Scan|Stop|Stopping|Send)$/.test(button.text));
  const statusText = [...document.querySelectorAll("body *")]
    .map((node) => node.textContent?.trim() || "")
    .find((text) => /^(Preparing scan\.\.\.|Stopping scan\.\.\.|Scanning clip \d+ of \d+\.\.\.|Scan completed|Transcribing document\.\.\.)$/.test(text)) || null;
  const clipMatch = statusText?.match(/^Scanning clip (\d+) of (\d+)\.\.\.$/);
  const laser = [...document.querySelectorAll(".laser-scanner-beam")].filter((node) => {
    const value = node.getBoundingClientRect();
    return value.width > 0 && value.height > 0;
  }).length;
  const queueLabel = [...document.querySelectorAll("body *")]
    .find((node) => /^Queued Clips \(\d+\)$/.test(node.textContent?.trim() || ""))?.textContent?.trim() || null;
  const queueMatch = queueLabel?.match(/^Queued Clips \((\d+)\)$/);
  const cropButton = document.querySelector('button[title="Crop Tool"]');
  return {
    label: snapshotLabel,
    time: performance.now(),
    scanButton,
    statusText,
    activeClipIndex: clipMatch ? Number(clipMatch[1]) : null,
    activeClipTotal: clipMatch ? Number(clipMatch[2]) : null,
    laser,
    queueLabel,
    queueCount: queueMatch ? Number(queueMatch[1]) : 0,
    cropModeEnabled: Boolean(cropButton?.className.includes("bg-neutral-800")),
    viewport: rect(viewport),
    stage: rect(stage),
  };
}, label);

const openScanner = async () => {
  await page.goto(`${url.replace(/\/$/, "")}/?scannerMultiClipStopProbe=${Date.now()}`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });
  await sleep(260);
};

const upload = async (path) => {
  const inputs = await page.$$('input[type="file"]');
  if (!inputs.length) throw new Error("No scanner file input found");
  await inputs.at(-1).uploadFile(path);
  await page.waitForFunction(
    () => Boolean(document.querySelector("#scanner-viewport img, #scanner-viewport canvas")),
    { timeout: 50000 },
  );
  await sleep(900);
};

const drag = async (from, to, steps = 100) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button: "left" });
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    await page.mouse.move(
      from.x + (to.x - from.x) * progress,
      from.y + (to.y - from.y) * progress,
    );
  }
  await page.mouse.up({ button: "left" });
  await sleep(180);
};

const addClip = async (start, end, expectedQueueCount) => {
  const cropState = await readState(`before-crop-${expectedQueueCount}`);
  if (!cropState.cropModeEnabled) await page.click('[title="Crop Tool"]');
  const surface = await page.$("[data-scanner-document-surface]");
  const bounds = await surface?.boundingBox();
  if (!bounds) throw new Error("Scanner surface unavailable");
  await drag(
    { x: bounds.x + bounds.width * start.x, y: bounds.y + bounds.height * start.y },
    { x: bounds.x + bounds.width * end.x, y: bounds.y + bounds.height * end.y },
  );
  await page.click('[title="Add Clip"]');
  await page.waitForFunction(
    (count) => [...document.querySelectorAll("body *")]
      .some((node) => node.textContent?.trim() === `Queued Clips (${count})`),
    { timeout: 10000 },
    expectedQueueCount,
  );
  await sleep(250);
};

const clickScan = async () => page.evaluate(() => {
  const titled = document.querySelector('button[title="Scan"]');
  if (titled) {
    titled.click();
    return true;
  }
  const button = [...document.querySelectorAll("button")].find((candidate) => {
    const text = candidate.textContent?.trim() || "";
    return text === "Scan" || /^\d+Scan$/.test(text);
  });
  if (!button) return false;
  button.click();
  return true;
});

const clickStop = async () => page.evaluate(() => {
  const button = document.querySelector('button[title="Stop scan"]')
    || [...document.querySelectorAll("button")].find((candidate) => /Stop/.test(candidate.textContent?.trim() || ""));
  if (!button) return false;
  button.click();
  return true;
});

const report = {
  url,
  pdf,
  errors,
  scenario: {
    queueTarget: 3,
    samplesBeforeStop: [],
    samplesAfterStop: [],
  },
  generatedAt: new Date().toISOString(),
};

try {
  await openScanner();
  await upload(pdf);
  await addClip({ x: 0.12, y: 0.15 }, { x: 0.82, y: 0.25 }, 1);
  await addClip({ x: 0.18, y: 0.38 }, { x: 0.78, y: 0.49 }, 2);
  await addClip({ x: 0.16, y: 0.62 }, { x: 0.84, y: 0.74 }, 3);

  report.scenario.beforeScan = await readState("before-scan");
  report.scenario.scanClicked = await clickScan();
  if (!report.scenario.scanClicked) throw new Error("Scan button was not clickable with three queued clips");

  await page.waitForFunction(
    () => document.body.innerText.includes("Scanning clip 1 of 3..."),
    { timeout: 20000 },
  );
  report.scenario.activeBeforeStop = await readState("active-clip-1-before-stop");
  if (report.scenario.activeBeforeStop.activeClipIndex !== 1 || report.scenario.activeBeforeStop.laser === 0) {
    throw new Error(`The probe did not reach active clip 1 before Stop: ${JSON.stringify(report.scenario.activeBeforeStop)}`);
  }

  report.scenario.stopClicked = await clickStop();
  if (!report.scenario.stopClicked) throw new Error("Stop button was not clickable during active clip 1");

  for (let index = 0; index < 60; index += 1) {
    await sleep(100);
    report.scenario.samplesAfterStop.push(await readState(`after-stop-${(index + 1) * 100}ms`));
  }

  const allSamples = [report.scenario.activeBeforeStop, ...report.scenario.samplesAfterStop];
  const observedClipIndices = [...new Set(allSamples.map((sample) => sample.activeClipIndex).filter(Boolean))];
  const laterClipSamples = allSamples.filter((sample) => (sample.activeClipIndex || 0) > 1);
  const finalState = report.scenario.samplesAfterStop.at(-1);
  report.scenario.observedClipIndices = observedClipIndices;
  report.scenario.laterClipSamples = laterClipSamples;
  report.scenario.finalState = finalState;
  report.errors = errors;

  const passed =
    report.scenario.beforeScan.queueCount === 3 &&
    report.scenario.activeBeforeStop.activeClipIndex === 1 &&
    report.scenario.activeBeforeStop.activeClipTotal === 3 &&
    report.scenario.stopClicked &&
    laterClipSamples.length === 0 &&
    finalState.queueCount === 3 &&
    finalState.queueLabel === "Queued Clips (3)" &&
    finalState.scanButton?.title === "Scan" &&
    finalState.scanButton?.disabled === false &&
    finalState.statusText === null &&
    finalState.laser === 0 &&
    errors.length === 0;

  report.scenario.passed = passed;
  if (!passed) {
    throw new Error(`Multi-clip cancellation assertions failed: ${JSON.stringify({ observedClipIndices, laterClipSamples, finalState, errors })}`);
  }

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    outputPath,
    errors,
    passed,
    observedClipIndices,
    finalButton: finalState.scanButton,
    finalQueueCount: finalState.queueCount,
  }));
} catch (error) {
  report.errors = [...errors, `probe: ${error.message}`];
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.error(JSON.stringify({ outputPath, errors: report.errors }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
