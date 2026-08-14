import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const puppeteer = require("/tmp/node_modules/puppeteer-core");

const previewUrl =
  process.env.PREVIEW_URL ||
  "https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer";
const viewport = {
  width: Number(process.env.VIEWPORT_WIDTH || 1280),
  height: Number(process.env.VIEWPORT_HEIGHT || 720),
};

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  const page = await browser.newPage();
  await page.setViewport(viewport);

  const errors = [];
  const ignoredWarnings = [];
  const isKnownPreviewResourceWarning = (text) =>
    text.includes("net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin") ||
    text.includes("net::ERR_CERT_VERIFIER_CHANGED");

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
  await sleep(120);

  const categoryIds = {
    Appearance: "appearance",
    "Keyboard & Typing": "keyboard",
    Practice: "practice",
    "Ambient Focus": "ambient",
    Performance: "performance",
    "AI Setup": "scanner",
  };

  const visible = async (element) =>
    page.evaluate((node) => {
      if (!(node instanceof HTMLElement)) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    }, element);

  const snapshot = async (label) =>
    page.evaluate((label) => {
      const panel = document.querySelector('[data-settings-panel="true"]');
      const detail = panel?.querySelector("div.flex-1.min-w-0.overflow-y-auto");
      const close = panel?.querySelector('button[aria-label="Close settings"]');
      const titleRow = close?.parentElement;
      const title = [...(titleRow?.querySelectorAll("span") || [])].find(
        (span) => getComputedStyle(span).fontSize === "24px" && span.textContent?.trim(),
      );
      const back = [...(titleRow?.querySelectorAll("button") || [])].find(
        (button) => button !== close,
      );
      const category = panel?.querySelector('button[data-settings-category][aria-current="page"]');
      const visibleViews = [...(detail?.children || [])].filter((child) => {
        const style = getComputedStyle(child);
        const rect = child.getBoundingClientRect();
        return style.display !== "none" && rect.width > 0 && rect.height > 0;
      });
      const rect = detail?.getBoundingClientRect();
      return {
        label,
        title: title?.textContent?.trim() || "",
        category: category?.getAttribute("data-settings-category") || "",
        hasBack: Boolean(back),
        detailTop: rect?.top ?? null,
        firstChildTop: visibleViews[0]?.getBoundingClientRect().top ?? null,
        visibleViewCount: visibleViews.length,
        scrollTop: detail?.scrollTop ?? null,
      };
    }, label);

  const results = [];

  const openCategory = async (categoryId) => {
    await page.click(`[data-settings-category="${categoryId}"]`);
    await sleep(220);
  };

  const clickVisibleText = async (text) => {
    const clicked = await page.evaluate((text) => {
      const panel = document.querySelector('[data-settings-panel="true"]');
      const candidates = [...(panel?.querySelectorAll("button") || [])].filter(
        (button) => button.textContent?.trim().startsWith(text),
      );
      const candidate = candidates.find((button) => {
        const style = getComputedStyle(button);
        const rect = button.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      });
      if (!candidate) return false;
      candidate.click();
      return true;
    }, text);
    assert.equal(clicked, true, `Could not find visible Settings row: ${text}`);
    await sleep(220);
  };

  const waitForSettledView = async (expectedTitle = "") => {
    await page.waitForFunction(
      ({ expectedTitle }) => {
        const panel = document.querySelector('[data-settings-panel="true"]');
        const detail = panel?.querySelector("div.flex-1.min-w-0.overflow-y-auto");
        const titleRow = panel?.querySelector('button[aria-label="Close settings"]')?.parentElement;
        const title = [...(titleRow?.querySelectorAll("span") || [])].find(
          (span) => getComputedStyle(span).fontSize === "24px" && span.textContent?.trim(),
        )?.textContent?.trim() || "";
        const visibleViews = [...(detail?.children || [])].filter((child) => {
          const style = getComputedStyle(child);
          const rect = child.getBoundingClientRect();
          return style.display !== "none" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
        });
        return visibleViews.length === 1 && (!expectedTitle || title === expectedTitle);
      },
      { expectedTitle },
      { timeout: 1800 },
    );
  };

  const resetFrom = async (label, categoryId, nestedRow) => {
    await openCategory(categoryId);
    if (nestedRow) await clickVisibleText(nestedRow);

    await waitForSettledView(nestedRow ? nestedRow : "");

    const before = await snapshot(`${label}:before-reset`);
    const resetButton = await page.$('[data-settings-reset="true"]');
    assert.ok(resetButton, "Missing Settings reset button");
    await resetButton.click();
    await sleep(40);
    const immediate = await snapshot(`${label}:immediate-after-reset`);
    await sleep(260);
    const settled = await snapshot(`${label}:settled-after-reset`);
    results.push({ label, before, immediate, settled });
  };

  await resetFrom("Appearance main", "appearance");
  await resetFrom("Keyboard main", "keyboard");
  await resetFrom("Practice main", "practice");
  await resetFrom("Ambient Focus main", "ambient");
  await resetFrom("Performance main", "performance");
  await resetFrom("AI Setup main", "scanner");
  await resetFrom("Themes submenu", "appearance", "Themes");
  await resetFrom("Font submenu", "appearance", "Font");

  await openCategory("keyboard");
  const typingSoundsToggle = await page.$('[role="switch"]');
  if (typingSoundsToggle) {
    const enabled = await page.evaluate(
      (button) => button.getAttribute("aria-checked") === "true",
      typingSoundsToggle,
    );
    if (!enabled) await typingSoundsToggle.click();
    await sleep(80);
    await resetFrom("Choose Clicky Sounds submenu", "keyboard", "Choose Clicky Sounds");
  }

  assert.equal(errors.length, 0, `Application errors: ${errors.join(" | ")}`);
  console.log(
    JSON.stringify(
      {
        viewport,
        results,
        errors,
        ignoredWarnings: [...new Set(ignoredWarnings)],
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
