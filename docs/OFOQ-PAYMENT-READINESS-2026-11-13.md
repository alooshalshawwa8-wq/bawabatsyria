# OFOQ Payment Readiness Audit — 2026-11-13

## Scope

Read-only inspection of the production Supabase project and the active GitHub development branch. No payment settings, secrets, prices, database rows, Auth configuration, or deployed functions were changed.

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
- The database schema contains manual-payment order fields and Stripe subscription mapping fields.

## Verified implementation in membership-api v23

- Stripe Checkout creation exists at `POST /api/checkout`.
- Checkout is blocked unless `PAYMENTS_ENABLED=true`, Stripe and service-role secrets are configured, and the database billing gate is open.
- Stripe webhook signature verification checks the timestamp and HMAC with a five-minute tolerance.
- Webhook handlers synchronize subscription states and entitlements and record verified revenue events.
- The checkout path refuses a new checkout when the account already has a current subscription.
- No self-service Stripe Billing Portal route is present.
- No user-facing manual-payment order submission or owner review/approval route is present in this Edge Function.

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
- Static source checks confirmed the route, both billing gates, user-scoped subscription lookup, server-derived customer ID, HTTPS URL validation, UI wiring, and CI test step.
- The GitHub branch remains ahead of `main` and has no commits behind it.
- A completed GitHub Actions run for the new commit was not available through the current workflow-run query at the time of this audit. Therefore, the new test is committed and wired into CI, but its execution result is not claimed here.
- The function has not been deployed to production. The live deployed version remains unchanged.
