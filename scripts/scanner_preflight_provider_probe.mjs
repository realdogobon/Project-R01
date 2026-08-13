import puppeteer from "/tmp/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:3000";
const fixturePath = process.argv[3] || "/tmp/royscript-scanner-fixture.png";
const outputPath = process.argv[4] || "/tmp/scanner_preflight_provider_probe.json";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const providerHosts = [
  "generativelanguage.googleapis.com",
  "api.groq.com",
  "api.openai.com",
];

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1280, height: 800 },
});
const page = await browser.newPage();
const errors = [];
const providerRequests = [];

page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});

await page.setRequestInterception(true);
page.on("request", (request) => {
  const requestUrl = new URL(request.url());
  if (providerHosts.includes(requestUrl.hostname)) {
    providerRequests.push({
      method: request.method(),
      hostname: requestUrl.hostname,
      pathname: requestUrl.pathname,
      time: Date.now(),
    });
    void request.respond({
      status: 418,
      contentType: "application/json",
      body: JSON.stringify({ error: "provider-mock: unexpected request during preflight" }),
    });
    return;
  }
  void request.continue();
});

await page.evaluateOnNewDocument(() => {
  window.localStorage.setItem("royscript_ai_keys", JSON.stringify({
    gemini: "mock-preflight-key",
    groq: "mock-preflight-key",
    openai: "mock-preflight-key",
  }));
});

const readState = async (label) => page.evaluate((snapshotLabel) => {
  const buttons = [...document.querySelectorAll("button")].map((button) => ({
    text: button.textContent?.trim() || "",
    title: button.getAttribute("title"),
    disabled: button.hasAttribute("disabled"),
    backgroundColor: getComputedStyle(button).backgroundColor,
  }));
  const action = buttons.find((button) =>
    button.title === "Scan" ||
    button.title === "Stop scan" ||
    button.title === "Stopping scan" ||
    button.title === "Send extracted text",
  );
  const actionNode = action ? [...document.querySelectorAll("button")].find((button) => button.getAttribute("title") === action.title) : null;
  const statusText = [...document.querySelectorAll("body *")]
    .map((node) => node.textContent?.trim() || "")
    .find((text) => /^(Preparing scan\.\.\.|Stopping scan\.\.\.|Scanning clip \d+ of \d+\.\.\.|Scan completed)$/.test(text)) || null;
  const queueLabel = [...document.querySelectorAll("body *")]
    .find((node) => /^Queued Clips \(\d+\)$/.test(node.textContent?.trim() || ""))?.textContent?.trim() || null;
  const badge = action?.title === "Stop scan"
    ? actionNode?.querySelector("span.absolute")
    : null;
  const hand = action?.title === "Stop scan" ? actionNode?.querySelector("svg") : null;
  const statusNode = statusText
    ? [...document.querySelectorAll("span")].find((node) => node.textContent?.trim() === statusText)
    : null;
  const rect = (element) => {
    if (!element) return null;
    const value = element.getBoundingClientRect();
    return { left: value.left, top: value.top, width: value.width, height: value.height, bottom: value.bottom };
  };
  return {
    label: snapshotLabel,
    action,
    statusText,
    queueLabel,
    badge: badge ? {
      backgroundColor: getComputedStyle(badge).backgroundColor,
      color: getComputedStyle(badge).color,
      rect: rect(badge),
    } : null,
    hand: hand ? {
      width: getComputedStyle(hand).width,
      height: getComputedStyle(hand).height,
      strokeWidth: hand.getAttribute("stroke-width"),
      rect: rect(hand),
    } : null,
    statusRect: rect(statusNode),
  };
}, label);

const clickStop = async () => page.evaluate(() => {
  const button = document.querySelector('button[title="Stop scan"]');
  if (!button) return false;
  button.click();
  return true;
});

const report = {
  url,
  fixturePath,
  providerHosts,
  errors,
  providerRequests,
  generatedAt: new Date().toISOString(),
};

try {
  await page.goto(`${url.replace(/\/$/, "")}/?scannerPreflightProviderProbe=${Date.now()}`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });

  const inputs = await page.$$('input[type="file"]');
  if (!inputs.length) throw new Error("No scanner file input found");
  await inputs.at(-1).uploadFile(fixturePath);
  await page.waitForFunction(
    () => Boolean(document.querySelector('#scanner-viewport img[alt="Scanned Document Paper Element"], #scanner-viewport canvas')),
    { timeout: 30000 },
  );
  await sleep(500);
  await page.click('[title="Crop Tool"]');
  const surface = await page.$("[data-scanner-document-surface]");
  const bounds = await surface?.boundingBox();
  if (!bounds) throw new Error("Scanner surface unavailable");
  await page.mouse.move(bounds.x + bounds.width * 0.18, bounds.y + bounds.height * 0.25);
  await page.mouse.down({ button: "left" });
  for (let index = 1; index <= 60; index += 1) {
    const progress = index / 60;
    await page.mouse.move(
      bounds.x + bounds.width * (0.18 + 0.62 * progress),
      bounds.y + bounds.height * (0.25 + 0.42 * progress),
    );
  }
  await page.mouse.up({ button: "left" });
  await sleep(120);
  await page.click('[title="Add Clip"]');
  await page.waitForFunction(
    () => [...document.querySelectorAll("body *")].some((node) => node.textContent?.trim() === "Queued Clips (1)"),
    { timeout: 10000 },
  );

  report.beforeScan = await readState("before-scan");
  const scanButton = await page.$('button[title="Scan"]');
  if (!scanButton) throw new Error("Scan button not found before provider-mock run");
  await scanButton.click();
  await page.waitForFunction(() => document.body.innerText.includes("Preparing scan..."), { timeout: 10000 });
  report.preflight = await readState("preflight");

  await sleep(900);
  report.preflightBeforeStop = await readState("preflight-before-stop");
  report.stopClicked = await clickStop();
  await sleep(500);
  report.afterStop = await readState("after-stop");
  await sleep(3600);
  report.afterBoundary = await readState("after-preflight-boundary");
  report.providerRequests = providerRequests;
  report.errors = errors;

  report.passed =
    report.preflightBeforeStop.statusText === "Preparing scan..." &&
    report.preflightBeforeStop.action?.title === "Stop scan" &&
    report.preflightBeforeStop.action?.disabled === false &&
    report.stopClicked === true &&
    report.afterStop.action?.title === "Scan" &&
    report.afterStop.action?.disabled === false &&
    report.afterBoundary.action?.title === "Scan" &&
    providerRequests.length === 0 &&
    errors.length === 0;

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    outputPath,
    passed: report.passed,
    providerRequestCount: providerRequests.length,
    stopClicked: report.stopClicked,
    preflightAction: report.preflightBeforeStop.action,
    afterStopAction: report.afterStop.action,
    errors,
  }));
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  report.providerRequests = providerRequests;
  report.errors = [...errors, `probe: ${error.message}`];
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.error(JSON.stringify({ outputPath, errors: report.errors, providerRequestCount: providerRequests.length }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
