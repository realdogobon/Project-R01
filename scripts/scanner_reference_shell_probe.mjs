import fs from "node:fs";
import puppeteer from "/tmp/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";

const url = process.argv[2] || "http://127.0.0.1:3000";
const imagePath = process.argv[3] || "/home/ubuntu/upload/thumb_1200_1696.png";
const outputPath = process.argv[4] || "/tmp/scanner_reference_shell_probe.json";

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

try {
  await page.goto(`${url.replace(/\/$/, "")}/?scannerReferenceShellProbe=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });
  const input = (await page.$$('input[type="file"]')).at(-1);
  if (!input) throw new Error("No scanner file input found");
  await input.uploadFile(imagePath);
  await page.waitForFunction(() => Boolean(document.querySelector('#scanner-viewport img[alt="Scanned Document Paper Element"], #scanner-viewport canvas')), { timeout: 40000 });
  await new Promise((resolve) => setTimeout(resolve, 700));

  const measurements = await page.evaluate(() => {
    const viewport = document.querySelector("#scanner-viewport");
    const rectOf = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tag: element.tagName,
        id: element.id || null,
        className: typeof element.className === "string" ? element.className : null,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom },
        display: style.display,
        position: style.position,
        overflow: style.overflow,
      };
    };
    const ancestors = [];
    let current = viewport;
    for (let i = 0; current && i < 8; i += 1) {
      ancestors.push(rectOf(current));
      current = current.parentElement;
    }
    return {
      image: rectOf(document.querySelector('#scanner-viewport img[alt="Scanned Document Paper Element"]')),
      viewport: rectOf(viewport),
      ancestors,
      body: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
    };
  });
  fs.writeFileSync(outputPath, JSON.stringify({ url, imagePath, errors, measurements }, null, 2));
  console.log(JSON.stringify({ outputPath, errors }));
} catch (error) {
  fs.writeFileSync(outputPath, JSON.stringify({ url, imagePath, errors: [...errors, `probe: ${error.message}`] }, null, 2));
  console.error(JSON.stringify({ outputPath, errors: [...errors, `probe: ${error.message}`] }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
