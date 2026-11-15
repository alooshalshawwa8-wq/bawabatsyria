# OFOQ-033 — Section execution, data dependencies and owner-safety map

**Date:** 2026-11-15  
**Branch:** `aloosh/brand-prep-2026-11-15`  
**Scope:** Read-only source inspection of `index.html`, `ofoq-core.js`, `ofoq-workspaces.js`, `ofoq-data.js`, `ofoq-workspace-extensions.js`, `ofoq-commerce-cloud.js`, `ofoq-vault.js`, `ofoq-metrics.js`, `career-studio.js`, `ecommerce-studio.js`, and `operations-hub.js`.  
**Status:** Engineering inventory; no runtime code or production settings changed.

## 1. Actual execution architecture

The application is not 78 independent pages. It is a shared single-page shell with a catalogue and a small number of rendering extensions:

1. `index.html` owns the 78-record catalogue, the main `openSection(sec)` dispatcher, a small number of bespoke modules, and a generic `renderUtilityModule(sec, tool)` renderer.
2. `activateSectionPage(sec)` changes the shared detail shell (hero, title, description). It does not create a separate route per catalogue item.
3. The main dispatcher has dedicated branches for `sports_radar`, `trading_academy`, `zodiac_world`, `prices`, `chef`, and `marketing_vip`; other bespoke helpers include additional domain-specific renderers.
4. The `utilityModules` registry provides a generic input/calculation/output pattern for many sections. Its save action stores generated text locally under `ofoq-notes-<section-id>`.
5. Several scripts wrap `window.openSection` to add behavior. The order in which those scripts load and wrap the dispatcher is therefore a compatibility contract.
6. `ofoq-core.js` adds favorites/recent navigation and records visits by stable catalogue ID. It does not call the network.
7. `ofoq-workspaces.js` and `ofoq-workspace-extensions.js` inject authenticated cloud panels into selected sections.

**Architectural conclusion:** Reorganize the catalogue into owner workspaces above the existing shared dispatcher. Do not fork 78 pages, rename IDs, or change the script wrapping order casually.

## 2. Dispatch coverage observed in source

### Main dispatcher branches explicitly observed
- `sports_radar` — football module renderer.
- `trading_academy` — local trading education/simulation renderer.
- `zodiac_world` — entertainment/mystic renderer; image-based cup reading is described as awaiting an AI connection.
- `prices` — manual rate-entry calculator; source explicitly says it is not currently live market data.
- `chef` — local random meal picker.
- `marketing_vip` — local marketing copy generator.

The section dispatcher also has other section-specific helpers, such as the automotive parts guide and multiple domain renderers. The list above is the set of top-level `sec.id` branches directly extracted from the main `openSection` body in this pass, not an exhaustive inventory of every helper call nested inside it.

### Generic utility registry
The source defines a `utilityModules` map and a shared `renderUtilityModule` renderer. Each configured item uses client-side fields and a deterministic `cfg.run(values)` function. The generated output can be copied or saved in browser local storage. This is a lightweight local tool pattern, not evidence of a connected AI service or real-time data feed.

### Navigation/history
- `openSection(sec)` is the shared entry point.
- The navigation wrapper adds a hash for the selected ID and browser history behavior.
- `ofoq-core.js` wraps `openSection` to record recent visits and mount a favorite control.
- `ofoq-data.js` wraps `openSection` to emit a usage event.
- Workspace scripts wrap `openSection` to mount additional panels.
- Every wrapper should preserve `this`, arguments, return values, and async completion. A future refactor should replace wrapper stacking with a single event/hook registry and add order-independent tests.

## 3. Cloud data access contract

### Shared client layer: `ofoq-data.js`

Observed behavior:
- Reads Supabase URL, anon key, and session state from browser globals/local storage.
- Uses Supabase Auth endpoints for refresh and user lookup.
- Exposes `OFOQData.getUser()`, `request(table, options)`, `track(event, section)`, `edge(path)`, session invalidation, and local sign-out.
- The REST helper attaches the anon key and the signed-in user's bearer token, and retries one 401 after refreshing the session.
- Usage events are allowlisted to a fixed event-name set and use section IDs that match a conservative pattern.

