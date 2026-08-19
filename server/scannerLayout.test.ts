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

  it("keeps the live toolbar Task View architecture while excluding superseded permanent tab-strip markup", () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/Workspace.tsx"), "utf8");

    expect(source).not.toContain("data-workspace-tab-strip");
    expect(source).not.toContain("data-workspace-tab-scroll");
    expect(source).not.toContain("data-workspace-tab-controls");
    expect(source).toContain("data-workspace-tab-overview-trigger");
    expect(source).toContain("data-workspace-new-tab-trigger");
    expect(source).toContain("const [isTabOverviewOpen, setIsTabOverviewOpen] = useState(false);");
    expect(source).toContain("data-workspace-tab-overview-item={tab.id}");
    expect(source).toContain('data-workspace-tab-overview-close={tab.id}');
    expect(source).toContain("function buildTabOverviewPreview(text: string) {");
    expect(source).toContain("switchTab(tab.id);");
    expect(source).toContain("event.stopPropagation();");
    expect(source).toContain("initiateTabClose(tab.id, event);");
    expect(source).toContain("const WORKSPACE_TAB_CACHE_RESET_VERSION = 1;");
    expect(source).toContain("const resetPersistedWorkspaceTabs = (uid: string): AccountStateSnapshot => {");
    expect(source).toContain("workspaceTabCacheResetVersion: WORKSPACE_TAB_CACHE_RESET_VERSION,");
    expect(source).toContain("setCustomPracticeText(snap.practiceText || \"\");");
    expect(source).toContain("setCustomPracticeTitle(snap.practiceTitle || \"\");");
  });

  it("offers a guarded Close all tabs exit action without bypassing dirty-state or exam protections", () => {
    const workspaceSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/Workspace.tsx"), "utf8");
    const exitSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/lib/platformExit.ts"), "utf8");

    expect(workspaceSource).toContain('import { hasRoyScriptDesktopExitBridge, requestRoyScriptExit } from "../lib/platformExit";');
    expect(workspaceSource).toContain("const closeAllTabsAndRequestExit = () => {");
    expect(workspaceSource).toContain("if (!hasRoyScriptDesktopExitBridge()) return;");
    expect(workspaceSource).toContain('const dirtyCount = tabs.filter(t => t.isDirty && (t.content || "").trim() !== "").length;');
    expect(workspaceSource).toContain('setPendingAction("closeAllTabs");');
    expect(workspaceSource).toContain('else if (action === "closeAllTabs") {');
    expect(workspaceSource).toContain("closeAllTabsNow();");
    expect(workspaceSource).toContain("requestRoyScriptExit(\"closeAllTabs\");");
    expect(workspaceSource).toContain("data-workspace-tab-close-all");
    expect(workspaceSource).toContain("Close all tabs");
    expect(workspaceSource).toContain("Close all tabs and exit the application");
    expect(workspaceSource).toContain('disabled={examStatus === "running" || examStatus === "countdown" || isExamSealed || tabs.length === 0}');
    expect(exitSource).toContain("export const ROYSCRIPT_REQUEST_EXIT_EVENT = \"royscript-request-exit\";");
    expect(exitSource).toContain("export function hasRoyScriptDesktopExitBridge(): boolean {");
    expect(exitSource).toContain("if (!hasRoyScriptDesktopExitBridge()) return false;");
    expect(exitSource).toContain("window.dispatchEvent(");
    expect(exitSource).toContain("Exit request must always fail silently at the app level.");
  });

  it("removes the superseded permanent tab-strip neon lifecycle without affecting the live Task View", () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/Workspace.tsx"), "utf8");

    expect(source).not.toContain("buildTabAccentPath");
    expect(source).not.toContain("firstKeyGlowPendingTabIdRef");
    expect(source).not.toContain("fireTabGlow");
    expect(source).not.toContain("completeTabGlow");
    expect(source).not.toContain("hasGlowedOnce");
    expect(source).toContain("data-workspace-tab-overview-trigger");
    expect(source).toContain("data-workspace-tab-overview-item={tab.id}");
  });

  it("preserves completed exam seals per tab without imposing a workspace-wide Just Look lock", () => {
    const workspaceSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/Workspace.tsx"), "utf8");
    const templateSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/components/lexkit/DefaultTemplate.tsx"), "utf8");

    expect(workspaceSource).not.toContain("isPostExamReviewActive");
    expect(workspaceSource).not.toContain("data-post-exam-review-allowed");
    expect(workspaceSource).not.toContain('editorRef.current?.setReadOnly(isExamSealed || examStatus === "timeout");');
    expect(workspaceSource).not.toContain('readOnly={examStatus === "timeout" || isExamSealed}');
    expect(workspaceSource).not.toContain('if (examStatus === "timeout" || isExamSealed) {\n        editorRef.current.setReadOnly(true);');
    expect(workspaceSource).not.toContain('editorRef.current?.setSelection(snap.cursor!)');
    expect(workspaceSource).toContain('if (examStatus === "running" && !isExamSealed) {');
    expect(templateSource).toContain("const latestReadOnlyRef = useRef(Boolean(readOnly));");
    expect(templateSource).toContain("latestReadOnlyRef.current = Boolean(readOnly);");
    expect(templateSource).toContain("const hydrationGenerationRef = useRef(0);");
    expect(templateSource).toContain("if (hydrationRequestId !== hydrationGenerationRef.current) return;");
    expect(templateSource).toContain("$setSelection(null);");
    expect(templateSource).toContain("editor.setEditable(!latestReadOnlyRef.current);");
    expect(workspaceSource).toContain("const reopenTimesUpForSealedTab = () => {");
    expect(workspaceSource).toContain('if (!isExamSealed || examStatus === "timeout") return;');
    expect(workspaceSource).toContain('setExamStatus("timeout");');
    expect(workspaceSource).toContain("setExamStatus(\"idle\");");
    expect(workspaceSource).toContain("toolbarLocked={isExamSealed}");
    expect(workspaceSource).toContain("readOnly={isExamSealed}");
    expect(workspaceSource).toContain("sealedVisual={isExamSealed}");
    expect(workspaceSource).not.toContain("opacity-55 grayscale-[50%]");
    expect(workspaceSource).toContain("onReadOnlyEditorDoubleClick={isExamSealed ? reopenTimesUpForSealedTab : undefined}");
    expect(workspaceSource).not.toContain("data-sealed-exam-review-shield");
    expect(workspaceSource).toContain('document.addEventListener("pointerdown", handlePointerDown, true);');
    expect(workspaceSource).toContain('document.removeEventListener("pointerdown", handlePointerDown, true);');
    expect(workspaceSource).toContain("const canCloseFromOverview = !tab.examSealed;");
    expect(workspaceSource).toContain('data-workspace-tab-overview-close-eligible={canCloseFromOverview ? "true" : "false"}');
    expect(workspaceSource).toContain('{canCloseFromOverview && <button type="button" data-workspace-tab-overview-close={tab.id}');
    expect(workspaceSource).toContain("onJustLook={() => {");
    expect(workspaceSource).toContain("onJustLook();");
    expect(workspaceSource).toContain('setExamStatus("idle");\n    setIsExamMode(false);');
    expect(templateSource).toContain("toolbarLocked?: boolean;");
    expect(templateSource).toContain("sealedVisual?: boolean;");
    expect(templateSource).toContain('sealedVisual ? "lexkit-sealed-document" : ""');
    expect(templateSource).toContain("onReadOnlyEditorDoubleClick?: () => void;");
    expect(templateSource).toContain("onDoubleClick={() => { if (readOnly) onReadOnlyEditorDoubleClick?.(); }}");
    expect(templateSource).toContain('data-lexkit-editing-controls aria-disabled={toolbarLocked}');
    expect(templateSource).toContain('data-lexkit-command-controls aria-disabled={toolbarLocked}');
  });
});
