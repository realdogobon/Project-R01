import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyPracticeSessionToProgression,
  createEmptyAchievementLedger,
  createEmptyProgressionRecord,
  getAchievementProgress,
  isCountablePracticeSession,
  isLevelQualityPracticeSession,
  isQualifyingPracticeSession,
  migrateLegacyProgression,
  reconcileAchievementLedger,
  type ProgressionSession,
} from "../client/src/lib/progression";

const now = "2026-08-20T00:00:00.000Z";

function practice(id: string, overrides: Partial<ProgressionSession> = {}): ProgressionSession {
  return { id, type: "Practice", speed: 44, accuracy: 94, duration: 120, date: now, ...overrides };
}

describe("unified Practice progression policy", () => {
  it("credits ordinary completed Practice runs while reserving speed and accuracy for the promotion-quality gate", () => {
    expect(isQualifyingPracticeSession(practice("qualified"), 1)).toBe(true);
    expect(isCountablePracticeSession(practice("normal-five-session-run", { speed: 28, accuracy: 78, duration: 15 }), 1)).toBe(true);
    expect(isLevelQualityPracticeSession(practice("slow", { speed: 39 }), 1)).toBe(false);
    expect(isLevelQualityPracticeSession(practice("inaccurate", { accuracy: 91 }), 1)).toBe(false);
    expect(isCountablePracticeSession(practice("brief", { duration: 4 }), 1)).toBe(false);
    expect(isQualifyingPracticeSession(practice("exam", { type: "Exam" }), 1)).toBe(false);
  });

  it("rebuilds normal eligible Practice history into visible progress after a policy repair", () => {
    const history = Array.from({ length: 5 }, (_, index) => practice(`ordinary-${index}`, { speed: 31, accuracy: 82, duration: 15 }));
    const rebuilt = migrateLegacyProgression(history);

    expect(rebuilt.version).toBe(2);
    expect(rebuilt.level).toBe(1);
    expect(rebuilt.levelCredits).toBe(5);
    expect(rebuilt.creditedSessionIds).toHaveLength(5);
  });

  it("credits a qualified Practice session only once and never credits an Exam session", () => {
    const record = createEmptyProgressionRecord();
    const qualifying = practice("once");
    const history = new Map([[qualifying.id, qualifying]]);
    const first = applyPracticeSessionToProgression(record, qualifying, history);
    const duplicate = applyPracticeSessionToProgression(first.record, qualifying, history);
    const exam = applyPracticeSessionToProgression(first.record, practice("exam", { type: "Exam" }), history);

    expect(first.credited).toBe(true);
    expect(first.record.levelCredits).toBe(1);
    expect(duplicate.credited).toBe(false);
    expect(duplicate.record.levelCredits).toBe(1);
    expect(exam.credited).toBe(false);
    expect(exam.record.levelCredits).toBe(1);
  });

  it("requires the Level 1 rolling evidence before producing the durable Level 2 milestone", () => {
    const evidence = Array.from({ length: 19 }, (_, index) => practice(`evidence-${index}`));
    const finalSession = practice("final-evidence");
    const history = new Map([...evidence, finalSession].map((session) => [session.id, session]));
    const result = applyPracticeSessionToProgression({
      ...createEmptyProgressionRecord(),
      levelCredits: 999,
      creditedSessionIds: evidence.map((session) => session.id),
      rollingQualifiedSessionIds: evidence.map((session) => session.id),
    }, finalSession, history);

    expect(result.credited).toBe(true);
    expect(result.record.level).toBe(2);
    expect(result.record.levelCredits).toBe(0);
    expect(result.milestone).toMatchObject({ previousLevel: 1, previousLevelGoal: 1000, nextLevel: 2, nextLevelGoal: 1100 });
  });
});

describe("permanent anti-farming achievements", () => {
  it("does not treat brief high-speed runs or Exam sessions as Velocity evidence", () => {
    const sessions = [
      practice("brief-speed", { speed: 95, duration: 30 }),
      practice("exam-speed", { type: "Exam", speed: 95, duration: 300 }),
    ];
    const ledger = reconcileAchievementLedger(createEmptyAchievementLedger(), sessions, [], now);
    expect(ledger.unlocks.velocity_90).toBeUndefined();
  });

  it("records a permanent unlock with evidence while allowing only live locked-row progress to fall after deletion", () => {
    const sessions = [practice("first-finish", { speed: 31, accuracy: 82, duration: 15 })];
    const ledger = reconcileAchievementLedger(createEmptyAchievementLedger(), sessions, [], now);
    const afterDeletion = getAchievementProgress(ledger, [], []);
    const firstFinish = afterDeletion.find((achievement) => achievement.id === "foundation_first_finish");

    expect(ledger.unlocks.foundation_first_finish?.evidenceIds).toEqual(["first-finish"]);
    expect(firstFinish).toMatchObject({ unlocked: true, current: 0, target: 1 });
  });

  it("counts distinct draft IDs once and retains the Craft unlock after the draft is removed", () => {
    const files = [{ id: "draft-a", updatedAt: now }, { id: "draft-a", updatedAt: now }];
    const ledger = reconcileAchievementLedger(createEmptyAchievementLedger(), [], files, now);
    const afterDeletion = getAchievementProgress(ledger, [], []).find((achievement) => achievement.id === "craft_first");

    expect(ledger.unlocks.craft_first?.evidenceIds).toEqual(["draft-a"]);
    expect(afterDeletion).toMatchObject({ unlocked: true, current: 0, target: 1 });
  });
});

