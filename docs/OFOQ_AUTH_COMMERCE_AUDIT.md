# OFOQ Auth, Commerce, Accounting & Inventory Audit

Date: 2026-11-11
Supabase project: `elzquyehghuxhswogsch`

## Scope and safety

This pass used read-only Supabase project/advisor/schema/policy/grant inspection and repository source review. No customer rows were read or changed. No DDL, RLS policy, grant, Auth setting, payment provider, or external data-provider setting was changed. No API-Football, Stripe, Gemini, or other upstream provider request was made.

## Auth and project security

- Supabase project state: `ACTIVE_HEALTHY`; PostgreSQL 17.11.
- Security advisor reports `auth_leaked_password_protection` as WARN: leaked-password protection is disabled.
- The connected Supabase actions available in this session do not expose the Auth dashboard configuration endpoint/settings. Therefore minimum password length, password character requirements, MFA enrollment/assurance policy, JWT lifetime, site URL and redirect allow-list were not independently inspected or changed.
- Recommended owner action: review Authentication > Settings / Password Security in the Supabase dashboard. Enable leaked-password protection if the project's plan supports it; review a minimum length of at least 8 characters and stronger password requirements. Review MFA and redirect allow-lists separately before production.
- Existing authorization policies inspected use `auth.uid()` ownership or `auth.jwt()->'app_metadata'` for platform-owner checks. No policy inspected in this scope relies on user-editable `user_metadata`.

## Commerce, accounting and inventory schema

Tables found:
- `accounting_accounts`
- `inventory_items`
- `inventory_movements`
- `payment_methods`
- `payment_orders`
- `points_ledger`

Key controls verified:
- Accounting accounts: owner-scoped SELECT/INSERT/UPDATE/DELETE policies; account type constrained to asset/liability/equity/revenue/expense; non-empty bounded names; unique account code per user.
- Inventory items: owner-scoped CRUD policies; non-negative quantity, reorder level and unit cost; unique SKU per user; bounded non-empty name.
- Inventory movements: owner-scoped SELECT/INSERT; no authenticated DELETE grant observed; non-zero movement delta; constrained movement types; composite foreign key ties a movement to an item belonging to the same user and restricts deletion of referenced items.
- Payment methods: anonymous/authenticated SELECT is limited by policy to enabled methods; owner writes require owner claims in `app_metadata`.
- Payment orders: authenticated SELECT is restricted to the owning user or platform owner; no authenticated INSERT/UPDATE/DELETE grants observed in this table inspection. The server-side membership function is the controlled writer path.
- Points ledger: user-scoped SELECT; INSERT policy requires platform-owner claims in `app_metadata`; non-zero delta, non-empty reason and unique idempotency key.

The security advisor's remaining `rls_enabled_no_policy` INFO findings concern ten platform/AI/football tables previously reviewed. These were intentionally not given broad policies: their current service-role-only grants make a blanket public policy inappropriate. The advisor INFO items should be re-evaluated if grants or access paths change.

## Payment and Edge Function guardrails

- `membership-api` is deployed with `verify_jwt=false`, but its handler validates bearer tokens against Supabase Auth for protected routes and validates Stripe webhook signatures on the webhook route.
- Stripe checkout is intentionally disabled unless `PAYMENTS_ENABLED=true` and the required Stripe/service-role secrets are present.
- No payment configuration was enabled or changed.
- API-Football provider blocking remains in place as previously audited.

## Frontend commerce improvement

Updated `ecommerce-studio.js` so each pricing calculation clears prior metrics and resets its validity marker before validation. Invalid input now leaves no stale pricing result visible and explicitly tells the user that previous results were cleared.

Updated `tests/browser-smoke.mjs` with browser assertions for:
1. a valid pricing calculation producing six metrics and a valid marker;
2. invalid target margin input clearing the validity marker;
3. all previous metrics disappearing;
4. user-facing invalid-input feedback.

The existing browser smoke suite also blocks external requests during its run. The new assertions are committed but have not yet been executed in a browser in this session; no CI success is claimed.

## Remaining owner/dashboard verification

1. Review and, if available on the plan, enable leaked-password protection.
2. Confirm password length/complexity, MFA policy, JWT lifetime, Site URL and redirect allow-list in Auth settings.
3. Confirm the deployed Edge Function environment still keeps `PAYMENTS_ENABLED` unset/false.
4. Keep all external provider integrations blocked until quota and readiness checks are complete.

## Follow-up inventory allocation defect and fix

A source-level review found that order quantities were counted as reserved only while an order status was `new`, `processing`, or `shipped`. Moving an order to `delivered` therefore released its reservation even though the product's on-hand quantity was not decremented by this local order workflow. That could make the same units available for a later order.

Fix committed in `ecommerce-studio.js`: every order except `cancelled` remains allocated against available stock, including `delivered` orders. This matches the existing workflow's explicit behavior that recording an order does not automatically decrement physical stock; the reservation remains until the operator reconciles stock or cancels the order. This avoids silent double-selling without pretending that delivery automatically changed physical inventory.

Regression assertion committed in `tests/browser-smoke.mjs`: mark the first order delivered, then attempt another order whose quantity would exceed the original stock once the delivered order is still counted. The test expects the same insufficient-stock validation.

The updated source and test were fetched back from GitHub and their expected code markers were verified. The browser test itself has not yet been run in this session.

## Inventory movement trigger hardening verification

The `inventory_movement_apply` trigger invokes `private.apply_inventory_movement()`, a SECURITY DEFINER trigger function. Its definition uses an empty search_path, fully qualifies `public.inventory_items`, requires `auth.uid()` to equal the new movement's `user_id`, constrains the update to the same user's item, and rejects movements that would make quantity negative. Direct EXECUTE is false for `anon`, `authenticated`, and `service_role`; the `private` schema has no USAGE grant for `anon` or `authenticated`. The standard roles `anon` and `authenticated` also have neither superuser nor BYPASSRLS attributes. No database changes were needed for this trigger in this pass.
