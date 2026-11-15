# OFOQ-007 — Supabase security posture review
Date: 2026-11-15
Project: `elzquyehghuxhswogsch`
Scope: read-only verification; no production configuration or schema changes.

## Current verification

- Supabase reports 37 applied migrations.
- Security Advisor reports 12 `rls_enabled_no_policy` findings at INFO level:
  `ai_provider_daily_usage`, `football_api_budget_policy`, `football_api_budget_reservations`, `football_api_cache`, `football_api_rate_limits`, `football_api_usage`, `ofoq_revenue_events`, `platform_feature_catalog`, `platform_launch_config`, `platform_plan_catalog`, `platform_plan_features`, and `site_assistant_rate_limits`.
- A direct privilege check using `has_table_privilege` confirmed no SELECT or INSERT privileges for `anon` or `authenticated` on those 12 tables. `service_role` retains backend access. This confirms the relevant client read/insert paths are closed; it does not replace a complete review of every privilege or every application endpoint.
- Security Advisor reports one WARN: leaked-password protection is disabled in Supabase Auth. This remains an open dashboard hardening item; no Auth setting was changed.
- Performance Advisor reports 26 unused-index INFO findings. No index was dropped; usage counters alone are insufficient evidence for safe deletion.
- A previous Health Advisor check was clear; this session's live recheck focused on security and performance.

## Decision log

1. Preserve the 12 RLS-enabled/no-policy tables as backend-only; do not add broad RLS policies merely to silence INFO findings.
2. Do not weaken RLS or grant client access.
3. Enable leaked-password protection only through an owner-approved Auth configuration window after confirming availability on the current plan.
4. Do not replay applied migrations or reconstruct missing SQL from migration names.
5. Keep billing disabled and do not alter payment, Auth, RLS, secrets, or production schema as part of this read-only review.
6. Review unused indexes only after representative traffic and query-plan analysis.

## Verification evidence

- `list_migrations`: 37 applied migration records.
- `get_advisors(type=security)`: 12 INFO findings and 1 WARN finding.
- `get_advisors(type=performance)`: 26 unused-index INFO findings.
- Direct `has_table_privilege` check for SELECT/INSERT on the 12 tables: no client-role access for `anon` or `authenticated`.

This document records observed state only. It does not certify end-to-end production readiness or prove that all application endpoints are secure.
