# OFOQ Payment Readiness Audit — 2026-11-13

## Scope

Read-only inspection of the production Supabase project and the active GitHub development branch. No payment settings, secrets, prices, database rows, Auth configuration, Storage buckets, or deployed functions were changed.

## Verified production state

- Supabase project: `bawabatsyria` (`elzquyehghuxhswogsch`), status `ACTIVE_HEALTHY`.
- Deployed `membership-api`: active, version 23.
- `membership_plans`: four active plans — `free`, `pro_monthly`, `vip_monthly`, `business_monthly`.
- Paid plan `stripe_price_id`, `price_minor`, and `currency` values are all NULL.
- `payment_methods`: zero rows; no local payment method is enabled.
- `payment_orders`: zero rows.
- `subscriptions`: zero rows.
- `platform_launch_config`: `launch_mode=trial`, `billing_enabled=false`, `paid_features_enforced=false`.
- Payment-related tables have RLS enabled. Payment-method writes are owner-policy protected; payment orders are readable by their owner or platform owner; subscriptions are owner-readable.
- `payment_orders` has no authenticated user INSERT policy, and the deployed Edge Function has no user-facing manual-payment order submission or owner review/approval route. The current RLS policy set therefore does not constitute a usable local-payment workflow.
- Supabase Storage has zero buckets and no object policies. No payment proof upload or private review storage currently exists.
- The schema already contains manual-payment order fields and Stripe subscription mapping fields.

## Verified implementation in membership-api v23

- Stripe Checkout creation exists at `POST /api/checkout`.
- Checkout is blocked unless `PAYMENTS_ENABLED=true`, Stripe and service-role secrets are configured, and the database billing gate is open.
- Stripe webhook signature verification checks the timestamp and HMAC with a five-minute tolerance.
- Webhook handlers synchronize subscription states and entitlements and record verified revenue events.
- The checkout path refuses a new checkout when the account already has a current subscription.
- No self-service Stripe Billing Portal route is present in the deployed v23 function.
- No user-facing manual-payment order submission or owner review/approval route is present in the deployed v23 function.

## Readiness conclusion

The payment foundation is partially implemented, but production collection is not ready and must remain disabled. The existence of Checkout and webhook code is not evidence of an operational payment system.

## Required work before enabling collection

1. Choose the permitted payment provider(s) for the business jurisdiction and verify merchant onboarding eligibility.
2. Approve the commercial plan prices, billing periods, currencies, tax/refund/cancellation terms, and public pricing display.
3. Configure provider test-mode credentials and webhook endpoint secrets only in Supabase Edge Function secrets; never in GitHub or browser code.
4. Add and test self-service subscription management/cancellation (Stripe Billing Portal or an equivalent provider flow).
5. If manual local transfers are selected, implement authenticated order creation, payment-proof upload with private Storage policies, owner review/approval/rejection, expiry, idempotency, and entitlement activation only after verified receipt.
6. Add runtime contract tests for checkout gating, duplicate/replayed webhooks, invalid signatures, subscription lifecycle, refunds, cancellation, and manual-order authorization.
7. Run end-to-end tests using provider test mode and isolated test accounts; do not use real charges.
8. Only after legal/provider readiness and all tests pass, review a separate production activation plan. Keep `PAYMENTS_ENABLED` and the database billing gate disabled until explicit owner approval.

## Security review notes

- Supabase Security Advisor reports 11 tables with RLS enabled but no policies. A separate privilege check confirmed that both `anon` and `authenticated` have no table-level SELECT/INSERT/UPDATE privileges on those 11 tables. This is currently a closed-access posture, not evidence of public exposure. Keep it that way unless a documented server-side or client-side access requirement is established.
- Security Advisor also reports that Auth leaked-password protection is disabled. This is a recommended account-security improvement to schedule in Supabase Auth settings; it was not changed during this read-only review.
- Performance Advisor lists unused indexes, including several on empty payment tables. No index was removed: the tables have no operational history, and dropping indexes without workload evidence would be premature.

## Safety boundaries

- Do not invent prices, provider account details, or merchant credentials.
- Do not enable payment collection, paid-feature enforcement, or production billing during engineering preparation.
- Do not grant public access to payment orders, subscriptions, or private proof files.
- Do not activate entitlements from a client-submitted receipt or unverified webhook.
- Do not mutate production billing configuration as part of this audit.

## Follow-up engineering work completed on the development branch

