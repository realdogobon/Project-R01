import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const previewUrl = process.argv[2] || process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const outputDir = process.argv[3] || "/tmp/scanner-cloud-theme";

fs.mkdirSync(outputDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  defaultViewport: { width: 1280, height: 820 },
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

const report = { previewUrl, themes: {}, errors: [] };

try {
  for (const theme of ["light", "dark"]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on("pageerror", (error) => report.errors.push(`${theme}: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") report.errors.push(`${theme}: ${message.text()}`);
    });
    await page.evaluateOnNewDocument((storedTheme) => localStorage.setItem("theme", storedTheme), theme);
    await page.goto(`${previewUrl.replace(/\/$/, "")}/?scannerCloudTheme=${theme}-${Date.now()}`, { waitUntil: "networkidle2", timeout: 90_000 });
    await page.waitForSelector('[title="AI Scanner"]', { timeout: 30_000 });
    await page.click('[title="AI Scanner"]');
    await page.waitForSelector("[data-scanner-upload-dropzone]", { timeout: 30_000 });
    const cloud = await page.evaluate(() => {
      const glyph = document.querySelector("[data-scanner-upload-dropzone] svg");
      if (!glyph) throw new Error("Idle scanner cloud glyph was not found");
      const styles = getComputedStyle(glyph);
      return { color: styles.color, opacity: styles.opacity, dark: document.documentElement.classList.contains("dark") };
    });
    await page.screenshot({ path: path.join(outputDir, `${theme}-idle.png`), fullPage: false });
    report.themes[theme] = cloud;
    await context.close();
  }

  if (report.errors.length) throw new Error(report.errors.join(" | "));
  if (report.themes.light.dark || !report.themes.dark.dark) throw new Error("Theme storage did not produce both scanner theme states");
  if (report.themes.light.color === report.themes.dark.color) throw new Error("Cloud glyph did not receive distinct dual-theme treatment");
  report.status = "passed";
} finally {
  fs.writeFileSync(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
