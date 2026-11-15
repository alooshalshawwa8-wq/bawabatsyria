# OFOQ-026 — Free-First Multi-Provider AI Gateway: Technical Audit & Design

**Date:** 2026-11-15  
**Branch:** `ofoq/private-access-readiness-2026-11-15`  
**Status:** Read-only technical audit and design specification. No provider account, secret, database, Edge Function, production configuration, or paid service was changed.

## 1. Executive finding

The current assistant is **not** a multi-model system. The inspected Edge Function has one direct provider integration: Google Gemini API, using the server-side `GEMINI_API_KEY`, with model `gemini-3.5-flash-lite`.

The current function also:
- Authenticates the owner using Supabase Auth and owner claims before sending the prompt to Gemini.
- Reserves a database quota for the Gemini provider with a hard-coded daily limit of 30.
- Has no alternate provider adapter or fallback when Gemini is unavailable or quota is exhausted.
- Returns a basic-mode unavailable message if the Gemini key is absent.
- Contains the old public visitor-oriented system prompt and old assistant identity; this is already tracked in OFOQ-024.
- Logs operational request metadata and provider error metadata, but not the conversation text.

The next engineering goal is to evolve this safely into a provider-neutral gateway, not to add many API calls directly into the existing function.

## 2. Existing code facts

Verified in `supabase/functions/site-assistant/index.ts`:
- Provider: Google Gemini API.
- Model: `gemini-3.5-flash-lite`.
- Credential: `GEMINI_API_KEY` read by the server runtime.
- Provider request: direct `generateContent` request.
- Owner authorization: Supabase Auth user lookup plus `app_metadata` owner claims.
- Quota reservation: `reserve_ai_provider_request('gemini', 30)`.
- Input limits: 24 KB request body, up to 12 messages, 2,000 characters per normalized message.
- The function uses one global provider selection; no caller-selected arbitrary URL/model is accepted.

Important: the code-level quota of 30 requests/day is an application guardrail. It is not evidence that Google's free tier grants 30 requests/day, nor does it prove the configured key is on a no-billing project.

## 3. Provider candidates — status checked 2026-11-15

The following are candidates, not connected accounts or promises of unlimited use.

| Provider / route | Free availability evidence | Engineering treatment |
|---|---|---|
| Google Gemini API | Google's pricing page lists a Free tier for selected models, with free input/output tokens and limited model access. Gemini free-tier content may be used to improve Google products. | Existing primary adapter. Verify the exact model's free-tier eligibility and actual project quota in AI Studio. Do not send sensitive private records until the data-use implications are explicitly accepted. |
| Cloudflare Workers AI | Official pricing states 10,000 Neurons/day on Workers Free; requests beyond the free allocation fail on Free rather than silently charging. Some large models require Workers Paid. | Strong candidate once the owner's Cloudflare account is connected. Keep an explicit model allowlist and a hard fail-closed policy. No Cloudflare access is currently available to this development workflow. |
| OpenRouter free model variants | Free model variants ending in `:free` have $0 model pricing, but the free tier is limited (currently documented as 20 RPM and 50 RPD); purchased credits increase the daily cap. Free routing is not a durable production SLA. | Optional adapter. Use only explicitly allowlisted `:free` model IDs. Reject any paid model ID or paid fallback. Never add credits automatically. Review provider data policy before sending private context. |
| Groq API | A Free tier exists with model-specific RPM/RPD/TPM/TPD limits. Exact limits are account/model-dependent and shown in the account limits page. Developer tier is paid usage. | Candidate adapter after confirming current account terms, exact model availability, privacy terms, and quotas. No account or key is currently connected. |
| Local/self-hosted models | No per-token API charge if run on hardware already owned; hardware, electricity, memory, speed, and setup still have costs. | Optional future route. Do not assume the user's phone can host large models. Consider local desktop or browser inference only after device capability testing. |

