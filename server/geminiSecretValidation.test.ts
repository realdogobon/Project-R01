import { describe, expect, it } from "vitest";

describe("configured Gemini development credential", () => {
  it("authenticates against the lightweight model-list endpoint without exposing the key", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey!)}`,
      { signal: AbortSignal.timeout(12_000) },
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { models?: unknown[] };
    expect(Array.isArray(payload.models)).toBe(true);
    expect(payload.models!.length).toBeGreaterThan(0);
  }, 15_000);
});