Important security review items:
- The anon key is a browser public key, not a secret; authorization must be enforced by Auth and database RLS.
- Access and refresh tokens are present in browser storage by design in this implementation. This increases impact from any same-origin XSS or malicious browser extension. Keep strict CSP, avoid unsafe HTML insertion, and review all script sources before enabling private access.
- Do not place provider API keys, service-role keys, or other privileged credentials in this data layer or browser bundle.
- The wrapper obtains the current user before table requests, but this alone is not an authorization boundary. Every table and RPC still requires correct RLS/grants.

### Workspace tables observed

| Workspace | Tables | Operations observed |
|---|---|---|
| CRM panel in `ofoq-workspaces.js` | `ofoq_crm_contacts` | SELECT, POST, PATCH, DELETE |
| Career applications panel | `ofoq_career_applications` | SELECT, POST, PATCH, DELETE |
| Inventory panel | `inventory_items`, `inventory_movements` | SELECT, POST |
| Chart of accounts | `accounting_accounts` | SELECT, POST |
| CRM activity extension | `ofoq_crm_contacts`, `ofoq_crm_activities` | SELECT, POST |
| Career profile extension | `ofoq_career_profiles` | SELECT, POST with upsert conflict target |
| Journal draft extension | `accounting_accounts`, `journal_entries`, `journal_lines` | SELECT, POST, conditional DELETE of draft on failure |
| Shared usage tracking | `ofoq_usage_events` | POST |

The `business` section mounts CRM panels; `accounting_vip` mounts inventory/accounts/journal tools; `jobs` and `freelance_vip` mount career applications/profile panels.

### Commerce cloud and personal vault

- `ofoq-commerce-cloud.js` provides opt-in manual synchronization of locally stored product/order records. Its own source comments explicitly say no public storefront and no payment processing. It uses an owner-account session in session storage and a private per-account cloud sync path; inspect its full table names and SQL constraints before any future migration.
- `ofoq-vault.js` uses the `user_workspace_backups` table and an explicit allowlist of local workspace keys. It states that backups exclude passwords, access tokens, and assistant chat history, but are **not client-side encrypted**. It retains the latest 20 backups per account across backup types.
- Do not describe vault backups as end-to-end encrypted. For sensitive commercial records, assess encryption, retention, restore validation, and deletion behavior before relying on it as the only backup.

## 4. Local persistence inventory

| Key / family | Purpose observed | Notes |
|---|---|---|
| `ofoq_personal_space_v1` | Favorites and recent section IDs | Core navigation; cap 78 favorites / 12 recent; preserve schema and IDs. |
| `ofoq-notes-<id>` | Saved outputs from generic utility modules | Per-section local notes; included in vault allowlist. |
| `ofoq_trading_checklist_v1` | Trading pre-flight checklist | Local browser state. |
| `ofoq_trading_journal_v1` | Trading journal | Listed in vault allowlist; inspect writer/reader semantics before migration. |
| `ofoq_ecommerce_scenarios_v1`, `ofoq_ecommerce_launch_checklist_v1` | E-commerce planning | Local-first. |
| `ofoq_ecommerce_products_v1`, `ofoq_ecommerce_orders_v1`, `ofoq_ecommerce_deleted_orders_v1` | Product/order records and deletion tombstones | Local-first source plus opt-in cloud sync. |
| `ofoq_operations_hub_v1` and recovery keys | Operations hub and recovery | Local-first, with optional cloud snapshots. |
| `bawabatsyria_stock_v1`, `bawabatsyria_trade_*`, `bawabatsyria_treasury_*` | Trading/store operations and treasury records | Included in vault allowlist; exact schemas require dedicated audit. |
| `bawabatsyria_auth_session`, `bawabatsyria_access_token` | Auth session/token storage | Sensitive browser state; deliberately excluded from vault backup. |

