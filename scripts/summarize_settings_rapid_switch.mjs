import { readFile } from "node:fs/promises";

const report = JSON.parse(
  await readFile("/home/ubuntu/settings-rapid-switch-report.json", "utf8"),
);

for (const viewport of report.reports || []) {
  const interactionIssues = viewport.interactionIssues || [];
  const categorySummaries = (viewport.categoryBursts || []).map((burst) => ({
    sweep: burst.sweep,
    maxVisibleMotionChildren: burst.summary?.maxVisibleChildren ?? null,
    verticalRange: burst.summary?.verticalRange ?? null,
  }));
  const nestedSummaries = (viewport.nestedBursts || []).map((burst) => ({
    cycle: burst.cycle,
    maxVisibleMotionChildren: burst.summary?.maxVisibleChildren ?? null,
    verticalRange: burst.summary?.verticalRange ?? null,
  }));

  console.log(
    JSON.stringify(
      {
        viewport: viewport.viewport,
        browserErrors: viewport.errors || [],
        ignoredWarnings: viewport.ignoredWarnings || [],
        interactionIssues,
        categorySummaries,
        nestedSummaries,
        final: viewport.final,
      },
      null,
      2,
    ),
  );
}
