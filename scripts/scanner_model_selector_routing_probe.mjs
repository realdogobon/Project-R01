import fs from "node:fs";
import puppeteer from "puppeteer-core";

const url = process.argv[2] || process.env.PREVIEW_URL || "http://127.0.0.1:3000";
const fixturePath = process.argv[3] || "/tmp/royscript-scanner-fixture.png";
const outputPath = process.argv[4] || "/tmp/scanner_model_selector_routing_probe.json";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const providers = {
  gemini: { key: "mock-gemini-key", host: "generativelanguage.googleapis.com" },
  groq: { key: "mock-groq-key", host: "api.groq.com" },
  openai: { key: "mock-openai-key", host: "api.openai.com" },
};

const models = [
  ["gemini-3.7-flash", "gemini-3.7-flash", "gemini"],
  ["gemini-2.5-flash", "gemini-2.5-flash", "gemini"],
  ["gemini-2.5-flash-lite", "gemini-2.5-flash-lite", "gemini"],
  ["gemini-2.5-pro", "gemini-2.5-pro", "gemini"],
  ["gemini-2.0-flash-exp", "gemini-2.0-flash", "gemini"],
  ["gemini-1.5-flash", "gemini-1.5-flash", "gemini"],
  ["groq-llama-3.3-70b", "llama-3.3-70b-versatile", "groq"],
  ["groq-llama-3.1-8b", "llama-3.1-8b-instant", "groq"],
  ["groq-mixtral-8x7b", "llama-3.2-11b-vision-preview", "groq"],
  ["groq-gemma2-9b", "llama-3.2-11b-vision-preview", "groq"],
  ["openai-gpt-4o", "gpt-4o", "openai"],
  ["openai-gpt-4o-mini", "gpt-4o-mini", "openai"],
  ["openai-gpt-4.1", "gpt-4.1", "openai"],
  ["openai-gpt-4.1-mini", "gpt-4.1-mini", "openai"],
  ["openai-gpt-4.1-nano", "gpt-4.1-nano", "openai"],
].map(([id, apiModel, provider]) => ({ id, apiModel, provider }));

if (!fs.existsSync(fixturePath)) {
  throw new Error(`Scanner fixture not found: ${fixturePath}`);
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  defaultViewport: { width: 1280, height: 800 },
});

const report = {
  url,
  fixturePath,
  generatedAt: new Date().toISOString(),
  availability: [],
  routes: [],
  errors: [],
};

const runPage = async (keys, label, work) => {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  await page.evaluateOnNewDocument((initialKeys) => {
    window.localStorage.setItem("royscript_ai_keys", JSON.stringify(initialKeys));
  }, keys);
  try {
    return await work(page, errors);
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  } finally {
    report.errors.push(...errors.map((error) => `${label}: ${error}`));
    await context.close();
  }
};

