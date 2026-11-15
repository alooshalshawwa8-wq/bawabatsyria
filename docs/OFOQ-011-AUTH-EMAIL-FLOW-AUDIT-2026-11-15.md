# OFOQ-011 — Auth email-flow source audit and resend redirect correction

Date: 2026-11-15
Branch: `ofoq/ofoq-001-execution`
Commit: `30d77cb6852b1e84161fd615fcce80c645f24d03`
Scope: inspect the browser's direct Supabase Auth flows and correct a redirect parameter mismatch. No production configuration or mail settings changed.

## Architecture confirmed

The membership panel in `index.html` calls Supabase Auth directly from the browser:
- `POST /auth/v1/signup?redirect_to=...`
- `POST /auth/v1/token?grant_type=password`
- `POST /auth/v1/resend`
- `POST /auth/v1/recover?redirect_to=...`
- `PUT /auth/v1/user` for password update after recovery.

The `membership-api` Edge Function is not the signup/recovery email sender in this flow. It validates bearer sessions for membership operations; email delivery is handled by Supabase Auth.

## Fix committed on development branch

The resend-confirmation browser code previously sent `options.emailRedirectTo` in the raw REST JSON body. That is the client-library option shape, not the GoTrue REST redirect query convention used by the other direct Auth requests in this page.

Updated the request to pass `redirect_to=<current page URL>` as a query parameter and keep the JSON body to `{type: "signup", email}`.

This aligns resend with the signup and recovery requests and makes the intended post-confirmation return URL explicit.

## CI

Two workflows were triggered for this commit:
- OFOQ static validation — queued/running at review time.
- Membership and portal validation — queued/running at review time.

Do not mark this commit green until both complete successfully.

## What remains unverified

This source correction does not prove that messages are actually delivered. The available project inspection interface does not expose the private Auth SMTP credentials/configuration or a mailbox delivery receipt. The project log sources visible to the read-only log query did not include Auth/GoTrue email delivery logs.

Before claiming real email readiness, an authorized owner must:
1. Review Supabase Dashboard > Authentication > SMTP Settings and confirm a production SMTP provider is configured (never copy credentials into repository files or chat).
2. Confirm the Auth Site URL and Redirect URLs allow the exact GitHub Pages URL used by the site: `https://alooshalshaw8-wq.github.io/bawabatsyria/`.
3. Perform one controlled signup/resend and one password-recovery test using an owner-approved test mailbox, and verify receipt, spam placement, link destination, and successful callback.
4. Keep provider credentials private; do not use the default shared email sender for production readiness assumptions.

No real account was created, no email was sent, and no SMTP, Auth, billing, secret, production database, or deployment setting was changed.

## Redirect parameter cross-check

The resend redirect correction was cross-checked against the current Supabase JavaScript Auth implementation: `packages/core/auth-js/src/lib/fetch.ts` maps the `redirectTo` request option to the `redirect_to` URL query parameter before issuing the HTTP request. The resend client method passes `options.emailRedirectTo` through that request option. This confirms that the browser's direct REST request should use the query parameter rather than nesting `options.emailRedirectTo` in the JSON body.

Reference: https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/src/lib/fetch.ts

The GoTrue OpenAPI schema documents the resend JSON body fields (`email`, `type`, and optional security metadata) but does not enumerate the redirect query parameter on that operation. The SDK implementation is the direct cross-check for the supported client option mapping.
