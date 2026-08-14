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

try {
  for (const viewport of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: viewport.width, height: viewport.height });
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin")) {
        errors.push(message.text());
      }
    });

    await page.goto(`${previewUrl}/?from_webdev=1`, { waitUntil: "networkidle2" });
    await page.evaluate(() => {
      localStorage.setItem("royscript_ai_keys", JSON.stringify({ gemini: "cancellation-probe-key" }));
    });
    await page.reload({ waitUntil: "networkidle2" });
    await page.click('button[title="Start Practice"]');
    await page.click('button[aria-label="Create Practice Text"]');
    await page.waitForSelector('button[aria-label="Close Practice Text"]');

    await page.evaluate(() => {
      const nativeFetch = window.fetch.bind(window);
      window.__cancellationProbe = { requests: 0, aborts: 0 };
      window.fetch = (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        if (!url.includes("generativelanguage.googleapis.com")) return nativeFetch(input, init);
        window.__cancellationProbe.requests += 1;
        const signal = init?.signal;
        return new Promise((resolve, reject) => {
          const timer = window.setTimeout(() => {
            resolve(new Response(JSON.stringify({
              candidates: [{ content: { parts: [{ text: Array.from({ length: 200 }, (_, index) => `practice${index}`).join(" ") }] } }],
            }), { status: 200, headers: { "Content-Type": "application/json" } }));
          }, 1500);
          const abort = () => {
            window.clearTimeout(timer);
            window.__cancellationProbe.aborts += 1;
            reject(new DOMException("Aborted", "AbortError"));
          };
          if (signal?.aborted) abort();
          else signal?.addEventListener("abort", abort, { once: true });
        });
      };
    });

    const beforeValues = await page.$$eval("textarea", (areas) => areas.map((area) => area.value));
    await page.click('button[aria-label="Generate Practice Text"]');
    await page.waitForSelector('button[aria-label="Cancel Practice Text generation"]', { timeout: 1000 });
    const activeCancel = await page.$eval('button[aria-label="Cancel Practice Text generation"]', (button) => ({
      disabled: button.disabled,
      text: button.textContent?.trim(),
    }));
    assert.equal(activeCancel.disabled, false, `${viewport.name}: Cancel button was not actionable`);
    assert.equal(activeCancel.text, "Cancel", `${viewport.name}: Cancel button did not transition cleanly`);

    await page.click('button[aria-label="Cancel Practice Text generation"]');
    await page.waitForSelector('button[aria-label="Generate Practice Text"]', { timeout: 1000 });
    await new Promise((resolve) => setTimeout(resolve, 250));
    const afterValues = await page.$$eval("textarea", (areas) => areas.map((area) => area.value));
    const probeState = await page.evaluate(() => window.__cancellationProbe);
    assert.equal(probeState.requests, 1, `${viewport.name}: expected one provider request`);
    assert.equal(probeState.aborts, 1, `${viewport.name}: provider request was not aborted`);
    assert.deepEqual(afterValues, beforeValues, `${viewport.name}: cancelled generation committed stale text`);
    assert.equal(await page.$('button[aria-label="Cancel Practice Text generation"]'), null, `${viewport.name}: Cancel state persisted after stop`);
    assert.deepEqual(errors, [], `${viewport.name}: unexpected browser errors: ${errors.join(" | ")}`);
    console.log(`${viewport.name}: cancellation transition, abort propagation, recovery, and stale-commit guard passed`);
    await page.close();
  }
} finally {
  await browser.close();
}
