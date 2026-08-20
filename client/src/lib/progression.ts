export const PROGRESSION_POLICY_VERSION = 2;
export const ACHIEVEMENT_LEDGER_VERSION = 1;

export type ProgressionSession = {
  id: string;
  type: "Practice" | "Exam";
  speed: number;
  accuracy: number | null;
  duration: number;
  date: string;
};

export type ProgressionFile = { id: string; updatedAt: string };

export type LevelDefinition = {
  level: number;
  title: string;
  requiredCredits: number;
  minWpm: number;
  minAccuracy: number;
  minDurationSeconds: number;
  rollingWindow: number;
};

export const LEVEL_DEFINITIONS: readonly LevelDefinition[] = [
  { level: 1, title: "Novice Copyist", requiredCredits: 1000, minWpm: 40, minAccuracy: 92, minDurationSeconds: 10, rollingWindow: 20 },
  { level: 2, title: "Adept Scribe", requiredCredits: 1100, minWpm: 43, minAccuracy: 93, minDurationSeconds: 10, rollingWindow: 25 },
  { level: 3, title: "Methodical Clerk", requiredCredits: 1250, minWpm: 46, minAccuracy: 94, minDurationSeconds: 15, rollingWindow: 25 },
  { level: 4, title: "Precision Operator", requiredCredits: 1400, minWpm: 49, minAccuracy: 94, minDurationSeconds: 20, rollingWindow: 30 },
  { level: 5, title: "Steady Transcriber", requiredCredits: 1600, minWpm: 52, minAccuracy: 95, minDurationSeconds: 25, rollingWindow: 30 },
  { level: 6, title: "Technical Clerk", requiredCredits: 1800, minWpm: 55, minAccuracy: 95, minDurationSeconds: 30, rollingWindow: 35 },
  { level: 7, title: "Speed Sage", requiredCredits: 2050, minWpm: 58, minAccuracy: 96, minDurationSeconds: 35, rollingWindow: 35 },
  { level: 8, title: "Grand Archivist", requiredCredits: 2350, minWpm: 62, minAccuracy: 96, minDurationSeconds: 40, rollingWindow: 40 },
  { level: 9, title: "Master Stenographer", requiredCredits: 2700, minWpm: 66, minAccuracy: 97, minDurationSeconds: 45, rollingWindow: 40 },
  { level: 10, title: "Legendary Typist", requiredCredits: 3100, minWpm: 70, minAccuracy: 97, minDurationSeconds: 50, rollingWindow: 50 },
];

export type ProgressionRecord = {
  version: number;
  level: number;
  levelCredits: number;
  creditedSessionIds: string[];
  rollingQualifiedSessionIds: string[];
  completedAt: string | null;
};

export type ProgressionMilestone = {
  previousLevel: number;
  previousLevelXP: number;
  previousLevelGoal: number;
  nextLevel: number;
  nextLevelXP: number;
  nextLevelGoal: number;
};

export type ProgressionApplyResult = {
  record: ProgressionRecord;
  credited: boolean;
  milestone: ProgressionMilestone | null;
};

export function createEmptyProgressionRecord(): ProgressionRecord {
  return {
    version: PROGRESSION_POLICY_VERSION,
    level: 1,
    levelCredits: 0,
    creditedSessionIds: [],
    rollingQualifiedSessionIds: [],
    completedAt: null,
  };
}

export function getLevelDefinition(level: number): LevelDefinition {
  return LEVEL_DEFINITIONS[Math.min(Math.max(level, 1), LEVEL_DEFINITIONS.length) - 1];
}

/**
 * A completed, scored Practice run earns one training credit. Performance is
 * assessed at the promotion gate across a rolling sample, not by discarding
 * normal daily practice one run at a time.
 */
export function isCountablePracticeSession(session: ProgressionSession, level = 1): boolean {
  const definition = getLevelDefinition(level);
  return session.type === "Practice"
    && typeof session.accuracy === "number"
    && session.duration >= definition.minDurationSeconds;
}

export function isLevelQualityPracticeSession(session: ProgressionSession, level = 1): boolean {
  const definition = getLevelDefinition(level);
  return isCountablePracticeSession(session, level)
    && session.speed >= definition.minWpm
    && (session.accuracy ?? 0) >= definition.minAccuracy;
}

