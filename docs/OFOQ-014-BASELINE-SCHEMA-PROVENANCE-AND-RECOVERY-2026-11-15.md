# OFOQ-014 — Baseline Schema Provenance and Recovery Investigation
**Date:** 2026-11-15  
**Project:** `elzquyehghuxhswogsch`  
**Branch:** `ofoq/ofoq-001-execution`  
**Related:** OFOQ-012 historical migration restoration; OFOQ-013 clean replay gate

## Executive determination

The authoritative historical baseline source file could not be recovered from the connected repository or Supabase migration ledger. The clean-replay failure is explained: the first tracked migration assumes foundational public tables already exist, but none of the 36 recorded/tracked migrations creates them.

The current production catalog provides a verified present-day schema reference for these tables, including `public.inventory_movements`. This is not the original pre-`20261109161357` baseline: current production triggers/functions show later hardening and cannot safely be relabelled as historical baseline SQL.

This investigation closes the source search and records the recoverable catalog evidence, but does not fabricate a baseline migration or claim clean replay is fixed. No production DDL/DML, grants, policies, Auth settings, or migration history were changed.

## 1. Provenance search

1. Supabase `supabase_migrations.schema_migrations` contains exactly 36 migration records, first version `20261109161357`.
2. Every recorded migration statement was checked for `CREATE TABLE` of `inventory_movements`, `inventory_items`, and `journal_entries`: none creates these foundational relations.
3. The development branch contains 36 SQL migration files. The first, `20261109161357_inventory_and_accounting_integrity.sql`, immediately refers to pre-existing tables.
4. Repository `backend/schema.sql` is a D1/SQLite schema (TEXT IDs, INTEGER timestamps, `unixepoch()`, Stripe/D1 tables); it is not a source for Supabase PostgreSQL inventory/accounting tables.
5. No canonical Supabase baseline/schema dump was found in the inspected tracked source.

**Conclusion:** the foundational schema was provisioned outside the currently tracked migration lineage (possibly an earlier manual/dashboard SQL deployment or untracked historical migration). Available records do not establish which mechanism or preserve its original source text.

## 2. First migration prerequisites

Migration `20261109161357_inventory_and_accounting_integrity.sql` assumes these relations exist before it runs:

- `public.inventory_movements`
- `public.inventory_items`
- `public.journal_entries`
- `public.journal_lines`
- `public.profiles`
- `public.subscriptions`

It also relies on columns such as `updated_at` on inventory_items, journal_entries, profiles, and subscriptions. The current catalog confirms related dependencies on `auth.users`, `inventory_items(user_id,id)`, `journal_entries(user_id,id)`, `accounting_accounts(user_id,id)`, and `membership_plans(id)`.

## 3. Verified current production definition: public.inventory_movements

| Column | Type | Null | Default |
|---|---|---:|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | — |
| item_id | uuid | NO | — |
| quantity_delta | numeric(14,3) | NO | — |
| movement_type | text | NO | — |
| reference | text | YES | — |
| notes | text | YES | — |
| created_at | timestamptz | NO | now() |

Constraints:
- Primary key on `id`.
- `quantity_delta <> 0`.
- `movement_type IN ('opening','purchase','sale','return','adjustment','waste')`.
- `user_id -> auth.users(id) ON DELETE CASCADE`.
- `(user_id,item_id) -> inventory_items(user_id,id) ON DELETE RESTRICT`.

Indexes:
- `inventory_movements_pkey` — unique btree `(id)`.
- `inventory_movements_item_created_idx` — btree `(user_id,item_id,created_at DESC)`.
- `inventory_movements_user_created_idx` — btree `(user_id,created_at DESC)`.

Security/current trigger:
- RLS enabled; authenticated owner SELECT and INSERT policies constrain `auth.uid() = user_id`; no UPDATE/DELETE policy returned.
- Current BEFORE INSERT trigger `inventory_movement_apply` calls `private.apply_inventory_movement()`.
- That current function is SECURITY DEFINER with empty search_path and checks `auth.uid()` against `new.user_id` before updating stock.

## 4. Current related table inventory

- `inventory_items`: UUID id/user_id, optional SKU/description, name, unit, quantity numeric(14,3), reorder_level numeric(14,3), unit_cost numeric(14,2), currency char(3), created_at, updated_at; Auth owner FK, composite unique `(user_id,id)`, unique `(user_id,sku)`.
- `accounting_accounts`: UUID id/user_id, code, name, account_type, currency char(3), is_active, created_at; account-type check and composite unique `(user_id,id)`.
- `journal_entries`: UUID id/user_id, identity entry_number, entry_date, description, status, created_at, updated_at; Auth owner FK, status/description checks, unique `(user_id,id)`.
- `journal_lines`: UUID id/user_id/entry_id/account_id, optional description, debit/credit numeric(14,2), created_at; balanced-line check and composite FKs to journal_entries and accounting_accounts.
- `profiles`: id references `auth.users(id)`, display_name, avatar_url, locale, created_at, updated_at.
- `subscriptions`: UUID id/user_id, plan_id, provider, provider_subscription_id/customer_id, status, period timestamps, cancel_at_period_end, created_at, updated_at; references Auth and `membership_plans`.
- The live table listing reports RLS enabled on these prerequisite tables.

## 5. Historical/current mismatch — why no baseline was fabricated

Current production inventory trigger: `inventory_movement_apply` -> `private.apply_inventory_movement()`; temporary historical trigger created by the first recovered migration: `inventory_movement_apply_stock` -> `public.apply_inventory_movement_to_stock()`.

Current journal trigger: `validate_journal_entry_status` -> `private.validate_journal_entry_status()`; temporary historical trigger: `journal_entry_require_balance` -> `public.validate_posted_journal_entry()`.

The present production catalog is a current-state reference, not proof of the exact pre-migration baseline. Copying it into a runnable historical migration could alter semantics, RLS, trigger behavior, or object ordering.

## 6. Final evidence matrix

| Item | Result |
|---|---|
| Current production definition of `inventory_movements` | Recovered from live PostgreSQL catalogs |
| Current related table columns/constraints/indexes/policies/triggers | Inspected |
| First migration prerequisite set | Identified |
| Historical pre-`20261109161357` baseline SQL | NOT FOUND |
| Provenance of original baseline deployment | NOT ESTABLISHED |
| Safe authoritative runnable baseline migration | NOT CREATED |
| Clean replay fixed | NO — blocked pending authoritative baseline |
| Production schema/data changed | NO |

## 7. Required path to true closure

One authoritative input is still required:

1. Original Supabase SQL/schema export or migration file that created the foundational tables; or
2. Verified historical backup/schema snapshot from before migration `20261109161357`; or
3. Explicit owner approval to create a new forward-maintained bootstrap baseline from the present production catalog, clearly labelled reconstructed rather than historically recovered, followed by complete isolated replay and review.

Until then, no guessed tables, synthetic baseline, or edits to the 14 recovered historical files are acceptable.

**Safety:** this investigation was read-only against production. No DDL/DML, grants, RLS/Auth changes, secrets, or provider calls. PR #23 remains draft and unmerged.
