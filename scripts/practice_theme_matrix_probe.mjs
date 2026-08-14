import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const puppeteer = require("/tmp/node_modules/puppeteer-core");
const previewUrl = process.env.PREVIEW_URL || "https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer";
const themeSource = fs.readFileSync("/home/ubuntu/royscript-tsr/client/src/constants/themes.ts", "utf8");
const themeBlock = themeSource.slice(themeSource.indexOf("MONKEYTYPE_THEMES"), themeSource.indexOf("MONKEYTYPE_FONTS"));
const importedThemes = [...themeBlock.matchAll(/^\s*(?:"([^"]+)"|([A-Za-z0-9_]+)):\s*\{/gm)].map((match) => match[1] || match[2]);
const themes = [...new Set(["classic", "mint", "royal", "dolch", "sand", "scarlet", ...importedThemes])];
const viewports = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "mobile", width: 375, height: 812 },
].filter((viewport) => !process.env.ONLY_VIEWPORT || viewport.name === process.env.ONLY_VIEWPORT);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const failures = [];
let passed = 0;

async function clickTextButton(page, text, description) {
  const clicked = await page.evaluate((label) => {
    const button = [...document.querySelectorAll("button")].find(
      (candidate) =>
        candidate.textContent?.trim() === label ||
        candidate.firstElementChild?.textContent?.trim() === label,
    );
    if (!button) return false;
    button.click();
    return true;
  }, text);
  assert.ok(clicked, `${description}: button was not found`);
}

async function closeSettings(page) {
  const clicked = await page.evaluate(() => {
    const button = document.querySelector('button[aria-label="Close settings"]');
    if (!button) return false;
    button.click();
    return true;
  });
  assert.ok(clicked, "Settings close control was not found");
  await page.waitForSelector('[data-settings-panel="true"]', { hidden: true, timeout: 2500 });
}

async function openThemes(page) {
  const settingsClicked = await page.evaluate(() => {
    const button = document.querySelector('button[title="Settings"]');
    if (!button) return false;
    button.click();
    return true;
  });
  assert.ok(settingsClicked, "Settings button was not found");
  await page.waitForSelector('[data-settings-panel="true"]', { timeout: 2500 });
  const appearanceClicked = await page.evaluate(() => {
    const button = document.querySelector('button[data-settings-category="appearance"]');
    if (!button) return false;
    button.click();
    return true;
  });
  assert.ok(appearanceClicked, "Appearance category was not found");
  await wait(120);
  const clicked = await page.evaluate(() => {
    const row = [...document.querySelectorAll('[data-settings-panel="true"] button')].find(
      (candidate) => candidate.firstElementChild?.textContent?.trim() === "Themes",
    );
    if (!row) return false;
    row.click();
    return true;
  });
  assert.ok(clicked, "Themes navigation row was not found");
  await page.waitForFunction(
    () => [...document.querySelectorAll('[data-settings-panel="true"] button')].filter(
      (candidate) => candidate.querySelector("div.grid-cols-3"),
    ).length > 0,
    { timeout: 2500 },
  );
  await wait(80);
}

async function clickThemeByIndex(page, index, expectedCount) {
  const count = await page.evaluate(({ themeIndex }) => {
    const buttons = [...document.querySelectorAll('[data-settings-panel="true"] button')].filter(
      (candidate) => candidate.querySelector("div.grid-cols-3"),
    );
    const button = buttons[themeIndex];
    if (!button) return { count: buttons.length, clicked: false };
    button.click();
    return { count: buttons.length, clicked: true };
  }, { themeIndex: index });
  assert.equal(count.count, expectedCount, `theme card count changed at index ${index}`);
  assert.ok(count.clicked, `theme card ${index} was not found`);
}

