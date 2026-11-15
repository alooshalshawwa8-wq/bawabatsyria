# OFOQ-025 — ❤️ Aloosh alshawwa ❤️ Owner-First Information Architecture

**Date:** 2026-11-15  
**Branch:** `ofoq/private-access-readiness-2026-11-15`  
**Status:** Proposed product architecture; no routes, sections, data, or production settings changed.

## 1. Design principle

The existing 78-section catalogue was designed around a broad public platform. The new product is a private personal digital environment. Therefore, the home screen must stop treating all 78 catalogue entries as equal destinations.

Preserve existing section identifiers and code while introducing a smaller owner-first navigation system. Sections can be hidden from the daily home, grouped under a library, or archived from active navigation without deleting code or user data.

## 2. Proposed top-level navigation

1. **الرئيسية / مركز القيادة** — daily overview, pinned workspaces, recent work, tasks, alerts and quick capture.
2. **أعمالي وتجـارتي** — shop operations, ecommerce, products, inventory, suppliers, purchasing, sales, pricing and margin analysis.
3. **المال والمحاسبة** — personal finance, cash flow, budgets, shop accounts, ledgers and reconciliations.
4. **الأسواق والتداول** — market research, watchlists, trading journal, scenario analysis, position sizing and risk controls; no autonomous execution by default.
5. **الزراعة والإنتاج** — crop/animal projects, field logs, inputs, irrigation, seasonal plans, costs and yield.
6. **المحتوى والحضور الرقمي** — content calendar, writing/design/video briefs, and planning for the owner's own social accounts; publishing requires explicit approval.
7. **الذكاء الاصطناعي** — assistant chat, model directory, model comparison, task routing, prompt library, provider quotas and AI workbench.
8. **المعرفة والتعلّم** — personal encyclopedia, research library, structured notes, learning plans and source-backed reference.
9. **العلوم والاهتمامات** — astronomy, science, psychology, sports and optional entertainment tools.
10. **ملفاتي وذاكرتي** — documents, searchable knowledge, saved decisions, project memory, exports and privacy controls.
11. **الإعدادات والأمان** — identity, sessions, connected services, API secrets status (never reveal secret values), backups, permissions and audit history.

## 3. Initial priority matrix

| Priority | Workspace | Existing catalogue candidates | Initial purpose |
|---|---|---|---|
| P0 | Private identity and command center | `privacy_center`, `accessibility_center` plus shared shell | Owner-only entry, overview, pinned work and personal settings. |
| P1 | Commerce cockpit | `ecommerce_studio`, `accounting_vip`, `trader_market`, `business` | Manage real shops and commerce workflows with consistent product, supplier, stock and sales data. |
| P1 | Accounting and personal finance | `accounting_vip`, `personal_finance`, `prices` | Consolidated personal and shop cashflow, budgets, costs, profit and reporting. |
| P1 | AI command center | `ai_lab`, `syria_ai` and assistant integration | One named assistant, provider-neutral routing, free quota tracking and reusable specialist skills. |
| P1 | Research and knowledge vault | `world_encyclopedia`, `books_knowledge`, `science_space` | Source-backed research, notes, files and persistent project context. |
| P2 | Trading research desk | `trading_academy`, `prices` | Risk-first analysis, journaling, scenario tools and verified market sources when available. |
| P2 | Agriculture workspace | `agriculture`, `fertilizers`, `environment_climate` | Farm/field planning, input logs, crop calendar and cost/yield records. |
| P2 | Social media and content studio | `social_media_hub`, `marketing_vip`, `video_factory_vip`, `design_lab`, `photography_media` | Plan, draft, organize and evaluate content for the owner's own channels. |
| P3 | Learning and interests | `education`, `language_academy`, `world_history`, `zodiac_world`, `sports_radar` | Optional personal learning, science and entertainment spaces. |

Priority labels are a proposed sequence, not a claim that any current section is already fully functional.

## 4. What changes in the 78-section catalogue

- Do not delete sections simply because they are not central to the owner's daily work.
- Move rarely used or public-service-oriented sections into a searchable **مكتبة الأدوات والموضوعات** rather than showing all tiles on the home screen.
- Hide public-marketplace, third-party business directory, public reports/complaints and customer-oriented flows from the private home unless the owner later identifies a personal use.
- Keep public-facing legal, membership, payment, marketing and signup assumptions out of the private app's primary navigation.
- Reuse existing modules where their function fits; do not rebuild a working local calculator or tool without evidence that replacement is needed.
- Distinguish local tools, static catalogues, live integrations, AI-assisted workflows and planned capabilities visibly.

## 5. Shared data concepts

Build shared entities before duplicating data across workspaces:

- **Workspace:** owner-scoped container for a shop, farm, trading journal, learning project or personal area.
- **Project:** a goal or ongoing initiative within a workspace.
- **Contact / supplier:** a reusable person or organization record, with minimum necessary personal data.
- **Product / item:** SKU, category, unit, cost, selling price, stock movements and supplier links.
- **Transaction:** timestamp, type, amount, currency, account, category, source and reconciliation state.
- **Task / event:** due date, priority, status, reminders and links to a project or record.
- **Document / note:** file metadata, content index, tags, source, version and access scope.
- **AI task record:** selected provider/model, task type, quota reservation, status and minimal operational metadata. Avoid retaining sensitive prompts unless explicitly required and controlled.

All personal records must be owner-scoped server-side and protected by RLS. The client must never be the only security boundary.

## 6. Cross-workspace command center

The home dashboard should show only useful owner-specific information:
- Tasks due soon and overdue.
- Current shop stock warnings and purchasing needs.
- Cashflow summary and unreconciled transactions.
- Trading watchlist alerts only when a verified data source is connected.
- Agriculture tasks and seasonal milestones.
- Draft content waiting for review.
- Recent files, notes and assistant outputs.
- AI provider quota/availability status and active fallback state.
- Security alerts such as new sessions or failed authorization attempts.

Do not fabricate data to fill dashboard cards. If a source is not connected, show a clear setup or unavailable state.

## 7. Permissions and action policy

- Read-only analysis can run automatically within the owner's authenticated session.
- Changes to important records should be reviewable and reversible where possible.
- External publishing, sending messages, purchases, payments, trades, deletion, and account/security changes require explicit owner confirmation.
- API credentials are entered and stored server-side only; the UI shows provider name, connection status, permissions and last validation, never secret contents.
- Third-party connectors must use the narrowest practical scopes and be revocable.

## 8. Build order

1. Private access gate and authenticated owner shell.
2. Shared navigation, search, command palette and personal workspace registry.
3. Common files, notes, tasks, projects and data ownership layer.
4. AI gateway and the assistant identity.
5. Commerce and accounting workspaces.
6. Knowledge/research workspace.
7. Trading research, agriculture and content workspaces.
8. Optional interests and library of remaining catalogue sections.
9. Full regression, accessibility, security, backup and restore tests.

## 9. Decision record

This is the recommended owner-first architecture based on the established private-use goal and the owner's previously discussed interests. It is a planning proposal, not permission to remove existing sections, change production, migrate data, enable external actions, or spend money.