const openScanner = async (page, suffix) => {
  await page.goto(`${url.replace(/\/$/, "")}/?scannerModelSelectorProbe=${suffix}`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await page.waitForSelector('[title="AI Scanner"]', { timeout: 20000 });
  await page.click('[title="AI Scanner"]');
  await page.waitForSelector("[data-scanner-model-selector]", { timeout: 20000 });
};

const readAvailability = (page) => page.evaluate(() => {
  const select = document.querySelector("[data-scanner-model-selector]");
  const groups = [...select.querySelectorAll("optgroup")].map((group) => ({
    label: group.label,
    disabled: group.disabled,
    optionCount: group.querySelectorAll("option").length,
  }));
  return {
    selectDisabled: select.disabled,
    selectOpacity: getComputedStyle(select).opacity,
    groups,
  };
});

try {
  const availabilityCases = [
    { label: "no-keys", keys: {}, expected: { selectDisabled: true, disabledGroups: ["Google Gemini", "Groq", "OpenAI"] } },
    { label: "gemini-only", keys: { gemini: providers.gemini.key }, expected: { selectDisabled: false, disabledGroups: ["Groq", "OpenAI"] } },
    { label: "groq-only", keys: { groq: providers.groq.key }, expected: { selectDisabled: false, disabledGroups: ["Google Gemini", "OpenAI"] } },
    { label: "openai-only", keys: { openai: providers.openai.key }, expected: { selectDisabled: false, disabledGroups: ["Google Gemini", "Groq"] } },
  ];

  for (const item of availabilityCases) {
    const actual = await runPage(item.keys, item.label, async (page) => {
      await openScanner(page, `${item.label}-${Date.now()}`);
      return readAvailability(page);
    });
    const disabledGroups = actual.groups.filter((group) => group.disabled).map((group) => group.label);
    const passed = actual.selectDisabled === item.expected.selectDisabled
      && JSON.stringify(disabledGroups) === JSON.stringify(item.expected.disabledGroups)
      && actual.groups.every((group) => group.optionCount > 0);
    report.availability.push({ ...item, actual, passed });
  }

  const allKeys = Object.fromEntries(Object.entries(providers).map(([provider, config]) => [provider, config.key]));
  for (const test of models) {
    const routed = await runPage(allKeys, test.id, async (page) => {
      const requests = [];
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        const requestUrl = new URL(request.url());
        if (!Object.values(providers).some((provider) => provider.host === requestUrl.hostname)) {
          void request.continue().catch(() => {});
          return;
        }
        const corsHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        };
        if (request.method() === "OPTIONS") {
          void request.respond({ status: 204, headers: corsHeaders, body: "" }).catch(() => {});
          return;
        }
        const rawBody = request.postData() || "{}";
        let body = {};
        try { body = JSON.parse(rawBody); } catch { body = {}; }
        const geminiPart = body?.contents?.[0]?.parts?.find?.((part) => part.inline_data)?.inline_data;
        const chatImage = body?.messages?.[0]?.content?.find?.((part) => part.type === "image_url")?.image_url?.url;
        requests.push({
          hostname: requestUrl.hostname,
          pathname: requestUrl.pathname,
          model: body?.model || null,
          geminiMimeType: geminiPart?.mime_type || null,
          geminiImageLength: geminiPart?.data?.length || 0,
          chatImageIsJpeg: typeof chatImage === "string" && chatImage.startsWith("data:image/jpeg;base64,"),
          chatImageLength: typeof chatImage === "string" ? chatImage.length : 0,
        });
        const mockBody = requestUrl.hostname === providers.gemini.host
          ? { candidates: [{ content: { parts: [{ text: "Mock scanner route" }] } }] }
          : { choices: [{ message: { content: "Mock scanner route" } }] };
        void request.respond({
          status: 200,
          contentType: "application/json",
          headers: corsHeaders,
          body: JSON.stringify(mockBody),
        }).catch(() => {});
      });

      await openScanner(page, `${test.id}-${Date.now()}`);
      await page.select("[data-scanner-model-selector]", test.id);
      await sleep(60);
      const input = await page.$('input[type="file"][accept*=".pdf"]');
      if (!input) throw new Error("Primary scanner document input not found");
      await input.uploadFile(fixturePath);
      await page.waitForSelector("[data-scanner-upload-selected]", { timeout: 15000 });
      await page.click("[data-scanner-local-upload]");
      await page.waitForFunction(
        () => Boolean(document.querySelector('#scanner-viewport img[alt="Scanned Document Paper Element"], #scanner-viewport canvas')),
        { timeout: 30000 },
      );
      await page.waitForFunction(() => !document.querySelector("[data-scanner-upload-success]"), { timeout: 10000 });
      await page.waitForSelector("[data-scanner-document-surface]", { timeout: 10000 });
      await page.click('[title="Crop Tool"]');
      const surface = await page.$("[data-scanner-document-surface]");
      const bounds = await surface?.boundingBox();
      if (!bounds) throw new Error("Scanner crop surface unavailable");
      await page.mouse.move(bounds.x + bounds.width * 0.18, bounds.y + bounds.height * 0.24);
      await page.mouse.down({ button: "left" });
      await page.mouse.move(bounds.x + bounds.width * 0.82, bounds.y + bounds.height * 0.72, { steps: 18 });
      await page.mouse.up({ button: "left" });
      await sleep(120);
      await page.click('[title="Add Clip"]');
      await page.waitForFunction(() => document.body.innerText.includes("Queued Clips (1)"), { timeout: 10000 });
      await page.click('[title="Scan"]');
      await page.waitForFunction(() => document.body.innerText.includes("Preparing scan..."), { timeout: 10000 });
      const start = Date.now();
      while (!requests.length && Date.now() - start < 11000) await sleep(100);
      // Allow the mocked provider response to settle, then remove interception
      // before closing this isolated browser context.
      await sleep(250);
      await page.setRequestInterception(false);
      return { requests, selectedValue: await page.$eval("[data-scanner-model-selector]", (select) => select.value) };
    });
    const request = routed.requests[0];
    const expectedHost = providers[test.provider].host;
    const imageSent = test.provider === "gemini"
      ? request?.geminiMimeType === "image/jpeg" && request.geminiImageLength > 1000
      : request?.chatImageIsJpeg === true && request.chatImageLength > 1000;
    const expectedPath = test.provider === "gemini"
      ? `/v1beta/models/${test.apiModel}:generateContent`
      : test.provider === "groq"
        ? "/openai/v1/chat/completions"
        : "/v1/chat/completions";
    const passed = routed.selectedValue === test.id
      && routed.requests.length === 1
      && request?.hostname === expectedHost
      && request?.pathname === expectedPath
      && (test.provider === "gemini" || request?.model === test.apiModel)
      && imageSent;
    report.routes.push({ test, routed, passed });
  }

  report.passed = report.availability.every((item) => item.passed)
    && report.routes.every((item) => item.passed)
    && report.errors.length === 0;
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    outputPath,
    passed: report.passed,
    availability: report.availability.map(({ label, passed }) => ({ label, passed })),
    routedModels: report.routes.filter(({ passed }) => passed).length,
    routeTotal: report.routes.length,
    errors: report.errors,
  }));
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  report.errors.push(`probe: ${error.message}`);
  report.passed = false;
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.error(JSON.stringify({ outputPath, errors: report.errors }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
