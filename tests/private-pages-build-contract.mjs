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
assert.ok(!existsSync(resolve(root, "service-worker.js")), "Private artifact must not ship a service worker");
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
const robots = readFileSync(resolve(root, "robots.txt"), "utf8");
assert.ok(robots.includes("Disallow: /"), "Private robots policy must disallow crawler access"); 
assert.doesNotMatch(robots, /Sitemap:/i);
assert.ok(!existsSync(resolve(root, "sitemap.xml")), "Private artifact must not advertise or ship a public sitemap");
const headers = readFileSync(resolve(root, "_headers"), "utf8");
assert.match(headers, /X-Robots-Tag:\s*noindex, nofollow, noarchive/i);
assert.match(headers, /X-Content-Type-Options:\s*nosniff/i);
assert.match(headers, /Cache-Control:\s*no-store/i);

const pagesWorkflow = readFileSync(resolve(".github/workflows/pages.yml"), "utf8");
assert.match(pagesWorkflow, /if: github\.event\.repository\.private == false && vars\.OFOQ_PUBLIC_PAGES_ENABLED == 'true'/);

const expectedRoot = new Set([
  "_headers", "assets", "career-studio.js", "ecommerce-studio.js", "index.html",
  "manifest.json", "ofoq-commerce-cloud.js", "ofoq-core.js", "ofoq-data.js",
  "ofoq-icon.svg", "ofoq-metrics.js", "ofoq-profile.js",
  "ofoq-vault.js", "ofoq-workspace-extensions.js", "ofoq-workspaces.js",
  "operations-hub.js", "robots.txt",
]);
for (const entry of readdirSync(root)) {
  assert.ok(expectedRoot.has(entry), "Unexpected file in private artifact: " + entry);
}
for (const match of html.matchAll(/srcset=["']([^"']+)["']/g)) {
  for (const candidate of match[1].split(",").map(item => item.trim().split(/\s+/)[0])) {
    const relative = candidate.replace(/^\.\//, "");
    assert.ok(existsSync(resolve(root, relative)), "HTML references a missing responsive image: " + relative);
  }
}
for (const match of html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)) {
  const relative = match[1].replace(/^\.\//, "");
  assert.ok(existsSync(resolve(root, relative)), "HTML references a missing private asset: " + relative);
}

const retirementWorkflow = readFileSync(resolve(".github/workflows/retire-github-pages.yml"), "utf8");
assert.match(retirementWorkflow, /if: inputs\.confirm_retirement == true/);
assert.match(retirementWorkflow, /OFOQ_PRIVATE_SITE_URL: \$\{\{ inputs\.private_site_url \}\}/);

const forbidden = new Set(["docs", "tests", "supabase", "backend", "scripts", ".github", ".git"]);
for (const entry of readdirSync(root, { withFileTypes: true })) {
  assert.ok(!forbidden.has(entry.name), "Private artifact leaked a source-only path: " + entry.name);
  assert.ok(!/\.(?:md|sql|py|mjs|env|pem|key)$/i.test(entry.name), "Private artifact leaked a non-public file: " + entry.name);
}
console.log("Private Pages artifact contract passed: noindex, no offline worker, explicit asset allowlist.");
