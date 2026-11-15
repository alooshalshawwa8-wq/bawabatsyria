#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");

function matchingDelimiter(source, openingIndex) {
  const opening = source[openingIndex];
  const closing = opening === "[" ? "]" : opening === "{" ? "}" : null;
  assert.ok(closing, "Unsupported opening delimiter");
  let depth = 0, quote = null, escaped = false, lineComment = false, blockComment = false;
  for (let i = openingIndex; i < source.length; i++) {
    const ch = source[i], next = source[i + 1];
    if (lineComment) { if (ch === "\n") lineComment = false; continue; }
    if (blockComment) { if (ch === "*" && next === "/") { blockComment = false; i++; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "/" && next === "/") { lineComment = true; i++; continue; }
    if (ch === "/" && next === "*") { blockComment = true; i++; continue; }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === opening) depth++;
    else if (ch === closing && --depth === 0) return i;
  }
  throw new Error("Unterminated " + opening + " block at offset " + openingIndex);
}

const html = await read("index.html");
const workspaces = await read("ofoq-workspaces.js");
const extensions = await read("ofoq-workspace-extensions.js");
const marker = html.indexOf("const sections = [");
assert.ok(marker >= 0, "Section catalogue declaration missing");
const arrayStart = html.indexOf("[", marker);
const arrayEnd = matchingDelimiter(html, arrayStart);
const catalogueSource = html.slice(arrayStart + 1, arrayEnd);
const records = [...catalogueSource.matchAll(/\{\s*id:\s*'([^']+)'\s*,\s*title:\s*'([^']*)'\s*,\s*icon:\s*'([^']*)'\s*,\s*desc:\s*'([^']*)'/g)]
  .map(match => ({ id: match[1], title: match[2], icon: match[3], desc: match[4] }));
assert.equal(records.length, 78, "Expected 78 catalogue records; parsed " + records.length);
const ids = records.map(item => item.id);
assert.equal(new Set(ids).size, ids.length, "Duplicate section IDs detected");
for (const item of records) {
  assert.match(item.id, /^[a-z][a-z0-9_]*$/, "Invalid stable section ID: " + item.id);
  for (const field of ["title", "icon", "desc"]) assert.ok(item[field].trim(), "Blank " + field + " for " + item.id);
}

const utilityStart = html.indexOf("const utilityModules=");
const utilityEnd = html.indexOf("async function openSection", utilityStart);
assert.ok(utilityStart >= 0 && utilityEnd > utilityStart, "Utility registry boundaries missing");
const utilitySource = html.slice(utilityStart, utilityEnd);
const utilityIds = [...utilitySource.matchAll(/^\s*([a-z][a-z0-9_]*):\s*\{\s*title:/gm)].map(match => match[1]);
assert.equal(utilityIds.length, 70, "Expected 70 primary utility module definitions; found " + utilityIds.length);
assert.equal(new Set(utilityIds).size, utilityIds.length, "Duplicate utility module keys detected");

const augmentedUtilityIds = [];
for (const match of html.matchAll(/Object\.assign\(utilityModules,\s*\{/g)) {
  const objectStart = html.indexOf("{", match.index);
  const objectEnd = matchingDelimiter(html, objectStart);
  const body = html.slice(objectStart + 1, objectEnd);
  const keys = [...body.matchAll(/^\s*([a-z][a-z0-9_]*):\s*\{\s*title:/gm)].map(item => item[1]);
  assert.equal(new Set(keys).size, keys.length, "Duplicate keys in a utilityModules augmentation");
  augmentedUtilityIds.push(...keys);
}

const directRendererIds = [...html.matchAll(/sec\.id\s*===\s*'([a-z][a-z0-9_]*)'/g)].map(match => match[1]);
const workspaceIds = [...(workspaces + "\n" + extensions).matchAll(/section\.id\s*===\s*["']([a-z][a-z0-9_]*)["']/g)].map(match => match[1]);
const catalog = new Set(ids);
const assertKnown = (label, values) => {
  const orphans = [...new Set(values)].filter(id => !catalog.has(id));
  assert.deepEqual(orphans, [], label + " reference unknown catalogue IDs: " + orphans.join(", "));
};
assertKnown("Utility registry", [...utilityIds, ...augmentedUtilityIds]);
assertKnown("Direct renderer", directRendererIds);
assertKnown("Cloud workspace", workspaceIds);

const covered = new Set([...utilityIds, ...augmentedUtilityIds, ...directRendererIds, ...workspaceIds]);
for (const id of ["auto_moto_gallery", "tech_devices", "luxury_villas"]) covered.add(id);
const uncovered = ids.filter(id => !covered.has(id));
assert.deepEqual(uncovered, [], "Catalogue sections without a registered utility, direct renderer, or cloud workspace: " + uncovered.join(", "));

console.log("OFOQ section registry validation passed.");
console.log(JSON.stringify({
  catalogueSections: records.length,
  utilityModules: utilityIds.length,\n  augmentedUtilityModules: augmentedUtilityIds.length,
  directRendererReferences: new Set(directRendererIds).size,
  cloudWorkspaceTargets: new Set(workspaceIds).size,
  uncoveredSections: 0
}, null, 2));
