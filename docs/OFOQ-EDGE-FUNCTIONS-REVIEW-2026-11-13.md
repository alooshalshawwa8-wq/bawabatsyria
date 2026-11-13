# OFOQ Edge Functions Security & Reliability Review — 2026-11-13

## Scope and evidence
Reviewed the currently deployed source returned by Supabase for:
- `site-assistant` v20
- `football-data` v45
- `membership-api` v23

This is a source-level review of deployed function contents, not a live HTTP penetration test. No function, database row, secret, auth setting, or production configuration was changed.

## Positive controls verified

### site-assistant v20
- Strict allowlisted browser origin and POST/OPTIONS method handling.
- Bounded request body (24 KB), JSON parsing, and maximum 12 message turns.
- Message content is trimmed and capped; section instructions come from a fixed server-side allowlist.
- Provider key and service-role credential are read only from server environment.
- Global daily provider budget reservation is performed through `reserve_ai_provider_request` before calling Gemini; failure is closed (503/429).
- Logs avoid recording conversation text; provider errors are truncated.

### football-data v45
- Strict browser origin, GET-only method, and bounded in-memory per-runtime throttling.
- Persistent rate-limit RPC is fail-closed: inability to verify the limit stops provider access.
- Provider calls are guarded by a database budget reservation and cache/stale-cache paths.
- Provider key and service-role key are server-side only.
- Paid-feature enforcement checks launch configuration, feature catalog, authenticated user, and entitlements when commercial enforcement is active.
- Usage/admin endpoint checks authenticated owner metadata or owner entitlement.

### membership-api v23
- Protected routes validate bearer tokens by calling Supabase Auth `/auth/v1/user`; owner access is derived from `app_metadata`, not user-editable metadata.
- Request bodies for points grants, checkout, and webhooks have explicit byte limits.
- Points grants validate target UUID, bounded integer delta, reason, and idempotency key; owner check precedes the write.
- Stripe webhook verifies timestamped HMAC signatures with a five-minute tolerance and rejects incomplete configuration.
- Checkout remains blocked by `PAYMENTS_ENABLED` and the database launch/billing gate.
- Service-role and Stripe secrets are server-side only.

## Findings and recommended actions

### P1 — Add durable rate limiting for the AI assistant
The assistant's 12-requests/minute limiter is held in an in-memory map per Edge isolate. Its source comment correctly notes that isolates are ephemeral; the global daily budget protects total daily provider spend, but it does not provide a durable per-user/IP minute limit across isolates.
**Action:** Add an atomic database-backed per-IP or privacy-preserving client bucket limiter (with a conservative fail-closed behavior) before provider calls. Keep the existing daily reservation as a second independent control.

### P1 — Verify the trust boundary for client IP headers
Both public functions derive the rate-limit key from the first value of `x-forwarded-for`. Confirm the deployed gateway overwrites/sanitizes this header and clients cannot choose the effective first hop. If that guarantee is absent, use a trusted platform-provided client IP header or gateway-level rate limiting. Do not treat a caller-supplied forwarding header as identity.

### P2 — Tighten input validation in football catalog datasets
The catalog dispatcher allowlists dataset names and parameter names, trims and caps values, and applies several dataset-specific checks. Validation is not uniformly strict for every parameter (for example, some IDs and date/status filters are forwarded as bounded strings).
**Action:** Add per-dataset schemas for required fields, numeric IDs, seasons, dates, enum values, and maximum list sizes; reject malformed filters before provider requests.

### P2 — Add automated contract tests for function boundaries
Source review confirms many guardrails but does not prove deployed behavior under malformed payloads, concurrency, spoofed headers, expired tokens, provider timeouts, or budget exhaustion.
**Action:** Build repeatable tests for:
- CORS preflight, wrong origin, unsupported method.
- Oversized and malformed JSON.
- Missing/invalid/expired bearer tokens and owner-vs-user authorization.
- Rate-limit concurrency and fail-closed behavior.
- Provider budget exhaustion, cache hit/stale fallback, and upstream timeout.
- Stripe invalid signature, stale timestamp, duplicate event, and checkout-disabled state.
- Points grant validation and duplicate idempotency key.

## Operational notes
- Do not enable Stripe or change launch mode as part of this review.
- Do not enable public database grants or create generic RLS policies to silence advisor warnings.
- The existing per-function source has been inspected, but no live endpoint test was completed in this pass.
- No secrets, tokens, user messages, or personal data were copied into this report.

## Priority sequence
1. Verify trusted client-IP header behavior and enforce durable AI minute throttling.
2. Add strict football catalog parameter schemas.
3. Add automated contract tests and run them against a safe test environment.
4. Only then consider narrowly scoped code changes and deploy after review.