Sources reviewed:
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Gemini model page: https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite
- Cloudflare Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Cloudflare model availability change: https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/
- OpenRouter free models: https://openrouter.ai/collections/free-models
- OpenRouter pricing: https://openrouter.ai/pricing
- Groq rate limits: https://console.groq.com/docs/rate-limits

Recheck all provider terms, quota values, model IDs and data-use rules at connection time; they can change without a code release.

## 4. Core architecture

### A. Single internal gateway contract

All user-facing AI tasks should call one internal service contract, for example:

`runAiTask({ taskType, messages, workspace, sensitivity, outputMode })`

The browser must never send:
- An arbitrary provider base URL.
- An arbitrary provider model name.
- A provider API key.
- A user-controlled system prompt that overrides security rules.
- A paid/free boolean trusted by the server.

The server determines provider, model, quota, policy, and fallback.

### B. Provider adapter interface

Each provider adapter implements:
- `id`, `displayName`, `capabilities`, `supportedModalities`.
- `isConfigured()` using server-side secret presence only.
- `listAllowedModels()` from a reviewed server-side registry.
- `estimateQuotaCost()` where provider data permits.
- `generate()` with timeout, bounded input/output, and normalized errors.
- `readUsageHeaders()` to capture provider quota metadata where exposed.
- `classifyFailure()` to distinguish quota, transient, configuration, policy, and invalid-request failures.

Do not dynamically load executable provider adapters from remote model catalogues.

### C. Model registry

Each model entry should record:
- Provider and exact model ID.
- Free status: `free_verified`, `free_limited`, `paid`, `unknown`.
- Last verification date and source URL.
- Input/output modalities and context/output limits.
- Tool/function-call support, structured-output support, vision/audio support.
- Quota dimensions and reset timezone where known.
- Data-use and retention caveats.
- Sensitivity eligibility: public, ordinary personal, sensitive.
- Enabled/disabled state and explicit owner approval flag.

Default-deny: unknown pricing or uncertain free status means disabled.

### D. Routing policy

1. Classify task type and sensitivity.
2. Filter to enabled models whose capabilities match.
3. Exclude providers without an approved data policy for the sensitivity level.
4. Exclude all paid, unknown-cost, and billing-enabled routes by default.
5. Check local app quota and provider quota headers/state.
6. Rank eligible models by task quality, reliability, latency, and quota availability.
7. Reserve quota before dispatch.
8. Invoke one provider; retry only on safe transient failures.
9. If fallback is allowed, choose the next eligible free model; never silently cross to paid.
10. If all eligible routes fail, return a clear unavailable response and preserve the user's input.

A fallback is not allowed to change data-sensitivity class. Sensitive personal finance, identity, account, or private business data must not be routed to a third party just because a provider is available.

### E. Council / multi-model review

A model council should be an explicit workflow, not the default for every prompt:
- Select two or more approved free models.
- Give each model a narrowly scoped independent task.
- Compare evidence, calculations, uncertainty and disagreements.
- Use a synthesis model only if it is also approved and within quota.
- Show which models actually responded and which failed.
- Avoid duplicate calls when the task does not justify the extra quota.

This preserves quotas and avoids pretending that multiple models always improve accuracy.

## 5. Privacy and data policy

- Owner-only application authentication is not the same as provider-side data privacy.
- Gemini's current Free tier disclosure says content may be used to improve Google products. Do not send sensitive personal records until this is deliberately reviewed.
- For each provider, document retention, human review, training use, region, subprocessors, and deletion terms before enabling it.
- Provide sensitivity levels:
  - `public`: ordinary public knowledge and generic prompts.
  - `personal`: non-sensitive preferences and personal planning.
  - `sensitive`: identity, financial, business, health, legal, credentials, private documents.
- Default third-party AI access for `sensitive` data: denied unless the provider's terms and configuration have been reviewed and owner-approved.
- Never put keys in browser code, Git, static assets, prompts, model output, or logs.
- Keep service-role credentials and provider secrets server-side only.
- Log provider/model IDs, latency, token/quota metadata and status; avoid storing raw prompts by default.
- The assistant must disclose when data is sent to an external model provider.

