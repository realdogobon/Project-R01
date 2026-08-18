import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createCommandPaletteExecutionGuard } from "../client/src/components/lexkit/commandPaletteSafety";

const templatePath = path.resolve(import.meta.dirname, "../client/src/components/lexkit/DefaultTemplate.tsx");
const palettePath = path.resolve(import.meta.dirname, "../client/src/components/lexkit/CommandPalette.tsx");

describe("Command Palette selection and history safety", () => {
  it("restores the editor-owned selection after palette focus yields and before the selected command runs", () => {
    const events: string[] = [];
    const guard = createCommandPaletteExecutionGuard<string>({
      focusEditor: () => events.push("focus-editor"),
      restoreSelection: (selection, afterRestore) => {
        events.push(`restore:${selection}`);
        afterRestore();
      },
    });

    guard.capture("selected-link-alpha");
    guard.execute(() => events.push("run-heading-2"));

    expect(events).toEqual([
      "restore:selected-link-alpha",
      "run-heading-2",
      "focus-editor",
    ]);
  });

  it("does not replay a stale selection into a later palette command", () => {
    const events: string[] = [];
    const guard = createCommandPaletteExecutionGuard<string>({
      focusEditor: () => undefined,
      restoreSelection: (selection, afterRestore) => {
        events.push(`restore:${selection}`);
        afterRestore();
      },
    });

    guard.capture("paragraph-two");
    guard.execute(() => events.push("run-heading-1"));
    guard.execute(() => events.push("run-quote"));

    expect(events).toEqual([
      "restore:paragraph-two",
      "run-heading-1",
      "run-quote",
    ]);
  });

  it("does not dispatch a palette command until the selection restore has committed", () => {
    const events: string[] = [];
    let commitRestore: (() => void) | null = null;
    const guard = createCommandPaletteExecutionGuard<string>({
      focusEditor: () => events.push("focus-editor"),
      restoreSelection: (selection, afterRestore) => {
        events.push(`restore:${selection}`);
        commitRestore = afterRestore;
      },
    });

    guard.capture("paragraph-start");
    guard.execute(() => events.push("run-heading-1"));

    expect(events).toEqual(["restore:paragraph-start"]);
    commitRestore?.();
    expect(events).toEqual([
      "restore:paragraph-start",
      "run-heading-1",
      "focus-editor",
    ]);
  });

  it("keeps palette ownership separate from toolbar shortcuts and routes execution through the selection-safe boundary", () => {
    const template = fs.readFileSync(templatePath, "utf8");
    const palette = fs.readFileSync(palettePath, "utf8");

    expect(template).toContain("capturePaletteSelection");
    expect(template).toContain("executePaletteCommand");
    expect(template).toContain("onCommandPaletteOpen={openCommandPalette}");
    expect(template).toContain("onExecute={executePaletteCommand}");
    expect(template).toContain("focusEditor: () => editor?.focus()");
    expect(template).toContain("$setSelection(selectionSnapshot.clone())");
    expect(template).toContain("{ onUpdate: afterRestore }");
    expect(template).toContain("paletteSelectionRef.current = null");
    expect(template).toContain("requestAnimationFrame");
    expect(template).toContain("registerKeyboardShortcuts(commands, document.body)");

    expect(palette).toContain("onExecute?: (action: () => void) => void");
    expect(palette).toContain("const executeCommand = (command: CommandPaletteItem, afterKeyboardEvent = false) =>");
    expect(palette).toContain("window.setTimeout(closeAndDispatch, 0)");
    expect(palette).toContain("onExecute ? onExecute(command.action) : command.action()");
  });
});
