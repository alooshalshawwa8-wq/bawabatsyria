# ALOOSH FUTURE INTELLIGENCE — MASTER PROJECT STATE

> Last verified: 2026-11-13 (UTC)
> Repository: `alooshalshawwa8-wq/bawabatsyria`
> Default branch: `main`
> Status: operational baseline captured; several deployment and browser checks remain unverified.

## 1. Strategic scope

OFOQ is the primary platform within ALOOSH FUTURE INTELLIGENCE. Preserve existing sections and tools; do not remove or silently change user-approved behavior. Keep internal founder/admin strategy and sensitive operational data separated from public content by server-side authentication, authorization, and data-access controls. Public entertainment content (including astrology/tarot/coffee-cup experiences) must be framed as entertainment, not scientific fact or guaranteed prediction.

The approved display name is **❤️Aloosh alshawwa ❤️**.

## 2. Repository identity and caution

- Active project repository: `alooshalshawwa8-wq/bawabatsyria` (public, default branch `main`).
- A similarly named repository `alooshalshawwa8-wq/bawabatsuria` also exists. Do not confuse the two repositories.
- The connected GitHub account has admin/push access to the active repository.

## 3. Latest verified source state

Latest source commit on `main`:
- SHA: `afd43e06705ed9765e71608a6289acb305aae8af`
- Message: `test: enforce AI and football Edge Function abuse controls in CI`
- This commit adds static CI contracts for the AI assistant's POST/origin/body-size/message-count/global-budget protections and the football API's GET/origin/local-throttle/persistent-quota/fail-closed/owner-gate protections.
- Deno type-checking and the expanded static contract validator passed.

Previous code-quality commit:
- SHA: `1d51d2dd935f719451a3ca555875f86d1704cee3`
- Added CI assertions for membership API authentication, owner-only points grants, Stripe webhook signature/timestamp checks, bounded payloads, idempotency, disabled-checkout guard, and browser-secret exclusion.

Verified workflows for latest source SHA `afd43e0...`:
- OFOQ static validation #39: success.
- Membership/portal validation #542: success.
- GitHub Pages deployment #522: success; see deployment evidence below.

The static validator also verifies unique section IDs, priority mappings, renderer coverage, and key frontend contracts. CI source assertions protect against accidental removal of backend security controls; they do not replace runtime authorization tests or penetration testing.

## 3A. Master-state record commits

- Initial state record commit: `34e0ee4cf9a91787a07d8adcc1b26e63833275a0`.
- Follow-up correction commit (repository-name disambiguation): `50dc1da824df6aaa1f2a94602a506ea8a1ca6653`.
- The current master-state document is stored at this path and must be refreshed after each material verified change.

## 4. Application scope and coverage

- `index.html` is present on `main` and contains Arabic RTL metadata, canonical URL, Open Graph/Twitter metadata, JSON-LD Organization/WebSite/WebPage records, and the platform shell.
- The browser smoke test currently asserts **78 sections** and tests every section's shared workspace tabs, AI helper presence, command-center behavior, favorites/recent visits, and selected commerce interactions.
- This test expectation is not equivalent to a successful executed browser test. The user's earlier approved baseline referred to 46 sections and 42 tools; reconcile the historical requirement list against the current 78-section registry and actual feature inventory before claiming all prior requirements are preserved.
- `ofoq-core.js` stores only section IDs for favorites/recent visits in localStorage on the current browser; it is local-device state, not account-synced storage.
- The page includes the Gemini-backed `site-assistant` endpoint and section-aware helper UI. Do not expose provider credentials in public code.

## 4A. Recovered historical acceptance context (partial)

Earlier project records confirm the historic targets of **46 interactive sections** and **42 tool modules**, but do not contain a complete itemized list of their exact names. Do not fabricate the missing names or infer that the current 78-section registry is a one-to-one replacement.

