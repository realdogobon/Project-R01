import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const puppeteer = require("/tmp/node_modules/puppeteer-core");

const previewUrl = process.env.PREVIEW_URL || "https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer";
const viewports = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "mobile", width: 375, height: 812 },
];

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const clickButtonWithText = async (page, text) => {
  await page.evaluate((expectedText) => {
    const button = [...document.querySelectorAll("button")].find(
      (candidate) => candidate.textContent?.trim() === expectedText,
    );
    if (!button) throw new Error(`Missing button: ${expectedText}`);
    button.click();
  }, text);
};

try {
  for (const viewport of viewports) {
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
    await page.waitForSelector('button[aria-label="Create Practice Text"]');

    assert.equal(
      await page.$$eval('button[aria-label="Create Practice Text"]', (buttons) => buttons.length),
      1,
      `${viewport.name}: expected exactly one standalone AI trigger`,
    );
    assert.equal(
      await page.$eval('button[aria-label="Create Practice Text"]', (button) =>
        !button.textContent?.includes("AI Generation") &&
        getComputedStyle(button).backgroundColor === "rgba(0, 0, 0, 0)",
      ),
      true,
      `${viewport.name}: AI trigger still appears as a text or filled button`,
    );

    await page.click('button[aria-label="Create Practice Text"]');
    await page.waitForSelector('button[aria-label="Close Practice Text"]');
    assert.equal(
      await page.$eval("body", (body) => body.textContent?.includes("Practice Text") ?? false),
      true,
      `${viewport.name}: Practice Text modal did not open`,
    );
    assert.equal(
      await page.$$eval("select", (selects) => selects.length),
      4,
      `${viewport.name}: expected Subject, Topic, Difficulty, and Length`,
    );
    assert.equal(
      await page.$eval("body", (body) => body.textContent?.includes("AI Text Generator") ?? false),
      false,
      `${viewport.name}: old AI Text Generator title remains`,
    );

    await page.select("select:nth-of-type(1)", "parliament");
    const topicLabels = await page.$$eval("select", (nodes) =>
      [...nodes[1].options].map((option) => option.textContent?.trim()),
    );
    assert.deepEqual(
      topicLabels,
      [
        "Parliamentary questions",
        "Bills and legislation",
        "Motions and resolutions",
        "Committees and reports",
        "Budget and finance",
        "Policy and public-interest debates",
        "Elections and representation",
        "Governance and public services",
        "Social welfare and inclusion",
        "International affairs",
        "Custom topic",
      ],
      `${viewport.name}: parliamentary topic taxonomy did not update correctly`,
    );
    assert.equal(
      await page.$eval("select:nth-of-type(1)", (select) => select.value),
      "parliament",
      `${viewport.name}: subject selection did not persist`,
    );

    await clickButtonWithText(page, "Generate");
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll("button")).some((button) => button.textContent?.trim() === "Generate" && !button.disabled),
      { timeout: 5000 },
    );
    assert.equal(
      await page.$eval("body", (body) => body.textContent?.includes("Choose a provider in AI Setup to generate practice text.") ?? false),
      false,
      `${viewport.name}: provider failure remained visible after silent-failure handling`,
    );
    assert.equal(
      await page.$eval("body", (body) => body.textContent?.includes("/api/generate-practice") ?? false),
      false,
      `${viewport.name}: obsolete generation endpoint surfaced to the user`,
    );

    await page.evaluate(() => {
      localStorage.setItem("royscript_ai_keys", JSON.stringify({ gemini: "probe-key" }));
    });
    await page.reload({ waitUntil: "networkidle2" });
    await page.click('button[title="Start Practice"]');
    await page.waitForSelector('button[aria-label="Create Practice Text"]');
    await page.click('button[aria-label="Create Practice Text"]');
    await page.waitForSelector('button[aria-label="Close Practice Text"]');
    await page.select("select:nth-of-type(1)", "parliament");
    await page.$$eval("select", (nodes) => {
      const topic = nodes[1];
      if (!topic) throw new Error("Missing Topic select");
      topic.value = "custom-topic";
      topic.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.click('input[placeholder="Enter a topic"]');
    await page.type('input[placeholder="Enter a topic"]', "Digital rights committee reporting");
    await page.$$eval("select", (nodes) => {
      const length = nodes[3];
      if (!length) throw new Error("Missing Length select");
      length.value = "custom";
      length.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.click('input[aria-label="Custom word count"]');
    await page.keyboard.down("Control");
    await page.keyboard.press("A");
    await page.keyboard.up("Control");
    await page.type('input[aria-label="Custom word count"]', "20");

    await page.click('input[aria-label="Custom word count"]');
    await page.keyboard.down("Control");
    await page.keyboard.press("A");
    await page.keyboard.up("Control");
    await page.type('input[aria-label="Custom word count"]', "10");
    await clickButtonWithText(page, "Generate");
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll("button")).some((button) => button.textContent?.trim() === "Generate" && !button.disabled),
      { timeout: 5000 },
    );
    assert.equal(
      await page.$eval("body", (body) => body.textContent?.includes("Custom length must be between 20 and 2000 words.") ?? false),
      false,
      `${viewport.name}: invalid custom-length validation remained visible`,
    );

    await page.click('input[aria-label="Custom word count"]');
    await page.keyboard.down("Control");
    await page.keyboard.press("A");
    await page.keyboard.up("Control");
    await page.type('input[aria-label="Custom word count"]', "20");

    await page.evaluate(() => {
      window.__practiceFetches = [];
      window.__practiceAttempts = {};
      const nativeFetch = window.fetch.bind(window);
      const normalizedCase = "Hello \u2014 world\u2026 \u201cquoted\u201d \u2605 one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen";
      const shortLargeCase = Array.from({ length: 59 }, (_, index) => `short${index}`).join(" ");
      const compliantLargeCase = Array.from({ length: 1000 }, (_, index) => `word${index}${index % 25 === 24 ? "." : ""}`).join(" ");
      window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        if (!url.includes("generativelanguage.googleapis.com")) return nativeFetch(input, init);
        const body = String(init?.body ?? "");
        const target = body.match(/Target length: (\d+) words/)?.[1] ?? "unknown";
        const attempt = (window.__practiceAttempts[target] ?? 0) + 1;
        window.__practiceAttempts[target] = attempt;
        window.__practiceFetches.push({ url, body });
        const text = target === "1236"
          ? (attempt === 1 ? shortLargeCase : compliantLargeCase)
          : (attempt === 1 ? "Hello \u2014 world\u2026 \u201cquoted\u201d \u2605" : normalizedCase);
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text }] } }],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      };
    });

    await clickButtonWithText(page, "Generate");
    try {
      await page.waitForFunction(
        () => document.querySelector("textarea")?.value === 'Hello - world... "quoted" one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen',
        { timeout: 2500 },
      );
    } catch (error) {
      console.log(JSON.stringify(await page.evaluate(() => ({
        textarea: document.querySelector("textarea")?.value ?? null,
        bodyText: document.body.textContent?.slice(-800) ?? "",
        attempts: window.__practiceAttempts ?? {},
        fetchCount: window.__practiceFetches?.length ?? 0,
      }))));
      throw error;
    }
    const request = await page.evaluate(() => window.__practiceFetches?.[0] ?? null);
    assert.ok(request, `${viewport.name}: mocked Gemini request was not made`);
    assert.equal(
      await page.evaluate(() => window.__practiceAttempts?.["20"] ?? 0),
      2,
      `${viewport.name}: short 20-word response did not trigger exactly one corrective retry`,
    );
    const requestBody = JSON.parse(request.body);
    const promptText = requestBody.contents?.[0]?.parts?.[0]?.text ?? "";
    assert.match(promptText, /Subject: Parliament and public policy/);
    assert.match(promptText, /Topic: Digital rights committee reporting/);
    assert.match(promptText, /Target length: 20 words/);
    assert.match(promptText, /standard English QWERTY keyboard/);
    assert.match(promptText, /Do not use em dashes, en dashes/);
    assert.equal(
      await page.$eval("textarea", (textarea) => /[^\x09\x0A\x0D\x20-\x7E]/.test(textarea.value)),
      false,
      `${viewport.name}: normalized generated text still contains non-ASCII characters`,
    );

    await page.click('button[aria-label="Create Practice Text"]');
    await page.waitForSelector('button[aria-label="Close Practice Text"]');
    await page.$$eval("select", (nodes) => {
      const length = nodes[3];
      if (!length) throw new Error("Missing Length select for large custom test");
      length.value = "custom";
      length.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.click('input[aria-label="Custom word count"]');
    await page.keyboard.down("Control");
    await page.keyboard.press("A");
    await page.keyboard.up("Control");
    await page.type('input[aria-label="Custom word count"]', "1236");
    await clickButtonWithText(page, "Generate");
    await page.waitForFunction(
      () => (document.querySelector("textarea")?.value.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)?.length ?? 0) >= 988,
      { timeout: 5000 },
    );
    const largeResult = await page.$eval("textarea", (textarea) => textarea.value);
    const largeWordCount = largeResult.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)?.length ?? 0;
    assert.ok(largeWordCount >= 988 && largeWordCount <= 1385, `${viewport.name}: 1,236-word retry produced ${largeWordCount} words`);
    assert.equal(
      await page.evaluate(() => window.__practiceAttempts?.["1236"] ?? 0),
      3,
      `${viewport.name}: 59-word response for the 1,236-word request did not trigger replacement plus continuation enforcement`,
    );

    const unexpectedErrors = errors.filter(
      (error) =>
        !error.includes("Choose a provider in AI Setup to generate practice text.") &&
        !error.includes("Custom length must be between 20 and 2000 words."),
    );
    assert.deepEqual(unexpectedErrors, [], `${viewport.name}: application errors detected: ${unexpectedErrors.join(" | ")}`);
    console.log(
      `${viewport.name} Practice AI probe passed${ignoredWarnings.length ? ` (${ignoredWarnings.length} known preview-resource warning ignored)` : ""}.`,
    );
    await page.evaluate(() => localStorage.removeItem("royscript_ai_keys"));
    await page.close();
  }
} finally {
  await browser.close();
}
