import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve("dist-hold");
assert.deepEqual(readdirSync(root).sort(), ["_headers", "index.html", "robots.txt"]);
const html = readFileSync(resolve(root, "index.html"), "utf8");
assert.match(html, /name="robots" content="noindex,nofollow,noarchive"/);
assert.match(html, /لم يتم نشر واجهة التطبيق أو أي بيانات مستخدم/);
assert.doesNotMatch(html, /<script|supabase|service-role|api[_-]?key/i);
assert.ok(readFileSync(resolve(root, "robots.txt"), "utf8").includes("Disallow: /"));
const headers = readFileSync(resolve(root, "_headers"), "utf8");
assert.match(headers, /Cache-Control:\s*no-store/i);
assert.match(headers, /Content-Security-Policy:\s*default-src 'none'/i);
assert.match(headers, /Permissions-Policy:/i);
for (const name of ["index.html", "robots.txt", "_headers"]) assert.ok(existsSync(resolve(root, name)));
console.log("Non-sensitive holding artifact contract passed.");
