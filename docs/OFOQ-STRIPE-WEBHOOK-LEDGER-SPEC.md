# OFOQ Stripe Webhook Ledger — Implementation Specification

**Status:** Design approved for isolated implementation only. Not applied to any Supabase database.
**Scope:** Durable receipt, concurrency control, retry, and atomic entitlement reconciliation for Stripe webhook events.

## Why this is required

The current Edge Function verifies Stripe signatures and validates event envelopes, but it does not persist a receipt for every accepted event. Revenue events have a unique provider event ID, while subscription lifecycle events can trigger repeated Stripe API reads and multiple REST writes. Subscription persistence and entitlement reconciliation are separate requests, so a partial failure can leave them temporarily inconsistent.

## Required event ledger

Create `public.stripe_webhook_events` with:

- `id uuid primary key default gen_random_uuid()`
- `provider_event_id text not null unique`, constrained to Stripe event ID format
- `event_type text not null`
- `event_created_at timestamptz not null`
- `payload_sha256 text not null` (digest only; do not persist full card/customer payloads)
- `status text not null check (status in ('received','processing','processed','failed'))`
- `attempts integer not null default 0 check (attempts >= 0)`
- `received_at, updated_at timestamptz not null default now()`
- `processing_started_at, lease_expires_at, processed_at, next_retry_at timestamptz`
- `last_error text` with a bounded length

Enable RLS and create no client policies. Revoke table access from `anon` and `authenticated`; grant only the minimum required access to `service_role` and narrowly scoped security-definer RPCs. Security-definer functions must set a fixed `search_path`, validate all arguments, and have execution revoked from PUBLIC/anon/authenticated.

## State machine and concurrency

1. After signature and envelope verification, compute SHA-256 over the exact raw request body.
2. Insert a receipt using `provider_event_id` as the idempotency key. A conflict must not create a second receipt.
3. Claim only a `received` or retry-eligible `failed` row, or a `processing` row whose lease expired. Claiming increments attempts and sets a short lease in one SQL statement.
4. If the row is `processed`, return HTTP 200 without side effects. If another worker owns a live lease, return HTTP 200/202 without running side effects; Stripe retry is not the recovery mechanism for a live lease.
5. On a transient processing error, record a bounded error and exponential retry time. Never mark an event processed before all durable business writes commit.
6. A scheduled recovery worker must reclaim expired leases and retry eligible failed rows. Alert on repeated failures and old pending receipts.

## Atomic business commit

Do not attempt to achieve atomicity by issuing separate PostgREST writes from the Edge Function.

The final implementation must fetch and validate the authoritative Stripe subscription outside the database transaction, then call one database RPC that, in a single transaction:

- locks the claimed webhook receipt;
- verifies that the caller owns the active lease and that the event is not already processed;
- upserts the Stripe subscription snapshot using the unique provider subscription ID;
- reconciles only Stripe-sourced entitlements, preserving owner/lifetime and other non-Stripe grants;
- inserts the revenue event with its existing unique provider event ID when applicable;
- marks the webhook receipt processed and clears its lease.

If any write fails, the transaction must roll back all business changes and leave the event retryable. The RPC must reject mismatched event IDs, invalid user/plan IDs, invalid status values, malformed timestamps, negative amounts, and non-ISO currency codes. It must never accept a user ID or entitlement set directly from an untrusted browser.

## Operational safeguards

- Keep the existing raw-body signature verification, five-minute signature timestamp tolerance, payload size cap, and event envelope validation.
- Keep the explicit event-type allowlist in the Edge Function; acknowledge unknown event types without side effects.
- Do not store raw webhook bodies or unnecessary personal data.
- Add retention/partitioning policy only after measuring event volume; do not delete unprocessed or failed receipts.
- Add metrics for duplicate deliveries, lease expiry, retries, processing latency, and permanent failures.
- Keep payment enablement and Stripe secrets gated independently from this ledger.

## Required test matrix before rollout

- Same event delivered sequentially and concurrently.
- Worker crash after claim, lease expiry, and successful recovery.
- Database failure before subscription upsert, between subscription and entitlement writes, and before receipt completion.
- Duplicate revenue event insert.
- Expired and concurrently renewed leases.
- Owner/lifetime entitlement preservation and non-Stripe entitlement preservation.
- Invalid user, plan, subscription ID, amount, currency, status, and timestamp.
- Unknown event types and every allowlisted event type.
- RLS/privilege tests proving client roles cannot read or mutate receipts.
- Load test for retry bursts and webhook concurrency.

## Environment constraint

The current Supabase organization does not permit development branches on its present plan. Therefore this specification is committed to the OFOQ development branch only; no migration has been applied to production and no Edge Function has been deployed. Implement and exercise the migration/RPC only after an isolated database environment is available.
