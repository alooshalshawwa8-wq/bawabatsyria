# OFOQ Engineering Audit — 2026-11-13

## Scope
Read-only inspection of the existing GitHub Pages application and its connected Supabase project. Account creation/email confirmation testing is intentionally deferred at the owner's request.

## Verified deployment and backend
- Public site: https://alooshalshawwa8-wq.github.io/bawabatsyria/
- Repository: https://github.com/alooshalshawwa8-wq/bawabatsyria
- Default branch: main
- Supabase project: bawabatsyria (ACTIVE_HEALTHY)
- PostgreSQL: 17.11
- Active Edge Functions: membership-api v23, site-assistant v20, football-data v45
- Billing remains disabled by the application guard; do not enable until legal, provider, and operational prerequisites are satisfied.

## Security observations
1. Supabase Security Advisor reports leaked-password protection disabled. Enable in Supabase Auth password security settings, then verify.
2. Security Advisor reports 11 public-schema tables with RLS enabled but no policies. This is fail-closed for API roles, not evidence of public read/write access. Confirm each is intentionally backend-only before changing grants or policies.
3. The membership Edge Function has platform JWT gateway verification disabled, but its handler authenticates users through the Supabase Auth user endpoint before all non-public API routes. Public health/plans and the Stripe webhook are separate explicit routes. Preserve this application-level validation if changing gateway settings.
4. Do not expose service-role secrets in the browser. Existing membership backend reads the service-role key only from server environment.
5. Payments are intentionally disabled. Keep this guard in place.

## Performance observations
- Performance Advisor reports 25 unused indexes. Do not drop them based only on this advisory; some may be intended for future workload or constraints. Reassess after representative traffic and query-plan review.

## Frontend inspection
- The main application is a single large index.html (~554 KB) with many embedded scripts and modular feature scripts.
- The membership UI includes sign-up, login, password recovery, and resend-confirmation flows.
- Redirect URLs are derived from the deployed site origin and path.
- This read-only audit did not run a real email signup, browser automation, or end-to-end visual test. Do not claim those tests passed.

## Next engineering sequence
1. Enable leaked-password protection in Auth dashboard and re-run security advisor.
2. Inventory the 11 RLS/no-policy tables, confirm expected server-only access, and document grants before changing any policy.
3. Review Edge Function authorization boundaries and test health/read-only routes without changing production data.
4. Add automated smoke/contract tests for membership and core user journeys.
5. Perform browser/mobile accessibility and navigation tests.
6. Resume signup/email confirmation test only after the above work; do not create more test accounts until then.

## Change safety
No production database rows, RLS policies, Auth users, secrets, payment settings, or Edge Functions were modified during this audit.
