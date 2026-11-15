# ❤️ Aloosh alshawwa ❤️ — Private Identity & Product Rebuild Plan

**Status:** Planning artifact only. No application identity, production configuration, database, deployment, or account setting is changed by this document.

**Target:** Rebuild the existing OFOQ application into a single-owner personal digital environment branded exactly as **❤️ Aloosh alshawwa ❤️**. The AI assistant uses the same display name.

## 1. Product decision

- Website display name: **❤️ Aloosh alshawwa ❤️**
- AI assistant display name: **❤️ Aloosh alshawwa ❤️**
- Product purpose: a private, owner-operated personal operating environment; not a public SaaS, marketplace, agency, or service for third parties.
- Audience: the owner only.
- Default language: Arabic (RTL), with multilingual capability where useful.
- Cost rule: free-first. No paid subscription, domain, API credit, or commercial service without the owner's explicit approval.
- Privacy rule: complete the private-hosting and access-control cutover before publishing the full rebrand.

## 2. Non-negotiable sequencing

1. Finish and verify the private access boundary (Cloudflare Pages + Access, protected previews, owner-only backend and RLS).
2. Confirm the old public GitHub Pages origin cannot expose the application; perform the documented retirement/cache cleanup and visibility change only after the protected replacement is proven.
3. Establish a safe staging/preview workflow protected by the same owner-only access.
4. Inventory every current page, route, title, icon, manifest, PWA asset, email template, assistant label, metadata field, footer, help message, and integration that contains the old public brand.
5. Apply the new brand consistently in a dedicated reviewed branch.
6. Run visual, accessibility, mobile, functional, security, and regression tests.
7. Release only after owner approval and a tested rollback path.

Do not perform a broad find-and-replace. Preserve stable technical identifiers, database objects, API contracts, Supabase project identifiers, storage keys, migration history, and existing user data unless a separately reviewed migration proves a change is necessary.

## 3. Brand system

### Canonical display strings
- Primary brand: ❤️ Aloosh alshawwa ❤️
- Assistant: ❤️ Aloosh alshawwa ❤️
- Suggested short internal product slug (not a replacement for the visible brand): aloosh-personal
- Suggested assistant internal key: aloosh-assistant

The display strings must be centralized in one brand configuration module and consumed by page titles, navigation, assistant UI, metadata, manifests, footer, and generated documents. Keep user-visible spelling and heart placement exact.

### Visual direction
- Premium, calm, modern personal command center.
- Distinctive typography with excellent Arabic readability and correct RTL layout.
- A coherent color system, spacing scale, icon family, component states, and responsive breakpoints.
- Avoid excessive animation, visual clutter, fake counters, decorative cards without function, and dark patterns.
- Respect reduced-motion preferences and provide accessible contrast and focus states.
- Create a coherent logo/mark and app icon set only after the owner approves the visual direction; do not embed copyrighted third-party marks.

## 4. Assistant identity and behavior

The assistant's visible name must match the website exactly. It should behave as the owner's private digital chief-of-staff and specialist router, not as a public chatbot.

Core capabilities to design:
- Personal command center with quick actions and contextual workspace.
- Persistent, owner-controlled knowledge and project memory with export, correction, and deletion workflows.
- Document and file understanding, search, summarization, drafting, and knowledge organization.
- Task-specific assistants with a shared identity, shared permissions, and a common context layer.
- Multi-provider AI routing with provider adapters, capability registry, model catalogue, quota tracking, fallback, and evaluation.
- A clear indication of the active model/provider and whether a response used a free quota, local model, or a paid service (paid services must remain disabled unless approved).

Never expose provider API keys in browser code, static assets, source control, logs, or client-visible configuration. Store credentials only in server-side secrets. Do not promise unlimited free access: provider eligibility, free quotas, model availability, rate limits, and API terms vary. The system must fail safely when a quota is exhausted and must not silently switch to a paid endpoint.

## 5. Personal workspaces — build only after the owner prioritizes them

