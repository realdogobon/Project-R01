import { readFileSync } from "node:fs";

const reportPath = process.argv[2];
const r = JSON.parse(readFileSync(reportPath, "utf8"));

const target = 1 / Math.sqrt(2);
let allGood = true;
for (const phase of ["entry", "tray", "exit"]) {
  const e = r[phase] ?? {};
  const seg = phase === "entry" ? "entry" : "output";
  const s = e[seg];
  if (!s || Number(s.opacity) <= 0.1) {
    console.log(`${phase}: not visible at captured frame (opacity=${s?.opacity ?? "n/a"})`);
    continue;
  }
  const w = s.right - s.left;
  const h = s.bottom - s.top;
  const ratio = w / h;
  const ok = Math.abs(ratio - target) < 0.03;
  allGood = allGood && ok;
  console.log(`${phase}: w=${w.toFixed(2)} h=${h.toFixed(2)} ratio=${ratio.toFixed(4)} target=${target.toFixed(4)} ${ok ? "A4" : "NOT A4"}`);
}
console.log(allGood ? "RESULT: A4 proportion verified" : "RESULT: proportion mismatch");
