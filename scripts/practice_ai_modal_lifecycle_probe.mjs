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
      localStorage.setItem("royscript_ai_keys", JSON.stringify({ gemini: "modal-lifecycle-probe-key" }));
    });
    await page.reload({ waitUntil: "networkidle2" });
    await page.click('button[title="Start Practice"]');
    await page.click('button[aria-label="Create Practice Text"]');
    await page.waitForSelector('button[aria-label="Generate Practice Text"]');

    await page.evaluate(() => {
      const nativeFetch = window.fetch.bind(window);
      window.__modalLifecycleProbe = { requests: 0, aborts: 0 };
      window.fetch = (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        if (!url.includes("generativelanguage.googleapis.com")) return nativeFetch(input, init);
        window.__modalLifecycleProbe.requests += 1;
        const signal = init?.signal;
        return new Promise((resolve, reject) => {
          const words = Array.from({ length: 520 }, (_, index) => `practice${index}`).join(" ");
          const timer = window.setTimeout(() => {
            resolve(new Response(JSON.stringify({
              candidates: [{ content: { parts: [{ text: words }] } }],
            }), { status: 200, headers: { "Content-Type": "application/json" } }));
          }, 900);
          const abort = () => {
            window.clearTimeout(timer);
            window.__modalLifecycleProbe.aborts += 1;
            reject(new DOMException("Aborted", "AbortError"));
          };
          if (signal?.aborted) abort();
          else signal?.addEventListener("abort", abort, { once: true });
        });
      };
    });

    const beforeText = await page.$eval("textarea", (area) => area.value);
    await page.click('button[aria-label="Generate Practice Text"]');
    await page.waitForSelector('button[aria-label="Creating Practice Text"]', { timeout: 1000 });
    assert.equal(await page.$eval("textarea", (area) => area.getAttribute("aria-busy")), "true", `${viewport.name}: Configure Session textarea did not expose busy state`);
    assert.ok(await page.$('textarea + div[role="status"]'), `${viewport.name}: Configure Session loading overlay was not visible`);

    await page.click('button[aria-label="Close Practice Text"]');
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(await page.$('button[aria-label="Close Practice Text"]'), null, `${viewport.name}: modal did not dismiss from the title-bar X`);
    assert.equal(await page.$eval("textarea", (area) => area.getAttribute("aria-busy")), "true", `${viewport.name}: closing the modal cancelled the Configure Session job`);
    assert.deepEqual(await page.$eval("textarea", (area) => area.value), beforeText, `${viewport.name}: close committed text before generation completed`);

    await page.click('button[aria-label="Create Practice Text"]');
    await page.waitForSelector('button[aria-label="Creating Practice Text"]', { timeout: 500 });
    assert.ok(await page.$('button[aria-label="Cancel Practice Text generation"]'), `${viewport.name}: reopening did not restore the explicit Cancel action`);
    assert.equal(await page.$eval("textarea", (area) => area.getAttribute("aria-busy")), "true", `${viewport.name}: reopening lost the live generation state`);

    await page.waitForFunction(() => {
      const area = document.querySelector("textarea");
      return area?.getAttribute("aria-busy") === "false" && area.value.includes("practice0");
    }, { timeout: 3000 });
    assert.equal(await page.$('button[aria-label="Close Practice Text"]'), null, `${viewport.name}: modal did not close after successful completion`);
    assert.equal(await page.$eval("textarea", (area) => area.getAttribute("aria-busy")), "false", `${viewport.name}: Configure Session remained busy after completion`);
    assert.equal((await page.$eval("textarea", (area) => area.value)).includes("practice0"), true, `${viewport.name}: completed text did not reach Configure Session`);

    const probeState = await page.evaluate(() => window.__modalLifecycleProbe);
    assert.equal(probeState.requests, 1, `${viewport.name}: close/reopen created duplicate provider requests`);
    assert.equal(probeState.aborts, 0, `${viewport.name}: modal dismissal aborted the active provider request`);
    assert.deepEqual(errors, [], `${viewport.name}: unexpected browser errors: ${errors.join(" | ")}`);
    console.log(`${viewport.name}: modal dismiss, persistent generation, reopen recovery, completion commit, and auto-close passed`);
    await page.close();
  }
} finally {
  await browser.close();
}
