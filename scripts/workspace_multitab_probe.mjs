import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const previewUrl = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const outputDir = "/tmp/workspace-toolbar-tabs";

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const overviewCount = () => page.$$eval("[data-workspace-tab-overview-item]", (items) => items.length);
const tabCountLabel = () => page.$eval("[data-tab-count]", (element) => element.textContent?.trim() || "");
const hasSaveDialog = () => page.evaluate(() => [...document.querySelectorAll("h2")].some((heading) => heading.textContent?.includes("Do you want to save changes")));
const clickDialogAction = (label) => page.evaluate((buttonLabel) => {
  const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === buttonLabel);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing ${buttonLabel} button`);
  button.click();
}, label);
const waitForOptionalSaveDialog = async () => {
  try {
    await page.waitForFunction(() => [...document.querySelectorAll("h2")].some((heading) => heading.textContent?.includes("Do you want to save changes")), { timeout: 700 });
    return true;
  } catch {
    return false;
  }
};
const closeOverviewIfOpen = async () => {
  if (await page.$("[data-workspace-tab-overview]")) {
    await page.click("[data-workspace-tab-overview-trigger]");
    await page.waitForFunction(() => !document.querySelector("[data-workspace-tab-overview]"), { timeout: 10_000 });
  }
};
const openOverview = async () => {
  if (!(await page.$("[data-workspace-tab-overview]"))) {
    await page.click("[data-workspace-tab-overview-trigger]");
    await page.waitForSelector("[data-workspace-tab-overview]", { timeout: 10_000 });
  }
};

await page.goto(previewUrl, { waitUntil: "networkidle2" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle2" });
await page.waitForSelector("[data-workspace-toolbar-controls]", { timeout: 10_000 });

const initialLayout = await page.evaluate(() => {
  const toolbar = document.querySelector(".lexkit-toolbar");
  const controls = document.querySelector("[data-workspace-toolbar-controls]");
  const obsoleteStrip = document.querySelector("[data-workspace-tab-strip]");
  if (!toolbar || !controls) throw new Error("Missing toolbar workspace controls");
  const toolbarRect = toolbar.getBoundingClientRect();
  const controlRect = controls.getBoundingClientRect();
  return {
    controlsShareToolbarRow: Math.abs((toolbarRect.top + toolbarRect.bottom) / 2 - (controlRect.top + controlRect.bottom) / 2) < 2 && controlRect.top >= toolbarRect.top - 1 && controlRect.bottom <= toolbarRect.bottom + 1,
    obsoleteStripVisible: Boolean(obsoleteStrip && (obsoleteStrip).getBoundingClientRect().height > 0),
  };
});

for (let expected = 2; expected <= 4; expected += 1) {
  await page.click("[data-workspace-new-tab-trigger]");
  await page.waitForFunction((label) => document.querySelector("[data-tab-count]")?.textContent?.trim() === label, { timeout: 10_000 }, `${expected} tabs`);
}
const countAfterCreate = await tabCountLabel();

await page.click('[contenteditable="true"]');
await page.keyboard.type("toolbar-live-preview");
await wait(220);
await page.click("[data-workspace-tab-overview-trigger]");
await page.waitForSelector("[data-workspace-tab-overview]", { timeout: 10_000 });
const overviewListsAllTabs = (await overviewCount()) === 4;
const activePreviewHasTypedText = await page.evaluate(() => [...document.querySelectorAll("[data-openeditor-tab-preview]")].some((preview) => preview.textContent?.includes("toolbar-live-preview")));
await page.screenshot({ path: path.join(outputDir, "overview-light.png") });

const activationTarget = await page.$eval("[data-workspace-tab-overview-item]", (item) => item.getAttribute("data-workspace-tab-overview-item"));
await page.click(`[data-workspace-tab-overview-activate="${activationTarget}"]`);
await page.waitForFunction(() => !document.querySelector("[data-workspace-tab-overview]"), { timeout: 10_000 });
const overviewCardSwitches = true;

await page.click("[data-workspace-tab-overview-trigger]");
await page.waitForSelector("[data-workspace-tab-overview]", { timeout: 10_000 });
const cleanCloseTarget = await page.$eval("[data-workspace-tab-overview-item]:not(:first-child)", (item) => item.getAttribute("data-workspace-tab-overview-item"));
await page.click(`[data-workspace-tab-overview-close="${cleanCloseTarget}"]`);
if (await waitForOptionalSaveDialog()) await clickDialogAction("Don't Save");
await page.waitForFunction((expected) => document.querySelectorAll("[data-workspace-tab-overview-item]").length === expected, { timeout: 10_000 }, 3);
const cleanCardCloseRemovesOnlyOne = (await overviewCount()) === 3 && (await tabCountLabel()) === "3 tabs";

const dirtyTarget = await page.$eval("[data-workspace-tab-overview-item]", (item) => item.getAttribute("data-workspace-tab-overview-item"));
await page.click(`[data-workspace-tab-overview-activate="${dirtyTarget}"]`);
await page.waitForFunction(() => !document.querySelector("[data-workspace-tab-overview]"), { timeout: 10_000 });
await page.click('[contenteditable="true"]');
await page.keyboard.type("dirty-card-close");
await wait(220);
await page.click("[data-workspace-tab-overview-trigger]");
await page.waitForSelector(`[data-workspace-tab-overview-close="${dirtyTarget}"]`, { timeout: 10_000 });
await page.click(`[data-workspace-tab-overview-close="${dirtyTarget}"]`);
await page.waitForFunction(() => [...document.querySelectorAll("h2")].some((heading) => heading.textContent?.includes("Do you want to save changes")), { timeout: 10_000 });
const dirtyCardClosePrompts = await hasSaveDialog();
await clickDialogAction("Cancel");
await page.waitForFunction(() => ![...document.querySelectorAll("h2")].some((heading) => heading.textContent?.includes("Do you want to save changes")), { timeout: 10_000 });
const dirtyCancelRetainsCard = await page.$(`[data-workspace-tab-overview-item="${dirtyTarget}"]`) !== null;
await page.click(`[data-workspace-tab-overview-close="${dirtyTarget}"]`);
await page.waitForFunction(() => [...document.querySelectorAll("h2")].some((heading) => heading.textContent?.includes("Do you want to save changes")), { timeout: 10_000 });
await clickDialogAction("Don't Save");
await page.waitForFunction((id) => !document.querySelector(`[data-workspace-tab-overview-item="${id}"]`), { timeout: 10_000 }, dirtyTarget);
const dirtyDiscardRemovesCard = (await overviewCount()) === 2 && (await tabCountLabel()) === "2 tabs";

await closeOverviewIfOpen();
await page.evaluate(() => {
  const themeButton = [...document.querySelectorAll('[title="Toggle theme"]')].find((item) => item instanceof HTMLButtonElement && item.offsetParent !== null);
  if (!(themeButton instanceof HTMLButtonElement)) throw new Error("Missing visible theme button");
  themeButton.click();
});
await page.waitForFunction(() => document.documentElement.classList.contains("dark"), { timeout: 10_000 });
await openOverview();
await page.screenshot({ path: path.join(outputDir, "overview-dark.png") });
const darkOverviewRetainsCards = (await overviewCount()) === 2;
await closeOverviewIfOpen();

await page.evaluate(() => {
  Object.defineProperty(HTMLElement.prototype, "requestFullscreen", { configurable: true, value: () => Promise.resolve() });
  const examToggle = [...document.querySelectorAll('[title="Toggle Exam Mode"]')].find((item) => item instanceof HTMLButtonElement && item.offsetParent !== null);
  if (!(examToggle instanceof HTMLButtonElement)) throw new Error("Missing visible exam toggle");
  examToggle.click();
});
await page.waitForFunction(() => [...document.querySelectorAll("button")].some((button) => button.textContent?.trim() === "Set Timer"), { timeout: 10_000 });
await clickDialogAction("Set Timer");
await page.waitForFunction(() => [...document.querySelectorAll("button")].some((button) => button.textContent?.includes("Skip Rules & Start")), { timeout: 10_000 });
await page.evaluate(() => {
  const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes("Skip Rules & Start"));
  if (!(button instanceof HTMLButtonElement)) throw new Error("Missing exam start button");
  button.click();
});
await page.waitForFunction(() => {
  const overview = document.querySelector("[data-workspace-tab-overview-trigger]");
  const newTab = document.querySelector("[data-workspace-new-tab-trigger]");
  return overview instanceof HTMLButtonElement && newTab instanceof HTMLButtonElement && overview.disabled && newTab.disabled;
}, { timeout: 10_000 });
const examLocksToolbarWorkspaceControls = true;

const report = {
  previewUrl,
  checks: {
    toolbarControlsShareEditorToolbarRow: initialLayout.controlsShareToolbarRow,
    permanentTabStripIsNotVisible: !initialLayout.obsoleteStripVisible,
    newTabUpdatesToolbarCount: countAfterCreate === "4 tabs",
    overviewListsEveryToolbarManagedTab: overviewListsAllTabs,
    activeOverviewPreviewUsesLiveContent: activePreviewHasTypedText,
    overviewCardSwitchesTab: overviewCardSwitches,
    cleanOverviewCardCloseRemovesOnlyTarget: cleanCardCloseRemovesOnlyOne,
    dirtyOverviewCardClosePrompts: dirtyCardClosePrompts,
    dirtyOverviewCardCancelRetainsTab: dirtyCancelRetainsCard,
    dirtyOverviewCardDiscardRemovesTab: dirtyDiscardRemovesCard,
    darkOverviewRetainsCards,
    examLocksToolbarWorkspaceControls,
    consoleHealthy: consoleErrors.length === 0,
  },
  consoleErrors,
};

await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outputDir, ...report }, null, 2));
await browser.close();
