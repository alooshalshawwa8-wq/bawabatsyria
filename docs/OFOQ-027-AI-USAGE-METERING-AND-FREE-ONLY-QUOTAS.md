# OFOQ-027 — AI Usage Metering and Free-Only Quota Control

Date: 2026-11-15
Status: implementation slice on the private-access development branch; not deployed.

## Objective

Establish a provider-neutral contract for per-provider/model/task usage, latency, outcome, token counts, and cost without inventing unknown values or permitting paid fallback.

## Implemented in this slice

- `ai-usage-contract.ts` defines versioned usage events and normalized statuses: success, quota_exhausted, failed.
- Token counters accept only non-negative safe integers. Missing or malformed provider usage stays null.
- Cost remains null until the exact model/account pricing is authoritatively verified.
- Gemini adapter captures elapsed request time and parses Gemini `usageMetadata` when returned.
- Assistant emits structured `AI_USAGE_EVENT` operational logs containing provider, model, task, outcome, latency, token counts, null cost, and timestamp. No prompt, answer, user ID, or credential is included.
- Free-only policy is explicit: `freeOnly=true`, `allowPaidFallback=false`.
- Tests cover normalization, unknown values, latency handling, and paid-fallback prohibition.
- CI runs the new usage-contract test file.

## Current enforcement boundaries — do not overstate

1. The existing database reservation still enforces 30 requests/day for provider `gemini`; it is not yet model-specific.
2. The existing 12/minute limiter is per hashed client IP for the assistant endpoint, not a provider/model quota. The new 5/minute Gemini policy value is a target policy declaration only; it is **not yet enforced** by a provider-scoped atomic database reservation.
3. Token usage is currently emitted to structured Edge Function logs. It is not yet written to a durable per-model usage ledger or exposed in a dashboard.
4. Provider-reported token counts are only available when Gemini returns `usageMetadata`; absent counts remain unknown.
5. Actual cost is deliberately unknown/null. The configured model's account-level free-tier eligibility and rate limits remain unverified.
6. The current provider registry permits Gemini only. No secondary provider is enabled and no fallback is attempted.

## Next engineering slice

- Design a service-role-only, append-only usage ledger with provider ID, model ID, task, request correlation ID, timestamps, status, latency, input/output/total tokens, cost currency/amount, and whether cost is estimated or provider-reported.
- Add atomic provider+model minute/day request reservations and optional token budgets. Keep the existing endpoint/IP abuse limiter as a separate layer.
- Separate reservation, provider attempt, settlement, and release semantics. A local validation failure must not be misreported as provider consumption; a provider 429 must be recorded as quota exhaustion.
- Make request IDs idempotent to prevent duplicate settlement.
- Define retention, aggregation, and owner-only read access before building dashboard UI.
- Add a provider onboarding gate requiring verified free-tier eligibility, documented limits, server-side key presence, model allowlisting, health probe, and an explicit no-paid-fallback assertion.
- Do not apply any schema migration to the live Supabase project until separately reviewed and explicitly approved.

## Safety invariants

- Never log request/response content, API keys, authorization headers, or raw provider error bodies.
- Never infer zero tokens or zero cost when values are unknown.
- Never silently upgrade to a paid model, paid tier, or paid provider.
- Provider/model selection remains server-side and allowlisted; browser payloads cannot select endpoints or credentials.
