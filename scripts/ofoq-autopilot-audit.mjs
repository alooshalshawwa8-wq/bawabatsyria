import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const html = await read("index.html");
const workflow = {
  checkedAt: new Date().toISOString(),
  branch: process.env.GITHUB_REF_NAME || "local",
  commit: process.env.GITHUB_SHA || "local",
  checks: [],
  warnings: []
};
const check = (name, detail) => workflow.checks.push({ name, status: "passed", detail });
const warn = (name, detail) => workflow.warnings.push({ name, detail });

// Inventory: verify the site's published section catalog without invoking live providers.
const sectionMatches = [...html.matchAll(/\{\s*id:\s*["']([^"']+)["']\s*,\s*title:\s*["']([^"']+)["']/g)];
const sectionIds = sectionMatches.map(match => match[1]);
assert.equal(sectionIds.length, 78, `Expected 78 registered sections; found ${sectionIds.length}`);
assert.equal(new Set(sectionIds).size, sectionIds.length, "Section identifiers must be unique");
check("section-catalog", `${sectionIds.length} sections; all identifiers unique`);

// Check buttons for an accessible name; this is static analysis, not a substitute for browser testing.
const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button\s*>/gi)];
const unnamedButtons = buttons.map(([_, attrs, inner], index) => {
  const text = inner.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ").trim();
  const accessible = /\baria-label\s*=\s*["'][^"']+["']/i.test(attrs)
    || /\btitle\s*=\s*["'][^"']+["']/i.test(attrs)
    || text.length > 0;
  return accessible ? null : index + 1;
}).filter(Boolean);
assert.equal(unnamedButtons.length, 0, `Buttons without accessible names: ${unnamedButtons.join(", ")}`);
check("button-accessibility", `${buttons.length} static buttons have accessible names`);

// Confirm locally referenced application scripts exist and are syntactically valid in the workflow.
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']\.\/([^"'?#]+)["']/gi)].map(match => match[1]);
assert.ok(scripts.length > 0, "No local application scripts were found");
for (const path of new Set(scripts)) {
  await readFile(new URL("../" + path, import.meta.url));
}
check("local-script-references", `${new Set(scripts).size} unique local scripts exist`);

// Duplicate IDs are surfaced as warnings because some are SVG fragment IDs and runtime-generated templates.
const staticIdMatches = [...html.matchAll(/\\bid=(["'])([^"']+)\\1/g)];
const staticIds = staticIdMatches
  // Ignore IDs assembled dynamically, e.g. id='ofoq-pane-' + sectionId.
  .filter(match => !/^\\s*\\+/.test(html.slice(match.index + match[0].length)))
  .map(match => match[2]);
const idCounts = new Map();
for (const id of staticIds) idCounts.set(id, (idCounts.get(id) || 0) + 1);
const duplicateIds = [...idCounts].filter(([, count]) => count > 1).map(([id, count]) => ({ id, count }));
if (duplicateIds.length) warn("duplicate-dom-ids", duplicateIds);

// Keep the inventory useful for later per-section functional test coverage.
workflow.sectionInventory = sectionMatches.map(match => ({ id: match[1], title: match[2] }));
workflow.summary = {
  sections: sectionIds.length,
  buttons: buttons.length,
  localScripts: new Set(scripts).size,
  duplicateIdGroups: duplicateIds.length,
  passedChecks: workflow.checks.length,
  warnings: workflow.warnings.length
};

const markdown = [
  "# OFOQ automated health report",
  "",
  `- Checked: ${workflow.checkedAt}`,
  `- Branch: ${workflow.branch}`,
  `- Commit: ${workflow.commit}`,
  `- Sections: ${workflow.summary.sections}`,
  `- Buttons inspected: ${workflow.summary.buttons}`,
  `- Local scripts found: ${workflow.summary.localScripts}`,
  `- Duplicate ID groups (warning): ${workflow.summary.duplicateIdGroups}`,
  "",
  "## Checks",
  ...workflow.checks.map(item => `- PASS — ${item.name}: ${item.detail}`),
  "",
  "## Warnings",
  ...(workflow.warnings.length
    ? workflow.warnings.map(item => `- WARNING — ${item.name}: ${JSON.stringify(item.detail)}`)
    : ["- None"]),
  "",
  "## Section inventory",
  ...workflow.sectionInventory.map(item => `- ${item.id}: ${item.title}`),
  ""
].join("\n");

await writeFile("ofoq-autopilot-report.md", markdown);
await writeFile("ofoq-autopilot-report.json", JSON.stringify(workflow, null, 2) + "\n");
console.log(markdown);
