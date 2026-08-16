import { describe, expect, it } from "vitest";
import { MAX_PUBLIC_TEXT_BYTES, MAX_PUBLIC_VISUAL_BYTES } from "./publicLinkImport";

describe("scanner public-link import capacity contract", () => {
  it("admits visual documents up to 50 MB while retaining the 2 MB text safety boundary", () => {
    expect(MAX_PUBLIC_VISUAL_BYTES).toBe(50_000_000);
    expect(MAX_PUBLIC_TEXT_BYTES).toBe(2_000_000);
    expect(MAX_PUBLIC_TEXT_BYTES).toBeLessThan(MAX_PUBLIC_VISUAL_BYTES);
  });
});
