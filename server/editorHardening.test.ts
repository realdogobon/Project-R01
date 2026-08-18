import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { matchesKeyboardShortcut } from "../client/src/components/lexkit/commands";
import { calculateFloatingToolbarPosition } from "../client/src/components/lexkit/floatingToolbarPosition";

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