Recovered historical scope categories include:
- Commerce, profit, and inventory.
- Marketing, advertising, and video.
- Energy, fuel, real estate, and investment.
- Study, CV/resume, and travel.
- Agriculture, fertilizers, and water.
- Digital security and transactions.
- Heritage, tourism, and community initiatives.
- Medical appointment organization.

One explicitly named tool is **`مستشار التسويق ومولد الإعلانات VIP`**, with ad-copy generation, audience/benefit framing, price and offer support, platform/tone selection, and copy-ready output. Verify its present mapping and completeness against the actual registry before marking it complete.

Previously named strategic capability modules: `OFOQ CORE`, `OFOQ UNIVERSE`, `OFOQ NEXUS`, `OFOQ AI COUNCIL`, `OFOQ PULSE`, `OFOQ EXPERIENCE`, `OFOQ SHIELD`, and `OFOQ LAUNCH`.

Historical membership requirements included Professional/VIP/Business plan concepts, monthly Stripe subscriptions, server-verified VIP access, five VIP sections, points ledger/balance, wallet, and administrative controls. This is historical product scope, not evidence that billing is currently live. Current payment state remains disabled.

## 5. Deployment state

Canonical Pages URL:
`https://alooshalshawwa8-wq.github.io/bawabatsyria/`

Latest verified successful deployment:
- Workflow: Deploy static site to GitHub Pages, run #522.
- Run ID: `43428711168`.
- Deployed source SHA: `afd43e06705ed9765e71608a6289acb305aae8af`.
- Result: **success**, completed 2026-11-13T12:53:24Z.
- Successful steps: responsive WebP generation; site/JavaScript validation; e-commerce and career studio syntax checks; OFOQ portal contract tests; Pages artifact upload/deployment; Playwright browser smoke tests; Lighthouse audit; Lighthouse quality-budget enforcement.
- Browser smoke suite verified all 78 section workspaces, command-center keyboard controls, favorites/recent filters, Operations Hub tabs and CRUD, local JSON export, cloud-backup guardrails, and mobile horizontal-overflow check.
- Run: https://github.com/alooshalshawwa8-wq/bawabatsyria/actions/runs/43428711168
- Lighthouse artifact: `ofoq-lighthouse-reports`, artifact ID `14038835202`, retained at inspection time.

