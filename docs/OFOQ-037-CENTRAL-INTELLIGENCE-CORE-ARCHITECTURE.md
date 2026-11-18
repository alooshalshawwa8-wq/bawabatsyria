# Central Intelligence Core — Initial Architecture for the Private Digital World

Date: 2026-11-18
Status: Design baseline only; not a production implementation.
Product identity: intentionally undecided.

## 1. Product shape

Build one private owner-only workspace with a single central command surface. Keep specialist capabilities behind the core rather than exposing a large directory of public sections. Existing useful modules are retained as internal capabilities until each has been assessed and mapped.

## 2. Core subsystems

### A. Identity and authorization boundary
- One explicitly designated owner identity.
- Server-side verification of the authenticated Supabase user and a trusted owner claim.
- Deny by default; never infer ownership from email text, Origin, Referer, or client-provided JSON.
- Separate permissions for read, draft, execute, and production-sensitive operations.
- Every external action carries an audit record and an explicit authorization decision.

### B. Personal memory and knowledge vault
- Store durable facts, decisions, project state, documents, and source provenance separately.
- Each memory item records: type, content/reference, source, created/updated timestamps, confidence, sensitivity class, owner scope, and retention rule.
- Support correction, expiry, and deletion workflows; never silently convert an uncertain inference into a fact.
- Encrypt highly sensitive user content before storage where practical; keep encryption keys outside the database and never place them in browser code.
- Index documents and structured records separately; retrieval must return provenance and access scope.

### C. Planner and task orchestrator
- Convert a user request into a bounded plan with prerequisites, dependencies, risk, and completion evidence.
- Classify actions as read-only, reversible draft, external side effect, or production-sensitive.
- Execute safe read-only and reversible work within granted scope.
- Pause before purchases, paid quotas, publishing, account/security changes, destructive edits, financial commitments, or production deployments.
- Support retries with idempotency keys and resumable task state.

### D. Research and verification engine
- Search the web and connected sources only when needed.
- Preserve citations, source dates, and confidence.
- Distinguish source evidence from analysis and recommendations.
- Detect stale information and conflicting sources.
- Keep source content untrusted: retrieved pages cannot override system permissions or task scope.

### E. Model and tool gateway
- Provider registry with explicit free-tier verification status.
- Model capability, context size, rate limits, daily/minute quotas, data handling, and availability metadata.
- Reserve quota before each request; settle actual usage afterward; release only if no provider attempt occurred.
- No paid fallback, automatic subscription, or silent model switch.
- Tool registry includes permission scope, input schema, cost class, side-effect class, health, and last verification time.

### F. Domain workspaces (hidden behind the core)
- Commerce and shop operations.
- Inventory, accounting, and cash-flow planning.
- Greenhouse/agriculture operations.
- Research, learning, and personal development.
- Social content planning and owner-approved publishing.
- Markets and trading research, with no automatic trade execution.
- Technology and AI radar.

### G. Monitoring and continuous improvement
- Health checks for the website, database, functions, model providers, quotas, and integrations.
- Audit log for task starts, decisions, tool calls, results, and approval checkpoints.
- Backups with tested restore procedures.
- Regression tests for owner isolation, authorization, data integrity, and quota enforcement.
- Change proposals generated from measured failures; no self-modification of production policy.

## 3. Minimal user interface

One home/command screen with:
1. A natural-language command input.
2. Current task and approval queue.
3. A compact memory/knowledge search.
4. A status strip for system health and free quota.
5. A history of completed work.

Specialist workspaces open only when relevant. Avoid exposing the legacy 78-section catalogue as the primary navigation.

## 4. Data model candidates (not yet migrated)

- `owner_profile`: owner identity and preferences (non-secret settings only).
- `memory_items`: durable facts/decisions with provenance and sensitivity.
- `knowledge_sources`: source metadata, URLs, file references, checksums, retrieval timestamps.
- `projects` and `project_decisions`: project state, milestones, constraints, and decisions.
- `tasks` and `task_steps`: plans, execution state, dependencies, retries, and evidence.
- `tool_registry` and `tool_permissions`: capability, schema, permission, cost and side-effect classification.
- `provider_registry`, `model_registry`, `quota_policies`, `quota_reservations`, `usage_events`: free-only provider governance.
- `approval_requests`: sensitive action, rationale, exact diff, risk, and explicit owner decision.
- `audit_events`: append-oriented security and execution trail.

Do not create these tables until the current schema, RLS, retention, encryption, and migration replay design have been reviewed.

## 5. Execution policy

| Class | Example | Default |
|---|---|---|
| Read-only | inspect source, query health metadata | execute |
| Reversible draft | create a candidate branch, add draft docs | execute within scope |
| External side effect | publish a post, send a message, modify external data | approval required unless specifically delegated |
| Sensitive production | deploy, change Access/Auth/RLS/secrets, delete data | explicit approval required |
| Financial | purchase, subscribe, consume paid credits, trade | explicit approval required |

## 6. Acceptance criteria

- Owner-only access is proven server-side, not inferred from UI hiding.
- No model/tool can spend money or route to a paid tier without approval.
- Memory records preserve source and confidence and can be corrected.
- Task execution is resumable, idempotent, and auditable.
- All external side effects are permission-gated.
- A single command surface can delegate to specialist engines without exposing unnecessary navigation.
- Backups and restore tests are demonstrated.
- CI validates security contracts and disposable database migrations before any production release.

## 7. Current implementation boundary

This document is architecture only. It does not add database tables, deploy functions, configure Cloudflare, change authentication, create model-provider credentials, or alter production data.