/** @deprecated Prefer isCountablePracticeSession for credit eligibility. */
export function isQualifyingPracticeSession(session: ProgressionSession, level = 1): boolean {
  return isCountablePracticeSession(session, level);
}

function meetsRollingAudit(sessions: ProgressionSession[], definition: LevelDefinition): boolean {
  if (sessions.length < definition.rollingWindow) return false;
  const averageWpm = sessions.reduce((sum, session) => sum + session.speed, 0) / sessions.length;
  const averageAccuracy = sessions.reduce((sum, session) => sum + (session.accuracy ?? 0), 0) / sessions.length;
  return averageWpm >= definition.minWpm && averageAccuracy >= definition.minAccuracy;
}

export function applyPracticeSessionToProgression(
  record: ProgressionRecord,
  session: ProgressionSession,
  historyById: ReadonlyMap<string, ProgressionSession>,
): ProgressionApplyResult {
  const normalized: ProgressionRecord = {
    ...record,
    version: PROGRESSION_POLICY_VERSION,
    level: Math.min(Math.max(record.level, 1), LEVEL_DEFINITIONS.length),
    creditedSessionIds: [...new Set(record.creditedSessionIds)],
    rollingQualifiedSessionIds: [...new Set(record.rollingQualifiedSessionIds)],
  };
  const definition = getLevelDefinition(normalized.level);

  if (normalized.completedAt || normalized.creditedSessionIds.includes(session.id) || !isQualifyingPracticeSession(session, definition.level)) {
    return { record: normalized, credited: false, milestone: null };
  }

  const creditedSessionIds = [...normalized.creditedSessionIds, session.id];
  const rollingQualifiedSessionIds = [...normalized.rollingQualifiedSessionIds, session.id].slice(-definition.rollingWindow);
  const nextRecord: ProgressionRecord = {
    ...normalized,
    levelCredits: Math.min(normalized.levelCredits + 1, definition.requiredCredits),
    creditedSessionIds,
    rollingQualifiedSessionIds,
  };

  if (nextRecord.levelCredits < definition.requiredCredits) {
    return { record: nextRecord, credited: true, milestone: null };
  }

  const rollingSessions = rollingQualifiedSessionIds
    .map((id) => historyById.get(id))
    .filter((candidate): candidate is ProgressionSession => Boolean(candidate));

  if (!meetsRollingAudit(rollingSessions, definition)) {
    return { record: nextRecord, credited: true, milestone: null };
  }

  if (definition.level === LEVEL_DEFINITIONS.length) {
    return {
      record: { ...nextRecord, completedAt: session.date },
      credited: true,
      milestone: null,
    };
  }

  const nextDefinition = getLevelDefinition(definition.level + 1);
  return {
    record: {
      ...nextRecord,
      level: nextDefinition.level,
      levelCredits: 0,
      rollingQualifiedSessionIds: [],
    },
    credited: true,
    milestone: {
      previousLevel: definition.level,
      previousLevelXP: definition.requiredCredits,
      previousLevelGoal: definition.requiredCredits,
      nextLevel: nextDefinition.level,
      nextLevelXP: 0,
      nextLevelGoal: nextDefinition.requiredCredits,
    },
  };
}

export function migrateLegacyProgression(sessions: ProgressionSession[]): ProgressionRecord {
  const history = new Map<string, ProgressionSession>();
  const ordered = [...sessions]
    .filter((session) => session.type === "Practice")
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
  let record = createEmptyProgressionRecord();
  for (const session of ordered) {
    history.set(session.id, session);
    record = applyPracticeSessionToProgression(record, session, history).record;
  }
  return record;
}

export function getProgressionSummary(record: ProgressionRecord) {
  const definition = getLevelDefinition(record.level);
  const completed = Boolean(record.completedAt);
  const credits = completed ? definition.requiredCredits : record.levelCredits;
  return {
    level: definition.level,
    title: definition.title,
    credits,
    requiredCredits: definition.requiredCredits,
    progressPercent: Math.round((credits / definition.requiredCredits) * 100),
    completed,
  };
}

