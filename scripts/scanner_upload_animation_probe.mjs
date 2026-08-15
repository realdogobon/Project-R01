import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const previewUrl = process.argv[2] || process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const outputDir = process.argv[3] || "/tmp/scanner-upload-animation";
const imageFixture = "/home/ubuntu/upload/pasted_file_mn5PFv_image.png";
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

if (!fs.existsSync(imageFixture)) throw new Error(`Image fixture missing: ${imageFixture}`);
fs.mkdirSync(outputDir, { recursive: true });
const oversizeFixture = path.join(outputDir, "silent-rejection.bin");
fs.writeFileSync(oversizeFixture, Buffer.alloc(20 * 1024 * 1024 + 1));

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  defaultViewport: { width: 1280, height: 820 },
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const context = await browser.createBrowserContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("requestfailed", (request) => {
  const failure = request.failure()?.errorText;
  if (failure) errors.push(`request: ${failure} ${request.url()}`);
});

const report = { previewUrl, outputDir, errors, states: {}, status: "started" };
const capture = async (name) => page.screenshot({ path: path.join(outputDir, name), fullPage: false });
const openScanner = async (label) => {
  await page.goto(`${previewUrl.replace(/\/$/, "")}/?scannerUploadAnimation=${label}-${Date.now()}`, { waitUntil: "networkidle2", timeout: 90_000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 30_000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("[data-scanner-empty-upload-state]", { timeout: 30_000 });
};
const primaryInput = async () => {
  const input = await page.$('input[type="file"][accept*=".pdf"]');
  if (!input) throw new Error("Primary scanner uploader was not found");
  return input;
};
const measureState = async () => page.evaluate(() => {
  const rect = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const value = element.getBoundingClientRect();
    return { left: value.left, top: value.top, width: value.width, height: value.height };
  };
  return {
    empty: rect("[data-scanner-empty-upload-state]"),
    pending: rect("[data-scanner-upload-pending]"),
    success: rect("[data-scanner-upload-success]"),
    actionBar: rect("[data-scanner-action-bar]"),
    visibleErrorText: [...document.querySelectorAll("[role=alert], [data-error], .error")]
      .map((element) => element.textContent?.replace(/\s+/g, " ").trim())
      .filter(Boolean),
  };
});

try {
  await openScanner("success");
  await capture("01-idle.png");
  report.states.idle = await measureState();

  const successfulInput = await primaryInput();
  await successfulInput.uploadFile(imageFixture);
  await page.waitForSelector("[data-scanner-upload-pending]", { timeout: 5_000 });
  await sleep(80);
  report.states.pending = await measureState();
  await capture("02-pending.png");

  await page.waitForSelector("[data-scanner-upload-success]", { timeout: 20_000 });
  report.states.success = await measureState();
  await capture("03-success.png");
  await sleep(760);
  const previewReady = await page.evaluate(() => [...document.querySelectorAll("#scanner-viewport img, #scanner-viewport canvas")]
    .some((candidate) => candidate instanceof HTMLImageElement && candidate.complete && candidate.naturalWidth > 0));
  report.states.settled = { ...(await measureState()), previewReady };

  if (!report.states.pending.pending) throw new Error("Pending upload row did not render");
  if (!report.states.success.success) throw new Error("Transient success overlay did not render");
  if (report.states.settled.success) throw new Error("Success overlay did not dismiss after its transient handoff");
  if (!previewReady) throw new Error("Loaded document preview was not visible after success handoff");

  await openScanner("silent-rejection");
  const rejectedInput = await primaryInput();
  await rejectedInput.uploadFile(oversizeFixture);
  await page.waitForSelector("[data-scanner-upload-pending]", { timeout: 5_000 });
  await sleep(1_150);
  report.states.silentFailure = await measureState();
  await capture("04-silent-failure-returned-to-idle.png");

  if (!report.states.silentFailure.empty) throw new Error("Silent failure did not return to the idle upload surface");
  if (report.states.silentFailure.pending || report.states.silentFailure.success) throw new Error("Silent failure left an upload state visible");
  if (report.states.silentFailure.visibleErrorText.length > 0) throw new Error(`Silent failure exposed an error surface: ${report.states.silentFailure.visibleErrorText.join(" | ")}`);
  if (errors.length > 0) throw new Error(`Unexpected browser errors: ${errors.join(" | ")}`);

  report.status = "passed";
} finally {
  fs.writeFileSync(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
  await context.close();
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
