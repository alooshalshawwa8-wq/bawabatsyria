# OFOQ Global Excellence Roadmap

**Project:** OFOQ / أُفُق  
**Strategy:** Build a free-first, Arabic-first digital super-portal by learning from the strongest public features of global portals and improving the experience through original integrations.  
**Repository:** https://github.com/alooshalshawwa8-wq/bawabatsyria

## Product principles

1. Reproduce useful interaction patterns and capabilities, not proprietary branding, source code, or protected visual assets.
2. Do not count a feature as delivered until it works, has a clear data source where relevant, and passes a repeatable test.
3. Keep core browsing, calculators, personal navigation, learning utilities, and local-first workspaces free.
4. Prefer open standards, browser-native capabilities, static delivery, and free tiers with explicit quotas.
5. Never expose provider secrets in browser code. Route privileged requests through controlled server functions.
6. Every live-data panel must show source and last-updated time; never label cached or user-entered values as live.
7. Respect privacy: personal navigation and local workspaces remain on-device unless the user explicitly opts into cloud backup.
8. Build accessibility, Arabic RTL, responsive mobile behavior, and reduced-motion support into every release.

## Competitive product patterns to adopt

- **Google:** fast universal search, clear result organization, useful utility entry points, and consistent cross-device patterns.
- **Yahoo:** a content-rich front page with distinct news, finance, sports, weather, and lifestyle destinations.
- **Yandex:** service discovery, maps/translation/weather entry points, and coherent links between consumer services.
- **MSN:** personalized content discovery and readable editorial cards.
- **Start.me / Protopage:** user-controlled dashboards, shortcuts, and customizable personal workspaces.

OFOQ must create original value through connected workflows: one search can discover a topic, open a specialist workspace, run a calculator, save the result, and continue learning without losing context.

## Delivery phases and acceptance gates

### Phase 1 — OFOQ CORE
- Confirm Pages deployment and all local assets resolve.
- Keep JavaScript, manifest, service-worker, section-registry, and browser smoke checks in CI.
- Establish consistent local-first navigation, favorites, and recent history.
- Review Supabase RLS, function authentication, quotas, and exposed configuration before expanding integrations.
- Gate: deployment green; no missing local assets; no uncaught browser errors; all section IDs unique; mobile layout has no horizontal overflow.

### Phase 2 — OFOQ UNIVERSE
- Audit every registered section against a standard card: purpose, working tools, data sources, free limits, privacy, status, and tests.
- Group sections by user goal and connect related tools.
- Replace placeholder-only sections with usable local-first tools or clearly mark them as planned.
- Gate: every published section has a useful workspace and a documented verification path.

### Phase 3 — OFOQ NEXUS
- Add unified search across section names, descriptions, tools, and saved workspace content.
- Add cross-section actions and contextual recommendations.
- Preserve user context only with clear controls and consent.
- Gate: search results are relevant, keyboard accessible, and do not trigger unnecessary provider calls.

### Phase 4 — OFOQ AI COUNCIL
- Route requests by task to available free providers or local deterministic tools.
- Add per-provider daily/monthly quotas, caching, rate limits, timeout handling, and fallback behavior.
- Keep provider keys server-side and redact prompts from logs.
- Gate: quota exhaustion degrades gracefully; no client-side secret; provider calls are observable and bounded.

### Phase 5 — OFOQ PULSE
- Add sourced news, sports, finance, weather, and other feeds only where lawful, reliable, and affordable.
- Display source, timestamp, and cache age.
- Use caching and refresh schedules that respect provider quotas.
- Gate: no stale information presented as live; source attribution visible; API budgets tested.

### Phase 6 — OFOQ EXPERIENCE
- Evolve the Galaxy visual system without sacrificing speed, readability, or accessibility.
- Add responsive dashboard layouts, personalization, keyboard command navigation, and PWA/offline support.
- Use animation sparingly and honor reduced-motion settings.
- Gate: mobile/desktop visual QA, accessibility checks, and performance budgets pass.

### Phase 7 — OFOQ SHIELD
- Review RLS policies table-by-table, function auth, input validation, CORS, abuse protection, secret handling, backups, and data retention.
- Add security headers and privacy disclosures where hosting supports them.
- Gate: no unresolved critical/high findings; backup and recovery tested; sensitive operations server-authorized.

### Phase 8 — OFOQ LAUNCH
- Run full regression tests across all sections and key user journeys.
- Verify mobile browsers, keyboard navigation, performance, offline behavior, and external data fallbacks.
- Start with a limited pilot, collect feedback, fix defects, then widen access.
- Gate: launch checklist signed off; no critical defects; rollback and incident process documented.

## Current execution record

### 2026-11-11 — OFOQ CORE v1
- Added `ofoq-core.js`, a local-first personal navigation layer.
- Added favorites and recently visited sections with local browser storage.
- Added catalog filters for all sections, favorites, and recent visits.
- Added a favorite action to each opened section workspace.
- Added the core script to the app shell and bumped the service-worker cache to `ofoq-shell-v39`.
- Added JavaScript syntax validation and CI contract checks.
- Extended Playwright browser smoke tests to verify favorites, recent visits, and restoration of the full catalogue.
- Privacy boundary: stores section IDs only; no network requests and no AI/API quota consumption.

## Current status

Phase 1 is in progress. A successful GitHub commit is not proof of a successful Pages deployment; deployment and browser tests must pass before this feature is called production-verified. Supabase security review and live deployment verification remain explicit launch blockers until checked.
