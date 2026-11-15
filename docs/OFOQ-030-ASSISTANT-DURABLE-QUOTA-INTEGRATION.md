# OFOQ-030 — Assistant Integration with the Durable AI Quota Ledger

Date: 2026-11-15
Status: implemented on the development branch; verification pending.

## Scope

The Nibras Edge Function now uses the provider/model-scoped quota ledger introduced in migration `20261115180000_ai_quota_ledger.sql`. This replaces the earlier provider-only daily counter in the assistant request path.

## Request lifecycle

1. Validate request origin, method, bounded message payload, owner session, and client rate limit.
2. Normalize conversation and derive a trusted task class from the server allowlist.
3. Resolve the provider through the server-side free-tier eligibility gate. A blocked or unverified provider returns before any provider quota is reserved.
4. Reserve a request against the exact `provider_id + model_id` and a unique request UUID.
5. Mark the reservation as provider-attempted immediately before invoking the isolated provider adapter.
6. Invoke only the server-resolved provider configuration.
7. Settle the same request UUID exactly once, recording status, latency, provider-reported token usage when available, and provider HTTP status.
8. Keep the structured log event free of prompt text, answer text, user identifiers, and API keys.

## Failure behavior

- Reservation service unavailable: fail closed; do not call the model.
- Provider/model not verified free: fail closed; do not call the model.
- Quota exhausted: return a quota response; no alternate paid provider or model.
- Provider 429: record `quota_exhausted` in the usage ledger.
- Provider errors/timeouts: record `failed` with measured latency and any available status.
- Settlement unavailable after a provider attempt: emit a minimal operational error and leave the attempted reservation auditable for future reconciliation. It is never released as unused.

## Accounting boundaries

- Request counters are reserved atomically per model and minute/day.
- Provider token counts are persisted only when the provider reports safe integer values.
- Token totals are tracked, but daily/minute token ceilings remain unset until reliable provider-specific token quota information and safe preflight estimation are available.
- Cost remains null. No price is inferred from a generic provider pricing page or a model name.
- No prompt, completion, or personal conversation content is stored in the ledger.

## Current hard gate

Gemini remains `enabled=false` and `free_tier_verified=false` in the database seed policy, and its registry eligibility flag remains false. The code path is intentionally unable to send Gemini requests until exact account/model no-charge eligibility is verified and an owner-reviewed change explicitly enables it.

## Verification

The development CI workflow checks:
- Edge Function TypeScript and security contracts.
- Clean migration replay.
- Exact model policy defaults and grants.
- Reservation lifecycle, idempotency, and duplicate-settlement protection.
- Concurrent minute quota behavior.

The new integration is not deployed to the production Edge Function or database. No production secrets, billing settings, Auth, RLS, or hosting settings have been changed.
