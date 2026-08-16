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

  it("feeds paper through the workspace scanner toolbar glyph’s front holder and output tray on every pointer entry", () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/Workspace.tsx"), "utf8");

    expect(source).toContain("const [paperFeedRun, setPaperFeedRun] = useState(0);");
    expect(source).toContain("const [isPaperFeedActive, setIsPaperFeedActive] = useState(false);");
    expect(source).toContain('className="relative flex h-full w-full items-center justify-center scanner-icon-wrapper"');
    expect(source).toContain("onPointerEnter={() => {");
    expect(source).toContain("setIsPaperFeedActive(true);");
    expect(source).toContain("setPaperFeedRun((run) => run + 1);");
    expect(source).toContain("key={`entry-${paperFeedRun}`}");
    expect(source).toContain("key={`tray-${paperFeedRun}`}");
    expect(source).toContain("key={`exit-${paperFeedRun}`}");
    expect(source).toContain("data-scanner-toolbar-paper-top-holder");
    expect(source).toContain("data-scanner-toolbar-paper-output-tray");
    expect(source).toContain("data-scanner-toolbar-paper-exit-window");
    expect(source).toContain("data-scanner-toolbar-paper-entry");
    expect(source).toContain("data-scanner-toolbar-paper-output");
    expect(source).toContain("data-scanner-toolbar-paper-exit");
    expect(source).toContain("@keyframes scanner-toolbar-paper-entry");
    expect(source).toContain("@keyframes scanner-toolbar-paper-tray");
    expect(source).toContain("@keyframes scanner-toolbar-paper-exit");
    expect((source.match(/76% \{\n            transform: translate\(-50%, -76%\);\n            opacity: 0\.25;/g) ?? []).length).toBe(2);
    expect((source.match(/84% \{\n            transform: translate\(-50%, -28%\);\n            opacity: 0\.65;/g) ?? []).length).toBe(2);
    expect((source.match(/88% \{\n            transform: translate\(-50%, -8%\);\n            opacity: 0\.8;/g) ?? []).length).toBe(2);
    expect((source.match(/92% \{\n            transform: translate\(-50%, 0%\);\n            opacity: 0\.72;/g) ?? []).length).toBe(2);
    expect((source.match(/96% \{\n            transform: translate\(-50%, 2%\);\n            opacity: 0\.4;/g) ?? []).length).toBe(2);
    expect((source.match(/100% \{\n            transform: translate\(-50%, 3%\);\n            opacity: 0;/g) ?? []).length).toBe(2);
    expect(source).toContain("left-[25%] top-[-50%]");
    expect(source).toContain("left-[25%] top-[58.33%]");
    expect(source).toContain("left-[25%] top-[58.33%]");
    const maskMatches = source.match(/data-scanner-toolbar-paper-(?:top-holder|output-tray|exit-window)[\s\S]*?w-\[50%\]/g) ?? [];
    expect(maskMatches.length).toBe(3);
    expect(source).toContain("2.7s cubic-bezier(0.33, 0, 0.67, 1)");
    expect(source).toContain("scanner-paper-sheet--feeding");
    expect(source).toContain('isPaperFeedActive ? "scanner-paper-sheet--feeding" : ""');
    expect(source).toContain("prefers-reduced-motion: no-preference");
    expect(source).toContain("overflow-hidden");
    expect((source.match(/scanner-paper-sheet scanner-paper-sheet--(?:entry|tray|exit)\s[^`]*aspect-\[1\/1\.41421356237\] w-\[82%\]/g) ?? []).length).toBe(3);
    expect((source.match(/scanner-paper-sheet scanner-paper-sheet--(?:entry|tray|exit)\s[^`]*w-\[82%\] rounded-\[1px\]/g) ?? []).length).toBe(3);
  });
});
