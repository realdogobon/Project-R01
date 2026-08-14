import fs from "node:fs";

const report = JSON.parse(fs.readFileSync("/home/ubuntu/settings-transition-report.json", "utf8"));

for (const { viewport, report: transitions, browserErrors } of report) {
  console.log(`\n${viewport.name} ${viewport.width}x${viewport.height}`);
  console.log(`browserErrors=${browserErrors.length}`);
  for (const transition of transitions) {
    const states = transition.state;
    const children = states.children
      .map((child) => `${child.key?.slice(0, 18)}@${child.top.toFixed(2)}:${child.opacity}`)
      .join(" | ");
    console.log(
      `${states.label.padEnd(42)} ` +
      `scroll=${states.frame?.scrollTop ?? "?"} ` +
      `children=${states.children.length} ` +
      `${children}`,
    );
  }
}