## 6. Quota and cost controls

Create a central application quota ledger with:
- Provider/model.
- Daily and per-minute reservations.
- Provider-reported remaining quota and reset metadata.
- Success/failure outcome.
- Token counts if returned.
- Estimated cost only when price is known.
- Manual disable switch.
- Circuit-breaker state and last successful health check.

Rules:
- All providers start disabled except the existing Gemini adapter.
- No paid provider can be enabled through model routing.
- No automatic card attachment, credit purchase, top-up, plan upgrade or paid fallback.
- Missing price metadata means route is disabled, not assumed free.
- Provider quotas are separate from app quotas; never confuse the two.
- A provider's free tier may be changed or revoked at any time.

## 7. Implementation phases

### Phase 1 — prepare without changing production
- Add typed contracts and a server-only provider registry.
- Refactor current Gemini request behind a Gemini adapter while preserving owner auth, existing request limits, quota reservation, and response shape.
- Add unit tests for provider selection, disabled providers, quota exhaustion, paid-model rejection, sensitive-data denial and fallback.
- Keep the existing Edge Function route and browser contract backward-compatible.

### Phase 2 — second free provider
- Connect one candidate only after the owner creates/authorizes its free account and stores its key as a server-side secret.
- Verify exact free quota and data terms.
- Add model allowlist and integration tests.
- Confirm that exhausted quota produces a safe unavailable response.

### Phase 3 — routing and council
- Add task-aware routing.
- Add per-provider quota tracking and circuit breakers.
- Add optional council mode with transparent model attribution.
- Benchmark Arabic quality, factual accuracy, latency, and cost/quotas.

### Phase 4 — private assistant identity
- Rewrite the system prompt from public visitor-guide to owner-first personal chief-of-staff.
- Use the exact visible assistant name **❤️ Aloosh alshawwa ❤️**.
- Keep owner authentication and explicit confirmation for consequential actions.
- Ensure the prompt does not claim access to tools, files or connected services that are not actually available.

## 8. Acceptance tests

- No provider key or service-role key appears in built assets or browser source.
- Unauthenticated requests cannot consume provider quota or call an AI provider.
- Authenticated non-owner requests are rejected.
- Unknown and paid models are rejected by server-side allowlist.
- A provider quota error does not trigger a paid fallback.
- A disabled provider is never invoked.
- A free-tier quota exhaustion returns a clear unavailable response.
- Sensitive data is not routed to unapproved third-party providers.
- The provider/model used is accurately represented to the owner.
- No raw prompt text appears in application logs.
- Existing browser request/response contract remains functional.
- CI validates all adapters with mocked provider responses; live provider smoke tests run only when explicitly configured and must not incur paid usage.

## 9. Decisions and non-actions

This specification does not:
- Create provider accounts or API keys.
- Claim any model is connected beyond the existing Gemini integration.
- Change Gemini's key, model, quota, or project billing settings.
- Add a new database migration or alter production quota policies.
- Deploy or publish an Edge Function.
- Enable OpenRouter, Groq, Cloudflare AI or local model services.
- Authorize any paid provider, paid credits, billing method, or subscription.

**Recommended next implementation:** add a server-side provider registry and refactor the current Gemini call behind an adapter in a separate development branch, with tests proving paid/unknown providers are impossible to select. Only after this is stable should a second provider be connected.


## 10. Deeper quota-schema audit — verified

The existing migration `20261109161356_reconstructed_foundational_baseline.sql` defines `public.ai_provider_daily_usage` with:
- `provider`
- `usage_date`
- `requests_used`
- `updated_at`
- A primary key on `(provider, usage_date)`.

It has RLS enabled, all client-role privileges revoked, and service-role access only. The helper `public.reserve_ai_provider_request(text, integer)` is `SECURITY DEFINER`, rejects invalid limits, atomically increments the provider/day counter, and returns a boolean. Client roles are explicitly denied execution; only `service_role` can execute it. A later migration sets its `search_path` to the empty string.

