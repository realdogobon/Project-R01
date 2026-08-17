import { mkdirSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const baseUrl = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const evidenceDir = process.argv[2] || "/tmp/workspace-tab-seam";
const reportPath = `${evidenceDir}/report.json`;

mkdirSync(evidenceDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--window-size=1280,720"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

const browserLogs = [];
page.on("console", (message) => browserLogs.push(message.text()));
await page.goto(`${baseUrl}/`, { waitUntil: "networkidle0", timeout: 60_000 });
await page.waitForSelector('span[title="Double click to rename"]', { timeout: 10_000 });

const readGeometry = () => page.evaluate(() => {
  const label = document.querySelector('span[title="Double click to rename"]');
  const tab = label?.closest("div.group");
  const tabStripContent = tab?.parentElement;
  const tabStrip = tabStripContent?.parentElement;
  if (!(label instanceof HTMLElement) || !(tab instanceof HTMLElement) || !(tabStripContent instanceof HTMLElement) || !(tabStrip instanceof HTMLElement)) {
    throw new Error("Could not resolve active tab, tab-strip content, and tab-strip elements");
  }

  const readBox = (element) => {
    const box = element.getBoundingClientRect();
    const computed = getComputedStyle(element);
    return {
      top: Number(box.top.toFixed(2)),
      bottom: Number(box.bottom.toFixed(2)),
      height: Number(box.height.toFixed(2)),
      paddingTop: computed.paddingTop,
      paddingBottom: computed.paddingBottom,
      marginTop: computed.marginTop,
      marginBottom: computed.marginBottom,
      borderTopWidth: computed.borderTopWidth,
      borderBottomWidth: computed.borderBottomWidth,
      boxSizing: computed.boxSizing,
      backgroundColor: computed.backgroundColor,
    };
  };

  const tabBox = readBox(tab);
  const contentBox = readBox(tabStripContent);
  const stripBox = readBox(tabStrip);
  return {
    tab: tabBox,
    tabStripContent: contentBox,
    tabStrip: stripBox,
    emptySeamPx: Number((tabBox.top - stripBox.top).toFixed(2)),
    tabBottomMatchesStripBottom: Math.abs(tabBox.bottom - stripBox.bottom) < 0.1,
  };
});

const geometry = await readGeometry();
await page.screenshot({ path: `${evidenceDir}/light.png`, clip: { x: 0, y: 0, width: 720, height: 120 } });
await page.evaluate(() => document.documentElement.classList.add("dark"));
const darkGeometry = await readGeometry();
await page.screenshot({ path: `${evidenceDir}/dark.png`, clip: { x: 0, y: 0, width: 720, height: 120 } });

writeFileSync(reportPath, JSON.stringify({ baseUrl, geometry, darkGeometry, browserLogs }, null, 2));
console.log(JSON.stringify({ geometry, darkGeometry, browserLogCount: browserLogs.length }, null, 2));

await browser.close();
if (geometry.emptySeamPx !== 0 || darkGeometry.emptySeamPx !== 0 || !geometry.tabBottomMatchesStripBottom || !darkGeometry.tabBottomMatchesStripBottom) {
  process.exitCode = 1;
}
