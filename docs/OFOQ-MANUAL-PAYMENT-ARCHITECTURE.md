# OFOQ Manual Payment Architecture — Design Only

Status: proposed engineering design; not implemented and not enabled.

This document defines a safe path for manual/local transfer payments if the platform owner later selects an eligible provider and approves the commercial terms. It does not authorize production schema changes, payment collection, or entitlement activation.

## Current blockers verified in production

- `payment_methods` and `payment_orders` exist but are empty.
- Paid plan price and currency fields are unset.
- `payment_orders` has no authenticated INSERT policy. The current Edge Function has no manual-order creation or review routes.
- Supabase Storage has no buckets or object policies.
- `billing_enabled=false` and `paid_features_enforced=false`; payments must remain disabled.

## Trust boundaries

1. The browser is untrusted. It must never decide the amount, currency, plan entitlement, reviewer identity, or paid status.
2. Authenticated users may create orders only through an Edge Function that validates the JWT and derives all pricing from an approved server-side plan/payment-method configuration.
3. The service role is server-only. Never return it, embed it in the browser, or log it.
4. An uploaded proof is an unverified claim, not evidence of receipt. It must not activate a subscription or entitlement.
5. Only a platform owner with the authoritative owner claims in `app_metadata` may review an order.
6. Every state transition must be idempotent, auditable, and enforced server-side.

## Proposed order lifecycle

```text
created
  -> pending_proof
  -> submitted_for_review
      -> paid (owner confirms receipt)
      -> rejected (owner rejects with reason)
      -> expired (server-side expiry job)
```

The existing `payment_orders.status` values currently support `pending`, `paid`, `rejected`, and `expired`. If the product needs a distinct proof-submitted state, add it through a reviewed migration rather than overloading `pending` ambiguously. Do not allow a client to set any terminal status.

## Proposed API responsibilities

- `POST /api/manual-payments/orders`: require an authenticated user; validate active plan and enabled payment method; read approved amount/currency from server-side configuration; create a pending order with a server-generated idempotency key and expiry; return only the order instructions and a safe upload capability.
- `POST /api/manual-payments/orders/:id/proof`: verify order ownership and pending status; issue a short-lived signed upload capability for one server-generated object path; never accept arbitrary bucket or path values from the browser.
- `POST /api/admin/manual-payments/:id/approve`: require owner authorization from `app_metadata`; verify order is pending, proof exists, amount/currency/method match; atomically mark paid, write an immutable review event, create/update the manual subscription, and activate only the corresponding entitlements.
- `POST /api/admin/manual-payments/:id/reject`: require owner authorization; require a bounded reason; atomically reject and append an immutable review event.
- `GET /api/manual-payments/orders`: return only the signed-in user's own orders; admin listing must be a separate owner-gated route.

All routes must enforce request-size limits, strict schemas, rate limits, origin checks as defense-in-depth, safe error messages, and structured audit logging without exposing proof contents or secrets.

## Private proof storage

- Create a dedicated private bucket (suggested name: `ofoq-payment-proofs`) only after the workflow and policies are reviewed.
- Configure a conservative file-size ceiling and an explicit allowlist of image/PDF MIME types. Validate file signatures server-side; MIME headers alone are untrusted.
- Use opaque, server-generated object names under a user/order-specific prefix. Disallow overwrite and path traversal.
- Prefer server-issued, short-lived signed upload/download URLs for exact object paths. Never make the bucket public.
- Verify the uploaded object exists, belongs to the order, and meets size/type constraints before review.
- Admin proof access should use short-lived signed URLs generated only after an owner authorization check.
- Define retention and deletion rules for rejected/expired proofs and comply with applicable privacy/legal requirements.

## Database and transaction design

- Keep RLS enabled on every exposed table. Do not add broad authenticated INSERT/UPDATE policies to `payment_orders`.
- Keep order creation and review behind authenticated Edge Functions using server-side credentials.
- Add an append-only `payment_order_events` audit table recording order ID, actor ID, action, timestamp, and bounded metadata. Prevent client writes and updates/deletes.
- Use a transaction/RPC with narrowly scoped execution privileges for approval so the order transition, event record, subscription change, and entitlement update commit together or not at all.
- Approval must lock the order row, require current status `pending`, and enforce a unique payment/order reference where applicable.
- A repeated approval request must return the existing result without duplicating subscription or entitlement effects.
- Rejection, expiry, and approval must be mutually exclusive terminal transitions.
- Store provider transfer references as normalized, bounded text; do not store card data or sensitive banking credentials.
- Never grant client write access to `subscriptions` or `entitlements`.

## Required test cases

- Unauthenticated order creation is rejected.
- User A cannot read, upload proof for, or review User B's order.
- A client cannot set amount, currency, status, reviewer, expiry, plan benefits, or entitlement values.
- Disabled methods, inactive plans, missing approved prices, and expired orders are rejected.
- Duplicate idempotency keys do not create duplicate orders.
- Upload capability cannot target another user's order, arbitrary paths, public buckets, or overwrite an existing proof.
- MIME spoofing, oversized files, malformed PDFs/images, and missing objects are rejected.
- Non-owner approval/rejection is rejected, including attempts to spoof user metadata.
- Concurrent or repeated approval produces exactly one paid transition and one entitlement activation.
- Rejected/expired orders cannot later be approved.
- Audit events are immutable and recorded for every review action.
- Storage access expires and no public URL is issued.

## Activation gates

Manual payments remain unavailable until all of the following are true:

1. The owner selects a legally and commercially permitted payment method and confirms provider instructions.
2. Prices, currencies, plan periods, refund/cancellation terms, and public disclosures are approved.
3. Schema migration, private Storage configuration, RLS, API implementation, and audit trail are reviewed.
4. All authorization, upload, concurrency, idempotency, and lifecycle tests pass in an isolated Supabase branch.
5. End-to-end testing is completed without real charges.
6. A separate explicit production activation decision is made. Trial mode and paid-feature enforcement remain unchanged until then.
