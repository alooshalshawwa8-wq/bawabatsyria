# OFOQ-024 — Brand, Assistant Identity & Personal-Use Inventory

**Date:** 2026-11-15  
**Branch:** `ofoq/private-access-readiness-2026-11-15`  
**Status:** Read-only audit and implementation backlog. No live identity, application source, production configuration, database, or deployment was changed by this audit.

## 1. Confirmed target identity

- Website display name: **❤️ Aloosh alshawwa ❤️**
- AI assistant display name: **❤️ Aloosh alshawwa ❤️**
- Product mode: private, single-owner personal operating environment.
- Default UI: Arabic, RTL, mobile-first, with optional multilingual support.
- Commercial/public SaaS assumptions are out of scope unless the owner later changes the direction.

## 2. Existing identity inventory — verified against the development branch

| Area | Current evidence | Required treatment |
|---|---|---|
| Main document metadata | `index.html` still identifies the site as أُفُق / OFOQ in title, description, author, Open Graph, Twitter metadata and JSON-LD; it still carries the old GitHub Pages canonical URL. | Rebuild metadata for a private app; do not expose public SEO, canonical URLs, or public organization schema. |
| Main visible shell | The 564 KB `index.html` contains many legacy OFOQ labels and a large number of embedded UI modules. | Inventory all visible surfaces and extract shared identity strings before changing labels. |
| Assistant launcher and chat | The page contains 13 occurrences of the legacy assistant name نَبْراس, including launcher aria-labels, mascot labels, chat header, welcome message, local guide replies, export labels, and AI helper prompts. | Replace the visible assistant identity consistently with ❤️ Aloosh alshawwa ❤️; retain stable DOM IDs and API contracts unless a tested migration requires otherwise. |
| Assistant edge function | `supabase/functions/site-assistant/index.ts` identifies the model as نَبْراس and describes it as a guide for platform visitors. The system prompt discusses visitors, optional account creation, public sections, memberships, and visitor support. | Re-author the system prompt for a single-owner private assistant. Keep server-side owner authentication, bounded requests, quota reservations, and safe logging. |
| Section-level AI helpers | `index.html` includes a copyable external prompt generator that says “أنت نَبْراس، مرشد أُفُق”. Another module labels a Gemini helper “مركز نَبْراس الذكي · Gemini”. | Use the same assistant identity and clearly distinguish integrated models from copy-and-paste external services. Never imply an external service is integrated or free without verification. |
| PWA install identity | `manifest.json` currently uses name أُفُق | OFOQ and short_name أُفُق. | Update after the private app name and icon assets are approved; preserve start_url, scope, language and RTL unless tested otherwise. |
| App icon | `ofoq-icon.svg` is still the manifest icon. | Create a new coherent brand mark and validate SVG/PWA compatibility, contrast, maskable safe area and favicon sizes. |
| Shared navigation and workspace layer | `ofoq-core.js` and `ofoq-workspaces.js` contain OFOQ-named identifiers and storage namespaces. | Separate user-visible brand from internal namespaces. Do not rename storage keys or global identifiers without migration and backward-compatibility tests. |
| User/profile/metrics modules | `ofoq-profile.js` and `ofoq-metrics.js` contain legacy product naming. | Audit user-visible labels and analytics events; avoid unnecessary database or storage key renames. |
| Build and release | Static validation, full Git history secret scan, membership/portal validation, and disposable PostgreSQL migration replay all passed on the current PR head SHA `982f6e7ce8b034519d94c4fadb316949886b8f8a`. | Keep these checks green; add identity contract tests when the actual rebrand implementation begins. |

## 3. Important product mismatch discovered

The current assistant prompt and portions of the page still assume a public visitor-facing service with optional user registration, open sections, account support, and membership concepts. That conflicts with the owner's now-confirmed private single-user direction.

This is not just a text rename. The assistant's scope, default assumptions, onboarding language, action permissions, and context model need to be changed so it serves the owner and the owner's own workspaces.

The server must continue to enforce owner authorization independently of Cloudflare Access. A branded front end or hidden UI is never an authorization boundary.

## 4. Recommended target assistant contract

The new assistant, displayed as **❤️ Aloosh alshawwa ❤️**, should:

1. Treat the authenticated owner as the sole intended user.
2. Operate as a personal chief-of-staff and multi-specialist coordinator.
3. Use a shared owner-controlled context, memory and file layer, with explicit access boundaries.
4. Route tasks to specialist capabilities (commerce, accounting, research, trading education, agriculture, social content, learning, science and other owner-selected areas).
5. State which model/provider is used when relevant and distinguish live data from static knowledge.
6. Prefer genuinely free services and local/open models where practical; record limits and fallback behavior.
7. Never silently invoke paid endpoints, consume paid credits, or create a subscription.
8. Never reveal API keys or secrets to the browser, prompts, logs, files or model output.
9. Require confirmation before consequential external actions such as posting, sending, purchasing, deleting, trading or changing account settings.
10. Avoid claims that it has accessed an account, file, live feed or external system unless a connected tool actually did so.

## 5. Rebuild sequence and safeguards

### Gate A — private access first
- Finish Cloudflare Pages + Access configuration with the owner's verified identity as the only allowed identity.
- Protect production and every enabled preview hostname.
- Test unauthenticated denial and owner success.
- Independently test Supabase Edge Function, PostgREST and storage authorization.
- Keep GitHub Pages and repository visibility unchanged until the private replacement is proven and the documented retirement process is approved.

### Gate B — safe identity layer
- Create one canonical brand configuration for user-visible strings.
- Keep technical IDs, route IDs, API names, database objects and storage keys stable initially.
- Define an icon/wordmark set and typography/color tokens.
- Update title, description, app manifest, launcher, assistant transcript labels, export names, and accessibility names together.
- Remove public-facing SEO and visitor acquisition language from the private build.

### Gate C — owner-first information architecture
- Review all current sections and the existing capability inventory.
- Classify each section as: core daily use, occasional use, reference/encyclopedia, future experiment, or retire/archive.
- Consolidate duplicated helpers and shared UI rather than preserving every existing tile.
- Prioritize high-value owner workflows before optional entertainment or public-service sections.

### Gate D — model gateway
- Build a provider-neutral catalogue of models, capabilities, limits, terms and last-verified date.
- Implement adapters server-side, per-provider quota tracking, timeout/retry policies, circuit breakers and safe fallback.
- Default to free/local providers; paid providers disabled unless explicitly approved.
- Never assume every model has a free API. Distinguish free web chat from free API access.

### Gate E — tests and release
- Add contract tests for exact website and assistant display identity.
- Test no legacy visitor-oriented assistant copy remains in active private UI.
- Test Arabic RTL, mobile, keyboard and screen-reader behavior.
- Test no secret in built assets and no direct endpoint bypass.
- Complete regression and rollback testing before owner-approved release.

## 6. Explicit non-actions

This audit did not:
- Rename the live website or assistant.
- Modify `index.html`, `manifest.json`, the icon, Edge Functions, database, RLS or Auth settings.
- Merge PR #32 or deploy a Pages site.
- Disable GitHub Pages, change repository visibility, or configure Cloudflare.
- Add paid services, API credits, billing, public signup, or public access.

## 7. Immediate next engineering step

After the owner-controlled private access gate is established, create a dedicated rebrand implementation branch and implement the canonical brand configuration plus assistant system-prompt rewrite as a single tested change-set. Then update the visible UI, PWA metadata and icon assets, followed by the owner-first section architecture.

**Audit baseline:** PR #32 is open and unmerged. All four CI workflows on its latest observed head commit passed. The full app and its old public identity are not yet cut over to a private host.
