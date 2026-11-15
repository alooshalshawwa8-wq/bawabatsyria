# OFOQ Engineering Audit 034 — Section Registry and Accounting Transaction Review

Date: 2026-11-15
Branch: `aloosh/brand-prep-2026-11-15`

## 1. Section registry validator

Added `scripts/validate-ofoq-section-registry.mjs` and wired it into `.github/workflows/static-validation.yml`.

The validator:
- Locates the `const sections = [...]` catalogue and finds its closing bracket with a delimiter scanner that respects quoted strings, escapes, and comments.
- Requires exactly 78 catalogue records and unique stable IDs.
- Requires non-empty title, icon, and description fields.
- Checks the 70 primary `utilityModules` keys for uniqueness and catalogue membership.
- Checks direct renderer section references and the cloud workspace extension targets against the catalogue.
- Requires every catalogue entry to have a utility module, a direct renderer, a workspace extension, or one of the three explicit premium-catalogue renderers.

### Source-level validation result

The validator's extraction and coverage rules were independently exercised against the current branch source during this audit:
- Catalogue records: 78; unique IDs: 78.
- Primary utility modules: 70; orphan keys: 0.
- Direct renderer references: 11 unique; orphan references: 0.
- Cloud workspace targets: `business`, `accounting_vip`, `jobs`, `freelance_vip`; orphan references: 0.
- Uncovered catalogue sections: 0.

The GitHub Actions workflow has been updated to execute the new script. A workflow run has not yet been observed for this branch; therefore CI execution is pending and is not represented as passed.

## 2. Inventory transaction review

Reviewed:
- `ofoq-workspaces.js`
- `supabase/migrations/20261109161356_reconstructed_foundational_baseline.sql`
- `supabase/migrations/20261109161357_inventory_and_accounting_integrity.sql`
- `supabase/migrations/20261109161417_remove_duplicate_integrity_triggers.sql`

Confirmed safeguards:
- Inventory quantity is constrained to be non-negative.
- Inventory movements require non-zero deltas and a valid movement type.
- Composite ownership foreign keys bind movements to an inventory item belonging to the same user.
- The surviving baseline trigger applies each movement to stock in the same database transaction and rejects a movement that would make stock negative.
- The duplicate later public trigger/function pair is explicitly removed by the follow-up migration, leaving the private baseline trigger as the intended stock mutation path.

Operational caveat:
- The UI creates a new item with quantity zero and then submits the opening movement as a second request. If the second request fails, the item can remain with zero stock. This is recoverable and does not create phantom stock, but the UX should expose the incomplete opening-balance state and offer a retry rather than implying the opening balance was saved.

## 3. Journal and accounting review

Confirmed safeguards:
- Journal lines must contain exactly one positive side (debit or credit); negative values and zero/zero lines are rejected by database checks.
- Composite foreign keys ensure a journal line's entry and account belong to the same user.
- New journal entries must start as drafts.
- Posted entries must contain at least two lines and have equal debit and credit totals.
- Posted entries cannot be reopened or voided.
- `public.post_journal_entry(uuid)` locks the user's draft row, rechecks line count and balance, then changes status to posted.
- The posting RPC is executable by authenticated users, not anon or PUBLIC.

Important implementation distinction:
- The current browser journal UI creates a draft header, then inserts its two lines in a separate request. It compensates for line-insert failure by deleting the draft; the entry's cascading foreign key removes any lines already inserted.
- This UI path does not call `post_journal_entry`; it deliberately leaves the balanced entry as a draft. The database posting RPC is a separate protected capability, not evidence that draft creation itself is a single atomic RPC.

### Implemented on the development branch

Added `supabase/migrations/20261115190000_create_atomic_journal_draft_rpc.sql`:
- Adds `public.create_journal_draft` as a `SECURITY INVOKER` function with an empty search path.
- Derives the owner exclusively from `auth.uid()`; accepts no caller-supplied user ID.
- Validates description length, date, distinct active same-owner accounts, same currency, and a positive amount with at most two decimal places.
- Creates the draft header and both balanced lines in one database transaction.
- Revokes PUBLIC/anon execution and grants execution to authenticated users only.

Updated `ofoq-data.js` with an authenticated POST-only PostgREST RPC transport, including the existing session refresh pattern. Updated `ofoq-workspace-extensions.js` so the journal UI uses the atomic RPC and continues to leave entries as drafts; posting remains a separate explicit action.

Added `tests/journal-draft-rpc-contract.mjs` and wired it plus syntax checks for the changed shared data/workspace scripts into static CI.

Remaining hardening:
- Add a client request UUID and database idempotency ledger before implementing automatic retries for this operation. The current RPC itself is atomic, but a user retry after an ambiguous network timeout could create a second valid draft.
- Run the migration replay and static CI against this branch before considering the change verified. No CI run has yet been observed for this branch.

## 4. Scope and non-actions

This audit is read-only apart from adding the validator, CI invocation, and this documentation. No production database, Auth users, RLS policies, live Edge Functions, Cloudflare configuration, GitHub Pages deployment, repository visibility, external account, or user data was changed. No migrations were applied. No PR was merged and no deployment was initiated.
