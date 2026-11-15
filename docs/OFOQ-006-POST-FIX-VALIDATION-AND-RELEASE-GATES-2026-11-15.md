# OFOQ-006 — Post-fix validation and release gates
Date: 2026-11-15
Branch: `ofoq/ofoq-001-execution`
Pull request: #23 (open, draft; not merged)

## Verified outcomes on the development branch

- 78 registered sections; section identifiers are unique.
- 113 static buttons have accessible names.
- 11 unique local application scripts exist.
- 0 duplicate static ID groups; no audit warnings.
- Browser and mobile smoke tests pass on the PR branch, including the 390px mobile viewport.
- Static validation, Deno type checks, Edge Function security contracts, and read-only Health Patrol pass.
- All 38 tracked migrations replay successfully from an empty local Supabase database, with critical relations, functions, and RLS assertions passing.
- The 14 previously missing historical migration files were restored and their SQL bodies were compared against `supabase_migrations.schema_migrations.statements`: 14/14 match after trimming outer whitespace only.

## Nibras security update

The development branch replaces the per-runtime in-memory limiter and caller-controlled X-Forwarded-For parsing with:
- the hosted-ingress `cf-connecting-ip` header;
- HMAC-SHA256 pseudonymous bucket keys (raw IPs are not stored);
- a PostgreSQL-backed atomic 12 requests / 60 seconds limiter;
- a service-role-only RPC, RLS-protected table, empty search_path, and 24-hour retention.

The additive rate-limit migration was applied to production as version `20261115082629`. The matching Edge Function `site-assistant` was then deployed as active version 21. Read-only verification confirmed the table/function exist, RLS is enabled, `anon` and `authenticated` cannot read/execute, and `service_role` has the required access.

## Current Pages deployment

GitHub Pages deployment from the merged main commit `feb3dcc2be99fea6ff674a6c1b7e7ca4caf0abb9` is running. The previous deployment's post-deploy browser test found 390px horizontal overflow; the merged responsive fix passed branch browser/mobile smoke tests. The final live Pages smoke test must complete before handover.

## Release gates still open

1. **Real email delivery:** configure a verified SMTP sender/domain and complete a real confirmation/recovery email test. Auth mocks do not prove delivery.
2. **Auth hardening:** review and enable leaked-password protection through supported Supabase Auth settings after checking impact. This has not been changed.
3. **Account journey:** run signup → confirmation → login → logout/login → password recovery with a real test mailbox.
4. **Service readiness:** the 78-section registry is not 78 fully connected services. Many sections are local templates; live provider feeds and external integrations must be explicitly verified and labelled.
5. **Payments:** keep billing disabled. Do not enable Stripe or manual payment flows until explicitly authorized and separately tested.
6. **Production release:** PR #23 remains a draft. After review/approval, merge, confirm Pages deployment and live browser/mobile checks, then apply the Nibras migration and deploy its Edge Function in the correct order.

## Safety boundary

Production changes were limited to one additive rate-limit migration and the matching `site-assistant` Edge Function deployment. No Auth setting, SMTP secret, payment setting, RLS policy on existing user tables, or production user data was changed.
