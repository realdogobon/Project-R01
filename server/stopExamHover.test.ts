import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(
  new URL("../client/src/pages/Workspace.tsx", import.meta.url),
  "utf8",
);

describe("Stop-Exam title-bar hover", () => {
  it("keeps the mascot at its fixed title-bar size on hover and press", () => {
    const stopExamButton = workspaceSource.match(
      /<button\s+onClick=\{handleExamFinishEarly\}[\s\S]*?title="Stop Exam"[\s\S]*?<\/button>/,
    )?.[0];
    const liveButtonClass = stopExamButton?.match(/className="([^"]+)"/)?.[1];

    expect(stopExamButton).toBeDefined();
    expect(liveButtonClass).toContain("hover:!transform-none");
    expect(liveButtonClass).toContain("active:!transform-none");
    expect(liveButtonClass).toContain("hover:opacity-75");
    expect(stopExamButton).toContain('className="h-14 w-auto object-contain"');
    expect(liveButtonClass).not.toMatch(/hover:scale-|active:scale-/);
  });
});
