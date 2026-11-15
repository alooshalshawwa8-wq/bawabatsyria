# OFOQ-007 — Supabase security posture review
Date: 2026-11-15
Project: `elzquyehghuxhswogsch`
Scope: read-only verification; no production configuration or schema changes.

## Current verification

- Supabase reports 37 applied migrations.
- The development source tree and production migration history were rechecked on 2026-11-15; Supabase reports 37 applied migration records. See the current migration reconciliation documents for source provenance.
- Security Advisor reports 12 `rls_enabled_no_policy` findings at INFO level: `ai_provider_daily_usage`, `football_api_budget_policy`, `football_api_budget_reservations`, `football_api_cache`, `football_api_rate_limits`, `football_api_usage`, `ofoq_revenue_events`, `platform_feature_catalog`, `platform_launch_config`, `platform_plan_catalog`, `platform_plan_features`, and `site_assistant_rate_limits`. These are internal operational/configuration tables.
- A read-only query against `a direct privilege check confirmed no SELECT or INSERT privileges for `anon` or `authenticated` on those 12 tables; `service_role` retains backend access. Keep them closed; do not add broad RLS policies merely to silence the INFO finding.
- Security Advisor reports one WARN: leaked-password protection is disabled in Supabase Auth. This remains an open hardening item; no Auth setting was changed.
- Health Advisor was previously reported clear; the current recheck in this session focused on security and performance advisors.

## Decision log

1. Preserve the 11 RLS-enabled/no-policy tables as inaccessible to client roles while direct-grant verification remains empty.
2. Do not weaken RLS or grant client access just to remove an informational lint.
3. Schedule leaked-password protection for an approved Auth configuration window; verify compatibility and user impact before changing it.
4. Recover the 14 original migration SQL files from a trusted backup, deployment artifact, or source history. Do not reconstruct SQL from migration names and do not reapply the already-applied migrations.
5. Keep billing disabled and do not alter payment, Auth, RLS, secrets, or production schema as part of this read-only review.

## Verification evidence

- `list_migrations`: 36 applied migration records.
- `get_advisors(type=security)`: 12 INFO findings and 1 WARN finding.
- `get_advisors(type=health)`: no findings.
- `information_schema.role_table_grants` query for the 12 tables and client roles: zero rows.

This document records observed state only. It does not certify end-to-end production readiness.