export type AchievementCategory = "Foundation" | "Velocity" | "Precision" | "Endurance" | "Consistency" | "Craft";
export type AchievementMetric = "practiceCount" | "qualifiedCount" | "speed" | "accuracy" | "perfectCount" | "duration" | "fileCount";

export type AchievementDefinition = {
  id: string;
  category: AchievementCategory;
  title: string;
  description: string;
  metric: AchievementMetric;
  target: number;
  rule: string;
};

const createPath = (
  category: AchievementCategory,
  metric: AchievementMetric,
  entries: Array<[string, string, string, number, string]>,
): AchievementDefinition[] => entries.map(([id, title, description, target, rule]) => ({ id, category, title, description, metric, target, rule }));

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  ...createPath("Foundation", "practiceCount", [
    ["foundation_first_finish", "First Finish", "Complete your first counted Practice session", 1, "1 counted finish"],
    ["foundation_25", "Practice Habit", "Complete 25 counted Practice sessions", 25, "25 counted finishes"],
    ["foundation_100", "Hundredfold", "Complete 100 counted Practice sessions", 100, "100 counted finishes"],
    ["foundation_500", "Long Form", "Complete 500 counted Practice sessions", 500, "500 counted finishes"],
    ["foundation_1000", "Foundation Built", "Complete 1,000 counted Practice sessions", 1000, "1,000 counted finishes"],
  ]),
  ...createPath("Velocity", "speed", [
    ["velocity_40", "Measured Pace", "Reach 40 WPM with control", 40, "40 WPM · 60 sec · 92%"],
    ["velocity_50", "Swift Runner", "Reach 50 WPM with control", 50, "50 WPM · 60 sec · 92%"],
    ["velocity_60", "Sonic Gazelle", "Reach 60 WPM with control", 60, "60 WPM · 60 sec · 92%"],
    ["velocity_75", "Rapid Scribe", "Reach 75 WPM with control", 75, "75 WPM · 60 sec · 92%"],
    ["velocity_90", "Warp Master", "Reach 90 WPM with control", 90, "90 WPM · 60 sec · 92%"],
  ]),
  ...createPath("Precision", "accuracy", [
    ["precision_95", "Clean Line", "Reach 95% accuracy over meaningful work", 95, "95% · 60 sec"],
    ["precision_97", "Fine Point", "Reach 97% accuracy over meaningful work", 97, "97% · 60 sec"],
    ["precision_98", "Exacting", "Reach 98% accuracy over meaningful work", 98, "98% · 60 sec"],
    ["precision_99", "Near Perfect", "Reach 99% accuracy over meaningful work", 99, "99% · 60 sec"],
    ["precision_perfect_five", "Five Perfect Runs", "Complete five separate perfect Practice sessions", 5, "5 × 100% · 60 sec"],
  ]),
  ...createPath("Endurance", "duration", [
    ["endurance_3", "Three Minute Line", "Complete a controlled 3-minute run", 180, "3 min · 92%"],
    ["endurance_5", "Steady Five", "Complete a controlled 5-minute run", 300, "5 min · 92%"],
    ["endurance_10", "Long Focus", "Complete a controlled 10-minute run", 600, "10 min · 92%"],
    ["endurance_20", "Deep Work", "Complete a controlled 20-minute run", 1200, "20 min · 92%"],
    ["endurance_30", "Half Hour Craft", "Complete a controlled 30-minute run", 1800, "30 min · 92%"],
  ]),
  ...createPath("Consistency", "qualifiedCount", [
    ["consistency_3", "Three in Control", "Complete three Level 1-quality Practice sessions", 3, "3 qualified sessions"],
    ["consistency_10", "Reliable Ten", "Complete ten Level 1-quality Practice sessions", 10, "10 qualified sessions"],
    ["consistency_25", "Quiet Discipline", "Complete 25 Level 1-quality Practice sessions", 25, "25 qualified sessions"],
    ["consistency_50", "Training Rhythm", "Complete 50 Level 1-quality Practice sessions", 50, "50 qualified sessions"],
    ["consistency_100", "Proven Routine", "Complete 100 Level 1-quality Practice sessions", 100, "100 qualified sessions"],
  ]),
  ...createPath("Craft", "fileCount", [
    ["craft_first", "First Draft", "Save your first cloud draft", 1, "1 saved draft"],
    ["craft_10", "Working Set", "Save ten distinct cloud drafts", 10, "10 saved drafts"],
    ["craft_25", "Draft Shelf", "Save 25 distinct cloud drafts", 25, "25 saved drafts"],
    ["craft_50", "Private Archive", "Save 50 distinct cloud drafts", 50, "50 saved drafts"],
    ["craft_100", "Reference Library", "Save 100 distinct cloud drafts", 100, "100 saved drafts"],
  ]),
];

