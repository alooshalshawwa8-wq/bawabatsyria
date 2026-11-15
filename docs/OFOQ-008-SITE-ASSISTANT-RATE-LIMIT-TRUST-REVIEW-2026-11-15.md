# OFOQ-008 — Site assistant rate-limit trust boundary review

Date: 2026-11-15
Branch: `ofoq/ofoq-001-execution`
Scope: source review and documentation only; no deployment or production configuration changes.

## Finding

The current `site-assistant` Edge Function derives its in-memory throttle key from:

```ts
request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
```

This value is caller-influenced unless the complete ingress path is proven to remove or overwrite caller-supplied values before the function receives them. If a caller can choose the first X-Forwarded-For element, they can rotate forged values and evade the per-runtime 12-requests-per-minute throttle. If the header is absent, all such requests share the `unknown` bucket.

The limiter is also explicitly per Edge runtime isolate and therefore is not a global per-IP control. The globally reserved daily AI request budget remains a separate, useful cost guard; it does not replace abuse controls.

## Evidence reviewed

- Current source: `supabase/functions/site-assistant/index.ts` on this branch.
- The Supabase official log-field reference lists `cf-connecting-ip` and `x-forwarded-for` among captured request headers, but does not establish a security contract for either header's sanitization at every ingress path.
- Supabase's public API-security guide demonstrates extracting the first `x-forwarded-for` value for a Postgres pre-request example. That example alone is not proof that a public Edge Function can safely trust the same value against caller-supplied headers.
- Community discussions about `cf-connecting-ip` describe useful deployment observations but explicitly leave open whether every direct/default/custom ingress path guarantees overwrite behavior. They are not an authoritative platform guarantee.

References:
- https://supabase.com/docs/guides/observability/log-field-reference
- https://supabase.com/docs/guides/api/securing-your-api
- https://github.com/orgs/supabase/discussions/52040
- https://github.com/orgs/supabase/discussions/52496

## Required resolution before release

1. Do not claim the current in-memory IP limiter is spoof-resistant.
2. Obtain a documented ingress trust contract from Supabase or run an approved, controlled header-spoof verification against the exact production invocation path without exposing diagnostic data.
3. Prefer a platform-verified client-IP value only after its overwrite guarantee is established for this project's ingress path; do not silently fall back to an unverified header.
4. Consider a durable, shared rate limiter for abuse control across Edge isolates. Keep the existing global daily provider budget as an independent cost guard.
5. Add tests for missing, malformed, duplicate, and caller-supplied forwarding headers once the trusted extraction contract is established.

## Safety boundary

No source code, database schema, Auth setting, Edge Function deployment, secret, or production configuration was changed. This is a release-gate finding, not a claim of a confirmed exploitable production vulnerability.
