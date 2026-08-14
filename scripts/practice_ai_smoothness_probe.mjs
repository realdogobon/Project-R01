import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const puppeteer = require("/tmp/node_modules/puppeteer-core");

const previewUrl = process.env.PREVIEW_URL || "https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer";
const viewports = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "mobile", width: 375, height: 812 },
];

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  for (const viewport of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: viewport.width, height: viewport.height });
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin")) {
        errors.push(message.text());
      }
    });

    await page.goto(`${previewUrl}/?from_webdev=1`, { waitUntil: "networkidle2" });
    await page.evaluate(() => {
      localStorage.setItem("royscript_ai_keys", JSON.stringify({ gemini: "smoothness-probe-key" }));
    });
    await page.reload({ waitUntil: "networkidle2" });
    await page.click('button[title="Start Practice"]');
    await page.waitForSelector('button[aria-label="Create practice text"]');
    const triggerColor = await page.$eval('button[aria-label="Create practice text"]', (button) => ({
      buttonColor: getComputedStyle(button).color,
      iconColor: button.querySelector("svg") ? getComputedStyle(button.querySelector("svg")).color : null,
    }));
    assert.ok(triggerColor.buttonColor && triggerColor.iconColor, `${viewport.name}: Practice glyph did not inherit a visible color`);
    assert.equal(triggerColor.iconColor, triggerColor.buttonColor, `${viewport.name}: NotebookPen color diverged from its trigger`);

    await page.click('button[aria-label="Create practice text"]');
    await page.waitForSelector('button[aria-label="Close practice text"]');
    await page.evaluate(() => {
      const nativeFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        if (!url.includes("generativelanguage.googleapis.com")) return nativeFetch(input, init);
        await new Promise((resolve) => setTimeout(resolve, 650));
        const words = Array.from({ length: 200 }, (_, index) => `practice${index}`).join(" ");
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: words }] } }],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      };
    });

    await page.evaluate(() => {
      const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === "Generate");
      if (!button) throw new Error("Missing Generate button");
      button.click();
    });
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === "Creating...");
      return Boolean(button?.disabled);
    }, { timeout: 1000 });

    const animationSample = await page.evaluate(async () => {
      const spinner = document.querySelector(".practice-generation-spinner");
      if (!spinner) return { found: false, animationName: "", transforms: [] };
      const transforms = [];
      for (let index = 0; index < 8; index += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        transforms.push(getComputedStyle(spinner).transform);
      }
      return {
        found: true,
        animationName: getComputedStyle(spinner).animationName,
        transforms,
      };
    });
    assert.equal(animationSample.found, true, `${viewport.name}: active Generate spinner was not rendered`);
    assert.equal(animationSample.animationName, "practice-generation-spin", `${viewport.name}: spinner is not using the compositor-safe animation`);
    assert.ok(new Set(animationSample.transforms).size > 1, `${viewport.name}: spinner transform did not advance across animation frames`);

    await page.waitForFunction(
      () => !document.querySelector('button[aria-label="Close practice text"]'),
      { timeout: 5000 },
    );
    assert.equal(errors.length, 0, `${viewport.name}: unexpected browser errors: ${errors.join(" | ")}`);
    console.log(`${viewport.name} Practice smoothness passed: ${JSON.stringify({ triggerColor, animationName: animationSample.animationName })}`);
    await page.close();
  }
} finally {
  await browser.close();
}
