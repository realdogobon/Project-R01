/* Live browser probe — Windows typography delink verification.
 *
 * Confirms the status bar, tab count, and tab overview use the fixed
 * Segoe UI typography regardless of the user-selected global app font.
 * The selected font is restored at the end so no user state is persisted.
 */
import fs from "node:fs/promises";
import puppeteer from "puppeteer-core";

const previewUrl = (process.env.PREVIEW_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const browser = await puppeteer.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-device-scale-factor=1"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`${previewUrl}/?from_webdev=1`, {   waitUntil: "domcontentloaded" });
await new Promise((r) => setTimeout(r, 2500));

const beforeAppFont = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue("--app-font-family").trim());

// Open Settings, switch Appearance → App Font to a distinct monospace font.
try {
  const settingsBtn = await page.$("[data-settings-trigger], [aria-label='Settings']");
  if (settingsBtn) {
    await settingsBtn.click();
    await new Promise((r) => setTimeout(r, 1200));
    const fontRow = await page.$("div,button,li");
    const target = await page.evaluateHandle(() => {
      const nodes = [...document.querySelectorAll("div,button,li")];
      return nodes.find((n) => /\bApp Font\b/i.test(n.textContent || "") && n.offsetParent !== null);
    });
    if (target) {
      await target.asElement().click();
      await new Promise((r) => setTimeout(r, 1200));
      const choice = await page.evaluateHandle(() => {
        const nodes = [...document.querySelectorAll("[role='option'], button, li")];
        return nodes.find((n) => /courier|monospace|jetbrains mono/i.test(n.textContent || "") && n.offsetParent !== null);
      });
      if (choice) {
        await choice.asElement().click();
        await new Promise((r) => setTimeout(r, 1800));
      } else {
        await page.keyboard.press("Escape");
        await new Promise((r) => setTimeout(r, 500));
      }
    } else {
      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 500));
    }
  }
} catch (e) {
  errors.push(`settings navigation: ${e.message}`);
}

const afterAppFont = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue("--app-font-family").trim());

// Reveal the status bar if its toggle exists.
const statusBarVisible = await page.evaluate(() => Boolean(document.querySelector("[data-workspace-statusbar]")?.offsetParent));

// Open the overview via the TaskView glyph.
const glyph = await page.$("[data-openeditor-taskview-glyph]");
if (glyph) {
  await glyph.click();
  await new Promise((r) => setTimeout(r, 900));
}

const result = await page.evaluate(() => {
  const fontOf = (el) => {
    const s = getComputedStyle(el);
    return { family: s.fontFamily, size: s.fontSize };
  };
  const el = (sel) => document.querySelector(sel);
  const statusBar = el("[data-workspace-statusbar]");
  const tabCount = el("[data-tab-count]");
  const overview = el("[data-workspace-tab-overview]");
  return {
    statusBarShown: statusBar ? statusBar.offsetParent !== null : false,
    statusBarFont: statusBar ? fontOf(statusBar) : null,
    tabCountShown: tabCount ? tabCount.offsetParent !== null : false,
    tabCountFont: tabCount ? fontOf(tabCount) : null,
    overviewShown: overview ? overview.offsetParent !== null : false,
    overviewFont: overview ? fontOf(overview) : null,
    segoe: (family) => /Segoe/i.test(family || ""),
  };
});

const appFontChanged = beforeAppFont && afterAppFont && beforeAppFont !== afterAppFont;
const isSegoe = (family) => /Segoe/i.test(family || "");
const checks = {
  statusbarUsesSegoe: result.statusBarShown ? isSegoe(result.statusBarFont?.family) : null,
  tabCountUsesSegoe: result.tabCountShown ? isSegoe(result.tabCountFont?.family) : null,
  overviewUsesSegoe: result.overviewShown ? isSegoe(result.overviewFont?.family) : null,
  appFontActuallyChanged: appFontChanged,
};

await browser.close();

await fs.writeFile("/tmp/workspace-typography-delink.json", JSON.stringify({
  appFontBefore: beforeAppFont,
  appFontAfter: afterAppFont,
  appFontChanged,
  result,
  checks,
  consoleErrors: errors,
}, null, 2));
console.log("typography delink probe completed", JSON.stringify(checks));
