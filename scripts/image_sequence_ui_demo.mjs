import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const previewUrl = process.argv[2] || process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const outDir = process.argv[3] || "/tmp/image-sequence-ui-demo";
const fixtures = [
  "/tmp/scanner-audit/fixtures/supported.jpg",
  "/tmp/scanner-audit/fixtures/supported.webp",
];
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

for (const fixture of fixtures) {
  if (!fs.existsSync(fixture)) throw new Error(`Image-sequence fixture is missing: ${fixture}`);
}
fs.mkdirSync(outDir, { recursive: true });

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

const report = { previewUrl, fixtures, errors, firstPage: false, secondPage: false, status: "started" };
try {
  await page.goto(`${previewUrl.replace(/\/$/, "")}/?imageSequenceDemo=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });

  const sequenceButton = await page.evaluate(() => {
    const control = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === "Extract text from image sequences");
    if (!control) return null;
    control.id = "image-sequence-demo-trigger";
    return "#image-sequence-demo-trigger";
  });
  if (!sequenceButton) throw new Error("Image-sequence import control was not found");

  const chooserPromise = page.waitForFileChooser({ timeout: 10000 });
  await page.click(sequenceButton);
  const chooser = await chooserPromise;
  await chooser.accept(fixtures);

  await page.waitForFunction(
    () => /\b1\/2\b/.test(document.body.innerText)
      && [...document.querySelectorAll("#scanner-viewport img")].some((candidate) => candidate instanceof HTMLImageElement && candidate.complete && candidate.naturalWidth > 0),
    { timeout: 60000 },
  );
  report.firstPage = true;
  await page.screenshot({ path: path.join(outDir, "01-image-sequence-page-1-of-2.png"), fullPage: false });

  const clickedNext = await page.evaluate(() => {
    const counter = [...document.querySelectorAll("span")].find((candidate) => candidate.textContent?.trim() === "1/2");
    const container = counter?.parentElement;
    const buttons = container ? [...container.querySelectorAll("button")] : [];
    const next = buttons.at(-1);
    if (!(next instanceof HTMLButtonElement) || next.disabled) return false;
    next.click();
    return true;
  });
  if (!clickedNext) throw new Error("Second-page navigation control was not available");

  await page.waitForFunction(() => /\b2\/2\b/.test(document.body.innerText), { timeout: 15000 });
  await sleep(700);
  const visiblePreview = await page.evaluate(() => [...document.querySelectorAll("#scanner-viewport img")]
    .some((candidate) => candidate instanceof HTMLImageElement && candidate.complete && candidate.naturalWidth > 0));
  if (!visiblePreview) throw new Error("Second image-sequence page did not render visibly");
  report.secondPage = true;
  await page.screenshot({ path: path.join(outDir, "02-image-sequence-page-2-of-2.png"), fullPage: false });

  if (errors.length > 0) throw new Error(`Unexpected browser errors: ${errors.join(" | ")}`);
  report.status = "passed";
} finally {
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  await context.close();
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
