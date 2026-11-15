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

The migration and function source are in the PR branch only. They have not been applied to production or deployed. Production deployment order must be: apply the additive rate-limit migration, verify the RPC/table, then deploy the Edge Function version that calls it.

## Current Pages deployment

GitHub Pages deployment run `43692718264` reported a successful deployment from `main`. Its post-deploy browser smoke test then failed on the old deployed main build with horizontal overflow at a 390px viewport (document width 411px). The PR branch contains the responsive fix and its local browser/mobile smoke tests pass. A fresh Pages deployment and post-deploy smoke test are still required after the PR is approved and merged.

## Release gates still open

1. **Real email delivery:** configure a verified SMTP sender/domain and complete a real confirmation/recovery email test. Auth mocks do not prove delivery.
2. **Auth hardening:** review and enable leaked-password protection through supported Supabase Auth settings after checking impact. This has not been changed.
3. **Account journey:** run signup → confirmation → login → logout/login → password recovery with a real test mailbox.
4. **Service readiness:** the 78-section registry is not 78 fully connected services. Many sections are local templates; live provider feeds and external integrations must be explicitly verified and labelled.
5. **Payments:** keep billing disabled. Do not enable Stripe or manual payment flows until explicitly authorized and separately tested.
6. **Production release:** PR #23 remains a draft. After review/approval, merge, confirm Pages deployment and live browser/mobile checks, then apply the Nibras migration and deploy its Edge Function in the correct order.

## Safety boundary

No production schema, RLS policy, Auth setting, secret, Edge Function deployment, payment setting, or production user data was changed during this validation batch. Work was limited to development-branch source, read-only production SQL comparison, and isolated CI environments.
