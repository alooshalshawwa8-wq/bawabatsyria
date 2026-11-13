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

Latest application commit observed on `main` before creating this state record:
- SHA: `9f09e8279255cdca5b597d794019042d20b41b0c`
- Message: `ci: validate mobile smoke test syntax before deployment`
- Timestamp: `2026-11-12T19:55:38Z`
- Change: adds `node --check tests/mobile-smoke.mjs` to `.github/workflows/pages.yml`.

Recent preceding commits added mobile viewport smoke coverage, Lighthouse regression budgets, responsive WebP generation/validation, and related CI checks.

The current workflow `.github/workflows/pages.yml` contains:
- HTML/manifest/JSON-LD/SEO/robots/sitemap validation.
- Section registry uniqueness, priority mapping, and renderer coverage checks.
- Node syntax checks for inline scripts and supporting JavaScript.
- `scripts/validate_ofoq.py` contract checks.
- GitHub Pages artifact upload and deployment.
- Playwright browser and mobile smoke tests.
- Lighthouse performance/accessibility/best-practices/SEO audit and budget enforcement.

The latest commit's combined status endpoint returned no status entries. The commit-specific workflow-runs endpoint also returned no runs (that endpoint only surfaces PR-triggered runs). Therefore CI success for this commit is **not verified** by the available evidence.

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

## 5. Deployment state

Canonical Pages URL:
`https://alooshalshawwa8-wq.github.io/bawabatsyria/`

Verified successful deployment run:
- Workflow: Deploy static site to GitHub Pages, run #515.
- Run ID: `43427370696`.
- Deployed source SHA: `57264a8b0c7c8b3df223011407f177aef617e7b3`.
- Result: **success**, completed 2026-11-13T12:43:45Z.
- Job steps confirmed successful: WebP generation, site/SEO/JavaScript validation, OFOQ portal contract tests, Pages artifact upload, deployment, Playwright browser smoke tests (including mobile), Lighthouse audit, and Lighthouse budget enforcement.
- Run: https://github.com/alooshalshawwa8-wq/bawabatsyria/actions/runs/43427370696
- Lighthouse artifact: `ofoq-lighthouse-reports`, artifact ID `14038172668`, retained and downloadable at inspection time.
- Lighthouse category scores: Performance **90**, Accessibility **100**, Best Practices **100**, SEO **100**.
- Lighthouse lab metrics: FCP 1.8 s, LCP 2.9 s, Speed Index 2.1 s, Total Blocking Time 210 ms, CLS 0, Interactive 3.0 s.
- The deployed browser smoke suite completed successfully against the Pages URL, checking the 78-section portal and mobile viewport. This is runtime evidence from CI, not a guarantee for every device/network.

The latest documentation-only commit is `cc89f5e99a82c45914d95f3fc30e423ad3be2088`. Its three push-triggered workflows (Pages deploy #516, static validation #33, membership/portal validation #536) were **queued** at the last status check; their final outcomes and the deployment of that exact SHA are not yet verified. The web fetcher could not independently load the Pages URL, so no separate external HTTP check is claimed.

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

- `docs/ALOOSH_FUTURE_INTELLIGENCE_MASTER_STATE.md` did not exist at the inspected path before this record was created.
- Live Pages response and current deployed commit.
- Actual latest GitHub Actions run and Lighthouse report.
- Full runtime execution of browser/mobile smoke tests.
- Exact reconciliation of the historic 46-section/42-tool acceptance inventory with the current 78-section test registry.
- Complete route-by-route security review of all Edge Functions.
- Review of the 10 RLS/no-policy tables' grants and intended backend-only exposure.
- Auth leaked-password protection decision.
- Full list of the 15 unused indexes and evidence-based retention decisions.

## 9. Next execution queue (priority ordered)

1. Verify the deployed Pages URL, deployment SHA, latest Actions run, and Lighthouse artifacts.
2. Reconcile section/tool acceptance inventory against the actual source registry and renderers without deleting features.
3. Complete a read-only Supabase access audit for each RLS/no-policy table, including grants, views, RPC exposure, and Edge Function access paths.
4. Review Edge Function authorization, rate limits, request validation, CORS, and abuse controls route by route.
5. Address the leaked-password protection warning through an explicit owner-approved Auth setting change.
6. Validate core user journeys and mobile/desktop behavior in a real browser.
7. Only after the baseline is verified, implement the next isolated, tested improvement and record its commit and deployment evidence.

## 10. Evidence and reporting rules

- A commit is not proof of a successful deployment.
- A successful build is not proof of runtime correctness.
- A healthy Supabase project is not proof that every endpoint or policy is secure.
- Distinguish verified facts, historical context, and estimates.
- Record exact commit SHAs, test commands/results, workflow run URLs, deployment URLs, and timestamps.
- Never put API keys, service-role keys, passwords, tokens, or other secrets in this file.
