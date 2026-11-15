# OFOQ-017 — Final Closure Decision and Owner-Only Launch Actions
**Date:** 2026-11-15  
**Branch:** `ofoq/ofoq-001-execution`  
**Related:** OFOQ-012 through OFOQ-016

## Executive status

**The investigation and engineering work that can be completed safely through the currently connected free tools is closed. The public-trial release is NOT certified and must remain blocked until the owner-only gates below are evidenced.**

This is a deliberate safety decision, not an assertion that the platform is fully ready.

## Closed with evidence

1. Historical recovery of the 14 missing migration source files: 14/14 exact matches against Supabase migration history; recorded in OFOQ-012.
2. Baseline provenance investigation: original historical baseline not found. A clearly labelled reconstructed baseline was added to the development branch; it is not represented as historical source recovery.
3. Clean replay: 37 migration files replayed in a disposable local Supabase environment in successful prior run `43689747824`; latest branch-head rerun is tracked separately and must be green before merge.
4. Static, membership/portal, Playwright browser, mobile, and read-only health checks passed on branch head `4443380f1d00825130e247b62bedbe3cb6d47ec3`, except the latest migration replay was still running at time of this report.
5. 78 registered sections and their shared workspace interaction were audited. The audit explicitly identified 18 sections still using a generic guide template; these are not certified as specialized functional services.
6. Production Supabase project was confirmed ACTIVE_HEALTHY. Health Advisor returned no findings.
7. No production schema/data, RLS/grants, Auth, SMTP, Edge Function, secrets, billing, or provider state was changed. No paid service was activated. PR #23 remains draft/open/unmerged.

## Owner-only gates — cannot be truthfully closed from the connected tools

### A. Real email delivery
The connected Supabase actions expose project metadata, SQL, logs, advisors, and Edge Function inventory; they do not expose the project's Auth SMTP or Site URL/Redirect URL configuration controls. Unified logs currently expose only `pgbouncer_logs` and `postgres_logs`, not Auth delivery logs. Therefore SMTP delivery cannot be proven or safely configured by this assistant.

Owner action:
1. In Supabase Dashboard → Authentication → SMTP Settings, configure a free/approved SMTP provider and verified sender domain.
2. In Authentication → URL Configuration, set the canonical production Site URL and exact allowed redirect URLs.
3. Publish SPF, DKIM and DMARC DNS records supplied by that mail provider.
4. Run signup, confirmation, resend, password-reset and redirect tests using an owner-approved mailbox.
5. Record message receipt, sender authentication results and callback destination. Do not disable email confirmation as a shortcut.

Never paste SMTP passwords or API keys into chat or GitHub.

### B. Trusted client identity and durable abuse throttling
The current `site-assistant` function uses per-isolate in-memory throttling and reads `x-forwarded-for`. The available evidence does not prove that the ingress overwrites this header with a trusted client address. The global daily AI reservation is a cost ceiling, not a per-client abuse-control substitute.

Owner/engineering action:
1. Confirm the exact Supabase ingress header contract from authoritative deployment configuration or use a trusted upstream that overwrites client identity.
2. Implement and test a shared durable limiter keyed only by that verified identity; if anonymous users are supported, add an abuse-resistant challenge such as a free CAPTCHA with owner-configured public/site and secret keys.
3. Verify spoofed forwarding headers cannot bypass limits; test concurrent requests across separate Edge isolates.
4. Keep the global daily reservation as a second independent budget guard.

Do not simply trust arbitrary `x-forwarded-for`, disable throttling, or introduce a shared global per-minute cap that lets one visitor deny service to everyone.

### C. Auth password hardening
Supabase Security Advisor still reports leaked-password protection disabled. The connected tools cannot update this Auth setting. Owner must check plan eligibility and enable it in Authentication → Security and Password settings if available. Do not upgrade to a paid plan without explicit approval.

### D. Recovery and isolation evidence
Before a public trial, run a disposable backup-restore drill and multi-user ownership/isolation tests covering profiles, inventory, accounting, subscriptions, points and any owner-scoped records. Preserve evidence and confirm cross-user reads/writes are denied. Do not create production test accounts or alter live user data without an approved test mailbox and test plan.

### E. Feature truthfulness
The audit found 18 generic-template sections. Until domain-specific functionality is implemented and tested, label them as guides/planning workspaces, not live integrations. Provider-dependent modules must remain marked unavailable when providers are blocked. Billing remains disabled.

## Release gate and closure rule

The release checklist may be marked PASS only when A–D have recorded evidence, the latest migration replay and all branch-head CI checks are green, the 18 generic-template sections are honestly labelled or completed, and the owner explicitly approves release.

PR #23 must remain draft/open until that review. No production merge or deployment is authorized by this report.

**Final disposition: engineering investigation closed; public-trial launch gate OPEN — owner evidence required.**
