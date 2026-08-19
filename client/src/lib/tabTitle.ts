export const DEFAULT_AUTOMATIC_TAB_TITLE = "New Document";
export const TASK_VIEW_TITLE_PREVIEW_MAX_LENGTH = 72;
export const TASK_VIEW_DESCRIPTION_PREVIEW_MAX_LENGTH = 144;
export const UNSAVED_DIALOG_TITLE_PREVIEW_MAX_LENGTH = 42;

type AutoNamedTab = {
  name: string;
  isAutoNamed?: boolean;
};

/**
 * Returns the first meaningful visible source line for an unsaved document.
 * Markdown scaffolding is stripped only from the line used as the display title;
 * the original editor content remains untouched.
 */
export function deriveAutomaticTabTitle(content: string): string {
  const firstMeaningfulLine = content
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line
      .trim()
      .replace(/^#{1,6}\s+/, "")
      .replace(/^>\s*/, "")
      .replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, "")
      .replace(/^\[[ xX]\]\s+/, "")
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[`*_~]/g, "")
      .replace(/\s+/g, " ")
      .trim())
    .find(Boolean);

  return firstMeaningfulLine || DEFAULT_AUTOMATIC_TAB_TITLE;
}

/**
 * Produces a compact single-line visual preview without changing the complete
 * title/content retained by a tab. It favours a nearby word boundary and falls
 * back to a character boundary for very long unbroken tokens.
 */
export function makeCompactTabPreview(value: string, maximumLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maximumLength) return normalized;

  const targetLength = Math.max(1, maximumLength - 1);
  const nearestWordBoundary = normalized.lastIndexOf(" ", targetLength);
  const cutAt = nearestWordBoundary > Math.floor(targetLength * 0.55) ? nearestWordBoundary : targetLength;
  return `${normalized.slice(0, cutAt).trimEnd()}…`;
}

/**
 * Existing snapshots can predate `isAutoNamed`. Their conventional blank title
 * remains safe to upgrade as soon as the user types, while explicit file and
 * manually renamed tabs stay stable.
 */
export function isAutomaticallyNamedTab(tab: AutoNamedTab): boolean {
  return tab.isAutoNamed === true || /^New Document(?: \d+)?$/.test(tab.name);
}