export type AchievementUnlock = { unlockedAt: string; evidenceIds: string[] };
export type AchievementLedger = { version: number; unlocks: Record<string, AchievementUnlock> };
export type AchievementProgress = AchievementDefinition & { current: number; unlocked: boolean; unlock?: AchievementUnlock };

export function createEmptyAchievementLedger(): AchievementLedger {
  return { version: ACHIEVEMENT_LEDGER_VERSION, unlocks: {} };
}

function controlledPracticeSessions(sessions: ProgressionSession[]) {
  return sessions.filter((session) => session.type === "Practice" && session.duration >= 60 && typeof session.accuracy === "number");
}

function achievementEvidence(definition: AchievementDefinition, sessions: ProgressionSession[], files: ProgressionFile[]) {
  const controlled = controlledPracticeSessions(sessions);
  const countable = sessions.filter((session) => isCountablePracticeSession(session, 1));
  const qualified = sessions.filter((session) => isLevelQualityPracticeSession(session, 1));
  const uniqueFiles = [...new Map(files.map((file) => [file.id, file])).values()];

  switch (definition.metric) {
    case "practiceCount": return { current: countable.length, evidenceIds: countable.map((session) => session.id) };
    case "qualifiedCount": return { current: qualified.length, evidenceIds: qualified.map((session) => session.id) };
    case "speed": {
      const matches = controlled.filter((session) => (session.accuracy ?? 0) >= 92 && session.speed >= definition.target);
      return { current: matches.length > 0 ? definition.target : 0, evidenceIds: matches.map((session) => session.id) };
    }
    case "accuracy": {
      const matches = controlled.filter((session) => (session.accuracy ?? 0) >= definition.target);
      return { current: matches.length > 0 ? definition.target : Math.min(definition.target, Math.max(0, ...controlled.map((session) => session.accuracy ?? 0))), evidenceIds: matches.map((session) => session.id) };
    }
    case "perfectCount": {
      const matches = controlled.filter((session) => session.accuracy === 100);
      return { current: matches.length, evidenceIds: matches.map((session) => session.id) };
    }
    case "duration": {
      const matches = controlled.filter((session) => (session.accuracy ?? 0) >= 92 && session.duration >= definition.target);
      return { current: Math.min(definition.target, Math.max(0, ...controlled.filter((session) => (session.accuracy ?? 0) >= 92).map((session) => session.duration))), evidenceIds: matches.map((session) => session.id) };
    }
    case "fileCount": return { current: uniqueFiles.length, evidenceIds: uniqueFiles.map((file) => file.id) };
  }
}

export function reconcileAchievementLedger(
  ledger: AchievementLedger,
  sessions: ProgressionSession[],
  files: ProgressionFile[],
  occurredAt: string,
): AchievementLedger {
  const next: AchievementLedger = { version: ACHIEVEMENT_LEDGER_VERSION, unlocks: { ...ledger.unlocks } };
  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    if (next.unlocks[definition.id]) continue;
    const evidence = achievementEvidence(definition, sessions, files);
    if (evidence.current >= definition.target) {
      next.unlocks[definition.id] = { unlockedAt: occurredAt, evidenceIds: evidence.evidenceIds.slice(0, definition.target) };
    }
  }
  return next;
}

export function getAchievementProgress(
  ledger: AchievementLedger,
  sessions: ProgressionSession[],
  files: ProgressionFile[],
): AchievementProgress[] {
  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const evidence = achievementEvidence(definition, sessions, files);
    return {
      ...definition,
      current: Math.min(definition.target, evidence.current),
      unlocked: Boolean(ledger.unlocks[definition.id]),
      unlock: ledger.unlocks[definition.id],
    };
  });
}
