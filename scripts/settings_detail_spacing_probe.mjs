import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const puppeteer = require("/tmp/node_modules/puppeteer-core");

const previewUrl = process.env.PREVIEW_URL || "https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer";
const soundscapeScreenshot = process.env.SOUNDSCAPE_SCREENSHOT || "/home/ubuntu/settings-soundscape-before.png";
const keyboardScreenshot = process.env.KEYBOARD_PROFILE_SCREENSHOT || "/home/ubuntu/settings-keyboard-profile-before.png";

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
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const openSettings = async () => {
    await page.goto(`${previewUrl}/?from_webdev=1`, { waitUntil: "networkidle2" });
    await page.click('button[title="Settings"]');
    await page.waitForSelector('[data-settings-panel="true"]');
    await new Promise((resolve) => setTimeout(resolve, 160));
  };

  const clickCategory = async (id) => {
    await page.click(`[data-settings-category="${id}"]`);
    await new Promise((resolve) => setTimeout(resolve, 180));
  };

  const clickTextButton = async (prefix) => {
    const clicked = await page.evaluate((textPrefix) => {
      const button = [...document.querySelectorAll('[data-settings-panel] button')]
        .find((candidate) => candidate.textContent?.trim().startsWith(textPrefix));
      if (!button) return false;
      button.click();
      return true;
    }, prefix);
    if (!clicked) throw new Error(`Missing Settings button: ${prefix}`);
    await new Promise((resolve) => setTimeout(resolve, 240));
  };

  await openSettings();
  await clickCategory("keyboard");
  await clickTextButton("Choose Clicky Sounds");
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('[data-settings-panel] button')].some(
        (candidate) => candidate.textContent?.trim().startsWith("Keyboard Sounds"),
      ),
    { timeout: 2000 },
  );
  await clickTextButton("Keyboard Sounds");
  await page.screenshot({ path: keyboardScreenshot, fullPage: false });

  await openSettings();
  await clickCategory("ambient");
  await clickTextButton("Soundscape");
  await clickTextButton("Atmosphere");
  await page.screenshot({ path: soundscapeScreenshot, fullPage: false });

  if (errors.length > 0) {
    throw new Error(`Browser errors: ${errors.join(" | ")}`);
  }

  console.log(JSON.stringify({
    passed: true,
    viewport: { width: Number(process.env.VIEWPORT_WIDTH || 1280), height: Number(process.env.VIEWPORT_HEIGHT || 720) },
    screenshots: { keyboardScreenshot, soundscapeScreenshot },
  }));
} finally {
  await browser.close();
}
