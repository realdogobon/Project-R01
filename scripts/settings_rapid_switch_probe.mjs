import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const puppeteer = require("/tmp/node_modules/puppeteer-core");

const previewUrl =
  process.env.PREVIEW_URL ||
  "https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer";
const reportPath =
  process.env.REPORT_PATH || "/home/ubuntu/settings-rapid-switch-report.json";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const viewTargets = [
  { category: "appearance", nested: ["Themes", "Font"] },
  {
    category: "keyboard",
    nested: ["Choose Clicky Sounds"],
    deeper: ["Keyboard Sounds", "Error Sounds"],
  },
  { category: "practice", nested: [] },
  { category: "ambient", nested: ["Atmosphere"] },
  { category: "performance", nested: [] },
  { category: "scanner", nested: [] },
];

function summarizeSamples(samples) {
  const allMotionChildren = samples.flatMap((sample) => sample.motionChildren);
  const maxVisibleChildren = Math.max(
    0,
    ...samples.map((sample) => sample.motionChildren.length),
  );
  const verticalPositions = allMotionChildren
    .map((child) => child.top)
    .filter((top) => Number.isFinite(top));
  const verticalRange = verticalPositions.length
    ? Math.max(...verticalPositions) - Math.min(...verticalPositions)
    : 0;
  const maxOpacity = allMotionChildren.length
    ? Math.max(...allMotionChildren.map((child) => child.opacity))
    : 0;
  return { maxVisibleChildren, verticalRange, maxOpacity };
}

async function sample(page, label) {
  return page.evaluate((sampleLabel) => {
    const dialog = document.querySelector('[data-settings-panel="true"] [role="dialog"]');
    const frame = dialog?.querySelector("div.custom-scrollbar");
    const closeButton = dialog?.querySelector('button[aria-label="Close settings"]');
    const titleRow = closeButton?.parentElement;
    const title = titleRow
      ? [...titleRow.querySelectorAll("span")]
          .map((span) => span.textContent?.trim())
          .filter(Boolean)
          .at(-1) || ""
      : "";
    const activeCategories = [
      ...document.querySelectorAll('[data-settings-category][aria-current="page"]'),
    ].map((button) => button.getAttribute("data-settings-category"));
    const frameRect = frame?.getBoundingClientRect();
    const motionChildren = frame
      ? [...frame.children]
          .map((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
              text: element.textContent?.replace(/\s+/g, " ").trim().slice(0, 70) || "",
              top: Number(rect.top.toFixed(3)),
              bottom: Number(rect.bottom.toFixed(3)),
              height: Number(rect.height.toFixed(3)),
              opacity: Number(style.opacity),
              transform: style.transform,
              position: style.position,
              display: style.display,
            };
          })
          .filter(
            (child) => child.display !== "none" && child.height > 0 && child.opacity > 0.001,
          )
      : [];
    return {
      label: sampleLabel,
      title,
      activeCategories,
      frame: frameRect
        ? {
            top: Number(frameRect.top.toFixed(3)),
            bottom: Number(frameRect.bottom.toFixed(3)),
            height: Number(frameRect.height.toFixed(3)),
          }
        : null,
      motionChildren,
      scrollTop: frame?.scrollTop ?? null,
      timestamp: performance.now(),
    };
  }, label);
}

async function clickCategory(page, id) {
  await page.evaluate((categoryId) => {
    const button = document.querySelector(
      `[data-settings-category="${categoryId}"]`,
    );
    if (!button) throw new Error(`Missing category: ${categoryId}`);
    button.click();
  }, id);
}

async function waitForCategory(page, id, timeout = 180) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const active = await page.evaluate(() =>
      document
        .querySelector('[data-settings-category][aria-current="page"]')
        ?.getAttribute("data-settings-category"),
    );
    if (active === id) return;
    await delay(4);
  }
  throw new Error(`Category did not settle: ${id}`);
}

async function clickNested(page, label) {
  const clicked = await page.evaluate((nestedLabel) => {
    const candidates = [...document.querySelectorAll('[data-settings-panel] button')];
    const button = candidates.find((candidate) => {
      const firstSpan = candidate.querySelector("span");
      return firstSpan?.textContent?.trim() === nestedLabel;
    });
    if (!button) return false;
    button.click();
    return true;
  }, label);
  if (!clicked) throw new Error(`Missing nested Settings row: ${label}`);
}

async function waitForNested(page, label, timeout = 180) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const present = await page.evaluate((nestedLabel) =>
      [...document.querySelectorAll('[data-settings-panel] button')].some(
        (candidate) =>
          candidate.querySelector("span")?.textContent?.trim() === nestedLabel,
      ),
    label);
    if (present) return;
    await delay(4);
  }
  throw new Error(`Nested Settings row did not settle: ${label}`);
}