async function inspectPracticeSurface(page) {
  return page.evaluate(() => {
    const character = document.querySelector(".typing-char-pending");
    if (!character) return null;
    let root = character.parentElement;
    while (root && root !== document.body && !root.style.getPropertyValue("--typing-accent")) {
      root = root.parentElement;
    }
    if (!root || root === document.body) return null;
    const rootStyle = getComputedStyle(root);
    const characterStyle = getComputedStyle(character);
    const pending = document.querySelector(".typing-char-pending");
    const error = document.querySelector('[data-strict-warning-icon]');
    return {
      characterColor: characterStyle.color,
      rootColor: rootStyle.color,
      characterOpacity: characterStyle.opacity,
      keyboardAccent: rootStyle.getPropertyValue("--typing-accent").trim(),
      pendingToken: rootStyle.getPropertyValue("--typing-text-pending").trim(),
      errorToken: rootStyle.getPropertyValue("--typing-text-error").trim(),
      pendingColor: pending ? getComputedStyle(pending).color : null,
      errorColor: error ? getComputedStyle(error).color : null,
    };
  });
}

try {
  for (const viewport of viewports) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: viewport.width, height: viewport.height });
    const errors = [];
    let stage = "initializing";
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin")) {
        errors.push(message.text());
      }
    });

    try {
      stage = "page load";
      await page.goto(`${previewUrl}/?from_webdev=1`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => localStorage.removeItem("royscript_ai_keys"));
      stage = "find Start Practice mode button";
      await page.waitForSelector('button[title="Start Practice"]', { timeout: 2500 });
      stage = "enter Practice mode";
      await page.click('button[title="Start Practice"]');
      stage = "find session Start Practice button";
      await page.waitForFunction(
        () => [...document.querySelectorAll("button")].some(
          (candidate) => candidate.textContent?.trim() === "Start Practice",
        ),
        { timeout: 2500 },
      );
      stage = "start typing session";
      await clickTextButton(page, "Start Practice", `${viewport.name}: session start`);
      stage = "mount Practice characters";
      await page.waitForSelector(".typing-char-pending", { timeout: 2500 });
      await wait(80);

      for (let themeIndex = 0; themeIndex < themes.length; themeIndex += 1) {
        const theme = themes[themeIndex];
        try {
          stage = `${theme}/open Themes`;
          await openThemes(page);
          stage = `${theme}/select theme card`;
          await clickThemeByIndex(page, themeIndex, themes.length);
          await wait(70);

          stage = `${theme}/inspect Practice surface`;
          const state = await inspectPracticeSurface(page);
          assert.ok(state, `${viewport.name}/${theme}: Practice text root was not found`);
          assert.equal(state.characterColor, state.rootColor, `${viewport.name}/${theme}: normal character is not neutral-root color`);
          assert.equal(state.pendingToken, "currentColor", `${viewport.name}/${theme}: pending characters still use a theme token`);
          assert.equal(state.errorToken, "#ef4444", `${viewport.name}/${theme}: strict warning token is not standard red`);
          if (state.pendingColor) assert.equal(state.pendingColor, state.rootColor, `${viewport.name}/${theme}: pending character is theme-tinted`);
          if (state.errorColor) assert.equal(state.errorColor, "rgb(239, 68, 68)", `${viewport.name}/${theme}: warning icon is not standard red`);
          assert.ok(state.keyboardAccent, `${viewport.name}/${theme}: keyboard/cursor accent token disappeared`);
          passed += 1;

          stage = `${theme}/close Settings`;
          await closeSettings(page);
        } catch (error) {
          failures.push(`${viewport.name}/${theme}: ${error.message}`);
          const panel = await page.$('[data-settings-panel="true"]');
          if (panel) {
            await closeSettings(page).catch(() => {});
            await wait(40);
          }
        }
      }
    } catch (error) {
      failures.push(`${viewport.name}/${stage}: ${error.message}`);
    }

    assert.equal(errors.length, 0, `${viewport.name}: unexpected browser errors: ${errors.join(" | ")}`);
    await page.close();
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`Theme matrix: ${themes.length} themes x ${viewports.length} viewports = ${passed} passed`);
if (failures.length) {
  console.error(failures.slice(0, 20).join("\n"));
  process.exitCode = 1;
}
