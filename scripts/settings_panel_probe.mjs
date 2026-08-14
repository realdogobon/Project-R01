import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const puppeteer = require("/tmp/node_modules/puppeteer-core");

const previewUrl = process.env.PREVIEW_URL || "https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer";
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({
    width: Number(process.env.VIEWPORT_WIDTH || 1280),
    height: Number(process.env.VIEWPORT_HEIGHT || 720),
  });
  const errors = [];
  const ignoredWarnings = [];
  const isKnownPreviewResourceWarning = (text) =>
    text.includes("net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin");
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (isKnownPreviewResourceWarning(message.text())) {
      ignoredWarnings.push(message.text());
      return;
    }
    errors.push(message.text());
  });

  await page.goto(`${previewUrl}/?from_webdev=1`, { waitUntil: "networkidle2" });
  await page.click('button[title="Settings"]');
  await page.waitForSelector('[data-settings-panel="true"]');
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(
    await page.$eval('[data-settings-panel="true"] [role="dialog"]',
      (dialog) => document.activeElement === dialog,
    ),
    true,
  );

  const categories = await page.$$eval(
    '[data-settings-panel="true"] button[data-settings-category]',
    (buttons) => buttons.map((button) => button.getAttribute("aria-label")),
  );
  assert.deepEqual(categories, [
    "Appearance",
    "Keyboard & Typing",
    "Practice",
    "Ambient Focus",
    "Performance",
    "AI Setup",
  ]);

  await page.evaluate(() => {
    localStorage.setItem(
      "royscript_ai_keys",
      JSON.stringify({ gemini: "probe-key-preserved" }),
    );
  });

  assert.equal(
    await page.$$eval('[data-settings-panel] [data-settings-reset="true"]',
      (buttons) => buttons.length,
    ),
    1,
  );
  assert.equal(
    await page.$$eval('[data-settings-panel] button', (buttons) =>
      buttons.filter((button) => button.textContent?.includes("Reset Settings")).length,
    ),
    0,
  );

  const visibleSectionFor = async (label) => {
    const categoryIds = {
      Appearance: "appearance",
      Keyboard: "keyboard",
      Practice: "practice",
      "Ambient Focus": "ambient",
      Performance: "performance",
      "AI Setup": "scanner",
    };
    const categoryId = categoryIds[label];
    if (!categoryId) throw new Error(`Missing category mapping: ${label}`);
    await page.click(`[data-settings-category="${categoryId}"]`);
    await new Promise((resolve) => setTimeout(resolve, 180));
    assert.equal(
      await page.$eval(
        `[data-settings-category="${categoryId}"]`,
        (button) => button.getAttribute("aria-current"),
      ),
      "page",
    );
    return page.$$eval('[data-settings-panel] section', (sections) =>
      sections
        .filter((section) => !section.classList.contains("hidden"))
        .map((section) => section.textContent?.replace(/\s+/g, " ").trim().slice(0, 80)),
    );
  };

  assert.match((await visibleSectionFor("Appearance")).join(" "), /Appearance/);
  assert.match((await visibleSectionFor("Keyboard")).join(" "), /Keyboard/);
  assert.match((await visibleSectionFor("Practice")).join(" "), /Gameplay/);
  assert.match((await visibleSectionFor("Ambient Focus")).join(" "), /Ambient Focus/);
  assert.match((await visibleSectionFor("Performance")).join(" "), /Performance/);
  const aiSetupText = (await visibleSectionFor("AI Setup")).join(" ");
  assert.match(aiSetupText, /Cloud providers|online document scanning|Gemini key/);
  assert.equal(
    await page.$$eval('[data-settings-panel] input[aria-label$=" key"]',
      (inputs) => inputs.length,
    ),
    3,
  );

  if (process.env.SETTINGS_SCANNER_SCREENSHOT) {
    await page.screenshot({
      path: process.env.SETTINGS_SCANNER_SCREENSHOT,
      fullPage: false,
    });
  }

  await page.click('[data-settings-reset="true"]');
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(
    await page.$eval(
      '[data-settings-category="appearance"]',
      (button) => button.getAttribute("aria-current"),
    ),
    "page",
  );
  assert.deepEqual(
    await page.evaluate(() => JSON.parse(localStorage.getItem("royscript_ai_keys") || "{}")),
    { gemini: "probe-key-preserved" },
  );

  await page.evaluate(() => {
    const button = document.querySelector('[data-settings-category="appearance"]');
    if (!button) throw new Error("Missing Appearance category button");
    button.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 150));

  if (process.env.SETTINGS_CATEGORY_SCREENSHOT) {
    await page.screenshot({
      path: process.env.SETTINGS_CATEGORY_SCREENSHOT,
      fullPage: false,
    });
  }

  await page.evaluate(() => {
    const button = [...document.querySelectorAll('[data-settings-panel] button')]
      .find((candidate) => candidate.textContent?.trim().startsWith("Themes"));
    if (!button) throw new Error("Missing Themes subview button");
    button.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 240));
  assert.equal(
    await page.$$eval('[data-settings-panel] button', (buttons) =>
      buttons.filter((button) => {
        if (button.textContent?.trim() !== "Classic") return false;
        let node = button;
        while (node instanceof HTMLElement) {
          if (getComputedStyle(node).opacity === "0") return false;
          node = node.parentElement;
        }
        return true;
      }).length,
    ),
    1,
  );

  if (process.env.SETTINGS_PROBE_SCREENSHOT) {
    await page.screenshot({
      path: process.env.SETTINGS_PROBE_SCREENSHOT,
      fullPage: false,
    });
  }

  await page.keyboard.press("Escape");
  const settingsHeadingCount = await page.$$eval('[data-settings-panel] span', (spans) =>
    spans.filter((span) => span.textContent?.trim() === "Settings").length,
  );
  assert.ok(settingsHeadingCount === 0 || settingsHeadingCount === 1);

  assert.deepEqual(errors, []);
  console.log(
    `Settings categorized navigation probe passed with zero application errors${
      ignoredWarnings.length ? ` (${ignoredWarnings.length} known preview-resource warning ignored)` : ""
    }.`,
  );
} finally {
  await browser.close();
}
