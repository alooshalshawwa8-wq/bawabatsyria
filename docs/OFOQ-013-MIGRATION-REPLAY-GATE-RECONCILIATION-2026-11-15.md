# OFOQ-013 — Migration Replay Gate and 20261111124846 Reconciliation
**Date:** 2026-11-15  
**Branch:** `ofoq/ofoq-001-execution`  
**Baseline commit:** `ff2e6ab5018753ab2fae6750681a680f90ddd8b1`  
**Related record:** `docs/OFOQ-012-HISTORICAL-MIGRATION-RESTORATION-2026-11-15.md`

## Purpose

Close the two follow-up items transferred out of the 14-migration source-recovery task: (1) investigate the apparent conflict in migration `20261111124846`, and (2) determine whether an isolated replay can safely be performed with the currently available, no-additional-cost environment.

## 1. Reconciliation of migration 20261111124846

### Evidence collected

- Supabase `list_migrations` reports version `20261111124846` / `enforce_conservative_football_quota_guardrails` in the project's migration history.
- The migration-history record retains the original SQL statements.
- The migration's two function bodies were compared against the live PostgreSQL definitions returned by `pg_get_functiondef`. After whitespace normalization, both bodies match exactly:
  - `public.football_api_budget_reserve(text,text)`
  - `public.football_api_budget_status()`
- The live singleton row in `public.football_api_budget_policy` has the values set by this migration:
  - daily limit: 70
  - core/live/emergency budget percentages: 57.15 / 28.58 / 14.27
  - warning / critical thresholds: 50 / 85
  - pacing buffer: 30
  - provider blocked: true
- A read-only call to `public.football_api_budget_status()` returned `providerBlocked=true`, `dailyLimit=70`, `minuteLimit=6`, and zero recorded reservations at the time of inspection.

### Determination

The comment in the historical SQL file saying that the migration was staged on a GitHub branch only is inconsistent with the actual migration history and live database state. The available evidence establishes that this migration is recorded as applied and that its two function definitions and policy values are present in production.

**Disposition: conflict resolved as a stale/historical intent comment, not an unapplied migration.** Preserve the recovered SQL exactly as sourced; do not rewrite the historical file to conceal the original comment. Do not replay this migration against production. The provider remains blocked, and this audit did not contact the provider or change that state.

## 2. Isolated replay test

A full isolated replay was not executed in this run.

- No existing local PostgreSQL/Supabase runtime was available in the execution environment.
- Creating a Supabase development branch can incur hourly compute and other usage charges. Under the project's free-first/no-purchase-without-owner-approval policy, no new Supabase branch or paid resource was created.
- The repository does not currently provide a checked-in `supabase/config.toml` local-stack configuration, so a complete Supabase local reset/replay could not be invoked safely from the current repository state without introducing and validating additional environment configuration.
- No production DDL, DML, migration replay, or migration-history edits were attempted.

This is an explicit environment limitation, not a failed replay. A disposable local PostgreSQL/Supabase stack can be used later if it is available without additional cost. Because all 14 versions are already recorded in the target project's migration history, they must not be re-applied to production as a way of testing them.

## 3. CI verification on the restored source and documentation

For commit `ff2e6ab5018753ab2fae6750681a680f90ddd8b1`, both GitHub Actions workflows completed successfully:

- `OFOQ static validation` — success. Includes JavaScript syntax checks, Deno type-checks for the three Edge Functions, Edge Function security contract tests, and static app contract validation.
- `Validate membership and portal code` — success. Includes membership and Stripe webhook security tests, D1 schema validation, OFOQ portal contract tests, Playwright browser smoke tests, and mobile smoke tests.

These CI workflows validate application and portal code. They are not a PostgreSQL migration replay and are not represented as such.

## 4. Safety and release posture

- All 14 restored SQL files remain exact source recoveries; no historical SQL was altered.
- No Supabase branch was created, no paid resource was provisioned, and no production SQL was executed.
- The production provider-block flag remains true.
- Billing remains disabled.
- PR #23 remains open and draft; no merge to `main` was performed.

## Final disposition

| Gate | Result |
|---|---|
| Fourteen source files restored and exact-compared | PASS — 14/14 |
| Historical 20261111124846 discrepancy investigated | PASS — stale comment reconciled against migration history and live state |
| Runtime status behavior checked read-only | PASS |
| Existing CI on restoration/documentation commit | PASS — both workflows |
| Isolated clean-database replay | NOT RUN — no existing no-cost isolated runtime |
| Production replay | PROHIBITED / NOT NEEDED — migration already recorded as applied |

**The recovery and reconciliation work is closed.** The only remaining optional assurance is a clean-database replay in an isolated environment that is already available at no additional cost. It is not a reason to replay any of these migrations against production or to block the historical source-recovery closure.


## 5. Executed clean-replay attempt — final evidence (2026-11-15)

This section supersedes the earlier statement that isolated replay was not run.

- GitHub Actions workflow run: `43687677547`; job: `132731464250`.
- The free runner installed the Supabase CLI, generated local configuration, pulled the containers, and initialized the disposable local database.
- Clean replay **failed on the first migration**, `20261109161357_inventory_and_accounting_integrity.sql`, with PostgreSQL error `42P01: relation "public.inventory_movements" does not exist`, at `drop trigger if exists inventory_movement_apply_stock on public.inventory_movements`.
- Later replay/assertion steps were skipped; cleanup stopped the disposable stack successfully.

### Determination and safety boundary

The checked-in migration sequence is not self-contained from an empty database: its first migration assumes a pre-existing `public.inventory_movements` relation. This does not establish that the 14 recovered SQL files are corrupt; all 14 remain exact matches to the historical statements. This failure also does not identify every missing baseline object or its authoritative definition.

Do not alter the 14 historical files, invent placeholder tables or a synthetic baseline, or replay migrations on production. No production SQL was executed by this workflow. Recover the authoritative baseline migration/schema and verify its provenance and ordering before another clean replay. PR #23 remains draft and unmerged.

### Updated disposition

| Gate | Result |
|---|---|
| 14 historical SQL files restored and exact-compared | PASS — 14/14 |
| 36 SQL migration files present in development branch | PASS |
| Historical 20261111124846 discrepancy reconciled | PASS |
| Free isolated Supabase stack bootstrapped | PASS |
| Clean replay from empty database | BLOCKED — missing pre-existing `public.inventory_movements` |
| Full replay assertions | NOT REACHED |
| Production database changed by test | NO |
| PR merged | NO |

**Closure:** The 14-file historical recovery and source-verification dossier are closed. The broader clean-replay gate is not passed; its concrete blocker is the missing baseline prerequisite above. The next critical task is baseline provenance recovery, not alteration of the recovered 14 files.
