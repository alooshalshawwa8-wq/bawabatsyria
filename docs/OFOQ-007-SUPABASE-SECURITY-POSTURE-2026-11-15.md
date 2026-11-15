# OFOQ-007 — Supabase security posture review
Date: 2026-11-15
Project: `elzquyehghuxhswogsch`
Scope: read-only verification; no production configuration or schema changes.

## Current verification

- Supabase reports 36 applied migrations.
- The development source tree currently contains 22 migration files; 14 applied versions remain unreconciled with checked-in SQL. See OFOQ-005 for the exact version/name register.
- Security Advisor reports 11 `rls_enabled_no_policy` findings at INFO level. These tables are internal operational/configuration tables.
- A read-only query against `information_schema.role_table_grants` returned no direct grants to `PUBLIC`, `anon`, or `authenticated` for those 11 tables. Keep them closed; do not add broad RLS policies merely to silence the INFO finding.
- Security Advisor reports one WARN: leaked-password protection is disabled in Supabase Auth. This remains an open hardening item; no Auth setting was changed.
- Health Advisor returned no findings.

## Decision log

1. Preserve the 11 RLS-enabled/no-policy tables as inaccessible to client roles while direct-grant verification remains empty.
2. Do not weaken RLS or grant client access just to remove an informational lint.
3. Schedule leaked-password protection for an approved Auth configuration window; verify compatibility and user impact before changing it.
4. Recover the 14 original migration SQL files from a trusted backup, deployment artifact, or source history. Do not reconstruct SQL from migration names and do not reapply the already-applied migrations.
5. Keep billing disabled and do not alter payment, Auth, RLS, secrets, or production schema as part of this read-only review.

## Verification evidence

- `list_migrations`: 36 applied migration records.
- `get_advisors(type=security)`: 11 INFO findings and 1 WARN finding.
- `get_advisors(type=health)`: no findings.
- `information_schema.role_table_grants` query for the 11 tables and client roles: zero rows.

This document records observed state only. It does not certify end-to-end production readiness.