Do not rename storage keys in the branding pass. If later migration is necessary, use a versioned, idempotent, rollback-capable migration that preserves existing local data.

## 5. Owner-action and data-integrity review

### Mutations that already have UI confirmation
- CRM contact deletion asks for confirmation.
- Career application deletion asks for confirmation.
- Vault restore/delete and commerce synchronization need dedicated confirmation-path review before they are included in the redesigned command center.

### Mutations requiring stronger guardrails before daily use
- Inventory movement buttons immediately submit a movement after user input. Add a preview of item, movement type, signed quantity, and resulting balance; reject negative stock unless an explicit policy permits it; require a final confirmation for destructive/large adjustments.
- Journal draft creation writes an entry and two balanced lines; on failure it attempts to delete the draft. Add an idempotency key or database transaction/RPC so a partial write cannot leave inconsistent records. The current UI says the draft is not posted, which should remain explicit.
- CRM and career records support delete. Add undo/soft-delete or a recovery window before production reliance.
- Account and inventory creation should validate currency and uniqueness at the database layer, not only in browser forms.
- Cloud backup restore overwrites local browser keys; require a clear before/after preview, timestamp and key counts, and a recoverable pre-restore snapshot.
- Never introduce live trading orders, public publishing, outbound messages, payment capture, or external account changes as implicit side effects of an owner workspace.

## 6. Readiness classification (source-level only)

| Capability | Current source evidence | Readiness assessment |
|---|---|---|
| Catalogue and shared section shell | Present in `index.html` | Existing, but visitor-oriented copy and shell need owner-first redesign after private access. |
| Favorites and recent items | Local-first core | Existing; preserve stable IDs/storage key. |
| Generic calculators | Utility registry and renderer | Existing local functionality; validate each formula and input boundaries. |
| Live market prices | Prices module explicitly asks user to enter rate | Not live; do not label as real-time. |
| AI assistant | Browser calls `site-assistant` Edge Function | Connected path exists in source; provider remains gated by server-side free-tier verification. |
| CRM, inventory and accounting | Cloud workspace panels and REST table calls | UI exists; production readiness depends on table-by-table RLS, constraints, transactions, and owner-only access tests. |
| Career applications/profile | Cloud panels and local career studio | Mixed local/cloud implementation; define one canonical source of truth before merging features. |
| E-commerce products/orders | Local-first studio plus manual private sync bridge | No public store/payment processing; preserve this boundary. |
| Personal vault | Explicit local-key allowlist and cloud backup table | Useful backup primitive; not client-encrypted; restore/delete require careful safety UX. |
| Sports data | Football module renderer | Verify data source freshness and API dependencies; do not assume live feeds. |
| Astrology/coffee-cup AI | Entertainment UI; AI image reading described as awaiting connection | Interface does not prove AI capability is connected. |

## 7. Next implementation sequence

1. Build a machine-readable registry for the 78 stable IDs, with owner workspace, module kind (`bespoke`, `utility`, `reference`, `cloud-workspace`), persistence class, and readiness flag.
2. Add CI tests for 78 unique IDs, no orphan favorites, every utility registry key matching a catalogue ID, and every cloud workspace hook targeting an existing ID.
3. Replace wrapper stacking with a single dispatcher extension registry while preserving current script load order during transition.
4. Add table/RPC permission tests for every cloud workspace table and verify owner isolation using two test identities in a disposable database.
5. Add transactional RPCs for inventory movements and journal drafts; test negative stock, duplicate submissions, and partial failures.
6. Define one local/cloud sync policy per data family, including conflict resolution and restore semantics.
7. Only after the private-access gate is complete, implement the canonical owner-first brand and navigation shell.

## 8. Explicit non-actions

No code behavior was changed. No production DB, RLS, Auth, Edge Function, Cloudflare, repository visibility, GitHub Pages, payment, external account, or user data was changed. No paid API or subscription was used.
