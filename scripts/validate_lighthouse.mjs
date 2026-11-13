import fs from "node:fs";

const path = process.argv[2] ?? "lighthouse-report.report.json";
const report = JSON.parse(fs.readFileSync(path, "utf8"));
const audits = report.audits ?? {};
const categories = report.categories ?? {};

const budgets = [
  ["Largest Contentful Paint", audits["largest-contentful-paint"]?.numericValue, 4_000, "ms"],
  ["Total Blocking Time", audits["total-blocking-time"]?.numericValue, 500, "ms"],
  ["Cumulative Layout Shift", audits["cumulative-layout-shift"]?.numericValue, 0.1, ""],
  ["Total transferred page weight", audits["total-byte-weight"]?.numericValue, 1_000_000, "bytes"],
];

for (const [label, value, maximum, unit] of budgets) {
  if (!Number.isFinite(value)) throw new Error(label + " metric is missing from Lighthouse report");
  console.log(label + ": " + value.toFixed(2) + (unit ? " " + unit : "") + " (budget " + maximum + (unit ? " " + unit : "") + ")");
  if (value > maximum) throw new Error(label + " exceeded its performance budget");
}

for (const key of ["accessibility", "best-practices", "seo"]) {
  const score = categories[key]?.score;
  if (!Number.isFinite(score) || score < 0.95) throw new Error("Lighthouse " + key + " score must remain at or above 95/100");
  console.log(key + ": " + Math.round(score * 100) + "/100");
}

if (!Number.isFinite(categories.performance?.score) || categories.performance.score < 0.8) {
  throw new Error("Lighthouse performance score must remain at or above 80/100");
}
console.log("performance: " + Math.round(categories.performance.score * 100) + "/100");
console.log("OFOQ Lighthouse budgets passed.");
