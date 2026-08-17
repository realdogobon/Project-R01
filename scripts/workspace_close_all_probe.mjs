import { writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const previewUrl = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const browser = await puppeteer.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function openWorkspace({ desktopBridge = false } = {}) {
  const page = await browser.newPage();
  page.__consoleErrors = [];
  page.on("pageerror", (error) => page.__consoleErrors.push(error.message));
  if (desktopBridge) {
    await page.evaluateOnNewDocument(() => {
      window.__royscriptProbeBridgeCalls = 0;
      window.__royscriptExit = () => {
        window.__royscriptProbeBridgeCalls += 1;
      };
    });
  }
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(previewUrl, { waitUntil: "networkidle2" });
  await page.waitForSelector("[data-workspace-tab-overview-trigger]", { timeout: 10_000 });
  return page;
}

async function openOverview(page) {
  await page.click("[data-workspace-tab-overview-trigger]");
  await page.waitForSelector("[data-workspace-tab-overview]", { visible: true, timeout: 10_000 });
}

async function tabCount(page) {
  return page.evaluate(() => {
    const text = document.querySelector("[data-tab-count]")?.textContent || "";
    return Number(text.match(/\d+/)?.[0] || 0);
  });
}

async function addTab(page) {
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "t", altKey: true, bubbles: true }));
  });
  await new Promise((resolve) => setTimeout(resolve, 350));
}

async function attachExitObservation(page) {
  await page.evaluate(() => {
    window.__royscriptProbeExit = null;
    window.addEventListener("royscript-request-exit", (event) => {
      window.__royscriptProbeExit = event.detail;
    });
  });
}

async function exitObservation(page) {
  return page.evaluate(() => ({
    event: window.__royscriptProbeExit,
    bridgeCalls: window.__royscriptProbeBridgeCalls || 0,
  }));
}

async function clickVisibleButton(page, label) {
  return page.evaluate((expectedLabel) => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === expectedLabel && candidate.offsetParent !== null,
    );
    button?.click();
    return Boolean(button);
  }, label);
}

async function waitForUnsavedDialog(page) {
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll("button")).some(
      (button) => button.textContent?.trim() === "Don't Save" && button.offsetParent !== null,
    ),
    { timeout: 5_000 },
  );
}

let page;
const allConsoleErrors = [];
try {
  // Standard browser preview: hidden action, intact tabs, no tabless editor state.
  page = await openWorkspace();
  await addTab(page);
  await addTab(page);
  const browserTabsBefore = await tabCount(page);
  await openOverview(page);
  const browserActionHidden = !(await page.$("[data-workspace-tab-close-all]"));
  const browserTabsRemain = (await tabCount(page)) === browserTabsBefore && browserTabsBefore === 3;
  await page.screenshot({ path: "/tmp/workspace-closeall-browser-safe.png" });
  allConsoleErrors.push(...page.__consoleErrors);
  await page.close();

  // Desktop bridge, clean content: request native exit and clear only the exiting shell state.
  page = await openWorkspace({ desktopBridge: true });
  await addTab(page);
  await attachExitObservation(page);
  await openOverview(page);
  const desktopActionVisible = Boolean(await page.$("[data-workspace-tab-close-all]"));
  await page.click("[data-workspace-tab-close-all]");
  await new Promise((resolve) => setTimeout(resolve, 500));
  const cleanDesktopExit = await exitObservation(page);
  const desktopCleanTabsCleared = (await tabCount(page)) === 0;
  const desktopCleanOverviewClosed = !(await page.$("[data-workspace-tab-overview]"));
  await page.screenshot({ path: "/tmp/workspace-closeall-desktop-clean.png" });
  allConsoleErrors.push(...page.__consoleErrors);
  await page.close();

  // Desktop bridge, dirty content: Cancel preserves tabs; Don't Save triggers the native exit path.
  page = await openWorkspace({ desktopBridge: true });
  await attachExitObservation(page);
  await addTab(page);
  await page.click("[data-lexical-editor], .lexkit-content-editable");
  await page.keyboard.type("Unsaved close-all regression", { delay: 12 });
  await new Promise((resolve) => setTimeout(resolve, 600));
  await openOverview(page);
  await page.click("[data-workspace-tab-close-all]");
  await waitForUnsavedDialog(page);
  const dirtyDialogRendered = true;
  const cancelClicked = await clickVisibleButton(page, "Cancel");
  await new Promise((resolve) => setTimeout(resolve, 300));
  const afterCancel = await exitObservation(page);
  const cancelPreservesTabs = (await tabCount(page)) === 2;
  await openOverview(page);
  await page.click("[data-workspace-tab-close-all]");
  await waitForUnsavedDialog(page);
  const dontSaveClicked = await clickVisibleButton(page, "Don't Save");
  await new Promise((resolve) => setTimeout(resolve, 500));
  const afterDontSave = await exitObservation(page);
  const dirtyDesktopTabsCleared = (await tabCount(page)) === 0;
  const dirtyDialogDismissed = await page.evaluate(() => !Array.from(document.querySelectorAll("button")).some(
    (button) => button.textContent?.trim() === "Don't Save" && button.offsetParent !== null,
  ));
  await page.screenshot({ path: "/tmp/workspace-closeall-desktop-dirty.png" });
  allConsoleErrors.push(...page.__consoleErrors);
  await page.close();

  const checks = {
    browserCreatesMultipleTabs: browserTabsBefore === 3,
    browserHidesCloseAllWithoutDesktopBridge: browserActionHidden,
    browserNeverEntersZeroTabEditorState: browserTabsRemain,
    desktopShowsCloseAllWithNativeBridge: desktopActionVisible,
    desktopCleanBridgeInvoked: cleanDesktopExit.bridgeCalls === 1,
    desktopCleanExitEventDispatched: cleanDesktopExit.event?.source === "closeAllTabs",
    desktopCleanTabsClearOnlyAfterBridge: desktopCleanTabsCleared,
    desktopCleanOverviewCloses: desktopCleanOverviewClosed,
    dirtyDialogRendered,
    cancelClicked,
    cancelPreservesTabs,
    cancelDoesNotRequestExit: afterCancel.bridgeCalls === 0 && afterCancel.event === null,
    dontSaveClicked,
    dirtyDesktopBridgeInvoked: afterDontSave.bridgeCalls === 1,
    dirtyDesktopExitEventDispatched: afterDontSave.event?.source === "closeAllTabs",
    dirtyDesktopTabsClearOnlyAfterBridge: dirtyDesktopTabsCleared,
    dirtyDialogDismissed,
    noPageErrors: allConsoleErrors.length === 0,
  };

  await writeFile("/tmp/workspace-closeall-result.json", JSON.stringify(checks, null, 2));
  console.log(JSON.stringify({ checks }, null, 2));
  if (Object.values(checks).some((passed) => !passed)) process.exitCode = 1;
} finally {
  await browser.close();
}
