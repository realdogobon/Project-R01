import fs from "node:fs/promises";
import puppeteer from "puppeteer-core";

const url = process.env.PREVIEW_URL || "https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer/?from_webdev=1";
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage();
const consoleEntries = [];
const pageErrors = [];

page.on("console", (message) => {
  consoleEntries.push({ type: message.type(), text: message.text() });
});
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });
  await new Promise((resolve) => setTimeout(resolve, 3_000));

  const viteEntries = consoleEntries.filter((entry) => entry.text.includes("[vite]"));
  const hmrFailure = viteEntries.find((entry) => /failed to connect to websocket|direct websocket connection fallback/i.test(entry.text));
  const connected = viteEntries.some((entry) => /\[vite\]\s+connected\./i.test(entry.text));
  const result = { url, connected, hmrFailure: hmrFailure?.text ?? null, pageErrors, viteEntries };
  await fs.writeFile("/tmp/vite-hmr-connection-report.json", JSON.stringify(result, null, 2));

  if (hmrFailure || !connected || pageErrors.length > 0) {
    throw new Error(`HMR probe failed: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
