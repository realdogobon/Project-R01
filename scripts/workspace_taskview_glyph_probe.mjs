import fs from "node:fs/promises";
import puppeteer from "puppeteer-core";

const previewUrl = process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const browser = await puppeteer.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

await page.goto(previewUrl, { waitUntil: "networkidle2" });
await page.waitForSelector("[data-workspace-tab-overview-trigger]", { timeout: 10_000 });

const trigger = await page.$("[data-workspace-tab-overview-trigger]");
const triggerBox = await trigger.boundingBox();
if (!triggerBox) throw new Error("Task View trigger did not have a visible box");

await page.screenshot({
  path: "/tmp/workspace-taskview-trigger.png",
  clip: {
    x: Math.max(0, triggerBox.x - 26),
    y: Math.max(0, triggerBox.y - 16),
    width: triggerBox.width + 52,
    height: triggerBox.height + 32,
  },
});

const before = await page.$eval("[data-openeditor-taskview-artwork]", (svg) => ({
  viewBox: svg.getAttribute("viewBox"),
  width: getComputedStyle(svg).width,
  height: getComputedStyle(svg).height,
  topFrame: Boolean(svg.querySelector("[data-taskview-top-frame]")),
  middleFrame: Boolean(svg.querySelector("[data-taskview-middle-frame]")),
  bottomFrame: Boolean(svg.querySelector("[data-taskview-bottom-frame]")),
  topRail: Boolean(svg.querySelector("[data-taskview-top-rail]")),
  gradientTile: Boolean(svg.querySelector("[data-taskview-gradient-tile]")),
  bottomRail: Boolean(svg.querySelector("[data-taskview-bottom-rail]")),
  frameGradient: Boolean(svg.querySelector("#taskview-frame-gradient")),
  tileGradient: Boolean(svg.querySelector("#taskview-tile-gradient")),
}));

const fixedControlSelectors = [
  "[data-workspace-tab-overview-trigger]",
  "[data-workspace-new-tab-trigger]",
];
const stationaryHover = [];
for (const selector of fixedControlSelectors) {
  const control = await page.$(selector);
  const initialBox = await control.boundingBox();
  if (!initialBox) throw new Error(`${selector} did not have a visible box`);
  await control.hover();
  await new Promise((resolve) => setTimeout(resolve, 180));
  const hovered = await page.$eval(selector, (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      transform: style.transform,
    };
  });
  stationaryHover.push({
    selector,
    stable:
      Math.abs(initialBox.x - hovered.left) < 0.1 &&
      Math.abs(initialBox.y - hovered.top) < 0.1 &&
      Math.abs(initialBox.width - hovered.width) < 0.1 &&
      Math.abs(initialBox.height - hovered.height) < 0.1 &&
      hovered.transform === "none",
  });
}

await page.click('[title="Toggle theme"]');
await page.waitForFunction(() => document.documentElement.classList.contains("dark"), { timeout: 10_000 });
const darkGlyph = await page.$eval("[data-openeditor-taskview-artwork]", (svg) => ({
  width: getComputedStyle(svg).width,
  height: getComputedStyle(svg).height,
  visible: getComputedStyle(svg).visibility === "visible" && getComputedStyle(svg).display !== "none",
}));
await page.screenshot({ path: "/tmp/workspace-taskview-dark.png" });

await trigger.click();
await page.waitForSelector("[data-workspace-tab-overview]", { visible: true, timeout: 10_000 });
const overview = await page.$("[data-workspace-tab-overview]");
const overviewBox = await overview.boundingBox();
if (!overviewBox) throw new Error("Task View overview did not open visibly");
await page.screenshot({ path: "/tmp/workspace-taskview-open.png" });

const result = { before, stationaryHover, darkGlyph, overview: { width: overviewBox.width, height: overviewBox.height }, consoleErrors };
await fs.writeFile("/tmp/workspace-taskview-glyph-result.json", JSON.stringify(result, null, 2));
await browser.close();

const checks = {
  literalCanvas: before.viewBox === "0 0 1200 1200" && before.width === "20px" && before.height === "20px",
  threeFrames: before.topFrame && before.middleFrame && before.bottomFrame,
  rightRailAndTile: before.topRail && before.gradientTile && before.bottomRail,
  dualGradients: before.frameGradient && before.tileGradient,
  darkModeLegible: darkGlyph.width === "20px" && darkGlyph.height === "20px" && darkGlyph.visible,
  fixedControlsDoNotMoveOnHover: stationaryHover.every((entry) => entry.stable),
  triggerOpensOverview: overviewBox.width > 400 && overviewBox.height > 100,
  consoleHealthy: consoleErrors.length === 0,
};

console.log(JSON.stringify({ checks, result }, null, 2));
if (Object.values(checks).some((passed) => !passed)) process.exitCode = 1;
