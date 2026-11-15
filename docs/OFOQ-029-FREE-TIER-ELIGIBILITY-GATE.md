# OFOQ-029 — Free-Tier Eligibility Gate

Date: 2026-11-15
Status: implemented on the development branch; CI verification pending.

## Decision

An API key alone is not proof that a provider/model call is free. The Gemini account/model free-tier status and effective quota have not yet been verified. To honor the founder's free-only rule, the provider registry now fails closed until that verification is explicitly recorded in server-owned configuration.

## Implemented

- Added `checkAiProviderEligibility` with explicit reasons: missing key, free tier unverified, and disabled.
- The current Gemini registry entry remains `freeTierVerified: false`.
- `resolveAiProvider` now returns null until the exact account/model free tier is verified.
- The task router inherits this gate, so the assistant does not issue a Gemini request while the gate is closed.
- Safe metadata can expose eligibility and a block reason, but never an API key.
- Tests cover the unverified block, missing key, unknown provider, metadata redaction, and single-provider allowlist.

## Operational consequence

The AI assistant provider route is intentionally unavailable until the owner verifies that the selected model and API account are eligible for no-charge usage under the current provider terms and limits. This is a deliberate fail-closed safeguard, not a provider outage.

## What is required to enable

Record evidence for the exact provider account and model:
- official current model and pricing documentation;
- account-level free-tier availability and applicable quotas;
- whether billing setup changes free-tier behavior;
- data handling terms acceptable for the intended prompts;
- a successful low-risk health check with the server-side key.

Only then may an owner-reviewed code change set `freeTierVerified: true`. Do not infer verification from model existence, an HTTP 200, an API key being present, or a provider's generic free-tier marketing.

No paid fallback is permitted. If the verified free quota is exhausted, return a clear quota response and stop. Do not retry using a paid tier, paid model, or paid provider.

## Release boundary

This gate is code-only on the development branch. It has not been deployed to the live Edge Function, and it has not changed production secrets, billing, provider settings, or database state.