Potential workspaces already aligned with the project's direction:
- Commerce and shop operations: products, stock, purchasing, sales, pricing, margins, suppliers, and reports.
- Personal finance and accounting: income/expense tracking, budgets, cash flow, and reconciliations.
- Trading research: watchlists, market research, journal, position sizing, and risk controls; no autonomous trading or custody of funds by default.
- Agriculture: crop plans, irrigation/fertilization logs, costs, seasonal tasks, and yield records.
- Social content: planning and drafting for the owner's own social accounts; publishing requires explicit user action and supported platform permissions.
- Learning and personal encyclopedia: structured notes, courses, research, and source-backed knowledge.
- Astronomy, science, psychology, and other interests.
- Sports and entertainment as optional modules.

This list is a candidate backlog, not an instruction to build every module. Prioritize by owner value, data availability, safety, cost, and maintenance burden.

## 6. Shared platform architecture

Build shared capabilities once and reuse them:
- Authentication and authorization: one owner identity, server-side authorization, least privilege, no client-only access checks.
- Personal data layer: explicit ownership, RLS, schema validation, backups, export, retention controls.
- File and knowledge layer: upload, indexing, retrieval, citations, and permission checks.
- AI gateway: provider adapters, model/capability registry, routing policies, quota ledger, retries, timeout budgets, circuit breakers, and audit metadata without storing sensitive prompt content unnecessarily.
- Workflow engine: approvals for consequential actions, idempotency, execution logs, and rollback where possible.
- Integration layer: isolated connectors with minimal scopes and revocable credentials.
- Observability: health, latency, error rates, quota usage, and cost visibility without collecting unnecessary personal content.

Do not create dozens of isolated pages with duplicated business logic. Build a small number of reliable platform services and domain workspaces on top.

## 7. Security and privacy acceptance criteria

- Unauthenticated visitors cannot load any application page, asset, preview, or private API.
- Only the owner's verified identity can pass the access layer.
- Direct Supabase/Edge Function/PostgREST calls enforce owner authorization independently of website Access.
- No non-owner account can read or mutate the owner's private records.
- No API secret is present in built assets, browser source maps, logs, Git history, or client configuration.
- All preview and branch deployments are disabled or protected by equivalent Access policies.
- Old public origin, old service worker, and old caches are handled using the approved retirement runbook.
- Noindex is not treated as access control.
- Backup and rollback procedures are documented and tested before destructive changes.
- No external integration or account action is taken without the necessary owner permission.

## 8. Quality gates

Before the rebrand release:
- Automated unit, integration, static, security, and build tests pass.
- Browser smoke tests pass on mobile and desktop.
- RTL, keyboard navigation, screen-reader labels, contrast, and reduced-motion behavior are checked.
- Every navigation item and button has a working destination/action.
- Empty, loading, error, offline, and permission-denied states are designed.
- Existing workflows and data are regression-tested.
- No placeholder data is presented as live data.
- No paid provider is called by default.
- A release note and rollback commit are prepared.

## 9. Explicitly out of scope without a later owner decision

- Public signup, public profiles, public sharing, third-party customer accounts, public API access, advertising, billing, memberships, paid subscriptions, and commercial services.
- Buying a domain, hosting plan, API credits, model subscription, or paid integration.
- Renaming the GitHub repository, Supabase project, database schema, Edge Function identifiers, or URLs merely for cosmetic consistency.
- Enabling autonomous financial trades, payments, purchases, account changes, or social publishing.

## 10. Immediate engineering tasks after the privacy gate

1. Generate a machine-readable inventory of brand references and application routes.
2. Identify the canonical brand configuration location and remove duplicate literals.
3. Map assistant UI, assistant endpoint, prompt templates, and logs to the same display identity.
4. Define the new information architecture from the owner's chosen priorities.
5. Implement the brand layer on a protected development branch without changing production.
6. Add regression tests for exact visible naming and prevent accidental reintroduction of the old public identity.
7. Complete an owner review before release.

**Current state:** This is a planning artifact only. The existing private-access PR and cutover safeguards remain the active priority. No rename, merge, deployment, or production change is authorized by this document.
