import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve("dist");
assert.ok(existsSync(resolve(root, "index.html")), "Private artifact index is missing");
const html = readFileSync(resolve(root, "index.html"), "utf8");
assert.match(html, /name="robots" content="noindex,nofollow,noarchive"/);
assert.doesNotMatch(html, /<link rel="canonical"/i);
assert.doesNotMatch(html, /application\/ld\+json/i);
assert.doesNotMatch(html, /serviceWorker\.register\(/);
assert.match(html, /serviceWorker\.getRegistrations\(/);
assert.match(html, /caches\.keys\(/);

for (const file of [
  "manifest.json",
  "ofoq-icon.svg",
  "ofoq-data.js",
  "ofoq-profile.js",
  "ofoq-metrics.js",
  "ecommerce-studio.js",
  "career-studio.js",
  "operations-hub.js",
  "ofoq-core.js",
  "ofoq-commerce-cloud.js",
  "ofoq-vault.js",
  "ofoq-workspaces.js",
  "ofoq-workspace-extensions.js",
  "robots.txt",
  "_headers",
]) {
  assert.ok(existsSync(resolve(root, file)), "Required private asset missing: " + file);
}
assert.ok(existsSync(resolve(root, "assets")), "Private asset directory missing");
const headers = readFileSync(resolve(root, "_headers"), "utf8");
assert.match(headers, /X-Robots-Tag:\s*noindex, nofollow, noarchive/i);
assert.match(headers, /X-Content-Type-Options:\s*nosniff/i);
assert.match(headers, /Cache-Control:\s*no-store/i);

const forbidden = new Set(["docs", "tests", "supabase", "backend", "scripts", ".github", ".git"]);
for (const entry of readdirSync(root, { withFileTypes: true })) {
  assert.ok(!forbidden.has(entry.name), "Private artifact leaked a source-only path: " + entry.name);
  assert.ok(!/\.(?:md|sql|py|mjs|env|pem|key)$/i.test(entry.name), "Private artifact leaked a non-public file: " + entry.name);
}
console.log("Private Pages artifact contract passed: noindex, no offline worker, explicit asset allowlist.");