- Added authenticated `POST /api/billing-portal` to create Stripe Billing Portal sessions.
- The route is gated by both `PAYMENTS_ENABLED` and the production billing configuration.
- The Stripe customer ID is selected server-side from a current subscription belonging to the authenticated user; the browser cannot submit a customer ID.
- The route only accepts a current Stripe subscription with a valid customer identifier and a future period end.
- The return URL is derived from the configured HTTPS site URL, and the returned portal URL must use the Stripe Billing Portal HTTPS host.
- Extended `GET /api/me` to expose the subscription provider field needed by the account UI.
- Added a hidden-by-default account control that appears only when the signed-in user has a current Stripe subscription; it requests a portal session without supplying customer identifiers.
- Added `tests/membership-api-contract.mjs` and wired it into `.github/workflows/monetization-checks.yml`.

## Verification status after the follow-up

- The updated API, account UI, test file, and CI workflow were fetched again from the development branch and inspected.
- GitHub Actions run [#724](https://github.com/alooshalshawwa8-wq/bawabatsyria/actions/runs/43489243417) completed successfully for commit `0f23a57a0fa3cc2d80943cf108fa96759f94ebb7`.
- The successful run explicitly passed the membership API security contract test, inline portal JavaScript syntax check, D1 schema validation, OFOQ portal contract tests, and browser/mobile smoke tests.
- The static validation workflow also completed successfully for the same commit.
- These are branch CI and source/browser smoke results; they do not prove live Supabase Edge Function runtime behavior or payment-provider test-mode success.
- The function has not been deployed to production. The live deployed version remains unchanged (v23).
- Stripe and local payments remain disabled; no prices, secrets, methods, orders, subscriptions, or real transactions were created.

## Next safe engineering steps

1. Add dedicated automated tests for the deployed Stripe webhook contract and billing-portal route using mocked provider responses, including replay/idempotency, invalid signatures, customer ownership, missing customer, expired periods, and unsafe URLs.
2. Design the local-payment state machine and private proof Storage policies in an isolated migration/test branch before any production schema change.
3. Implement admin review with immutable audit events and atomic entitlement activation only after owner approval and verified receipt.
4. Run end-to-end tests in an isolated Supabase branch and provider test mode. Do not deploy or enable real billing as part of this work.

## Additional Stripe webhook integrity review

A deeper read-only schema and source review identified the following important distinctions:

- Stripe signature verification is present: HMAC-SHA256 over the timestamp and raw payload, with a five-minute tolerance and constant-time comparison of equal-length signatures.
- The webhook body is bounded to 256 KiB.
- Subscription upserts are protected by a unique `provider_subscription_id`; entitlement upserts use the `(user_id, entitlement_key)` primary key; revenue records use a unique `provider_event_id`. These constraints help make repeated writes converge.
- However, `ofoq_revenue_events` is not a complete webhook receipt ledger: events that only synchronize subscription state do not receive a durable event receipt. The current handler can therefore repeat provider fetches and processing on delivery retries.
- Subscription persistence and entitlement changes currently occur through multiple separate REST calls, not one database transaction. A partial failure can leave the subscription row updated while entitlement reconciliation is incomplete until a later retry.
- The handler previously accepted a signed JSON object without strictly validating the Stripe event envelope. A strict envelope validation was added on the development branch: event ID format, event type format, positive safe-integer creation timestamp, and non-array object payload are now required before event dispatch.
- The contract test now asserts these envelope guards. This is source-contract coverage, not a cryptographic runtime test or a provider test-mode run.

## Webhook hardening still required before billing activation

1. Add a dedicated `stripe_webhook_events` receipt table with unique provider event ID, event type, Stripe creation timestamp, processing state, attempt count, received/processed timestamps, and a bounded error code. Do not store full payment payloads or secrets.
2. Atomically claim each event before processing; return success for already-completed events, and safely resume failed/in-progress events under a bounded retry/lease strategy.
3. Move subscription row synchronization, entitlement reconciliation, and event completion into a narrowly privileged transactional database function (or equivalent durable outbox design), so they commit together.
4. Preserve Stripe's latest-resource fetch strategy for subscription lifecycle events to reduce out-of-order event regressions, and test it explicitly.
5. Add mocked integration tests for valid/invalid signatures, stale timestamps, duplicate deliveries, malformed envelopes, provider API failures, partial database failures, and retry recovery.
6. Keep all billing gates closed and do not deploy this branch implementation to production until these controls and isolated end-to-end tests pass.
