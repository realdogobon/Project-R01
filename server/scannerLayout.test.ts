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

  it("uses the quiet staged upload surface while retaining stable import controls", () => {
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
    expect(source).toContain("data-scanner-upload-dropzone");
    expect(source).toContain("data-scanner-upload-selected");
    expect(source).toContain("data-scanner-remove-selected-upload");
    expect(source).toContain("data-scanner-upload-thumbnail");
    expect(source).toContain("Add a document");
    expect(source).toContain("Drop document here");
    expect(source).toContain("Upload document");
    expect(source).toContain("Up to 20 MB");
    expect(source).toContain("max-w-[520px]");
    expect(source).toContain("min-h-[340px]");
    expect(source).toContain("min-h-[168px]");
    expect(source).toContain("min-h-[108px]");
  });
});
