import fs from "node:fs";
import puppeteer from "puppeteer-core";

const previewUrl = process.argv[2] || "http://127.0.0.1:3000";
const fixturePath = process.argv[3] || "/tmp/scanner-audit/cp43-complete-issue.pdf";
const outputPath = process.argv[4] || "/tmp/scanner-limit-control.json";

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  defaultViewport: { width: 1280, height: 820 },
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();

try {
  await page.goto(`${previewUrl.replace(/\/$/, "")}/?scannerLimitProbe=${Date.now()}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("#scanner-viewport", { timeout: 20000 });

  const input = await page.$('input[type=file][accept*=".pdf"]');
  if (!input) throw new Error("Primary scanner document input was not found");
  await input.uploadFile(fixturePath);
  await page.waitForSelector("[data-scanner-upload-selected]", { timeout: 15000 });
  await page.click("[data-scanner-local-upload]");
  await page.waitForFunction(() => !document.querySelector("[data-scanner-upload-pending]") && Boolean(document.querySelector("[data-scanner-empty-upload-state]")), { timeout: 8000 });

  const result = await page.evaluate(() => {
    const describe = (selector) => [...document.querySelectorAll(selector)].map((element) => {
      const rect = element.getBoundingClientRect();
      const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return {
        text: element.textContent?.trim() || "",
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        visible: rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden" && getComputedStyle(element).display !== "none",
        topTag: top?.tagName || null,
        topData: top?.getAttribute("data-scanner-import-url") || top?.getAttribute("data-scanner-upload-dropzone") || null,
        containsTop: Boolean(top && (element.contains(top) || top.contains(element))),
      };
    });
    return {
      emptyState: Boolean(document.querySelector("[data-scanner-empty-upload-state]")),
      preview: Boolean(document.querySelector("#scanner-viewport img[alt='Scanned Document Paper Element']")),
      urlButtons: describe("[data-scanner-import-url]"),
      commandRails: describe("[data-scanner-upload-command-strip]"),
    };
  });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