Lighthouse results for this run:
- Performance **90**, Accessibility **100**, Best Practices **100**, SEO **100**.
- FCP 1.75 s, LCP 3.45 s, Speed Index 2.05 s, Total Blocking Time 76 ms, CLS 0, Interactive 3.54 s, server response 4.8 ms.
- Compared with the immediately preceding lab run (#520: Performance 94, LCP 2.86 s), this run shows expected lab variability and a slower LCP. The Lighthouse budget still passed. Treat these as lab measurements, not field Core Web Vitals.
- The LCP element was the main hero H1, with approximately 2.85 s render delay in this run. Main-thread work was about 2.4 s; image-delivery and cache-lifetime audits also identified opportunities. Prioritize initial render/JS/layout work before sacrificing welcome-image visual quality.

Static validation #39 and membership/portal validation #542 also completed successfully for the same source SHA:
- Static validation: https://github.com/alooshalshawwa8-wq/bawabatsyria/actions/runs/43428711173
- Membership/portal validation: https://github.com/alooshalshawwa8-wq/bawabatsyria/actions/runs/43428711189

No separate external manual browser session was available. Pages deployment and CI-run browser tests are verified; universal availability across all networks/devices is not claimed.

## 6. Supabase state (read-only inspection)

Project:
- Ref: `elzquyehghuxhswogsch`
- Name: `bawabatsyria`
- Region: `eu-central-1`
- Project status: `ACTIVE_HEALTHY`
- PostgreSQL: major version 17.

Active Edge Functions:
- `membership-api` version 20, `verify_jwt=false`.
- `site-assistant` version 19, `verify_jwt=false`.
- `football-data` version 44, `verify_jwt=false`.

These endpoints implement their own request/authentication/CORS controls in code; continue reviewing the complete route-by-route authorization and abuse controls. A CORS allowlist is not authentication.

Security advisor snapshot (2026-11-13):
- Warning: Supabase Auth leaked-password protection is disabled. Enabling it changes authentication policy and requires an authorized owner decision; do not change automatically.
- Informational finding: 10 public-schema tables have RLS enabled but no policies. Several appear to be backend-maintained usage, budget, cache, and platform configuration tables. Confirm table grants and intended access model before adding policies; no blanket public policies.
- Read-only SQL confirmed `public.reserve_ai_provider_request(text,integer)` is SECURITY DEFINER, with EXECUTE denied to `anon` and `authenticated`, and allowed to `service_role`. Preserve this restriction.
- No database schema or production data was changed during this inspection.

Performance advisor snapshot:
- 15 unused-index informational findings. Do not drop indexes based only on this snapshot; confirm workload/query plans and retention requirements first.

## 6A. Follow-up read-only security audit (2026-11-13)

### Public-schema table exposure

A fresh catalog query compared RLS state, policy presence, and table grants. The 10 tables flagged by the Supabase advisor as RLS-enabled with no policies are:
- `ai_provider_daily_usage`
- `football_api_budget_policy`
- `football_api_budget_reservations`
- `football_api_cache`
- `football_api_rate_limits`
- `football_api_usage`
- `platform_feature_catalog`
- `platform_launch_config`
- `platform_plan_catalog`
- `platform_plan_features`

For all 10, the current table-grant query showed grants only to `postgres` and `service_role`, with no direct `anon` or `authenticated` table grants. This supports a backend-only access design and means the advisor warning is not, by itself, evidence of public table exposure. Continue verifying views, RPCs, and every service-role call path. No policies or grants were changed.

### Function and view exposure

- `reserve_ai_provider_request(text,integer)` remains SECURITY DEFINER; EXECUTE is restricted to `service_role` (confirmed in the earlier audit).
- `post_journal_entry(uuid)` is SECURITY INVOKER and EXECUTE is granted to `authenticated`. Its body explicitly requires `auth.uid()`, locks only that user's draft entry, validates at least two balanced positive-debit lines, and posts only that same user's draft.
- `football_rate_limit_hit(text,integer,integer)` is SECURITY INVOKER and is used by the football Edge Function.
- `trim_user_workspace_backup_history()` is SECURITY INVOKER and is attached only as a BEFORE INSERT trigger on `user_workspace_backups`; its body serializes per-user retention and trims that user's history to the newest 19 prior rows before the new row is inserted. Catalog ACL inspection shows EXECUTE grants available to `anon` and `authenticated`; PostgreSQL trigger functions cannot be invoked as ordinary RPC functions. Treat this as an ACL cleanup candidate, not evidence of a working public RPC; no privilege changes were made.
- The `points_balances` view is owned by `postgres`, has `security_invoker=true`, and aggregates `points_ledger` by `user_id`. SELECT is granted to `authenticated`; security-invoker behavior means the underlying table's owner-scoped RLS applies.

### Edge Function route review (source inspection, not penetration testing)

- `membership-api` version 20: `/api/me`, `/api/points`, and `/api/points/grant` require a bearer token validated through Supabase Auth; owner-only points grants also validate app metadata, bound the body, validate UUID/delta/reason/idempotency key, and use idempotent inserts. `/api/plans` and health are intentionally public. Stripe webhook handling has signature verification code. Checkout remains hard-disabled unless the owner enables `PAYMENTS_ENABLED`; current source returns 403 while disabled. No explicit request-rate limiter was found in this function; add one before enabling checkout or broadening privileged routes.
- `site-assistant` version 19: POST-only, exact-origin check, bounded request body (24 KB), maximum 12 messages, content truncation, per-runtime IP throttle, and global database-backed Gemini daily budget of 30 requests. The in-memory IP throttle is best-effort only because Edge isolates are ephemeral.
- `football-data` version 44: GET-only, exact-origin check, per-runtime throttle plus persistent database-backed rate limiting, backend service-role access to cache/usage/config tables, authenticated owner-only usage dashboard, and entitlement checks for gated features. The rate limiter derives its client key from the first `x-forwarded-for` entry; verify the Supabase gateway's header-trust behavior before relying on it as a security boundary.
- These are static source observations, not live endpoint tests, fuzzing, or a complete audit of all route branches.

### Current advisor snapshot

- Security: 10 RLS/no-policy informational findings; leaked-password protection remains disabled (owner decision required).
- Performance: 15 unused-index informational findings. No indexes were dropped; usage statistics alone are insufficient evidence for removal.

## 7. Monetization and safety

The inspected `membership-api` source explicitly states payments remain disabled until the platform owner enables monetization. Preserve this state unless the owner explicitly authorizes a payment launch and all provider/legal/readiness checks are satisfied. Do not run real payment transactions or alter production payment/auth settings without explicit authorization.

## 8. Missing or unverified items

- Exact itemized historic 46-section/42-tool acceptance inventory. Earlier records only provide counts, categories, one named tool, and strategic module names; the full exact list remains unrecovered.
- Completeness of each of the 78 current sections beyond registry/rendering and smoke-test coverage.
- Persistent centralized rate limiting for `membership-api`; the current source has no explicit limiter.
- Trusted client-IP semantics for the first `x-forwarded-for` entry used by both `site-assistant` and `football-data`; verify the actual hosted gateway trust boundary before treating IP-based throttling as a security boundary.
- Complete route-by-route negative/runtime testing and penetration testing of all Edge Functions.
- Auth leaked-password protection decision remains with the owner.
- Evidence-based review of all 15 unused-index advisor findings.
- Real-user field performance/Core Web Vitals data; current Lighthouse results are CI lab measurements.
- Reduce initial main-thread/layout/render delay and investigate LCP variability without degrading the welcome sequence or visual quality.

## 9. Next execution queue (priority ordered)

1. Design a persistent, abuse-resistant membership API rate limiter with route-specific thresholds, a trusted identity strategy, bounded storage/retention, and explicit failure behavior. Reuse of the existing football quota RPC is only a candidate; review schema semantics and storage growth first. Implement and test in isolation before any production deployment.
2. Verify the trusted client-IP contract for hosted Supabase Edge Functions. The current first-entry `x-forwarded-for` parsing must not be treated as spoof-resistant until the proxy chain is confirmed. Prefer authenticated user identity for member endpoints where possible.
3. Recover the exact historic 46-section/42-tool list from archived project records and map each item to the current 78-section registry, renderers, and behavior without deleting functionality.
4. Add targeted negative tests for Edge Function auth failures, owner-only routes, invalid payloads, quota exhaustion, CORS, replay, and provider outages.
5. Profile the initial page's render delay, main-thread work, DOM size, and cache lifetimes; isolate the biggest cause and validate each optimization against Lighthouse plus browser smoke tests.
6. Review the 15 unused-index findings with query plans and workload evidence; make no removals without proof.
7. Owner decision on Supabase Auth leaked-password protection.
8. Expand browser coverage for high-value user journeys and collect field performance data when real-user telemetry is available.

## 10. Evidence and reporting rules

- A commit is not proof of a successful deployment.
- A successful build is not proof of runtime correctness.
- A healthy Supabase project is not proof that every endpoint or policy is secure.
- Distinguish verified facts, historical context, and estimates.
- Record exact commit SHAs, test commands/results, workflow run URLs, deployment URLs, and timestamps.
- Never put API keys, service-role keys, passwords, tokens, or other secrets in this file.
