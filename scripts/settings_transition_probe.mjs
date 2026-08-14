import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const puppeteer = require("/tmp/node_modules/puppeteer-core");

const previewUrl = process.env.PREVIEW_URL || "https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer";
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const clickExactText = async (page, text) => {
  const clicked = await page.evaluate((text) => {
    const candidates = Array.from(document.querySelectorAll('[data-settings-panel="true"] button, [data-settings-panel="true"] [role="button"]'));
    const target = candidates.find((element) => {
      const firstSpan = element.querySelector(":scope > span");
      return (firstSpan?.textContent || element.textContent || "").trim() === text;
    });
    if (!target) return false;
    target.click();
    return true;
  }, text);
  if (!clicked) throw new Error(`Could not find Settings control with exact text: ${text}`);
};

const clickBack = async (page) => {
  const clicked = await page.evaluate(() => {
    const titleRow = document.querySelector('[data-settings-panel="true"] .mx-\\[18px\\]');
    const button = titleRow?.querySelector("button");
    if (!button) return false;
    button.click();
    return true;
  });
  if (!clicked) throw new Error("Could not find the Settings nested-view back button");
};

try {
  const outputs = [];
  for (const viewport of [
    { name: "desktop", width: 1280, height: 720 },
    { name: "mobile", width: 375, height: 812 },
  ]) {
    const page = await browser.newPage();
    await page.setViewport({ width: viewport.width, height: viewport.height });
    const browserErrors = [];
    page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error}`));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
    });

    await page.goto(`${previewUrl}/?from_webdev=1`, { waitUntil: "networkidle2" });
    await page.click('button[title="Settings"]');
    await page.waitForSelector('[data-settings-panel="true"]');
    await wait(250);

    const sample = async (label) => page.evaluate((label) => {
      const frame = document.querySelector('[data-settings-panel="true"] .custom-scrollbar');
      const children = frame ? Array.from(frame.children) : [];
      const frameRect = frame?.getBoundingClientRect();
      return {
        label,
        time: performance.now(),
        frame: frameRect
          ? { top: frameRect.top, bottom: frameRect.bottom, height: frameRect.height, scrollTop: frame.scrollTop }
          : null,
        children: children.map((child) => {
          const rect = child.getBoundingClientRect();
          const style = getComputedStyle(child);
          return {
            tag: child.tagName,
            key: child.getAttribute("data-motion-key") || child.textContent?.trim().slice(0, 32),
            top: rect.top,
            bottom: rect.bottom,
            height: rect.height,
            opacity: style.opacity,
            transform: style.transform,
          };
        }),
        visibleSections: Array.from(document.querySelectorAll('[data-settings-panel="true"] section'))
          .filter((section) => !section.classList.contains("hidden"))
          .map((section) => {
            const rect = section.getBoundingClientRect();
            return { text: section.textContent?.trim().slice(0, 60), top: rect.top, height: rect.height };
          }),
      };
    }, label);

    const captureTransition = async (name, action) => {
      await action();
      const samples = [];
      for (const delay of [0, 40, 110, 220, 360, 650]) {
        if (delay > 0) await wait(delay - (samples.at(-1)?.delay || 0));
        samples.push({ delay, state: await sample(`${name}:${delay}ms`) });
      }
      await page.screenshot({
        path: `/home/ubuntu/settings-transition-${viewport.name}-${name}.png`,
        fullPage: false,
      });
      return samples;
    };

    const report = [];
    report.push(...await captureTransition("appearance-to-themes", async () => {
      await page.click('[data-settings-category="appearance"]');
      await wait(120);
      await clickExactText(page, "Themes");
    }));
    report.push(...await captureTransition("themes-to-fonts", async () => {
      await page.click('button[aria-label="Appearance"]');
      await wait(120);
      await clickExactText(page, "Font");
    }));
    report.push(...await captureTransition("fonts-to-sound-centre", async () => {
      await page.click('[data-settings-category="keyboard"]');
      await wait(120);
      await clickExactText(page, "Choose Clicky Sounds");
    }));
    report.push(...await captureTransition("sound-centre-to-keyboard-sounds", async () => {
      await clickExactText(page, "Keyboard Sounds");
    }));
    report.push(...await captureTransition("keyboard-sounds-to-error-sounds", async () => {
      await clickBack(page);
      await wait(120);
      await clickExactText(page, "Error Sounds");
    }));
    report.push(...await captureTransition("error-sounds-to-ai-setup", async () => {
      await page.click('[data-settings-category="scanner"]');
    }));

    outputs.push({
      viewport,
      browserErrors,
      report,
    });
    await page.close();
  }
  console.log(JSON.stringify(outputs, null, 2));
} finally {
  await browser.close();
}
