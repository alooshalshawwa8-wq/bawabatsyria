import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");

// Explicit allowlist: backend, database migrations, tests, docs, workflows,
// build scripts, and repository metadata must never enter the static artifact.
const publicFiles = [
  "index.html",
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
];
const publicDirectories = ["assets"];

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const relativePath of publicFiles) {
  const source = resolve(root, relativePath);
  if (!existsSync(source)) {
    throw new Error("Required public asset is missing: " + relativePath);
  }
  copyFileSync(source, resolve(output, relativePath));
}

for (const relativePath of publicDirectories) {
  const source = resolve(root, relativePath);
  if (!existsSync(source)) {
    throw new Error("Required public directory is missing: " + relativePath);
  }
  cpSync(source, resolve(output, relativePath), { recursive: true });
}

// The private deployment must not be indexed as a public website.
const indexPath = resolve(output, "index.html");
let html = readFileSync(indexPath, "utf8");
html = html.replace(
  /<meta name="robots" content="[^"]*">/i,
  '<meta name="robots" content="noindex,nofollow,noarchive">',
);
html = html.replace(/<link rel="canonical" href="[^"]*">/i, "");
html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/i, "");

// The existing public PWA service worker caches the app shell for offline use.
// On the first authenticated visit to this private deployment, unregister any
// old same-origin worker and clear only OFOQ's own shell caches. Do not register
// a new worker: an offline cache must not bypass the online Access gate.
const oldRegistration =
  /if\('serviceWorker' in navigator && location\.protocol\.startsWith\('http'\)\)\{window\.addEventListener\('load',\(\)=>navigator\.serviceWorker\.register\('\.\/service-worker\.js'\)\.catch\(\(\)=>\{\}\)\);\}/;
if (!oldRegistration.test(html)) {
  throw new Error("Expected legacy OFOQ service-worker registration was not found; review the private build transform.");
}
html = html.replace(
  oldRegistration,
  "if ('serviceWorker' in navigator) { window.addEventListener('load', async () => { try { const registrations = await navigator.serviceWorker.getRegistrations(); await Promise.all(registrations.filter(registration => new URL(registration.scope).origin === location.origin).map(registration => registration.unregister())); const cacheNames = await caches.keys(); await Promise.all(cacheNames.filter(name => name.startsWith('ofoq-shell-')).map(name => caches.delete(name))); } catch (_) {} }); }",
);
if (/serviceWorker\.register\(/.test(html)) {
  throw new Error("Private artifact must not register a service worker.");
}
writeFileSync(indexPath, html, "utf8");

// Do not advertise the legacy public GitHub Pages sitemap from the private host.
writeFileSync(resolve(output, "robots.txt"), "User-agent: *\nDisallow: /\n", "utf8");

const headersTemplate = resolve(root, "scripts/private-pages/_headers");
if (!existsSync(headersTemplate)) {
  throw new Error("Private Pages response-header template is missing.");
}
copyFileSync(headersTemplate, resolve(output, "_headers"));

console.log("Private Pages artifact built from an explicit public-asset allowlist.");
