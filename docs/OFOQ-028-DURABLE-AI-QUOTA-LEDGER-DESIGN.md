# OFOQ-028 — Durable AI Quota Ledger and Atomic Reservation Design

Date: 2026-11-15
Status: design specification only; no database migration or live database change.

## Required data model

### ai_quota_reservations
One row per logical provider attempt reservation:
- request_id (stable UUID or bounded opaque ID)
- provider_id, model_id, task
- state: reserved | settled | released | rejected
- reserved_at, provider_started_at, finalized_at
- provider_attempted boolean
- unique(provider_id, request_id)

The unique key makes retries idempotent. A repeated reservation with the same key returns the existing reservation and must not increment counters again.

### ai_usage_events
Append-only normalized outcome ledger:
- event_id, request_id, provider_id, model_id, task
- status: success | quota_exhausted | failed
- latency_ms
- input_tokens, output_tokens, total_tokens (nullable)
- cost_amount, cost_currency, cost_basis (nullable; provider_reported | verified_rate_estimate)
- provider_http_status (nullable), occurred_at
- unique(provider_id, request_id, event_type) or a unique settlement key to prevent duplicate outcome writes.

Never store prompt/response bodies, API keys, authorization headers, or raw provider error bodies.

### ai_quota_windows
Atomic counters keyed by provider, model, window kind, and window start:
- provider_id, model_id, window_kind (minute | day), window_start
- request_count, reserved_count, settled_count, token_count
- primary key(provider_id, model_id, window_kind, window_start)

Use database time (UTC) and fixed, documented window semantics. Keep IP-based abuse protection separate from provider quotas.

## Transactional RPC semantics

1. reserve_ai_quota(provider, model, request_id, limits): transactionally validate the allowlisted provider/model and free-only policy, check daily and minute windows, then reserve once. Return allowed/denied and retry-after metadata without leaking keys.
2. mark_ai_provider_attempt(request_id): set provider_attempted before the network call. This prevents a post-attempt failure from being incorrectly refunded.
3. settle_ai_quota(request_id, outcome, usage): idempotently append the outcome and reconcile reserved/settled counters. Missing token values remain NULL.
4. release_ai_quota(request_id, reason): only release a reservation when provider_attempted=false. A provider 429 is a consumed attempt and must be recorded as quota_exhausted, not released as if no call occurred.
5. Repeated settle/release calls return the prior final state and never double count.

All RPCs are SECURITY DEFINER only where necessary, with empty search_path, fully qualified object names, explicit argument validation, EXECUTE revoked from PUBLIC/anon/authenticated, and service_role-only execution. Tables use RLS enabled and no client-role policies; service-role grants are minimal.

## Quota policy

- Enforce both provider+model daily request and minute request ceilings atomically.
- Add token ceilings only after the provider reports reliable usage and the reset semantics are understood.
- A provider/model is eligible only when free-tier eligibility, account limits, model ID, and provider terms have been checked and recorded.
- No paid model, paid tier, paid fallback, or billing-enabled route is eligible by default.
- A fallback is allowed only to another explicitly enabled and currently healthy free provider/model; otherwise fail closed.

## Dashboard read model

Owner-only aggregate view, never a direct browser read of raw service-role tables:
- provider/model state and free-tier verification status
- daily/minute request use and remaining budget
- token totals with unknown counts visibly separated
- success/failure/quota-exhausted rates
- median and p95 latency
- actual cost and estimated cost shown separately; unknown cost is not displayed as zero
- last health check, last failure class, and fallback history

## Migration and release gates

- Inspect the exact current table/function definitions and all grants before writing migration SQL.
- Run migration replay and SQL contract tests on a clean disposable PostgreSQL database.
- Review lock behavior, transaction boundaries, indexes, retention, and rollback.
- Back up and obtain explicit approval before any live Supabase schema change.
- Deploy only after the owner-only hosting boundary and endpoint authorization checks are verified.