### Current limitations of this quota ledger

- Daily request count only; no model-level, task-level, token, input/output, minute, or provider cost accounting.
- No persisted provider-reported quota headers or reset timestamps.
- No explicit reservation lifecycle (reserved / completed / failed / released).
- The reservation is consumed before the external provider call and is not refunded on provider error or timeout. This is conservative for rate safety but can waste the daily app allowance.
- Provider name is the only partition key, so multiple models under one provider share the same counter.
- The current daily limit of 30 is passed by the Edge Function; it is an app-level cap, not a provider's verified free-tier allowance.

### Safe migration approach

Do not replace or mutate the existing quota function in-place as the first step. Add a versioned quota contract in a new reviewed migration after:
1. Creating a local disposable database from all migrations.
2. Verifying grants, RLS and function ownership.
3. Testing concurrent reservations and quota exhaustion.
4. Confirming rollback behavior.
5. Reviewing the production schema separately before any hosted migration.

The existing provider/day counter should remain as a coarse global safety ceiling during a staged transition. New model-level and token-level accounting can be introduced alongside it, then compared before changing enforcement.

## 11. Provider data-policy warning

The provider's API price is only one part of the decision. A $0 API call may still expose submitted data to provider retention, abuse review, human review, or model-improvement processing under the applicable free-tier terms. The registry therefore must treat data policy as a hard eligibility gate, not a footnote. For example, Google's published Gemini Free tier states that submitted content may be used to improve Google products. The private app must not send sensitive records to that route by default.



## 12. Development progress — first safe code slice

The development branch now contains the first implementation slice:
- Added `supabase/functions/site-assistant/ai-provider-registry.ts`.
- The current Gemini call now resolves through this server-side allowlist rather than hardcoding the provider endpoint in the request handler.
- The browser still cannot select a provider, model, or endpoint.
- The registry currently allows only the already-existing Gemini route; OpenRouter, Groq and Cloudflare are deliberately rejected.
- Registry metadata omits API credentials.
- Gemini free-tier eligibility is explicitly marked **unverified** for the exact configured model. The registry does not claim that this model/key is free.
- Added Deno tests for provider allowlisting, unknown-provider rejection, missing-key rejection, and secret isolation.
- Added the Deno test command to the existing static-validation workflow.

This is a controlled refactor, not yet a multi-provider gateway. No new provider was connected, no secret was created or changed, and no hosted Edge Function was deployed. The current Gemini model ID and provider account billing/free-tier status still require verification before any claim of free operation.

### Remaining verification gate

The pull request CI must pass on the updated commit, including Deno type-check and the new registry tests. The browser smoke test and the other PR checks must also complete successfully. No merge or deployment follows automatically from green CI.


## 13. Development progress — isolated provider transport adapter

A second implementation slice now separates provider selection from provider transport:
- Added `gemini-adapter.ts` as a dedicated server-side transport adapter.
- The Edge Function delegates generation to the adapter and no longer performs the Gemini HTTP request inline.
- The adapter accepts only the server-resolved provider config, normalized conversation contents, and the trusted system instruction.
- Added a 25-second request timeout.
- Classifies quota exhaustion (HTTP 429), transient server failures, provider errors, malformed responses, and empty model output.
- Does not parse or log provider error response bodies; operational logging records only a bounded status and error class.
- Added mocked transport tests for successful Arabic output, server-side API-key header use, request payload, quota failure, transient failure and malformed output.
- CI now runs the registry tests and adapter tests, alongside Edge Function type-checking and security contract tests.

### Explicit limitation

The registry still permits only the existing Gemini integration. No multi-provider routing, provider fallback, provider credentials, provider accounts, or new database quota ledger have been added. The adapter refactor is not a claim that the existing model or account has a verified free allocation. The configured model's current ID and pricing eligibility still require independent verification.

The change remains in the development branch and must pass the complete PR checks before it is considered ready for review. It has not been merged or deployed.