async function ensureToggleForNested(page, toggleLabel, nestedLabel) {
  const hasNested = await page.evaluate((expectedLabel) => {
    return [...document.querySelectorAll('[data-settings-panel] button')].some(
      (candidate) =>
        candidate.querySelector("span")?.textContent?.trim() === expectedLabel,
    );
  }, nestedLabel);
  if (hasNested) return;

  const toggled = await page.evaluate((expectedLabel) => {
    const button = [...document.querySelectorAll('[data-settings-panel] button')].find(
      (candidate) =>
        candidate.querySelector("span")?.textContent?.trim() === expectedLabel,
    );
    if (!button) return false;
    button.click();
    return true;
  }, toggleLabel);
  if (!toggled) throw new Error(`Missing conditional Settings toggle: ${toggleLabel}`);
  await delay(80);
}

async function clickBack(page) {
  const clicked = await page.evaluate(() => {
    const closeButton = document.querySelector(
      '[data-settings-panel="true"] button[aria-label="Close settings"]',
    );
    const titleRow = closeButton?.parentElement;
    const backButton = [...(titleRow?.querySelectorAll("button") || [])].find(
      (candidate) => {
        if (candidate === closeButton) return false;
        const rect = candidate.getBoundingClientRect();
        const style = getComputedStyle(candidate);
        return rect.width > 0 && rect.height > 0 && Number(style.opacity) > 0.05;
      },
    );
    if (!backButton) return false;
    backButton.click();
    return true;
  });
  return clicked;
}

async function waitForBack(page, timeout = 180) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const present = await page.evaluate(() => {
      const closeButton = document.querySelector(
        '[data-settings-panel="true"] button[aria-label="Close settings"]',
      );
      const titleRow = closeButton?.parentElement;
      return [...(titleRow?.querySelectorAll("button") || [])].some(
        (candidate) => {
          if (candidate === closeButton) return false;
          const rect = candidate.getBoundingClientRect();
          const style = getComputedStyle(candidate);
          return rect.width > 0 && rect.height > 0 && Number(style.opacity) > 0.05;
        },
      );
    });
    if (present) return Date.now() - started;
    await delay(4);
  }
  throw new Error("Back button did not settle");
}

