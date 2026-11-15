# OFOQ-015 — Reconstructed Foundational Baseline and Clean Replay Gate
**Date:** 2026-11-15  
**Project:** `elzquyehghuxhswogsch`  
**Branch:** `ofoq/ofoq-001-execution`  
**Related:** OFOQ-012, OFOQ-013, OFOQ-014

## Decision and provenance label

The user authorized the best available alternative where the original historical baseline could not be found. A new migration was therefore added:

`supabase/migrations/20261109161356_reconstructed_foundational_baseline.sql`

It is explicitly labelled a **reconstructed clean-install baseline derived from read-only production PostgreSQL catalog evidence captured 2026-11-15**, not the original historical migration. It precedes the first recovered migration `20261109161357` by one version unit and does not modify any of the 14 recovered historical files.

## Recovered foundational objects

The migration reconstructs the prerequisite relations verified in the live catalog:

- `membership_plans`
- `entitlements`
- `points_ledger` and its `points_balances` view
- `ai_provider_daily_usage` and `reserve_ai_provider_request(text, integer)`
- `profiles`
- `subscriptions`
- `inventory_items`
- `accounting_accounts`
- `journal_entries`
- `journal_lines`
- `inventory_movements`

It includes the observed columns, defaults, identity behavior, check/unique/foreign-key constraints, and supporting indexes. It also restores the live RLS posture and owner-scoped policies for these tables, plus the current catalog-observed helper functions and triggers needed by inventory movements, journal posting, and updated timestamps. The plan-price fields are represented as nullable and no Stripe price IDs or paid amounts are introduced; the later recorded plan migration seeds the plan catalog.

## Why this is a reconstruction, not historical recovery

The original pre-`20261109161357` source SQL or backup was not available in the connected repository or migration ledger. Current production state includes later hardening (notably private-schema SECURITY DEFINER trigger helpers), so it cannot be represented as the exact historical baseline. The migration file header and this document preserve that distinction.

## Safety and scope

- Development branch only; no production SQL was executed.
- No existing historical migration was edited.
- No production data, grants, RLS, Auth, secrets, Edge Functions, billing, or provider state was changed.
- No PR merge or force-push was performed.
- The migration replay workflow now pins Supabase CLI `2.72.7` to avoid the GitHub API "latest release" rate-limit failure and expects 37 total migrations (the original 36 plus this reconstructed baseline).

## Verification gate

The clean replay must complete from an empty disposable local Supabase database. Its assertions must verify:

1. 37 migration history records.
2. All 14 restored historical migration versions present.
3. Foundational tables including `inventory_movements`, `inventory_items`, `accounting_accounts`, `journal_entries`, `journal_lines`, and `membership_plans`, `entitlements`, `points_ledger`, and the `points_balances` view.
4. AI-provider daily quota table and restricted SECURITY DEFINER reservation function exist.
5. Current inventory and journal trigger presence.
6. `football_api_budget_reserve(text,text)` and `football_api_budget_status()` exist.
7. `football_api_budget_policy.provider_blocked = true`.

Until the workflow returns a successful completed run with these assertions, the replay gate remains pending; the existence of the new migration file alone is not proof of closure.
