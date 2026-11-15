# OFOQ Auth Email Delivery Readiness

**Review date:** 2026-11-13
**Environment:** Supabase project `elzquyehghuxhswogsch`
**Status:** Code path verified; production email deliverability is not yet production-ready.

## Evidence from the project

- Auth logs contain successful signup confirmation requests and `mail.send` events.
- The sender recorded in the Auth logs is Supabase's built-in sender (`noreply@mail.app.supabase.io`), not a project-owned SMTP domain.
- The logs confirm that Auth handed messages to its configured sender. They do not prove that a recipient's mailbox accepted, delivered, or displayed the message.
- The frontend currently provides signup, resend-confirmation, password-recovery, and recovery-password update flows.
- Browser smoke tests cover resend and password recovery. A signup redirect test has now been added to the development branch and awaits CI.

## Root operational constraint

Supabase's built-in email service is intended for development and evaluation, not production delivery. Current Supabase documentation states that it:
- sends only to addresses authorized as members of the Supabase organization's team;
- is limited to 2 emails per hour across the project;
- provides no delivery SLA and is best-effort.

Repeated signup attempts can therefore appear successful at the Auth API while a confirmation message is not delivered to an arbitrary recipient. A `mail.send` log line is not a delivery receipt.

## Required production configuration

Before opening public account registration:
1. Select a transactional email provider (for example Resend, AWS SES, Postmark, SendGrid, or Brevo).
2. Configure a dedicated authentication sending domain and sender address.
3. Publish and verify SPF, DKIM, and DMARC records with the provider.
4. Configure the provider's SMTP host, port, username, and password in Supabase Authentication SMTP settings. Credentials must be entered through the secure dashboard/settings flow; never commit them to GitHub or expose them in browser code.
5. Keep email confirmation enabled.
6. Confirm the production site URL and exact allowed redirect URLs include the GitHub Pages site path used by OFOQ.
7. Send controlled tests to multiple mailbox providers and verify provider delivery/bounce/suppression logs, not only Supabase Auth logs.
8. Configure appropriate Auth email rate limits after SMTP is active, and monitor bounces, complaints, and delivery failures.

## Safe current behavior

- Do not disable email confirmation as a workaround.
- Do not claim that a message has been delivered merely because Auth accepted the request.
- Keep the resend control, with neutral wording that asks the user to check inbox and spam.
- Avoid repeated resend attempts; the built-in sender is rate-limited.
- Do not enable public production registration until a custom SMTP provider is configured and end-to-end delivery has been verified.

## Ownership and secrets

SMTP provider selection, billing, sender-domain ownership, DNS changes, and credentials require the platform owner's action. This document is a readiness record only; no production Auth settings or credentials were changed.
