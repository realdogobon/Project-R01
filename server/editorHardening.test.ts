import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { matchesKeyboardShortcut } from "../client/src/components/lexkit/commands";
import { calculateFloatingToolbarPosition } from "../client/src/components/lexkit/floatingToolbarPosition";
import { DEFAULT_AUTOMATIC_TAB_TITLE, deriveAutomaticTabTitle, isAutomaticallyNamedTab, makeCompactTabPreview, TASK_VIEW_DESCRIPTION_PREVIEW_MAX_LENGTH, TASK_VIEW_TITLE_PREVIEW_MAX_LENGTH, UNSAVED_DIALOG_TITLE_PREVIEW_MAX_LENGTH } from "../client/src/lib/tabTitle";

const projectRoot = path.resolve(import.meta.dirname, "..");
const readProjectFile = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

describe("approved editor hardening contracts", () => {
  it("accepts Ctrl on Windows and Cmd on macOS for a primary editor shortcut without accepting unrelated modifiers", () => {
    const shortcut = { key: "b", ctrlKey: true };

    expect(matchesKeyboardShortcut({ key: "b", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false }, shortcut)).toBe(true);
    expect(matchesKeyboardShortcut({ key: "b", ctrlKey: false, metaKey: true, shiftKey: false, altKey: false }, shortcut)).toBe(true);
    expect(matchesKeyboardShortcut({ key: "b", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }, shortcut)).toBe(false);
    expect(matchesKeyboardShortcut({ key: "b", ctrlKey: true, metaKey: false, shiftKey: true, altKey: false }, shortcut)).toBe(false);
  });

  it("keeps command palette Enter and Escape owned by the palette while exposing a transient-overlay gate to Workspace", () => {
    const palette = readProjectFile("client/src/components/lexkit/CommandPalette.tsx");
    const workspace = readProjectFile("client/src/pages/Workspace.tsx");
    const dialog = readProjectFile("client/src/components/lexkit/components.tsx");

    expect(palette).toContain("data-royscript-transient-overlay");
    expect(palette).toContain('case "Enter":');
    expect(palette).toContain("e.stopImmediatePropagation();");
    expect(palette).toContain('window.addEventListener("keydown", handleKeyDown, true)');
    expect(palette).toContain("executeCommand(flatCommands[selectedIndex], true)");
    expect(palette).toContain("window.setTimeout(closeAndDispatch, 0)");
    expect(dialog).toContain("data-royscript-transient-overlay");
    expect(workspace).toContain('document.querySelector("[data-royscript-transient-overlay]")');
    expect(workspace).toContain("(isCtrlK || isEscape) && !isTransientOverlayOpen");
  });

  it("renders Task View through the shared centred Command Palette surface without replacing tab safety flows", () => {
    const workspace = readProjectFile("client/src/pages/Workspace.tsx");

    expect(workspace).toContain('placeholder="Search open tabs…"');
    expect(workspace).toContain('className="lexkit-command-palette-overlay"');
    expect(workspace).toContain('className="lexkit-command-palette"');
    expect(workspace).toContain('className="lexkit-command-palette-header"');
    expect(workspace).toContain('className="lexkit-command-palette-list"');
    expect(workspace).toContain('className="lexkit-command-palette-footer"');
    expect(workspace).toContain("data-royscript-transient-overlay data-workspace-tab-overview");
    expect(workspace).toContain("createPortal(");
    expect(workspace).toContain("filteredTabOverviewTabs");
    expect(workspace).toContain('setIsTabOverviewOpen(false); switchTab(tab.id);');
    expect(workspace).toContain("initiateTabClose(tab.id, event)");
    expect(workspace).toContain("const canCloseFromOverview = !tab.examSealed");
    expect(workspace).toContain('examStatus === "running" || examStatus === "countdown"');
    expect(workspace).toContain("data-workspace-tab-close-all");
  });

  it("keeps Task View rows free of redundant icons, headings, and dirty-dot decoration", () => {
    const workspace = readProjectFile("client/src/pages/Workspace.tsx");

    expect(workspace).not.toContain('<FileText size={16} className="lexkit-command-palette-icon shrink-0" />');
    expect(workspace).not.toContain('className="lexkit-command-palette-group-title">Open tabs');
    expect(workspace).not.toContain('tab.isDirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-55" />');
  });

  it("derives an auto-named tab from its first meaningful visible line while preserving deliberate titles", () => {
    expect(deriveAutomaticTabTitle("")).toBe(DEFAULT_AUTOMATIC_TAB_TITLE);
    expect(deriveAutomaticTabTitle("\n  ## Project outline\nSecond line")).toBe("Project outline");
    expect(deriveAutomaticTabTitle("> [Guide](https://example.com)\nSecond line")).toBe("Guide");
    expect(isAutomaticallyNamedTab({ name: "New Document" })).toBe(true);
    expect(isAutomaticallyNamedTab({ name: "New Document 4" })).toBe(true);
    expect(isAutomaticallyNamedTab({ name: "My saved note.md", isAutoNamed: false })).toBe(false);
  });

  it("keeps Task View labels as compact visual previews while retaining full title state for search", () => {
    const longTitle = "Quarterly planning notes for customer research, release coordination, and durable documentation across the entire operating calendar";

    expect(makeCompactTabPreview(longTitle, TASK_VIEW_TITLE_PREVIEW_MAX_LENGTH)).toBe("Quarterly planning notes for customer research, release coordination,…");
    expect(makeCompactTabPreview("singlewordwithoutbreaks".repeat(8), 20)).toBe("singlewordwithoutbr…");
    expect(makeCompactTabPreview("First line\nSecond line\nThird line", TASK_VIEW_DESCRIPTION_PREVIEW_MAX_LENGTH)).toBe("First line Second line Third line");

    const workspace = readProjectFile("client/src/pages/Workspace.tsx");
    expect(workspace).toContain("TASK_VIEW_TITLE_PREVIEW_MAX_LENGTH");
    expect(workspace).toContain("TASK_VIEW_DESCRIPTION_PREVIEW_MAX_LENGTH");
    expect(workspace).toContain('className="block w-full max-w-full truncate"');
    expect(workspace).toContain("lexkit-command-palette-item-title min-w-0 overflow-hidden");
  });

  it("contains Escape inside the dirty-close confirmation instead of leaking it to Settings", () => {
    const workspace = readProjectFile("client/src/pages/Workspace.tsx");

    expect(workspace).toContain("data-royscript-transient-overlay");
    expect(workspace).toContain("handleUnsavedPopupEscape");
    expect(workspace).toContain('window.addEventListener("keydown", handleUnsavedPopupEscape, true)');
    expect(workspace).toContain("setIsUnsavedPopupOpen(false);");
  });

  it("keeps a guarded Task View close confirmation in the foreground without exposing full document titles", () => {
    const workspace = readProjectFile("client/src/pages/Workspace.tsx");
    const closeInitiator = workspace.slice(workspace.indexOf("const initiateTabClose"), workspace.indexOf("const createNewTab"));

    expect(workspace).toContain("data-workspace-unsaved-popup");
    expect(workspace).toContain("z-[10050]");
    expect(workspace).toContain("getPendingActionTitlePreview");
    expect(workspace).toContain("makeCompactTabPreview(pendingTabName, UNSAVED_DIALOG_TITLE_PREVIEW_MAX_LENGTH)");
    expect(workspace).toContain('className="mt-0.5 block max-w-full truncate"');
    expect(workspace).not.toContain("title={tab.name}");
    expect(workspace).not.toContain("title={previewText}");
    expect(workspace).not.toContain("`Close ${tab.name}`");
    expect(closeInitiator).not.toContain("setIsTabOverviewOpen(false)");
    expect(workspace).toContain("doCloseTab(tabId);");
    expect(workspace).toContain("data-workspace-fallback-modal");
    expect(workspace).toContain("z-[10060]");
    expect(workspace).toContain('target.closest("[data-workspace-unsaved-popup], [data-workspace-fallback-modal]")');
    expect(workspace).toContain('!document.querySelector("[data-workspace-unsaved-popup], [data-workspace-fallback-modal]")');
  });

  it("limits unsaved-dialog names more tightly than the Task View while keeping them readable", () => {
    const longTitle = "Save-path verification note with a compact preview title only";
    const preview = makeCompactTabPreview(longTitle, UNSAVED_DIALOG_TITLE_PREVIEW_MAX_LENGTH);

    expect(UNSAVED_DIALOG_TITLE_PREVIEW_MAX_LENGTH).toBeLessThan(TASK_VIEW_TITLE_PREVIEW_MAX_LENGTH);
    expect(preview.length).toBeLessThanOrEqual(UNSAVED_DIALOG_TITLE_PREVIEW_MAX_LENGTH);
    expect(preview).toMatch(/…$/);
  });

  it("removes the global blue caret override, preserves localized caret inheritance, and restores combined decorations", () => {
    const indexCss = readProjectFile("client/src/index.css");
    const styles = readProjectFile("client/src/components/lexkit/styles.css");

    expect(indexCss).not.toContain("caret-color: #3b82f6 !important");
    expect(indexCss).not.toContain("caret-color: #60a5fa !important");
    expect(styles).toContain("caret-color: currentColor");
    expect(styles).toContain(".lexkit-text-underlineStrikethrough");
    expect(styles).toContain("text-decoration: underline line-through");
  });

  it("ships a renderer bridge for package-host-owned browser-reserved accelerators", () => {
    const workspace = readProjectFile("client/src/pages/Workspace.tsx");
    const bridge = readProjectFile("client/src/lib/desktopShortcuts.ts");

    expect(workspace).toContain("installRoyScriptDesktopShortcutBridge()");
    expect(workspace).toContain("const isCtrlT");
    expect(bridge).toContain('ROYSCRIPT_DESKTOP_SHORTCUT_EVENT = "royscript-desktop-shortcut"');
    expect(bridge).toContain("dispatchRoyScriptDesktopShortcut");
  });

  it("uses LexKit-style below-first placement while protecting RoyScript's persistent top chrome", () => {
    const topSelection = calculateFloatingToolbarPosition({
      selectionRect: { left: 20, right: 120, top: 92, bottom: 114, width: 100, height: 22 },
      viewportWidth: 1280,
      viewportHeight: 720,
      toolbarWidth: 560,
      toolbarHeight: 44,
      protectedTop: 84,
    });

    expect(topSelection.placement).toBe("below");
    expect(topSelection.y).toBeGreaterThanOrEqual(94);
    expect(topSelection.x).toBe(10);

    const bottomSelection = calculateFloatingToolbarPosition({
      selectionRect: { left: 620, right: 700, top: 676, bottom: 698, width: 80, height: 22 },
      viewportWidth: 1280,
      viewportHeight: 720,
      toolbarWidth: 560,
      toolbarHeight: 44,
      protectedTop: 84,
    });

    expect(bottomSelection.placement).toBe("above");
    expect(bottomSelection.y).toBe(624);

    const rightEdgeSelection = calculateFloatingToolbarPosition({
      selectionRect: { left: 1190, right: 1230, top: 300, bottom: 322, width: 40, height: 22 },
      viewportWidth: 1280,
      viewportHeight: 720,
      toolbarWidth: 560,
      toolbarHeight: 44,
      protectedTop: 84,
    });

    expect(rightEdgeSelection.positionFromRight).toBe(true);
    expect(rightEdgeSelection.x).toBe(710);
  });

  it("keeps the selection flyout on the shared LexKit geometry path instead of a hard-coded above-only calculation", () => {
    const template = readProjectFile("client/src/components/lexkit/DefaultTemplate.tsx");

    expect(template).toContain("calculateFloatingToolbarPosition");
    expect(template).toContain('document.querySelector(".lexkit-editor-header")');
    expect(template).toContain('window.addEventListener("scroll", updatePosition, true)');
    expect(template).not.toContain("rect.top - toolbarHeight - 10");
  });

  it("retains LexKit's native wrapped, grouped command-surface composition instead of forcing a single continuous strip", () => {
    const template = readProjectFile("client/src/components/lexkit/DefaultTemplate.tsx");

    expect(template).toContain("maxWidth: 400");
    expect(template).toContain('flexWrap: "wrap"');
    expect(template).not.toContain('flexWrap: "nowrap"');
    expect(template).toContain('className="w-px h-6 bg-border mx-1"');
  });
});
