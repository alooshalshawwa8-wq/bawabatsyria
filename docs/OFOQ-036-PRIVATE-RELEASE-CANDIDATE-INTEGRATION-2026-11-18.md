# Private Release Candidate 09 — Integration and Verification Record

Date: 2026-11-18
Repository: `alooshalshawwa8-wq/bawabatsyria`
Candidate branch: `aloosh/private-release-candidate-2026-11-18`
Production branch: `main` (unchanged)

## 1. Candidate construction

- PR #32 remains open and unmerged; head: `fafb6d5df8b3454053fc9adad84444fca1a9c376`.
- PR #33 remains open, draft, and unmerged; head: `de186024a51c3fdacbccfd18fecec78b12af2e44`.
- PR #33 is stacked on PR #32. The candidate branch was created directly from PR #33's head commit, preserving the stacked changes as a single isolated review candidate.
- Candidate branch creation did not change `main`, merge either PR, deploy Pages, or apply a database migration.
- Candidate static validation completed successfully on commit `eefd37571ea4e7f528774f66124a36fa9303d5dc` (GitHub Actions run [44370755301](https://github.com/alooshalshawwa8-wq/bawabatsyria/actions/runs/44370755301)). The prior candidate static runs also passed on the preceding integration commits.
- The GitHub compare endpoint reports the candidate as 234 commits ahead of `main`, with the candidate diff containing the combined changes listed by GitHub. This unusually large commit distance is a review warning: inspect ancestry and commit scope before any future merge; do not interpret the number as 234 newly authored feature commits.

## 2. Isolated CI enablement

The original static validation and clean migration replay workflows did not include this candidate branch in their push branch filters. On the candidate branch only:

- `.github/workflows/static-validation.yml` now includes the candidate branch in its push filter and `docs/**` in its path filter.
- `.github/workflows/migration-replay.yml` now includes the candidate branch in its push filter.
- Both workflows retain read-only repository permissions. The migration workflow creates a disposable local Supabase stack, replays migrations locally, runs assertions and SQL contracts, and tears down that local stack.
- `.github/workflows/pages.yml` was inspected and left unchanged. It only deploys from `main` through a manually authorized workflow dispatch; the candidate branch is not a deployment trigger.

These workflow edits are committed only to the candidate branch and successfully triggered isolated CI runs. Candidate static validation passed (run [44370755301](https://github.com/alooshalshawwa8-wq/bawabatsyria/actions/runs/44370755301)). The full Git-history Gitleaks scan passed with **0 findings across 1,061 commits** (run [44370754535](https://github.com/alooshalshawwa8-wq/bawabatsyria/actions/runs/44370754535)). The disposable migration replay run [44370459596](https://github.com/alooshalshawwa8-wq/bawabatsyria/actions/runs/44370459596) has passed the migration replay, all schema/security assertions, RPC idempotency tests, AI quota lifecycle/concurrency tests, owner-only RLS checks, and rate-limit concurrency tests; the local stack cleanup also completed successfully; the entire workflow concluded successfully.

## 3. Candidate CI evidence

The candidate itself has the following direct evidence:
- Static validation passed on the candidate head, including JavaScript syntax, 78-section registry, Deno checks, Edge Function security contracts, journal/inventory/idempotency contracts, static app contracts, and the private Pages artifact build.
- Gitleaks scanned 1,061 commits / approximately 3.45 MB and reported 0 findings.
- The disposable Supabase replay successfully applied all 43 migrations from an empty local database. All subsequent migration history, critical object, RLS/privilege, journal/inventory idempotency, AI quota lifecycle and concurrency, owner-only policy, and Nibras rate-limit concurrency steps passed. The local Supabase stack was stopped successfully and the full workflow concluded with success.
- The earlier source PR check counts remain historical evidence only: PR #32 had 5/5 and PR #33 had 2/2 on their reviewed heads.

## 4. Migration safety

The candidate contains five additional migration files beyond the 38-file main-branch baseline inspected during the earlier audit, bringing the candidate replay workflow's expected total to 43:
- `20261115160000_enforce_single_owner_rls.sql`
- `20261115180000_ai_quota_ledger.sql`
- `20261115190000_create_atomic_journal_draft_rpc.sql`
- `20261115191000_create_atomic_inventory_item_rpc.sql`
- `20261115192000_add_rpc_idempotency_keys.sql`

They are source files only on this candidate. No production migration was applied. The migration workflow targets a disposable local Supabase instance and asserts the expected migration count, recovered historical versions, RLS, RPC permissions, AI quota lifecycle, and idempotency contracts.

## 5. Important review gates

1. **Owner authentication:** inspect the exact owner claim verification in the candidate Edge Function and verify that no request can obtain owner access from caller-controlled metadata.
2. **CORS and canonical origin:** reconcile the legacy GitHub Pages origin with the intended Cloudflare Pages origin without changing production configuration.
3. **Public repository exposure:** repository visibility remains Public. Cloudflare Access on the website alone does not make source files private. Visibility change is not authorized in this phase.
4. **Secrets:** inspect tracked history and current source for accidental secrets; never print secret values or rotate production secrets in this phase.
5. **Pages deployment:** keep the Pages workflow on main and manually gated. No Pages workflow was dispatched.
6. **Supabase:** no production Auth, RLS, schema, function, or secret settings were changed.
7. **Brand:** keep the final product name undecided; do not reintroduce retired names as the final identity.

## 6. Code review findings

### Owner authentication
- The candidate assistant and membership API call Supabase Auth `/auth/v1/user` using the caller's Bearer token.
- Owner status is derived from the returned server-managed `app_metadata` claims: `role=OWNER`, `owner=true`, and `owner_access=lifetime`.
- The code does not use caller-provided `user_metadata`, email text, or request JSON to establish owner status. This is a sound direction, subject to verifying that the owner claims are assigned only by trusted server-side administration and that the corresponding production owner user is provisioned correctly.
- The candidate owner-only RLS migration uses the same claims through `public.is_ofoq_owner()`. It is source code only and has not been applied to production.

### Origin and legacy assistant context
- `site-assistant`, `football-data`, and `membership-api` retain a fallback `OFOQ_ALLOWED_ORIGIN` of the old GitHub Pages origin. A server environment override exists, but the Cloudflare production value has not been verified or changed. This is a release blocker for a Cloudflare cutover.
- The membership API also retains a legacy GitHub Pages `SITE_URL` fallback. Verify all redirect and email-link consumers before changing it.
- The assistant system prompt still describes the old public OFOQ/Nibras experience. It must be rewritten for the private owner-first digital world before the assistant is exposed on the private deployment.
- The new central intelligence core is documented as an architecture baseline only. No new memory tables, orchestration engine, UI redesign, or provider integration has been deployed or added to production.

### Repository and branch protection
- The candidate branch currently reports `protected=false`. No branch protection/ruleset was changed. Treat the candidate as a controlled working branch and require CI evidence plus review before any merge.
- The repository remains Public. Candidate code and docs are not private merely because the website may later be protected by Cloudflare Access.

## 7. Result

Completed:
- Created an isolated candidate branch from the stacked PR #33 head.
- Enabled static validation, disposable migration replay, and full Git-history secret scan triggers for this candidate branch.
- Preserved the production branch and deployment workflow.
- Documented migration and security review gates.

Pending:
- Verify server-side owner claim provisioning and the actual production owner account configuration without changing it.
- Configure and test the Cloudflare origin override only after the private hostname is finalized and production approval is granted.
- Build and verify the private artifact in CI.
- Prepare, but do not activate, a Cloudflare Access production cutover plan.

## 8. Explicit non-actions

No merge to `main`; no deployment; no production database migration; no production Auth/RLS/function/secret change; no repository visibility change; no Cloudflare Access activation; no paid service or paid browser credits.
