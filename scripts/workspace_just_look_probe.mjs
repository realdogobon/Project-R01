import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const previewUrl = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const outputDir = "/tmp/workspace-just-look";
const sealedExamText = "sealed-exam-artifact";
const ordinaryTabText = "ordinary-tab-remains-editable";
const freshWorkspaceText = "fresh-editable-workspace";

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

const waitForTextButton = (label) => page.waitForFunction((expected) => [...document.querySelectorAll("button")].some((button) => button.textContent?.trim() === expected), { timeout: 10_000 }, label);
const clickTextButton = (label) => page.evaluate((expected) => {
  const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === expected);
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing ${expected} button`);
  button.click();
}, label);
const timesUpVisible = () => page.evaluate(() => [...document.querySelectorAll("h2")].some((heading) => heading.textContent?.includes("Time is up")));
const visibleControlPoint = (selector, label) => page.evaluate(({ selector: targetSelector, label: targetLabel }) => {
  const target = [...document.querySelectorAll(targetSelector)]
    .find((item) => item instanceof HTMLButtonElement && item.offsetParent !== null);
  if (!(target instanceof HTMLButtonElement)) throw new Error(`Missing visible ${targetLabel}`);
  if (target.disabled) throw new Error(`Visible ${targetLabel} is unexpectedly disabled`);
  const rect = target.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}, { selector, label });
const openOverview = async () => {
  if (!(await page.$("[data-workspace-tab-overview]"))) {
    const point = await visibleControlPoint("[data-workspace-tab-overview-trigger]", "Task View trigger");
    await page.mouse.click(point.x, point.y);
    await page.waitForSelector("[data-workspace-tab-overview]", { timeout: 10_000 });
  }
  await new Promise((resolve) => setTimeout(resolve, 220));
};
const getSealedOverviewCardId = () => page.$eval('[data-workspace-tab-overview-exam-sealed="true"]', (card) => card.getAttribute("data-workspace-tab-overview-item"));
const selectOverviewCardById = async (tabId) => {
  const point = await visibleControlPoint(`[data-workspace-tab-overview-activate="${tabId}"]`, `Task View card ${tabId}`);
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(() => !document.querySelector("[data-workspace-tab-overview]"), { timeout: 10_000 });
};
const createNewWorkspaceTab = async () => {
  const point = await visibleControlPoint("[data-workspace-new-tab-trigger]", "new-tab trigger");
  await page.mouse.click(point.x, point.y);
  await new Promise((resolve) => setTimeout(resolve, 220));
};
const typeIntoEditable = async (text) => {
  await page.waitForSelector('.lexkit-content-editable[contenteditable="true"]', { timeout: 10_000 });
  await page.click('.lexkit-content-editable[contenteditable="true"]');
  await page.keyboard.type(text);
};
const editorSurfacePoint = () => page.$eval(".lexkit-editor", (editor) => {
  const rect = editor.getBoundingClientRect();
  return { x: rect.left + Math.min(48, rect.width / 2), y: rect.top + Math.min(48, rect.height / 2) };
});
const waitForEditorText = (text) => page.waitForFunction((expected) => {
  return (document.querySelector(".lexkit-content-editable")?.textContent || "").includes(expected);
}, { timeout: 10_000 }, text);

await page.goto(previewUrl, { waitUntil: "networkidle2" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle2" });
await page.waitForSelector("[data-workspace-toolbar-controls]", { timeout: 10_000 });
await new Promise((resolve) => setTimeout(resolve, 600));
const blankProfileStartsWithoutEditorFocus = await page.evaluate(() => {
  const editable = document.querySelector(".lexkit-content-editable");
  if (!(editable instanceof HTMLElement)) return false;
  const activeElement = document.activeElement;
  const editorOwnsFocus = activeElement === editable || editable.contains(activeElement);
  const selection = window.getSelection();
  const selectionTargetsEditor = !!selection?.rangeCount && editable.contains(selection.getRangeAt(0).commonAncestorContainer);
  return !editorOwnsFocus && !selectionTargetsEditor;
});

// Keep a real dirty ordinary tab beside the tab that will later become sealed.
await typeIntoEditable("ordinary-tab-before-exam");
await createNewWorkspaceTab();
await page.waitForFunction(() => Number.parseInt(document.querySelector("[data-tab-count]")?.textContent || "0", 10) >= 2, { timeout: 10_000 });

await page.evaluate(() => {
  Object.defineProperty(HTMLElement.prototype, "requestFullscreen", { configurable: true, value: () => Promise.resolve() });
  const toggle = [...document.querySelectorAll('[title="Toggle Exam Mode"]')].find((item) => item instanceof HTMLButtonElement && item.offsetParent !== null);
  if (!(toggle instanceof HTMLButtonElement)) throw new Error("Missing exam toggle");
  toggle.click();
});
await waitForTextButton("Set Timer");
await clickTextButton("Set Timer");
await page.waitForFunction(() => [...document.querySelectorAll("button")].some((button) => button.textContent?.includes("Skip Rules & Start")), { timeout: 10_000 });
await page.evaluate(() => {
  const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes("Skip Rules & Start"));
  if (!(button instanceof HTMLButtonElement)) throw new Error("Missing exam start button");
  button.click();
});
await page.waitForFunction(() => document.querySelector('[title="Stop Exam"]') instanceof HTMLButtonElement, { timeout: 10_000 });

await typeIntoEditable(sealedExamText);
await new Promise((resolve) => setTimeout(resolve, 400));
await page.click('[title="Stop Exam"]');
await page.waitForFunction(() => [...document.querySelectorAll("h2")].some((heading) => heading.textContent?.includes("Time is up")), { timeout: 10_000 });
const timeoutPopupAppearsAfterFinish = await timesUpVisible();

await clickTextButton("Just Look");
await page.waitForFunction(() => ![...document.querySelectorAll("h2")].some((heading) => heading.textContent?.includes("Time is up")), { timeout: 10_000 });
const sealedTabRemainsReadOnlyAfterJustLook = await page.evaluate(() => {
  const overview = document.querySelector("[data-workspace-tab-overview-trigger]");
  const newTab = document.querySelector("[data-workspace-new-tab-trigger]");
  const editing = document.querySelector("[data-lexkit-editing-controls]");
  const command = document.querySelector("[data-lexkit-command-controls]");
  return overview instanceof HTMLButtonElement
    && !overview.disabled
    && newTab instanceof HTMLButtonElement
    && !newTab.disabled
    && editing?.getAttribute("aria-disabled") === "true"
    && command?.getAttribute("aria-disabled") === "true"
    && document.querySelector(".lexkit-editor")?.classList.contains("cursor-default")
    && !document.querySelector("[data-sealed-exam-review-shield]");
});

// The seal must survive persistence without restoring the former global lock.
await new Promise((resolve) => setTimeout(resolve, 900));
await page.reload({ waitUntil: "networkidle2" });
await page.waitForSelector("[data-workspace-toolbar-controls]", { timeout: 10_000 });
const persistedSealedTabRestoresWithoutGlobalLock = await page.evaluate(() => {
  const overview = document.querySelector("[data-workspace-tab-overview-trigger]");
  const newTab = document.querySelector("[data-workspace-new-tab-trigger]");
  return overview instanceof HTMLButtonElement
    && !overview.disabled
    && newTab instanceof HTMLButtonElement
    && !newTab.disabled
    && document.querySelector(".lexkit-editor")?.classList.contains("cursor-default")
    && !document.querySelector("[data-sealed-exam-review-shield]");
});

await openOverview();
await page.waitForFunction(() => document.querySelectorAll("[data-workspace-tab-overview-item]").length >= 2 && !!document.querySelector('[data-workspace-tab-overview-exam-sealed="true"]'), { timeout: 10_000 });
const sealedOverviewKeepsApprovedBrightness = await page.evaluate(() => {
  const overview = document.querySelector("[data-workspace-tab-overview]");
  const editorContent = document.querySelector(".lexkit-content-editable");
  if (!(overview instanceof HTMLElement) || !(editorContent instanceof HTMLElement)) return false;
  const overviewStyle = getComputedStyle(overview);
  const editorStyle = getComputedStyle(editorContent);
  return Number.parseFloat(overviewStyle.opacity) >= 0.99
    && Number.parseFloat(editorStyle.opacity) <= 0.55;
});
await page.screenshot({ path: path.join(outputDir, "sealed-task-view.png"), fullPage: false });
const sealedOutsidePoint = await editorSurfacePoint();
await page.mouse.click(sealedOutsidePoint.x, sealedOutsidePoint.y);
await page.waitForFunction(() => !document.querySelector("[data-workspace-tab-overview]"), { timeout: 10_000 });
const sealedOverviewDismissesOnSingleOutsideClick = true;

await openOverview();
await page.waitForFunction(() => document.querySelectorAll("[data-workspace-tab-overview-item]").length >= 2 && !!document.querySelector('[data-workspace-tab-overview-exam-sealed="true"]'), { timeout: 10_000 });
const sealedExamTabId = await getSealedOverviewCardId();
const reviewTabIds = await page.$$eval("[data-workspace-tab-overview-item]", (items) => items.map((item) => item.getAttribute("data-workspace-tab-overview-item")).filter(Boolean));
const nonExamTabId = reviewTabIds.find((id) => id !== sealedExamTabId);
if (!sealedExamTabId || !nonExamTabId) throw new Error("Expected one sealed exam tab and one ordinary tab");
const sealedCompletedExamCloseIsHidden = await page.evaluate((tabId) => {
  const card = document.querySelector(`[data-workspace-tab-overview-item="${tabId}"]`);
  return card?.getAttribute("data-workspace-tab-overview-exam-sealed") === "true"
    && card?.getAttribute("data-workspace-tab-overview-close-eligible") === "false"
    && !document.querySelector(`[data-workspace-tab-overview-close="${tabId}"]`);
}, sealedExamTabId);
const overviewKeepsOrdinaryTabClosable = await page.$eval(`[data-workspace-tab-overview-close="${nonExamTabId}"]`, (control) => control instanceof HTMLButtonElement && !control.disabled);

await selectOverviewCardById(nonExamTabId);
// The selected document imports on a deliberate delay. Wait past it so this
// catches a stale sealed-tab closure restoring read-only after navigation.
await new Promise((resolve) => setTimeout(resolve, 260));
const ordinaryTabRestoresEditableAfterDelayedImport = await page.evaluate(() => {
  const editable = document.querySelector(".lexkit-content-editable");
  return editable?.getAttribute("contenteditable") === "true"
    && !document.querySelector(".lexkit-editor")?.classList.contains("cursor-default");
});
const ordinaryTabSwitchDoesNotCreateAutomaticSelection = await page.evaluate(() => {
  const editable = document.querySelector(".lexkit-content-editable");
  if (!(editable instanceof HTMLElement)) return false;
  const activeElement = document.activeElement;
  const editorOwnsFocus = activeElement === editable || editable.contains(activeElement);
  const selection = window.getSelection();
  const selectionTargetsEditor = !!selection?.rangeCount && editable.contains(selection.getRangeAt(0).commonAncestorContainer);
  return !editorOwnsFocus && !selectionTargetsEditor;
});
await typeIntoEditable(ordinaryTabText);
const ordinaryTextBounds = await page.$eval(".lexkit-content-editable p", (paragraph) => {
  const rect = paragraph.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
});
await page.mouse.move(ordinaryTextBounds.left + 8, ordinaryTextBounds.top + Math.max(8, ordinaryTextBounds.height / 2));
await page.mouse.down();
await page.mouse.move(ordinaryTextBounds.left + Math.min(180, ordinaryTextBounds.width - 8), ordinaryTextBounds.top + Math.max(8, ordinaryTextBounds.height / 2), { steps: 8 });
await page.mouse.up();
const ordinaryTabAllowsMouseSelection = await page.evaluate(() => {
  const selection = window.getSelection();
  const editable = document.querySelector(".lexkit-content-editable");
  return Boolean(selection && !selection.isCollapsed && editable?.contains(selection.anchorNode) && editable.contains(selection.focusNode));
});
const ordinaryTabInteractionStateAfterTyping = await page.evaluate((expected) => {
  const content = document.querySelector(".lexkit-content-editable")?.textContent || "";
  const editing = document.querySelector("[data-lexkit-editing-controls]");
  const command = document.querySelector("[data-lexkit-command-controls]");
  return content.includes(expected)
    && editing?.getAttribute("aria-disabled") === "false"
    && command?.getAttribute("aria-disabled") === "false"
    && !document.querySelector("[data-sealed-exam-review-shield]");
}, ordinaryTabText);
const ordinaryTabIsFullyEditable = ordinaryTabRestoresEditableAfterDelayedImport && ordinaryTabSwitchDoesNotCreateAutomaticSelection && ordinaryTabInteractionStateAfterTyping;

await openOverview();
const ordinaryOverviewKeepsApprovedBrightness = await page.evaluate(() => {
  const overview = document.querySelector("[data-workspace-tab-overview]");
  return overview instanceof HTMLElement
    && Number.parseFloat(getComputedStyle(overview).opacity) >= 0.99;
});
const ordinaryOutsidePoint = await editorSurfacePoint();
await page.mouse.click(ordinaryOutsidePoint.x, ordinaryOutsidePoint.y);
await page.waitForFunction(() => !document.querySelector("[data-workspace-tab-overview]"), { timeout: 10_000 });
const ordinaryOverviewDismissesOnSingleOutsideClick = true;

await openOverview();
const closePoint = await visibleControlPoint(`[data-workspace-tab-overview-close="${nonExamTabId}"]`, `close control ${nonExamTabId}`);
await page.mouse.click(closePoint.x, closePoint.y);
await page.waitForFunction(() => [...document.querySelectorAll("h2")].some((heading) => heading.textContent?.includes("Do you want to save changes")), { timeout: 10_000 });
const ordinaryDirtyTabUsesExistingCloseGuard = await page.evaluate(() => [...document.querySelectorAll("h2")].some((heading) => heading.textContent?.includes("Do you want to save changes")));
await clickTextButton("Cancel");
await page.waitForFunction(() => ![...document.querySelectorAll("h2")].some((heading) => heading.textContent?.includes("Do you want to save changes")), { timeout: 10_000 });

await openOverview();
await selectOverviewCardById(sealedExamTabId);
await waitForEditorText(sealedExamText);
await page.waitForSelector(".lexkit-editor.cursor-default", { timeout: 10_000 });
await page.keyboard.type("sealed-exam-mutation");
const sealedExamRejectsMutationAfterReturn = await page.evaluate((expected) => {
  const content = document.querySelector(".lexkit-content-editable")?.textContent || "";
  return content.includes(expected) && !content.includes("sealed-exam-mutation");
}, sealedExamText);
await page.screenshot({ path: path.join(outputDir, "sealed-exam-return.png") });

const sealedEditorPoint = await editorSurfacePoint();
await page.mouse.click(sealedEditorPoint.x, sealedEditorPoint.y, { count: 2, delay: 65 });
await page.waitForFunction(() => [...document.querySelectorAll("h2")].some((heading) => heading.textContent?.includes("Time is up")), { timeout: 10_000 });
const doubleClickOnSealedTabReopensTimesUp = await timesUpVisible();
await clickTextButton("Just Look");
await page.waitForSelector(".lexkit-editor.cursor-default", { timeout: 10_000 });

await createNewWorkspaceTab();
await page.waitForFunction(() => Number.parseInt(document.querySelector("[data-tab-count]")?.textContent || "0", 10) >= 3, { timeout: 10_000 });
await typeIntoEditable(freshWorkspaceText);
const newTabIsEditableFreshWorkspace = await page.evaluate((expected) => {
  const content = document.querySelector(".lexkit-content-editable")?.textContent || "";
  return content.includes(expected) && document.querySelector("[data-lexkit-editing-controls]")?.getAttribute("aria-disabled") === "false";
}, freshWorkspaceText);

await page.click('[title="Start Practice"]');
await page.waitForFunction(() => document.querySelector('[title="Write Mode"]') instanceof HTMLButtonElement, { timeout: 10_000 });
await page.click('[title="Write Mode"]');
await page.waitForSelector("[data-workspace-toolbar-controls]", { timeout: 10_000 });
const practiceModeRoundTripCompletes = true;

await openOverview();
await selectOverviewCardById(sealedExamTabId);
await waitForEditorText(sealedExamText);
await page.waitForSelector(".lexkit-editor.cursor-default", { timeout: 10_000 });
const sealedExamSurvivesPracticeAndTabTransitions = await page.evaluate((expected) => {
  const content = document.querySelector(".lexkit-content-editable")?.textContent || "";
  return content.includes(expected)
    && document.querySelector(".lexkit-editor")?.classList.contains("cursor-default")
    && !document.querySelector("[data-sealed-exam-review-shield]");
}, sealedExamText);

const report = {
  previewUrl,
  checks: {
    timeoutPopupAppearsAfterFinish,
    blankProfileStartsWithoutEditorFocus,
    sealedTabRemainsReadOnlyAfterJustLook,
    persistedSealedTabRestoresWithoutGlobalLock,
    sealedOverviewKeepsApprovedBrightness,
    sealedOverviewDismissesOnSingleOutsideClick,
    sealedCompletedExamCloseIsHidden,
    overviewKeepsOrdinaryTabClosable,
    ordinaryTabRestoresEditableAfterDelayedImport,
    ordinaryTabAllowsMouseSelection,
    ordinaryTabIsFullyEditable,
    ordinaryOverviewKeepsApprovedBrightness,
    ordinaryOverviewDismissesOnSingleOutsideClick,
    ordinaryDirtyTabUsesExistingCloseGuard,
    sealedExamRejectsMutationAfterReturn,
    doubleClickOnSealedTabReopensTimesUp,
    newTabIsEditableFreshWorkspace,
    practiceModeRoundTripCompletes,
    sealedExamSurvivesPracticeAndTabTransitions,
    consoleHealthy: consoleErrors.length === 0,
  },
  consoleErrors,
};

await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outputDir, ...report }, null, 2));
await browser.close();
