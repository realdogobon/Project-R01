import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const puppeteer = require("/tmp/node_modules/puppeteer-core");

const previewUrl = process.env.PREVIEW_URL || "https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer";
const viewports = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "mobile", width: 375, height: 812 },
];

const countWords = (value) => value.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)?.length ?? 0;

const readSelectOptions = async (page, index) =>
  page.$$eval("select", (nodes, selectIndex) =>
    [...(nodes[selectIndex]?.options ?? [])]
      .filter((option) => !option.disabled && option.value)
      .map((option) => ({ value: option.value, label: option.textContent?.trim() ?? "" })),
  index);

const selectValue = async (page, index, value, optionSignature = []) => {
  const matched = await page.evaluate(({ selectIndex, nextValue, requiredOptions }) => {
    const selects = [...document.querySelectorAll("select")];
    const indexed = selects[selectIndex];
    const matchesSignature = (candidate) => requiredOptions.every((required) =>
      [...candidate.options].some((option) => option.value === required),
    );
    const select = indexed && [...indexed.options].some((candidate) => candidate.value === nextValue) && matchesSignature(indexed)
      ? indexed
      : selects.find((candidate) => [...candidate.options].some((option) => option.value === nextValue) && matchesSignature(candidate));
    if (!select) return false;
    const option = [...select.options].find((candidate) => candidate.value === nextValue);
    if (!option) return false;
    select.value = nextValue;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }, { selectIndex: index, nextValue: value, requiredOptions: optionSignature });
  assert.equal(matched, true, `Missing option ${value} at select index ${index}`);
  await new Promise((resolve) => setTimeout(resolve, 40));
};

const clearAndType = async (page, selector, value) => {
  await page.click(selector);
  await page.keyboard.down("Control");
  await page.keyboard.press("A");
  await page.keyboard.up("Control");
  await page.type(selector, value);
};

const openGenerator = async (page) => {
  await page.waitForSelector('button[aria-label="Create Practice Text"]');
  await page.click('button[aria-label="Create Practice Text"]');
  await page.waitForSelector('button[aria-label="Close Practice Text"]');
};

const installMockProvider = async (page) => {
  await page.evaluate(() => {
    localStorage.setItem("royscript_ai_keys", JSON.stringify({ gemini: "matrix-only-probe-key" }));
    window.__practiceMatrixRequests = [];
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input.url;
      if (!url.includes("generativelanguage.googleapis.com")) return nativeFetch(input, init);
      const body = String(init?.body ?? "");
      const target = Number(body.match(/Target length: (\d+) words/)?.[1] ?? 50);
      const words = Array.from({ length: target }, (_, index) => `matrix${index + 1}${index % 25 === 24 ? "." : ""}`).join(" ");
      window.__practiceMatrixRequests.push({ body, target });
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: words }] } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };
  });
};

const generateAndMeasure = async (page, cases, label) => {
  const beforeRequests = await page.evaluate(() => window.__practiceMatrixRequests?.length ?? 0);
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === "Generate");
    if (!button) throw new Error("Missing Generate button");
    button.click();
  });
  await page.waitForFunction(
    (count) => (window.__practiceMatrixRequests?.length ?? 0) > count,
    { timeout: 5000 },
    beforeRequests,
  );
  await page.waitForFunction(
    () => !document.querySelector('button[aria-label="Close Practice Text"]'),
    { timeout: 5000 },
  );
  const result = await page.evaluate(() => ({
    text: document.querySelector("textarea")?.value ?? "",
    request: window.__practiceMatrixRequests?.at(-1) ?? null,
    ui: {
      selects: [...document.querySelectorAll("select")].map((select) => select.value),
      customWords: document.querySelector('input[aria-label="Custom word count"]')?.value ?? null,
    },
  }));
  assert.ok(result.request, `${label}: provider request was not captured`);
  const actualWords = countWords(result.text);
  assert.equal(actualWords, result.request.target, `${label}: expected ${result.request.target} words, received ${actualWords}; UI=${JSON.stringify(result.ui)}`);
  assert.equal(/[^\x09\x0A\x0D\x00-\x7F]/.test(result.text), false, `${label}: output contains non-ASCII characters`);
  assert.equal(/ {2,}/.test(result.text), false, `${label}: output contains repeated horizontal whitespace`);
  cases.push({ label, target: result.request.target, actualWords, prompt: result.request.body });
};

const configureSubjectTopic = async (page, subject, topic) => {
  await selectValue(page, 0, subject);
  if (topic) await selectValue(page, 1, topic);
};

const configureLength = async (page, lengthValue, customWords = null) => {
  await selectValue(page, 3, lengthValue, ["short", "medium", "long", "custom"]);
  if (lengthValue === "custom") {
    assert.ok(customWords, "Custom length requires a word count");
    await page.waitForSelector('input[aria-label="Custom word count"]', { visible: true, timeout: 1500 });
    await clearAndType(page, 'input[aria-label="Custom word count"]', String(customWords));
    await page.waitForFunction(
      (expected) => document.querySelector('input[aria-label="Custom word count"]')?.value === expected,
      { timeout: 1500 },
      String(customWords),
    );
  }
};

