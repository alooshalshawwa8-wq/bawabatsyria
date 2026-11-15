# OFOQ-009 — Historical migration recovery and reconciliation record

Date: 2026-11-15  
Repository: `alooshalshawwa8-wq/bawabatsyria`  
Branch: `ofoq/ofoq-001-execution`  
Supabase project: `elzquyehghuxhswogsch`  
Scope: read-only migration inventory, Git history/branch search, and recovery decision. No database or production changes.

## Executive result

**Recovery status: NOT RECOVERED — reconciliation gate remains OPEN.**

The live Supabase migration history contains **36 applied migrations**. The production `main` Git tree contains **22 SQL files** under `supabase/migrations/`. The development branch has the same tracked migration inventory at the reviewed commit. Therefore, **14 applied migration versions have no matching checked-in SQL file** in the reviewed repository tree.

This document closes the *search and evidence-recording task*; it does not claim that the 14 original SQL bodies have been recovered. No substitute SQL was generated.

## Exact 14-version gap

The following rows were returned by Supabase migration history but were not present as matching files in the reviewed repository migration directory:

| Applied version | Applied migration name | Recovery status |
|---|---|---|
| `20261109161357` | `inventory_and_accounting_integrity` | Original SQL not found |
| `20261109161417` | `remove_duplicate_integrity_triggers` | Original SQL not found |
| `20261109161525` | `least_privilege_public_table_grants` | Original SQL not found |
| `20261109161555` | `optimize_owner_points_rls_policy` | Original SQL not found |
| `20261109161635` | `prepare_stripe_plan_price_mapping` | Original SQL not found |
| `20261109173150` | `prepare_local_manual_payment_infrastructure` | Original SQL not found |
| `20261109173201` | `tighten_payment_rls_and_indexes` | Original SQL not found |
| `20261110063058` | `tighten_anonymous_payment_table_privileges` | Original SQL not found |
| `20261110161112` | `harden_payment_access_and_points_view` | Original SQL not found |
| `20261110161138` | `restrict_public_function_execution` | Original SQL not found |
| `20261111120208` | `football_provider_guard_and_usage_metrics` | Original SQL not found |
| `20261111124712` | `enforce_football_provider_block_and_70_daily_quota` | Original SQL not found |
| `20261111124728` | `correct_football_budget_bucket_rounding` | Original SQL not found |
| `20261111124846` | `enforce_conservative_football_quota_guardrails` | Original SQL not found |

## The 22 migration files present in the production repository tree

The recursive `main` tree contains these 22 files:

1. `20261111090120_football_api_data_layer.sql`
2. `20261111090324_football_usage_error_telemetry.sql`
3. `20261111091245_platform_trial_and_football_plans.sql`
4. `20261111091412_correct_football_plan_feature_matrix.sql`
5. `20261111091741_football_api_budget_guard_and_entitlement_enforcement.sql`
6. `20261111091948_football_api_minute_rate_guard.sql`
7. `20261111092130_index_football_budget_and_feature_lookup.sql`
8. `20261111092902_football_api_status_header_refresh.sql`
9. `20261111092946_capture_provider_subscription_plan.sql`
10. `20261111093056_retain_provider_minute_limit.sql`
11. `20261111160644_user_workspace_backup_vault.sql`
12. `20261111161225_bound_workspace_backup_retention.sql`
13. `20261113131859_harden_ai_provider_reservation_search_path.sql`
14. `20261113132339_revoke_postgres_client_default_privileges.sql`
15. `20261113132420_revoke_client_public_sequence_access.sql`
16. `20261113132427_restrict_workspace_backup_trigger_function.sql`
17. `20261113134758_ofoq_store_cloud_catalog_and_orders.sql`
18. `20261113134838_ofoq_store_product_archiving.sql`
19. `20261113134941_ofoq_store_archived_product_order_guard.sql`
20. `20261113135325_ofoq_store_composite_owner_primary_keys.sql`
21. `20261113141515_ofoq_shared_crm_career_analytics_layer.sql`
22. `20261113141700_ofoq_shared_workspace_fk_indexes.sql`

## Recovery search evidence

Searches performed and recorded:

