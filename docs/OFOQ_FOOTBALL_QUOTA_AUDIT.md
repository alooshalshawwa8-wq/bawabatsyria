# OFOQ Football Data — Quota & Reliability Audit

Date: 2026-11-11
Scope: static review of `supabase/functions/football-data/index.ts` on the default branch.
Safety: this audit did not call API-Football or consume provider quota.

## Verified protections in the Edge Function

- The browser-facing function accepts only the configured GitHub Pages origin, GET and OPTIONS; it applies an in-memory 30 requests/minute limit and a persistent per-client 60 requests/minute limiter.
- Provider cache lookup checks the in-memory cache, then the persistent `football_api_cache` table before attempting an upstream request.
- Each cache miss reserves budget through `rpc/football_api_budget_reserve` before calling API-Football. If the guard is unavailable, the provider request is stopped. If the daily budget is denied, the function attempts stale persistent data and otherwise returns a controlled 429.
- Identical concurrent provider requests are coalesced through `providerFetchInFlight`.
- Provider usage logging captures endpoint, status, response count, daily/minute quota headers when present, provider plan and duration.
- The owner-only usage action reads the budget and usage summaries and refreshes provider status no more often than once per 30 minutes per function instance.
- Cache TTLs vary by data volatility; live match data uses short windows, completed fixtures and static catalog data use longer windows.

## High-cost path identified

The `studio` action starts from a fixture lookup and, on a cold cache, fans out to as many as 17 additional datasets in parallel: events, lineups, players, statistics, predictions, injuries, head-to-head, home/away team statistics, home/away recent fixtures, standings, odds, league coverage and both team records. The budget reservation is performed per provider cache miss, so the global budget guard can deny excess calls; nevertheless, one studio open can consume a material portion of the configured daily budget when many cache keys are cold.

## Follow-up hardening priorities

1. Inspect the SQL definition and deployed state of `football_api_budget_reserve`, `football_api_budget_status`, and `football_rate_limit_hit`; confirm their caps are global across all Edge Function instances and fail closed.
2. Confirm the daily budget reserve is atomic under concurrency and reserves only one unit per upstream call.
3. Add a server-side studio response cache check before fixture lookup and fan-out (the current implementation already checks a studio cache key); verify persistent studio cache freshness and stale fallback behavior.
4. Consider a tiered studio mode: load fixture + essential live data first, then optional analytics only on explicit user interaction. Preserve the global budget guard for every call.
5. Add tests with mocked provider and RPC responses for cache hit, concurrent deduplication, budget denial, guard outage, stale fallback, and studio partial failure. These tests must not use the real API key.
6. Validate that the deployed Edge Function matches the reviewed source and inspect the latest GitHub Actions workflow run; a missing PR-triggered run is not evidence that deployment or CI succeeded.

## Current verification status

- Source review: completed for the quota, caching, rate-limit and studio fan-out paths.
- Live provider calls: intentionally not performed.
- SQL budget function definitions: not yet inspected in this pass.
- Browser acceptance suite / GitHub Actions: no PR-triggered workflow runs were returned for the latest documentation commit; deployment status remains unverified.
- No claim is made here that all 78 sections are functionally complete.

## Live Supabase verification (2026-11-11)

Read-only inspection of project `elzquyehghuxhswogsch` confirmed:

- The active policy row currently has `daily_limit_override=70`, `pacing_buffer_percent=30`, `warning_percent=50`, `critical_percent=85`, and, most importantly, `provider_blocked=true`. The provider is therefore intentionally blocked at the database guard. No setting was changed and no upstream API call was attempted.
- `football_api_budget_reserve` serializes reservations with transaction-scoped advisory locks (global minute lock plus UTC-day lock), checks the provider-block flag, enforces a hard maximum of 70 calls/day and 6 calls/rolling minute (or lower provider-reported limits), applies pacing, and freezes `live` and `emergency` buckets at the configured critical threshold.
- The four football budget/rate RPC functions are `SECURITY INVOKER`; their function ACLs show EXECUTE for `postgres` and `service_role` only. They are not executable by `anon` or `authenticated` according to the inspected ACL.
- The 10 tables flagged by the security advisor have RLS enabled and no policies. The inspected table grants for these tables are limited to `postgres` and `service_role`; no `anon` or `authenticated` table grants were present. This supports the intended backend-only model and means no broad client policy should be added just to silence the INFO linter finding.
- Supabase security advisor also reports leaked-password protection disabled. This is an Auth dashboard setting; it was not changed during this audit.
- Performance advisor reports 15 unused indexes. No indexes were removed because the findings alone do not prove an index is unnecessary, particularly on low-traffic or newly introduced modules.

## Updated conclusion

The central football quota guard is materially stronger than a simple per-instance throttle: reservations are serialized in the database, provider blocking is authoritative, and the hard daily/minute caps fail closed. The currently observed `provider_blocked=true` state must be preserved until the owner explicitly authorizes re-enabling provider traffic after reviewing the provider account and quota. Do not run live football tests while this flag is true.
