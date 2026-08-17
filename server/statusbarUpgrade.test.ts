import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createFormattedTextBlob,
  getLineColumn,
  getOffsetForLineColumn,
  getSelectionRange,
  normalizeLineEndings,
  readFormattedTextFile,
} from "../client/src/lib/statusBar";

const workspacePath = path.resolve(import.meta.dirname, "../client/src/pages/Workspace.tsx");
const lexkitStylesPath = path.resolve(import.meta.dirname, "../client/src/components/lexkit/styles.css");
const workspaceStylesPath = path.resolve(import.meta.dirname, "../client/src/index.css");
const defaultTemplatePath = path.resolve(import.meta.dirname, "../client/src/components/lexkit/DefaultTemplate.tsx");

describe("RoyScript status-bar behavior", () => {
  it("reports caret positions correctly across CRLF, LF, and CR documents", () => {
    expect(getLineColumn("one\r\ntwo\rthree\nfour", 0)).toEqual({ line: 1, column: 1 });
    expect(getLineColumn("one\r\ntwo\rthree\nfour", 5)).toEqual({ line: 2, column: 1 });
    expect(getLineColumn("one\r\ntwo\rthree\nfour", 13)).toEqual({ line: 3, column: 5 });
    expect(getOffsetForLineColumn("one\r\ntwo\rthree\nfour", 4, 2)).toBe(16);
  });

  it("keeps selection counts bounded and uses character-count semantics", () => {
    expect(getSelectionRange({ text: "abcdef", anchor: 5, focus: 2 })).toEqual({ start: 2, end: 5, count: 3 });
    expect(getSelectionRange({ text: "abcdef", anchor: -4, focus: 99 })).toEqual({ start: 0, end: 6, count: 6 });
    expect(getSelectionRange({ text: "abcdef", anchor: null, focus: 3 })).toBeNull();
  });

  it("serializes the selected line ending and can round-trip every supported text encoding", async () => {
    expect(normalizeLineEndings("a\nb\rc\r\nd", "crlf")).toBe("a\r\nb\r\nc\r\nd");

    for (const encoding of ["utf-8", "utf-8-bom", "utf-16le", "utf-16be"] as const) {
      const blob = createFormattedTextBlob("alpha\nbeta", { encoding, lineEnding: "lf", tabSize: 4 });
      const loaded = await readFormattedTextFile(new File([blob], `fixture-${encoding}.txt`));
      expect(loaded.text).toBe("alpha\nbeta");
      expect(loaded.format.encoding).toBe(encoding);
      expect(loaded.format.lineEnding).toBe("lf");
    }
  });

  it("keeps the approved compact footer while wiring real interactive controls", () => {
    const source = fs.readFileSync(workspacePath, "utf8");

    expect(source).toContain("onStatusChange={setEditorStatus}");
    expect(source).toContain("getLineColumn(editorStatus.text, editorStatus.focus)");
    expect(source).toContain("getSelectionRange(editorStatus)");
    expect(source).toContain("aria-label=\"Editor zoom\"");
    expect(source).toContain("type=\"range\" min=\"20\" max=\"300\" step=\"10\"");
    expect(source).toContain("lineEndingLabel(activeTabFormat.lineEnding)");
    expect(source).toContain("encodingLabel(activeTabFormat.encoding)");
    expect(source).toContain("createFormattedTextBlob(content, activeTabFormat)");
    expect(source).toContain("data-statusbar-control");
    expect(source).toContain('updateActiveTabFormat({ indentMode: "tabs" })');
  });

  it("keeps the saved-content baseline available without placing a dirty marker in the default footer", () => {
    const source = fs.readFileSync(workspacePath, "utf8");
    const footer = source.slice(source.indexOf("data-workspace-statusbar"), source.indexOf('{mode === "Practice"'));

    expect(source).toContain('"revertActiveTab"');
    expect(source).toContain("savedFormat?: TabFormat");
    expect(source).toContain("format: normalizeTabFormat(candidate.savedFormat)");
    expect(source).toContain("savedFormat: activeTabFormat");
    expect(footer).not.toContain("Unsaved changes");
    expect(footer).not.toContain("rounded-full bg-neutral-400");
  });

  it("applies the selected zoom percentage to the editable surface and exposes a Notepads-style flyout", () => {
    const workspaceSource = fs.readFileSync(workspacePath, "utf8");
    const lexkitStyles = fs.readFileSync(lexkitStylesPath, "utf8");
    const workspaceStyles = fs.readFileSync(workspaceStylesPath, "utf8");

    expect(workspaceSource).toContain('"--royscript-editor-zoom": `${Math.round(editorZoom * 100)}%`');
    expect(workspaceSource).toContain("data-statusbar-zoom-flyout");
    expect(workspaceSource).toContain('aria-label="Zoom out"');
    expect(workspaceSource).toContain('aria-label="Zoom in"');
    expect(workspaceSource).toContain(">Zoom {Math.round(editorZoom * 100)}%</button>");
    expect(workspaceSource).toContain('<span>Zoom</span>');
    expect(workspaceSource).toContain("Restore default zoom");
    expect(workspaceSource).toContain('"--statusbar-zoom-progress"');
    expect(lexkitStyles).toContain("font-size: var(--royscript-editor-zoom, 100%) !important;");
    expect(workspaceStyles).toContain(".statusbar-zoom-slider::-webkit-slider-thumb");
    expect(workspaceStyles).toContain("background: linear-gradient(90deg, #0078d4 0 var(--statusbar-zoom-progress, 0%), #8e8e8e");
    expect(workspaceStyles).toContain("height: 14px;");
    expect(workspaceStyles).toContain("width: 8px;");
    expect(workspaceStyles).toContain("border-radius: 3px;");
    expect(workspaceStyles).toContain("background: transparent;");
    expect(workspaceStyles).toContain(".statusbar-zoom-slider::-moz-range-progress");
  });

  it("keeps Windows-style footer cells separated and moves indentation out of the primary readout", () => {
    const source = fs.readFileSync(workspacePath, "utf8");
    const footer = source.slice(source.indexOf("data-workspace-statusbar"), source.indexOf('{mode === "Practice"'));
    const positionCell = footer.slice(footer.indexOf("data-statusbar-position"), footer.indexOf("data-statusbar-exam-wpm"));

    expect(footer).toContain("data-statusbar-position");
    expect(positionCell).toContain("cursor-default");
    expect(positionCell).not.toContain("aria-haspopup=\"dialog\"");
    expect(positionCell).not.toContain("Go to position");
    expect(footer).toContain("flex flex-1 min-w-0 items-stretch overflow-hidden");
    expect(footer).toContain("border-l border-black/[0.06]");
    expect(footer).toContain("data-statusbar-exam-wpm");
    expect(footer).toContain('className="truncate whitespace-nowrap"');
    expect(footer).toContain('className="ml-2.5"');
    expect(footer).not.toContain("Spaces:");
    expect(footer).not.toContain('statusMenu === "tabSize"');
    expect(footer).not.toContain("Unsaved changes");
    expect(source).toContain("Indentation");
  });

  it("leaves the ordinary spacebar path native while retaining only the explicit Tab indentation override", () => {
    const templateSource = fs.readFileSync(defaultTemplatePath, "utf8");

    expect(templateSource).toContain('if (e.key !== "Tab"');
    expect(templateSource).not.toContain('e.key === " "');
    expect(templateSource).not.toContain('e.code === "Space"');
  });
});
