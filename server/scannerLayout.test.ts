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

  it("uses a canvas-native upload stage and borderless import controls while retaining stable routes", () => {
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
    expect(source).toContain("Drop a document");
    expect(source).toContain("Release anywhere in this canvas");
    expect(source).toContain("Add to scanner");
    expect(source).toContain("Up to 50 MB");
    expect(source).toContain("CloudUpload");
    expect(source).toContain("data-scanner-upload-command-strip");
    expect(source).toContain("data-scanner-page-jump");
    expect(source).toContain("event.currentTarget.select()");
    expect(source).toContain("max-w-[620px]");
    expect(source).toContain("min-h-[360px]");
    expect(source).toContain("gap-1 px-4 py-1.5");
    expect(source).toContain("bg-[#DDD9E6]");
    expect(source).not.toContain("hover:bg-[#7868F4]/[0.018]");
    expect(source).not.toContain("scale-[1.08]");
    expect(source).not.toContain("border border-gray-200/70 bg-gradient-to-b");
  });

  it("keeps URL imports legible and selected-file metadata truthful without changing the silent import boundary", () => {
    const scannerSource = fs.readFileSync(scannerModalPath, "utf8");
    const workspaceSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/Workspace.tsx"), "utf8");

    expect(scannerSource).toContain("data-scanner-url-import-pending");
    expect(scannerSource).toContain("Importing from link");
    expect(scannerSource).toContain("Retrieving document");
    expect(scannerSource).toContain("beginUrlImport");
    expect(scannerSource).toContain("getScannerFileFormat");
    expect(scannerSource).toContain('"application/pdf": "PDF"');
    expect(scannerSource).toContain('import("pdfjs-dist/legacy/build/pdf.mjs")');
    expect(scannerSource).toContain("renderSelectedPdfThumbnail");
    expect(scannerSource).toContain("data-scanner-upload-thumbnail");
    expect(scannerSource).toContain("getScannerFileFormat(uploadPresentation.file)");
    expect(scannerSource).toContain("font-sans");
    expect(workspaceSource).toContain("const importedContentType = result.contentType.trim().toLowerCase()");
    expect(workspaceSource).toContain("type: importedContentType");
    expect(workspaceSource).toContain("lastModified: Date.now()");
  });

  it("uses the left-rail field type system across scanner controls, upload states, and footer labels", () => {
    const source = fs.readFileSync(scannerModalPath, "utf8");
    const fieldTypographyMarkers = source.match(/data-scanner-typography="field"/g) ?? [];

    expect(source).toContain('data-scanner-model-selector');
    expect(source).toContain('font-sans text-[13px] font-normal tracking-normal text-[#202020] dark:text-[#EAEAEA]');
    expect(source.match(/h-8 w-full appearance-none bg-white dark:bg-\[#2A2A35\] border border-\[#E5DCDA\]/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('data-scanner-file-type data-scanner-typography="field"');
    expect(source).toContain('data-scanner-upload-command-strip');
    expect(source).toContain('data-scanner-page-jump');
    expect(source).toContain('data-scanner-primary-action');
    expect(fieldTypographyMarkers.length).toBeGreaterThanOrEqual(14);
    expect(source).not.toContain('text-[11px] font-medium tracking-[0.01em] text-[#AAA5B4]');
  });

  it("replays the workspace scanner toolbar paper through a physical printer path on every mouse entry", () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/Workspace.tsx"), "utf8");

    expect(source).toContain("const [paperFeedRun, setPaperFeedRun] = useState(0);");
    expect(source).toContain("const [isPaperFeedActive, setIsPaperFeedActive] = useState(false);");
    expect(source).toContain("setIsPaperFeedActive(true);");
    expect(source).toContain("setPaperFeedRun((run) => run + 1);");
    expect(source).toContain("key={paperFeedRun}");
    expect(source).toContain("data-scanner-toolbar-paper");
    expect(source).toContain("@keyframes scanner-toolbar-paper-feed");
    expect(source).toContain("translate(-50%, -205%)");
    expect(source).toContain("translate(-50%, 155%)");
    expect(source).toContain("scanner-paper--feeding");
    expect(source).toContain('isPaperFeedActive ? "scanner-paper--feeding" : ""');
    expect(source).toContain("prefers-reduced-motion: no-preference");
    expect(source).not.toContain(".scanner-icon-wrapper:hover .scanner-paper");
  });
});