describe("Dashboard and Workspace progression integration", () => {
  it("uses the shared ledger in both consumer surfaces and keeps the level marker bounded and non-idle", () => {
    const dashboard = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/components/dashboard/WorkspaceDashboard.tsx"), "utf8");
    const workspace = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/Workspace.tsx"), "utf8");
    const marker = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/components/dashboard/LevelStateMarker.tsx"), "utf8");
    const globalStyles = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/index.css"), "utf8");

    expect(dashboard).toContain("getProgressionSummary(progression)");
    expect(dashboard).toContain("const badges = achievements;");
    expect(dashboard).toContain('const ACHIEVEMENT_PATHS = ["Foundation", "Velocity", "Precision", "Endurance", "Consistency", "Craft"] as const;');
    expect(dashboard).toContain("const achievementPaths = useMemo(() => ACHIEVEMENT_PATHS.map");
    expect(dashboard).toContain("aria-expanded={isExpanded}");
    expect(dashboard).toContain('aria-label={`${isExpanded ? "Collapse" : "Expand"} ${path.category} achievements`}');
    expect(dashboard).toContain("path.milestones.map((milestone)");
    expect(dashboard).toContain('text-[14px]');
    expect(dashboard).toContain('leading-5');
    expect(dashboard).toContain('text-[#1E1E1F] dark:text-[#EAEAEA]');
    expect(dashboard).toContain('data-achievement-path-row={path.category}');
    expect(dashboard).toContain('data-achievement-hover-detail');
    expect(dashboard).toContain('data-achievement-milestone-hover-detail');
    expect(dashboard).toContain('overflow-visible');
    expect(dashboard).toContain('animation: "none", transform: "none"');
    expect(dashboard).toContain('milestone.unlock?.unlockedAt');
    expect(dashboard).toContain('tabIndex={0}');
    expect(dashboard).toContain('group-hover/milestone:opacity-100');
    expect(dashboard).toContain('group-focus/milestone:opacity-100');
    expect(globalStyles).toContain("[data-achievement-path-row]:active:not(:disabled)");
    expect(globalStyles).toContain("The global active press-scale moves that hit area");
    expect(dashboard).not.toContain("path.earnedCount} / {path.milestones.length} earned");
    expect(dashboard).not.toContain("Next · ${path.nextMilestone.title}");
    expect(dashboard).not.toContain("milestone.current.toLocaleString()");
    expect(dashboard).toContain("qualifying sessions");
    expect(dashboard).not.toContain("const XP_PER_LEVEL = 1000");
    expect(workspace).toContain("getProgressionSummary(progression)");
    expect(workspace).not.toContain("const totalXP");
    expect(marker).toContain("Math.min(Math.max(level, 1), 10)");
    expect(marker).toContain("posture === 1");
    expect(marker).toContain("posture === 10");
    expect(marker).not.toContain("animate-pulse");
  });

  it("stabilizes dark native filter and sort controls without changing their behavior", () => {
    const dashboard = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/components/dashboard/WorkspaceDashboard.tsx"), "utf8");
    const sessionSelects = (dashboard.match(/<select[\s\S]*?<\/select>/g) ?? []).filter((select) => select.includes("sessionFilter"));

    expect(sessionSelects).toHaveLength(1);
    for (const select of sessionSelects) {
      expect(select).toContain("[color-scheme:light] dark:[color-scheme:dark]");
      expect(select).toContain("transition-[background-color,border-color,color] duration-150");
      expect(select).not.toContain("transition-all");
    }

    const sessionHistory = dashboard.slice(
      dashboard.indexOf('activeTab === "sessions"'),
      dashboard.indexOf('activeTab === "files"'),
    );

    expect(sessionHistory).toContain('placeholder="Search records..."');
    expect(sessionHistory).toContain("transition-[background-color] duration-150");
    expect(sessionHistory).toContain("isolate bg-white dark:bg-neutral-950");
    expect(sessionHistory).toContain("bg-white dark:bg-neutral-950 [contain:paint]");
    expect(sessionHistory).toContain("transition-colors duration-150 group");
    expect(sessionHistory).toContain('<Select value={sessionSort} onValueChange={(value) => setSessionSort(value as typeof sessionSort)}>');
    expect(sessionHistory).toContain("data-session-sort-trigger");
    expect(sessionHistory).toContain('aria-label="Sort Session History"');
    expect(sessionHistory).toContain("z-[250] min-w-[var(--radix-select-trigger-width)]");
    expect(sessionHistory).not.toContain('<select\n                      value={sessionSort}');
    expect(sessionHistory).not.toContain("transition-all");
  });
});