- Supabase `list_migrations`: confirmed 36 applied version/name rows.
- Recursive Git tree for production `main`: confirmed 22 migration SQL files.
- Recursive Git tree for the development branch: no additional matching migration files were identified in the reviewed development inventory.
- Earlier recursive tree review covered `security/runtime-test-harness-2026-11-13`, `ofoq/free-first-launch-plan`, `feature/secure-membership-wallet`, and `ofoq/founder-card-publish`; the 12 already-tracked November 11 migration files did not resolve the 14-version gap.
- Exact GitHub code searches were run for migration identifiers including `inventory_and_accounting_integrity`, `remove_duplicate_integrity_triggers`, `least_privilege_public_table_grants`, `prepare_stripe_plan_price_mapping`, `prepare_local_manual_payment_infrastructure`, `harden_payment_access_and_points_view`, `restrict_public_function_execution`, and `enforce_conservative_football_quota_guardrails`; no matching source files were returned.
- GitHub commit search for the exact `inventory_and_accounting_integrity` and `conservative_football_quota_guardrails` identifiers returned no matching commits.
- The similarly named repository `alooshalshawwa8-wq/bawabatsuria` was previously inspected and did not provide the missing migration directory/files.

Search-index limitations apply: absence from these results is not proof that no external backup, private archive, deleted/unreachable Git object, CI artifact, local developer workspace, or Supabase backup contains the originals.

## Required recovery inputs

Continue only from a trusted source, in this order:

1. Original developer workstation or CI/deployment artifact containing the exact SQL files.
2. A full Git bundle/clone or backup predating their removal, including unreachable objects and relevant refs.
3. An approved repository backup/export or another authoritative repository that can prove provenance.
4. Supabase backup/snapshot and a controlled schema/object comparison, used as corroborating evidence—not as a substitute for historical SQL.

For every recovered file, record its original filename, byte-for-byte content, source location, source commit/archive identifier, SHA-256 digest, and independent review result before restoring it to the development branch.

## Prohibited shortcuts and safety constraints

- Do not infer historical SQL from migration names, current schema, logs, or memory.
- Do not create placeholder or guessed SQL under the original timestamps.
- Do not rerun, reapply, or repair the 14 already-applied migrations merely to make the local file list match.
- Do not modify production schema, RLS, grants, functions, triggers, Auth, secrets, billing, or data as part of this recovery record.
- Do not add broad client policies to the internal RLS-enabled tables to silence advisor findings.
- Keep billing disabled and retain the trial/free-first policy.

## Release decision and exit criteria

**Migration reconciliation remains a release gate.** The task is complete only when either:

A. All 14 original SQL files are recovered from trusted provenance, restored to the development branch, hashed, reviewed, and their effects reconciled against the live database; or

B. If originals are irretrievable, a separately named and explicitly approved *baseline/reconciliation package* is prepared from a complete schema/object inventory, independently reviewed, tested against a disposable database, and accepted as a documented replacement for historical source recovery. This alternative must not impersonate or reuse the missing historical timestamps.

Until one of these paths is completed, do not mark migration reconciliation as resolved and do not merge PR #23 or promote this branch to production on the strength of this document.

## Change record

- Documentation only.
- No SQL migration file was created or modified.
- No migration was applied or reverted.
- No production database, schema, data, grants, RLS policies, Auth settings, secrets, Edge Functions, or billing configuration was changed.


## Supplemental recovery pass — 2026-11-15

A further pass was performed after the initial report update:

- Re-opened GitHub Issue #24, which records the original migration mismatch and the safe-resolution plan. Its discussion confirms that the live migration history was read directly and that the original SQL must be recovered from trusted deployment/backup artifacts or, if impossible, replaced only through a separately reviewed baseline process.
- Searched the user's available Library for the exact missing migration identifiers and related SQL source material. The search surfaced project reference documents and execution summaries, but no original SQL migration bodies or source archive.
- Re-checked the accessible second repository `alooshalshaw8-wq/bawabatsuria`; no matching migration source files were returned by exact-name code searches.
- Reconfirmed that the 14 migration names and applied versions are present in the live migration history, but the history table records identifiers, not the original SQL bodies.

### Final operational conclusion

The **documentation and repository-side recovery investigation are complete to the extent supported by currently accessible sources**. The **actual recovery of the 14 SQL bodies is still blocked** because no trusted copy of those bodies was found.

This is not a completed recovery and must not be represented as one. The remaining dependency is an authoritative source archive: a developer workstation export, original CI/deployment artifact, full Git bundle/backup containing the relevant objects, or another repository backup with provenance.

The alternative baseline route in the release criteria is a distinct engineering task. It requires a complete schema-only export and object inventory, a separately reviewed baseline package, and validation in an isolated PostgreSQL environment. It is not permission to fabricate historical files and has not been started or applied.

Reference: GitHub Issue [#24](https://github.com/alooshalshawwa8-wq/bawabatsyria/issues/24).

No production database changes, migration replay, reset, SQL reconstruction, or billing/Auth/security configuration changes were performed during this supplemental pass.
