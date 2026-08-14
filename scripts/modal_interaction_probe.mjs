import puppeteer from "/tmp/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import fs from "node:fs/promises";

const previewUrl = process.env.PREVIEW_URL || "http://127.0.0.1:3000/?from_webdev=1";
const outputPath = process.env.OUTPUT || "/home/ubuntu/modal-interaction-report.json";
const widths = [1280, 375];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function visible(page, selector) {
  return page.$eval(selector, (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
  }).catch(() => false);
}

async function visibleButtonByTitle(page, title) {
  return page.evaluate((wantedTitle) => {
    const buttons = [...document.querySelectorAll("button")];
    return buttons.some((button) => {
      const rect = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return button.getAttribute("title") === wantedTitle && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    });
  }, title);
}

async function clickVisibleTitle(page, title) {
  return page.evaluate((wantedTitle) => {
    const button = [...document.querySelectorAll("button")].find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      const style = getComputedStyle(candidate);
      return candidate.getAttribute("title") === wantedTitle && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    });
    if (!button) return false;
    button.click();
    return true;
  }, title);
}

async function clickHeaderClose(page, headerLabel) {
  return page.evaluate((wantedLabel) => {
    const label = [...document.querySelectorAll("span")].find((candidate) => candidate.textContent?.trim() === wantedLabel);
    const titleBar = label?.closest("div.h-\\[38px\\]");
    const closeButton = titleBar?.querySelector("button");
    if (!closeButton) return false;
    closeButton.click();
    return true;
  }, headerLabel);
}

async function clickText(page, text) {
  return page.evaluate((wantedText) => {
    const candidates = [...document.querySelectorAll("button, [role='button']")];
    const element = candidates.find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      const style = getComputedStyle(candidate);
      return candidate.textContent?.trim().includes(wantedText) && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    });
    if (!element) return false;
    element.click();
    return true;
  }, text);
}

async function snapshot(page, label) {
  return page.evaluate((snapshotLabel) => {
    const shells = [...document.querySelectorAll("[data-scanner-modal-shell], [role='dialog']")].filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    });
    const bodyText = document.body.innerText.slice(0, 600);
    return {
      label: snapshotLabel,
      modalCount: shells.length,
      modals: shells.map((element) => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName, role: element.getAttribute("role"), x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
      bodyText,
      scrollY: window.scrollY,
    };
  }, label);
}

async function runViewport(width) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: { width, height: 820, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push({ type: "pageerror", message: String(error?.message || error) }));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push({ type: "console", message: message.text() });
  });

  await page.goto(previewUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await sleep(1_000);
  const snapshots = [await snapshot(page, "workspace-initial")];
  const scenarios = [];

  const runScenario = async (name, open, close, inner) => {
    const started = Date.now();
    const opened = await open();
    await sleep(120);
    const openSnapshot = await snapshot(page, `${name}-open`);
    let innerResult = null;
    if (opened && inner) innerResult = await inner();
    if (opened) {
      await sleep(20);
      await close();
      await sleep(260);
    }
    const closedSnapshot = await snapshot(page, `${name}-closed`);
    scenarios.push({ name, opened, innerResult, elapsedMs: Date.now() - started, openSnapshot, closedSnapshot });
  };

  await runScenario(
    "scanner-open-close-burst",
    () => clickVisibleTitle(page, "AI Scanner"),
    () => clickHeaderClose(page, "Scan"),
    async () => {
      const shell = await visible(page, "[data-scanner-modal-shell]");
      if (!shell) return { shell: false };
      const closeButtonCount = await page.$$eval("[data-scanner-modal-shell] button", (buttons) => buttons.filter((button) => {
        const rect = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && !button.disabled;
      }).length);
      await clickHeaderClose(page, "Scan").catch(() => false);
      await clickVisibleTitle(page, "AI Scanner").catch(() => false);
      await clickHeaderClose(page, "Scan").catch(() => false);
      return { shell, closeButtonCount, burstCompleted: true };
    },
  );

  await runScenario(
    "library-category-burst",
    () => clickVisibleTitle(page, "Library"),
    () => clickHeaderClose(page, "Library"),
    async () => {
      const categoryLabels = ["All Documents", "Starred", "Trash"];
      const clicked = [];
      for (const label of categoryLabels) {
        if (await clickText(page, label)) clicked.push(label);
        await sleep(8);
      }
      const activeText = await page.$eval("body", (body) => body.innerText.slice(0, 800)).catch(() => "");
      return { clicked, activeText };
    },
  );

  await runScenario(
    "auth-mode-burst",
    () => clickVisibleTitle(page, "Profile"),
    () => clickVisibleTitle(page, "Close"),
    async () => {
      const signUp = await clickText(page, "Create account");
      await sleep(8);
      const signIn = await clickText(page, "Sign in");
      await sleep(8);
      const title = await page.$eval("[role='dialog']", (dialog) => dialog.innerText.slice(0, 250)).catch(() => "no-dialog");
      return { signUp, signIn, title };
    },
  );

  snapshots.push(...scenarios.flatMap((scenario) => [scenario.openSnapshot, scenario.closedSnapshot]));
  await page.screenshot({ path: `/home/ubuntu/modal-interaction-${width}.png`, fullPage: false });
  await browser.close();
  return { width, scenarios, snapshots, browserErrors };
}

const reports = [];
for (const width of widths) reports.push(await runViewport(width));
await fs.writeFile(outputPath, JSON.stringify({ previewUrl, generatedAt: new Date().toISOString(), reports }, null, 2));

const realErrors = reports.flatMap((report) => report.browserErrors).filter((error) => !/favicon|cross-origin|blocked/i.test(error.message));
if (realErrors.length) {
  console.error(JSON.stringify({ realErrors }, null, 2));
  process.exitCode = 1;
}

console.log(JSON.stringify({
  outputPath,
  viewports: reports.map((report) => report.width),
  scenarios: reports.map((report) => ({ width: report.width, names: report.scenarios.map((scenario) => scenario.name), browserErrors: report.browserErrors })),
  realErrorCount: realErrors.length,
}, null, 2));
