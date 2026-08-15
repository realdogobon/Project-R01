import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scannerModalPath = path.resolve(import.meta.dirname, "../client/src/components/DocumentScannerModal.tsx");

describe("scanner action-bar layout contract", () => {
  it("allows fixed-width footer controls to wrap instead of overflowing the primary Scan action", () => {
    const source = fs.readFileSync(scannerModalPath, "utf8");

    expect(source).toContain("data-scanner-action-bar");
    expect(source).toContain("flex flex-wrap items-center justify-between gap-4");
    expect(source).not.toContain("flex flex-wrap sm:flex-nowrap items-center justify-between gap-4");
    expect(source).toContain("overflow-visible");
    expect(source).toContain("data-scanner-primary-action");
    expect(source).toContain("max-w-full min-w-0 flex-wrap overflow-visible");
  });

  it("uses an integrated, compact empty upload surface while retaining stable import controls", () => {
    const source = fs.readFileSync(scannerModalPath, "utf8");

    expect(source).toContain("data-scanner-empty-upload-state");
    expect(source).toContain("data-scanner-local-upload");
    expect(source).toContain("data-scanner-import-url");
    expect(source).toContain("data-scanner-image-sequence");
    expect(source).toContain("data-scanner-upload-pending");
    expect(source).toContain("data-scanner-upload-success");
    expect(source).toContain("startLocalUploadPresentation");
    expect(source).not.toContain("No {providerLabel} key configured");
    expect(source).not.toContain("border-2 border-dashed");
    expect(source).toContain("Add a document");
    expect(source).toContain("Up to 20 MB");
    expect(source).toContain("mt-4 mb-12 px-5 py-3");
    expect(source).toContain("height: windowSize.width < 640 ? '232px' : undefined");
    expect(source).toContain("minHeight: windowSize.width < 640 ? '232px' : '420px'");
    expect(source).toContain("? '248px'");
    expect(source).toContain("minHeight: windowSize.width < 640 ? '248px' : '420px'");
  });
});