async function runViewport(viewport) {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: viewport.width, height: viewport.height });

  const errors = [];
  const ignoredWarnings = [];
  const isKnownPreviewResourceWarning = (text) =>
    text.includes("net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin");
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (isKnownPreviewResourceWarning(message.text())) {
      ignoredWarnings.push(message.text());
      return;
    }
    errors.push(message.text());
  });

  const result = {
    viewport,
    errors,
    ignoredWarnings,
    categoryBursts: [],
    nestedTransitions: [],
    deepNestedTransitions: [],
    nestedBursts: [],
    interactionIssues: [],
    final: null,
  };

  try {
    await page.goto(`${previewUrl}/?from_webdev=1`, { waitUntil: "networkidle2" });
    await page.click('button[title="Settings"]');
    await page.waitForSelector('[data-settings-panel="true"] [role="dialog"]');
    await delay(100);

    const initial = await sample(page, "initial");

    // Rapid category switching: ten complete sweeps with deliberately short gaps.
    for (let sweep = 0; sweep < 10; sweep += 1) {
      const samples = [];
      for (const target of viewTargets) {
        await clickCategory(page, target.category);
        await waitForCategory(page, target.category);
        samples.push(await sample(page, `sweep-${sweep}-${target.category}-immediate`));
        await delay(18);
      }
      await delay(40);
      samples.push(await sample(page, `sweep-${sweep}-post-40ms`));
      await delay(100);
      samples.push(await sample(page, `sweep-${sweep}-post-140ms`));
      await delay(180);
      samples.push(await sample(page, `sweep-${sweep}-settled`));
      result.categoryBursts.push({
        sweep,
        samples,
        summary: summarizeSamples(samples),
      });
    }

    // Every submenu opened and closed at a normal pace, with geometry sampled during the transition.
    for (const target of viewTargets) {
      await clickCategory(page, target.category);
      await waitForCategory(page, target.category);
      await delay(220);
      if (target.category === "keyboard") {
        await ensureToggleForNested(page, "Typing Sounds", "Choose Clicky Sounds");
      }
      if (target.category === "ambient") {
        await ensureToggleForNested(page, "Soundscape", "Atmosphere");
      }
      for (const nested of target.nested) {
        const samples = [];
        await waitForNested(page, nested);
        await clickNested(page, nested);
        samples.push(await sample(page, `${target.category}-${nested}-immediate`));
        await delay(35);
        samples.push(await sample(page, `${target.category}-${nested}-35ms`));
        await delay(100);
        samples.push(await sample(page, `${target.category}-${nested}-135ms`));
        await delay(180);
        samples.push(await sample(page, `${target.category}-${nested}-settled`));
        result.nestedTransitions.push({
          category: target.category,
          nested,
          samples,
          summary: summarizeSamples(samples),
        });

        if (target.deeper?.length) {
          for (const deeper of target.deeper) {
            const deeperSamples = [];
            await clickNested(page, deeper);
            deeperSamples.push(await sample(page, `${target.category}-${deeper}-immediate`));
            await delay(35);
            deeperSamples.push(await sample(page, `${target.category}-${deeper}-35ms`));
            await delay(100);
            deeperSamples.push(await sample(page, `${target.category}-${deeper}-135ms`));
            await delay(180);
            deeperSamples.push(await sample(page, `${target.category}-${deeper}-settled`));
            result.deepNestedTransitions.push({
              category: target.category,
              parent: nested,
              nested: deeper,
              samples: deeperSamples,
              summary: summarizeSamples(deeperSamples),
            });
            await waitForBack(page);
            if (!(await clickBack(page))) {
              result.interactionIssues.push({
                kind: "missing-back-button-during-deep-nested-transition",
                category: target.category,
                parent: nested,
                nested: deeper,
              });
            }
            await delay(180);
          }
        }
        await clickBack(page);
        await delay(180);
      }
    }

    // Nested rapid switching: repeatedly open, back out, and change category without waiting for exit.
    const nestedSequence = [
      ["appearance", "Themes"],
      ["appearance", "Font"],
      ["keyboard", "Choose Clicky Sounds"],
      ["ambient", "Atmosphere"],
      ["appearance", "Themes"],
      ["keyboard", "Choose Clicky Sounds"],
      ["ambient", "Atmosphere"],
      ["appearance", "Font"],
    ];
    for (let cycle = 0; cycle < 8; cycle += 1) {
      const samples = [];
      for (const [category, nested] of nestedSequence) {
        await clickCategory(page, category);
        await delay(12);
        await waitForCategory(page, category);
        if (category === "keyboard") {
          await ensureToggleForNested(page, "Typing Sounds", "Choose Clicky Sounds");
        }
        if (category === "ambient") {
          await ensureToggleForNested(page, "Soundscape", "Atmosphere");
        }
        await waitForNested(page, nested);
        await clickNested(page, nested);
        samples.push(await sample(page, `nested-cycle-${cycle}-${category}-${nested}-open`));
        await delay(12);
        await waitForBack(page);
        const returnedToMain = await clickBack(page);
        if (!returnedToMain) {
          result.interactionIssues.push({
            kind: "missing-back-button-during-nested-burst",
            cycle,
            category,
            nested,
          });
        }
        await delay(12);
      }
      await delay(60);
      samples.push(await sample(page, `nested-cycle-${cycle}-post-60ms`));
      await delay(260);
      samples.push(await sample(page, `nested-cycle-${cycle}-settled`));
      result.nestedBursts.push({
        cycle,
        samples,
        summary: summarizeSamples(samples),
      });
    }

    result.initial = initial;
    result.final = await sample(page, "final");
    await page.screenshot({
      path: `/home/ubuntu/settings-rapid-switch-${viewport.name}.png`,
      fullPage: false,
    });
  } catch (error) {
    result.testError = String(error?.stack || error);
  } finally {
    await page.close();
    await browser.close();
  }

  return result;
}

const reports = [];
for (const viewport of [
  { name: "desktop", width: 1280, height: 720 },
  { name: "mobile", width: 375, height: 812 },
]) {
  reports.push(await runViewport(viewport));
}

const output = {
  previewUrl,
  generatedAt: new Date().toISOString(),
  reports,
};
await writeFile(reportPath, JSON.stringify(output, null, 2));

const errors = reports.flatMap((report) => [
  ...(report.errors || []).map((error) => `${report.viewport.name}: ${error}`),
  ...(report.testError ? [`${report.viewport.name}: ${report.testError}`] : []),
]);
const maxCategoryChildren = Math.max(
  0,
  ...reports.flatMap((report) =>
    report.categoryBursts.map((burst) => burst.summary.maxVisibleChildren),
  ),
);
const maxNestedChildren = Math.max(
  0,
  ...reports.flatMap((report) =>
    report.nestedBursts.map((burst) => burst.summary.maxVisibleChildren),
  ),
);

if (errors.length > 0) {
  console.error(JSON.stringify({ passed: false, reportPath, errors }, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        passed: true,
        reportPath,
        viewports: reports.map((report) => report.viewport),
        categorySweepsPerViewport: 10,
        nestedBurstsPerViewport: 8,
        maxVisibleMotionChildrenDuringCategoryBursts: maxCategoryChildren,
        maxVisibleMotionChildrenDuringNestedBursts: maxNestedChildren,
        browserErrors: 0,
      },
      null,
      2,
    ),
  );
}
