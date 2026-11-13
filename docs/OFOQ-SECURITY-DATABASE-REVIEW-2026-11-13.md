# OFOQ — Security and Database Access Review

Date: 2026-11-13
Project: bawabatsyria / Supabase project `elzquyehghuxhswogsch`

## Verified findings

### RLS-enabled tables with no policies
A direct catalog query confirmed all 11 tables below have Row Level Security enabled and no policies. A separate grants query confirmed none has table privileges granted to either `anon` or `authenticated` at the time of review:

- `public.ai_provider_daily_usage`
- `public.football_api_budget_policy`
- `public.football_api_budget_reservations`
- `public.football_api_cache`
- `public.football_api_rate_limits`
- `public.football_api_usage`
- `public.ofoq_revenue_events`
- `public.platform_feature_catalog`
- `public.platform_launch_config`
- `public.platform_plan_catalog`
- `public.platform_plan_features`

Interpretation: these are currently fail-closed for the two Supabase API roles checked. The Supabase advisor finding is INFO, not proof of exposure. Do not add policies simply to silence the warning. Keep these tables server-only unless a reviewed product requirement calls for narrowly scoped user access.

### Auth security
Supabase Security Advisor reports `auth_leaked_password_protection` as WARN. Enable leaked-password protection in the Supabase Dashboard under Auth password security settings, then rerun the advisor. This project setting was not changed by this review.

### Performance
Supabase Performance Advisor reports 25 unused indexes. This is informational. No indexes were dropped. Review representative query plans and expected near-future workload before considering any removal.

## Other verified safeguards
- Membership Edge Function is active at version 23 and performs application-level user verification via `/auth/v1/user` before protected API routes.
- Billing is guarded by `PAYMENTS_ENABLED` and a production launch configuration check. Keep billing disabled until owner-approved operational, compliance, and payment-provider readiness.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.

## Verification boundary
This review queried database catalogs and Supabase advisors. It did not attempt unauthenticated data extraction, create accounts, send confirmation emails, change production grants/policies, change Auth settings, delete indexes, or deploy Edge Functions. Browser end-to-end and email delivery tests remain pending by owner request.

## Next actions
1. Owner/admin enables leaked-password protection in Supabase Auth dashboard.
2. Re-run security advisor and record whether warning cleared.
3. Keep the 11 backend-only tables without client grants unless a reviewed use case requires access.
4. Build and run read-only smoke tests for Edge Function health/plans and core public site routes.
5. Resume account creation and email confirmation tests only after the owner is ready.
