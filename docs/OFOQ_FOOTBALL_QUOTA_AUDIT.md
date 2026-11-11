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
