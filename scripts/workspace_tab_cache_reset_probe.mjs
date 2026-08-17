import fs from "node:fs/promises";
import puppeteer from "puppeteer-core";

const previewUrl = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
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

await page.goto(previewUrl, { waitUntil: "networkidle2" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle2" });
await page.waitForSelector("[data-workspace-tab-card]", { timeout: 10_000 });

await page.evaluate(() => {
  const guestUid = localStorage.getItem("typing_suite_guest_uid");
  if (!guestUid) throw new Error("Guest identifier was not created");

  localStorage.setItem("ais_saved_scan_extracts", JSON.stringify([{ id: "probe-scan", title: "Preserved scanner record" }]));
  localStorage.setItem(`typing_suite_state_${guestUid}`, JSON.stringify({
    editorContent: "This legacy content must be removed with the tab cache.",
    mode: "Write",
    practiceText: "Practice data must remain untouched.",
    practiceTitle: "Retained Practice Title",
    practiceConfig: { language: "en-US" },
    fileName: "Legacy document",
    cursor: { start: 1, end: 1 },
    isExamMode: true,
    examStatus: "running",
    examRemainingSeconds: 300,
    examTotalSeconds: 600,
    examReplayLog: [{ t: 1, s: "x" }],
    examSealed: true,
    tabs: [
      { id: "legacy-a", name: "Accidental tab A", content: "A", isDirty: true },
      { id: "legacy-b", name: "Accidental tab B", content: "B", isDirty: true },
      { id: "legacy-c", name: "Accidental tab C", content: "C", isDirty: true },
    ],
    activeTabId: "legacy-c",
  }));
});

await page.reload({ waitUntil: "networkidle2" });
await page.waitForFunction(
  () => document.querySelectorAll("[data-workspace-tab-card]").length === 1,
  { timeout: 10_000 },
);

const result = await page.evaluate(() => {
  const guestUid = localStorage.getItem("typing_suite_guest_uid");
  const snapshot = guestUid ? JSON.parse(localStorage.getItem(`typing_suite_state_${guestUid}`) || "null") : null;
  const cards = [...document.querySelectorAll("[data-workspace-tab-card]")]
    .map((card) => card.getAttribute("data-workspace-tab-card"));

  return {
    cards,
    active: document.querySelector('[data-workspace-tab-active="true"]')?.getAttribute("data-workspace-tab-card") ?? null,
    resetVersion: snapshot?.workspaceTabCacheResetVersion ?? null,
    snapshotTabs: snapshot?.tabs?.map((tab) => tab.name) ?? [],
    snapshotContent: snapshot?.editorContent ?? null,
    snapshotExamStatus: snapshot?.examStatus ?? null,
    retainedPracticeTitle: snapshot?.practiceTitle ?? null,
    retainedPracticeText: snapshot?.practiceText ?? null,
    retainedScannerRecord: localStorage.getItem("ais_saved_scan_extracts"),
  };
});

await fs.writeFile("/tmp/workspace-tab-cache-reset-result.json", JSON.stringify({ result, consoleErrors }, null, 2));
await browser.close();

const checks = {
  oneCleanVisibleTab: result.cards.length === 1 && result.cards[0] === "1" && result.active === "1",
  oneCleanPersistedTab: result.snapshotTabs.length === 1 && result.snapshotTabs[0] === "New Document" && result.snapshotContent === "",
  examStateCleared: result.snapshotExamStatus === "idle",
  resetStamped: result.resetVersion === 1,
  practiceStateRetained: result.retainedPracticeTitle === "Retained Practice Title" && result.retainedPracticeText === "Practice data must remain untouched.",
  scannerStateRetained: result.retainedScannerRecord === JSON.stringify([{ id: "probe-scan", title: "Preserved scanner record" }]),
  consoleHealthy: consoleErrors.length === 0,
};

console.log(JSON.stringify({ checks, result, consoleErrors }, null, 2));
if (Object.values(checks).some((passed) => !passed)) process.exitCode = 1;
