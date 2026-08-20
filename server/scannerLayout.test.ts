import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scannerModalPath = path.resolve(import.meta.dirname, "../client/src/components/DocumentScannerModal.tsx");

describe("scanner action-bar layout contract", () => {
  it("keeps a deliberate Scanner drag or resize authoritative over automatic content fitting", () => {
    const source = fs.readFileSync(scannerModalPath, "utf8");

    expect(source).toContain("const [hasManualWindowGeometry, setHasManualWindowGeometry] = useState(false);");
    expect(source).toContain("const beginManualWindowInteraction = React.useCallback");
    expect(source).toContain("setHasManualWindowGeometry(true);");
    expect(source).toContain("if (!isScannerOpen || windowSize.width < 640 || hasManualWindowGeometry) return;");
    expect(source).toContain("hasManualWindowGeometry, isNarrowPreview");
    expect(source).toContain("beginManualWindowInteraction('se', e)");
    expect(source).toContain("beginManualWindowInteraction('nw', e)");
    expect(source).toContain("beginManualWindowInteraction('move', e)");
  });

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

  it("silently hardens active Exam Mode against clipboard routes and browser input assistance", () => {
    const templateSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/components/lexkit/DefaultTemplate.tsx"), "utf8");

    expect(templateSource).toContain("const EXAM_BLOCKED_NATIVE_INPUT_TYPES = new Set([");
    expect(templateSource).toContain('"insertFromPaste"');
    expect(templateSource).toContain('"insertFromDrop"');
    expect(templateSource).toContain('"insertReplacementText"');
    expect(templateSource).toContain('if (EXAM_BLOCKED_NATIVE_INPUT_TYPES.has(inputType))');
    expect(templateSource).toContain('spellcheck: "false"');
    expect(templateSource).toContain('autocorrect: "off"');
    expect(templateSource).toContain('autocapitalize: "off"');
    expect(templateSource).toContain('autocomplete: "off"');
    expect(templateSource).toContain('"data-lt-active": "false"');
    expect(templateSource).toContain('"data-gramm": "false"');
    expect(templateSource).toContain("const observer = new MutationObserver(synchronizeBrowserAssistance);");
    expect(templateSource).toContain("attributeFilter: Object.keys(browserAssistanceAttributes)");
    expect(templateSource).toContain("return () => observer.disconnect();");
    expect(templateSource).toContain('if (examActive && (e.ctrlKey || e.metaKey) && ["c", "x", "v"].includes(e.key.toLowerCase()))');
    expect(templateSource).toContain('onCopyCapture={(e) => { if (examActive || readOnly) { e.preventDefault(); e.stopPropagation(); } }}');
    expect(templateSource).toContain('onContextMenuCapture={(e) => { if (examActive || readOnly) { e.preventDefault(); e.stopPropagation(); } }}');
    expect(templateSource).not.toContain('alert("Clipboard operations are locked.")');
  });

  it("keeps status metrics font-aware and makes the Settings theme indicator entry-stable", () => {
    const workspaceSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/Workspace.tsx"), "utf8");
    const settingsSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/components/modals/SettingsModal.tsx"), "utf8");

    expect(workspaceSource).toContain('style={{ fontFamily: fontCssFamily }}');
    expect(workspaceSource).toContain('Ln {position.line},');
    expect(workspaceSource).toContain('<span className="ml-2.5">Col {position.column}</span>');
    expect(workspaceSource).toContain('`Chars ${getStats().charsWithSpaces || 0}, Words ${getStats().words || 0}`');
    expect(settingsSource).toContain('const activeThemeIndex = Math.max(');
    expect(settingsSource).toContain('style={{ transform: `translateX(${activeThemeIndex * 100}%)` }}');
    expect(settingsSource).toContain('w-[calc((100%-8px)/3)]');
    expect(settingsSource).not.toContain('layoutId={themeIndicatorLayoutId}');
    expect(settingsSource).toContain('const [showResetConfirmation, setShowResetConfirmation] = useState(false);');
    expect(settingsSource).toContain('aria-live="polite"');
    expect(settingsSource).toContain('<span>Settings Reset</span>');
    expect(settingsSource).toContain('absolute bottom-6 right-6 z-20');
    expect(settingsSource).not.toContain('absolute left-full bottom-[14px]');
    expect(settingsSource).toContain('relative mt-auto w-full px-2 pt-4');
    expect(settingsSource).not.toContain('absolute top-4 right-11');
    expect(settingsSource).toContain('hover:text-neutral-700');
    expect(settingsSource).not.toContain('hover:bg-red-500/[0.08]');
    expect(settingsSource).toContain('title="Reset Settings"');
    expect(settingsSource).not.toContain('className="mb-3 h-px w-full bg-neutral-200/80 dark:bg-white/[0.09]"');
  });

  it("keeps Exam records but excludes them from progression and false accuracy reporting", () => {
    const workspaceSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/Workspace.tsx"), "utf8");
    const dashboardSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/components/dashboard/WorkspaceDashboard.tsx"), "utf8");
    const authSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/contexts/AuthContext.tsx"), "utf8");
    const progressionSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/lib/progression.ts"), "utf8");

    expect(authSource).toContain("accuracy: number | null;");
    expect(authSource).toContain('if (type === "Practice") {');
    expect(authSource).toContain("applyPracticeSessionToProgression(");
    expect(progressionSource).toContain('session.type === "Practice"');
    expect(progressionSource).toContain('if (normalized.completedAt || normalized.creditedSessionIds.includes(session.id) || !isQualifyingPracticeSession');
    expect(workspaceSource).toContain("getProgressionSummary(progression)");
    expect(dashboardSource).toContain("getProgressionSummary(progression)");
    expect(workspaceSource).toContain('wpm || 0,\n        null,\n        "Exam",');
    expect(workspaceSource).toContain('wpm || 0,\n          null,\n          "Exam",');
    expect(workspaceSource).not.toContain('99,\n        "Exam",');
    expect(dashboardSource).toContain("const scoredPracticeSessions = sessions.filter(");
    expect(dashboardSource).toContain('session.type === "Practice" && typeof session.accuracy === "number"');
    expect(dashboardSource).toContain(': "—"}');
  });

  it("persists one-time Practice level milestones and presents the real progress handoff", () => {
    const dashboardSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/components/dashboard/WorkspaceDashboard.tsx"), "utf8");
    const authSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/contexts/AuthContext.tsx"), "utf8");

    expect(authSource).toContain('export interface PendingLevelUpMilestone');
    expect(authSource).toContain('if (type === "Practice") {');
    expect(authSource).toContain('applyPracticeSessionToProgression(');
    expect(authSource).toContain('previousLevelGoal: typeof milestone.previousLevelGoal === "number" ? milestone.previousLevelGoal : 1000');
    expect(authSource).toContain('nextLevelGoal: typeof milestone.nextLevelGoal === "number" ? milestone.nextLevelGoal : 1000');
    expect(dashboardSource).toContain('const [activeLevelUpMilestone, setActiveLevelUpMilestone]');
    expect(dashboardSource).toContain('const duration = levelUpPhase === "filling" ? 900 : levelUpPhase === "hold" ? 2000 : 600;');
    expect(dashboardSource).toContain('Math.round((displayedLevelUpMilestone.previousLevelXP / displayedLevelUpMilestone.previousLevelGoal) * 100)');
    expect(dashboardSource).toContain('acknowledgePendingLevelUpMilestone(user.uid, activeLevelUpMilestone.id)');
    expect(dashboardSource).toContain('const isDashboardOpenRef = useRef(isOpen);');
    expect(dashboardSource).toContain('if (!isDashboardOpenRef.current || !user) return;');
    expect(dashboardSource).toContain('if (!isDashboardOpenRef.current) return;');
    expect(dashboardSource).toContain('{isHoldingLevelUp && (');
  });

  it("keeps real Practice keystrokes visibly pulsed through the title-bar typing glyph", () => {
    const glyphSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/components/AnimatedModeIcons.tsx"), "utf8");

    expect(glyphSource).toContain("const RAPID_TYPING_PULSE_MS = 220;");
    expect(glyphSource).toContain("const [typingPulse, setTypingPulse] = useState({ left: false, right: false, run: 0 });");
    expect(glyphSource).toContain("const activeKeySignatureRef = useRef(\"\");");
    expect(glyphSource).toContain("const signature = [...activeCodes].sort().join(\"|\");");
    expect(glyphSource).toContain("const typingPulseRef = useRef({ left: false, right: false, run: 0 });");
    expect(glyphSource).toContain("const queuedTypingHandRef = useRef<TypingHand | null>(null);");
    expect(glyphSource).toContain("const startTypingPulse = (hand: TypingHand): void => {");
    expect(glyphSource).toContain("run: typingPulseRef.current.run + 1,");
    expect(glyphSource).toContain('left: hand === "left",');
    expect(glyphSource).toContain('right: hand === "right",');
    expect(glyphSource).toContain('if (code === "Space") return ["right"];');
    expect(glyphSource).toContain("const leftHandActive = activeCodes.some((code) => leftHandKeyCodes.has(code));");
    expect(glyphSource).toContain('const rightHandActive = activeCodes.some((code) => rightHandKeyCodes.has(code) || code === "Space");');
    expect(glyphSource).toContain("if (incomingHand !== currentHand && queuedTypingHandRef.current !== incomingHand)");
    expect(glyphSource).not.toContain("const queuedTypingPulseRef = useRef({ left: false, right: false });");
    expect(glyphSource).not.toContain("const startTypingPulse = (hands: { left: boolean; right: boolean }): void => {");
    expect(glyphSource).toContain("setTimeout(() => {");
    expect(glyphSource).toContain("}, RAPID_TYPING_PULSE_MS);");
    expect(glyphSource).toContain("const leftHandTyping = typingPulse.left;");
    expect(glyphSource).toContain("const rightHandTyping = typingPulse.right;");
    expect(glyphSource).toContain("key={`practice-left-pulse-${leftHandTyping ? typingPulse.run : \"rest\"}`}");
    expect(glyphSource).toContain("key={`practice-right-pulse-${rightHandTyping ? typingPulse.run : \"rest\"}`}");
    expect(glyphSource).toContain("? { y: [0, -12, 0], rotate: [0, 6, 0] }");
    expect(glyphSource).toContain("? { y: [0, -12, 0], rotate: [0, -6, 0] }");
    expect(glyphSource).toContain('? { duration: 0.2, times: [0, 0.38, 1], ease: "easeOut" }');
    expect(glyphSource).toContain("useEffect(() => () => {");
  });

  it("keeps shared floating-window geometry pointer-coupled while preserving entry and exit motion", () => {
    const hookSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/hooks/useResizable.ts"), "utf8");
    const windowSources = [
      fs.readFileSync(scannerModalPath, "utf8"),
      fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/components/dashboard/LibraryHub.tsx"), "utf8"),
      fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/components/dashboard/WorkspaceDashboard.tsx"), "utf8"),
    ];

    expect(hookSource).toContain("const latestStateRef = useRef(state);");
    expect(hookSource).toContain("const pendingStateRef = useRef<WindowState | null>(null);");
    expect(hookSource).toContain("const windowRef = useRef<HTMLDivElement | null>(null);");
    expect(hookSource).toContain("const applyWindowGeometry = useCallback((nextState: WindowState) => {");
    expect(hookSource).toContain("applyWindowGeometry(nextState);");
    expect(hookSource).toContain("pendingStateRef.current = nextState;");
    expect(hookSource).not.toContain("window.requestAnimationFrame(() => {");
    expect(hookSource).toContain("flushPendingState();");
    expect(hookSource).toContain("window.addEventListener('mousemove', handleMouseMove);");
    expect(hookSource).toContain("window.addEventListener('mouseup', stopResize);");
    expect(hookSource).toContain("window.addEventListener('blur', stopResize);");
    expect(hookSource).toContain("useLayoutEffect(() => {");
    expect(hookSource).toContain("newX = startPos.current.winX + (startPos.current.width - newWidth);");
    expect(hookSource).toContain("newY = startPos.current.winY + (startPos.current.height - newHeight);");
    expect(hookSource).not.toContain("potentialWidth !== latestStateRef.current.width");
    expect(hookSource).not.toContain("potentialHeight !== latestStateRef.current.height");
    expect(hookSource).toContain("export const ROYSCRIPT_WINDOW_GEOMETRY_RESET_EVENT = 'royscript-window-geometry-reset';");
    expect(hookSource).toContain("export function resetPersistedFloatingWindowGeometry()");
    expect(hookSource).toContain("key?.startsWith('lexkit_window_')");
    expect(hookSource).toContain("window.dispatchEvent(new Event(ROYSCRIPT_WINDOW_GEOMETRY_RESET_EVENT));");
    expect(hookSource).toContain("window.addEventListener(ROYSCRIPT_WINDOW_GEOMETRY_RESET_EVENT, resetToFactoryGeometry);");
    expect(hookSource).not.toContain("if (resizing) {");
    expect(hookSource).not.toContain("const stopResize = useCallback(async () => {");

    for (const source of windowSources) {
      expect(source).toContain("ref={windowRef}");
      expect(source).toContain("resizing, startResize");
      expect(source).toContain("default: { duration: 0 }");
      expect(source).toContain("scale: resizing ? { duration: 0 }");
      expect(source).toContain("y: resizing ? { duration: 0 }");
      expect(source).toContain("style={{");
      expect(source).toContain("left: window.innerWidth < 640 ? 0 : x,");
      expect(source).toContain("top: window.innerWidth < 640 ? 0 : y,");
      const coordinateStyleIndex = source.indexOf("left: window.innerWidth < 640 ? 0 : x,");
      const outerAnimateIndex = source.lastIndexOf("animate={{", coordinateStyleIndex);
      const outerAnimate = source.slice(outerAnimateIndex, source.indexOf("        exit={{", outerAnimateIndex));
      expect(outerAnimate).not.toMatch(/\b(?:width|height|left|top):/);
      expect(source).toContain("w-full h-2 cursor-n-resize");
      expect(source).toContain("h-full w-2 cursor-w-resize");
      expect(source).toContain("w-5 h-5 cursor-se-resize");
    }

    const settingsSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/contexts/SettingsContext.tsx"), "utf8");
    expect(settingsSource).toContain('import { resetPersistedFloatingWindowGeometry } from "../hooks/useResizable";');
    expect(settingsSource).toContain("resetPersistedFloatingWindowGeometry();");
  });

  it("keeps the Settings drawer on one motion-owned entry path and uses native neutral reset feedback", () => {
    const settingsSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/components/modals/SettingsModal.tsx"), "utf8");
    const workspaceSource = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/Workspace.tsx"), "utf8");
    const drawerStart = settingsSource.indexOf("{/* Core settings cabinet drawer panel */}");
    const drawerEnd = settingsSource.indexOf("{/* Scoped CSS Blocker injected directly inside panel */}");
    const drawerSource = settingsSource.slice(drawerStart, drawerEnd);

    expect(drawerSource).toContain("initial={false}");
    expect(drawerSource).toContain('animate={{ x: isOpen ? 0 : "100%" }}');
    expect(drawerSource).not.toContain('opacity: isOpen ? 1 : 0');
    expect(drawerSource).toContain('ease: [0.22, 0.61, 0.36, 1], duration: 0.6');
    expect(drawerSource).not.toContain("transition-all");
    expect(drawerSource).not.toContain('transform: "none !important"');
    expect(settingsSource).toContain("inert={!isOpen}");
    expect(settingsSource).toContain('style={{ pointerEvents: isOpen ? "auto" : "none" }}');
    expect(settingsSource).toContain("Settings Reset");
    expect(settingsSource).not.toContain("Settings saved");
    expect(settingsSource).toContain("text-[13px] font-normal text-neutral-500 dark:text-neutral-400");
    expect(settingsSource).not.toContain("text-emerald-600 dark:text-emerald-300");
    expect(settingsSource).toContain("absolute bottom-6 right-6 z-20");
    expect(settingsSource).not.toContain("absolute left-full bottom-[14px] z-20 ml-3");
    expect(workspaceSource).toContain('data-royscript-wordmark aria-label="RoyScript TSR"');
    expect(workspaceSource).not.toContain("mx-2 font-light text-xl");
    expect(workspaceSource).toContain('fontFamily: \'"Allura", "Apple Chancery", "URW Chancery L", "Brush Script MT", cursive\'');
    expect(workspaceSource).toContain("text-[21px] md:text-[23px] font-normal");
    expect(workspaceSource).toContain("mb-[0.02em] ml-[0.19em]");
  });
});