const runViewport = async (browser, viewport) => {
  const page = await browser.newPage();
  await page.setViewport({ width: viewport.width, height: viewport.height });
  const errors = [];
  const ignoredWarnings = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (message.text().includes("net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin")) {
      ignoredWarnings.push(message.text());
      return;
    }
    errors.push(message.text());
  });

  await page.goto(`${previewUrl}/?from_webdev=1`, { waitUntil: "networkidle2" });
  await page.click('button[title="Start Practice"]');
  await openGenerator(page);
  await installMockProvider(page);

  const subjects = await readSelectOptions(page, 0);
  const initialTopics = await readSelectOptions(page, 1);
  const lengthOptions = await readSelectOptions(page, 3);
  const builtInLengths = lengthOptions.filter((option) => option.value !== "custom");
  assert.ok(subjects.length >= 10, `${viewport.name}: taxonomy unexpectedly has only ${subjects.length} subjects`);
  assert.ok(initialTopics.length >= 2, `${viewport.name}: taxonomy unexpectedly has only ${initialTopics.length} topics`);
  assert.ok(builtInLengths.length >= 3, `${viewport.name}: expected at least three built-in length tiers`);

  const cases = [];
  const subjectSummary = [];
  for (const [subjectIndex, subject] of subjects.entries()) {
    if (subjectIndex > 0) await openGenerator(page);
    await configureSubjectTopic(page, subject.value, "");
    const topics = await readSelectOptions(page, 1);
    const builtInTopics = topics.filter((topic) => topic.value !== "custom-topic");
    assert.ok(builtInTopics.length >= 1, `${viewport.name}/${subject.value}: no built-in topics found`);
    subjectSummary.push({ subject: subject.value, topicCount: builtInTopics.length });

    for (const topic of builtInTopics) {
      await openGenerator(page);
      await configureSubjectTopic(page, subject.value, topic.value);
      await configureLength(page, builtInLengths[0].value);
      await generateAndMeasure(page, cases, `${viewport.name}/${subject.value}/${topic.value}/${builtInLengths[0].value}`);
    }

    for (const length of builtInLengths.slice(1)) {
      await openGenerator(page);
      await configureSubjectTopic(page, subject.value, builtInTopics[0].value);
      await configureLength(page, length.value);
      await generateAndMeasure(page, cases, `${viewport.name}/${subject.value}/${builtInTopics[0].value}/${length.value}`);
    }

    await openGenerator(page);
    await configureSubjectTopic(page, subject.value, "custom-topic");
    await clearAndType(page, 'input[placeholder="Enter a topic"]', `${subject.label} practical writing exercise`);
    await configureLength(page, "custom", 20);
    await generateAndMeasure(page, cases, `${viewport.name}/${subject.value}/custom-topic/custom-20`);
  }

  for (const subjectValue of subjects.slice(0, 3).map((subject) => subject.value)) {
    await openGenerator(page);
    await configureSubjectTopic(page, subjectValue, "custom-topic");
    await clearAndType(page, 'input[placeholder="Enter a topic"]', `${subjectValue} long-form analysis`);
    await configureLength(page, "custom", 1236);
    await generateAndMeasure(page, cases, `${viewport.name}/${subjectValue}/custom-topic/custom-1236`);
  }

  const promptProblems = await page.evaluate(() =>
    (window.__practiceMatrixRequests ?? []).flatMap(({ body }) => {
      const prompt = JSON.parse(body).contents?.[0]?.parts?.[0]?.text ?? "";
      const problems = [];
      if (!prompt.includes("standard English QWERTY keyboard")) problems.push("missing keyboard contract");
      if (!prompt.includes("Do not use em dashes, en dashes")) problems.push("missing punctuation contract");
      if (!prompt.includes("Target length:")) problems.push("missing length target");
      return problems;
    }),
  );
  assert.deepEqual(promptProblems, [], `${viewport.name}: prompt contract gaps: ${promptProblems.join(" | ")}`);

  const unexpectedErrors = errors.filter(
    (error) =>
      !error.includes("Choose a provider in AI Setup to generate practice text.") &&
      !error.includes("Custom length must be between 20 and 2000 words."),
  );
  assert.deepEqual(unexpectedErrors, [], `${viewport.name}: application errors detected: ${unexpectedErrors.join(" | ")}`);
  assert.ok(cases.length >= subjects.length * 4, `${viewport.name}: matrix produced too few cases (${cases.length})`);
  console.log(JSON.stringify({
    viewport: viewport.name,
    subjects: subjects.length,
    topicCases: subjectSummary.reduce((sum, item) => sum + item.topicCount, 0),
    cases: cases.length,
    requests: await page.evaluate(() => window.__practiceMatrixRequests?.length ?? 0),
    ignoredWarnings: ignoredWarnings.length,
  }));
  await page.evaluate(() => localStorage.removeItem("royscript_ai_keys"));
  await page.close();
};

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  for (const viewport of viewports) await runViewport(browser, viewport);
  console.log("Practice AI heavyweight matrix passed.");
} finally {
  await browser.close();
}
