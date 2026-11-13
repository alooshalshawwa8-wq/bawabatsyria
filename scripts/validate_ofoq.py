#!/usr/bin/env python3
"""Fast, dependency-free contract checks for the OFOQ portal and AI budget."""
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text(encoding="utf-8")
assistant = (ROOT / "supabase/functions/site-assistant/index.ts").read_text(encoding="utf-8")
membership = (ROOT / "supabase/functions/membership-api/index.ts").read_text(encoding="utf-8")
worker = (ROOT / "service-worker.js").read_text(encoding="utf-8")
core = (ROOT / "ofoq-core.js").read_text(encoding="utf-8")
ecommerce = (ROOT / "ecommerce-studio.js").read_text(encoding="utf-8")
career = (ROOT / "career-studio.js").read_text(encoding="utf-8")
operations = (ROOT / "operations-hub.js").read_text(encoding="utf-8")
commerce_cloud = (ROOT / "ofoq-commerce-cloud.js").read_text(encoding="utf-8")
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))

def require(condition, message):
    if not condition:
        raise SystemExit("FAIL: " + message)

def object_body(source, marker):
    start = source.find(marker)
    require(start >= 0, "missing object marker: " + marker)
    brace = source.find("{", start)
    require(brace >= 0, "missing opening brace after " + marker)
    depth = 0
    for pos in range(brace, len(source)):
        if source[pos] == "{":
            depth += 1
        elif source[pos] == "}":
            depth -= 1
            if depth == 0:
                return source[brace + 1:pos]
    raise SystemExit("FAIL: unterminated object: " + marker)

# Section catalogue integrity and complete renderer coverage.
section_start = html.find("const sections = [")
require(section_start >= 0, "section catalogue missing")
section_end = html.find("\n\n]", section_start)
require(section_end > section_start, "section catalogue boundary missing")
section_ids = re.findall(r"\{\s*id:\s*'([^']+)'", html[section_start:section_end])
require(section_ids, "no section IDs parsed")
require(len(section_ids) == len(set(section_ids)), "duplicate section IDs")
priority_start = html.find("const sectionPriority = [")
require(priority_start >= 0, "section priority list missing")
priority_end = html.find("];", priority_start)
priority_ids = re.findall(r'"([^"]+)"', html[priority_start:priority_end])
require(len(priority_ids) == len(set(priority_ids)), "duplicate priority IDs")
require(set(section_ids) == set(priority_ids), "section priority list does not match catalogue")

# Shared futuristic navigation must remain keyboard- and accessibility-friendly.
command = re.search(r'<script id="ofoq-command-center-v2">([\s\S]*?)</script>', html)
require(command, "command center script missing")
for token in ('aria-modal', "role','dialog", "Escape", "ctrlKey", "metaKey", "focusables"):
    require(token in command.group(1), "command center accessibility contract missing: " + token)

# Membership API security and monetization guardrails.
for token in (
    'Deno.env.get("PAYMENTS_ENABLED") === "true"',
    'if (!PAYMENTS_ENABLED) return reply(',
    'async function authenticatedUser(request: Request)',
    'supabaseFetch("/auth/v1/user", token)',
    'metadata.role === "OWNER" && metadata.owner === true && metadata.owner_access === "lifetime"',
    'request.method === "POST" && path === "/api/stripe/webhook"',
    'verifyStripeSignature(payload, request.headers.get("Stripe-Signature") ?? "")',
    'Math.abs(Date.now() / 1000 - timestamp) > 300',
    'readBoundedText(request, 262_144)',
    'readBoundedText(request, 8_192)',
    'Number.isSafeInteger(delta)',
    'on_conflict=idempotency_key',
    'checkout.stripe.com/',
    'async function billingGateOpen(): Promise<boolean>',
    '/rest/v1/platform_launch_config?select=launch_mode,billing_enabled,paid_features_enforced&singleton=eq.true&limit=1',
    'config?.launch_mode === "production"',
    'config?.billing_enabled === true',
    'config?.paid_features_enforced === true',
    'PAYMENTS_ENABLED && await billingGateOpen()',
    'if (!await billingGateOpen()) return reply(',
):
    require(token in membership, "membership API security/monetization guard missing: " + token)
require("SUPABASE_SERVICE_ROLE_KEY" not in html and "STRIPE_SECRET_KEY" not in html, "membership provider secrets must not enter browser HTML")
require('Access-Control-Allow-Origin": "https://alooshalshawwa8-wq.github.io"' in membership, "membership API exact-origin CORS contract missing")

# Football provider must remain fail-closed when the provider account is blocked.
football = (ROOT / "supabase/functions/football-data/index.ts").read_text(encoding="utf-8")
for token in (
    'if (action === "status")',
    'providerBlocked',
    'available: false',
    '!budgetSnapshot?.providerBlocked',
):
    require(token in football, "football provider suspension guard missing: " + token)

# Database migration source for the hardened internal quota helper must be tracked.
quota_migration = ROOT / "supabase/migrations/20261113131859_harden_ai_provider_reservation_search_path.sql"
require(quota_migration.is_file(), "quota helper hardening migration is not tracked")
require("ALTER FUNCTION public.reserve_ai_provider_request(text, integer) SET search_path = '';" in quota_migration.read_text(encoding="utf-8"), "quota helper migration must pin an empty search_path")

# Scope reconciliation is explicit and must preserve the expanded catalogue.
scope_doc = ROOT / "docs/OFOQ_SCOPE_RECONCILIATION.md"
require(scope_doc.is_file(), "scope reconciliation document missing")
scope_text = scope_doc.read_text(encoding="utf-8")
for token in ("46", "42", "78", "70", "no sections or tools were removed"):
    require(token in scope_text, "scope reconciliation record missing: " + token)

# Public-schema defaults and sequence access must remain least-privilege.
default_acl_migration = ROOT / "supabase/migrations/20261113132339_revoke_postgres_client_default_privileges.sql"
require(default_acl_migration.is_file(), "client default-privilege migration missing")
default_acl_sql = default_acl_migration.read_text(encoding="utf-8")
for token in (
    "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public",
    "REVOKE ALL ON TABLES FROM anon, authenticated",
    "REVOKE ALL ON SEQUENCES FROM anon, authenticated",
    "REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated",
    "REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC",
):
    require(token in default_acl_sql, "least-privilege default ACL contract missing: " + token)

sequence_migration = ROOT / "supabase/migrations/20261113132420_revoke_client_public_sequence_access.sql"
require(sequence_migration.is_file(), "client sequence access migration missing")
sequence_sql = sequence_migration.read_text(encoding="utf-8")
for token in ("REVOKE ALL ON SEQUENCE", "football_api_budget_reservations_id_seq", "football_api_usage_id_seq", "journal_entries_entry_number_seq", "FROM anon, authenticated"):
    require(token in sequence_sql, "client sequence access restriction missing: " + token)

trigger_acl_migration = ROOT / "supabase/migrations/20261113132427_restrict_workspace_backup_trigger_function.sql"
require(trigger_acl_migration.is_file(), "trigger-only function privilege migration missing")
require("REVOKE EXECUTE ON FUNCTION public.trim_user_workspace_backup_history() FROM PUBLIC, anon, authenticated;" in trigger_acl_migration.read_text(encoding="utf-8"), "trigger-only helper must not be exposed as client RPC")

# AI assistant request hardening: exact-origin POST, bounded payloads, and fail-closed global budget.
for token in (
    'request.method !== "POST"',
    'origin !== ALLOWED_ORIGIN',
    'request.headers.get("x-forwarded-for")',
    'rateAllowed(ip)',
    'readBoundedBody(request, 24_000)',
    'body.messages.length > 12',
    'item.content.trim().slice(0, 2000)',
    'reserve_ai_provider_request',
    'budgetAllowed !== true',
):
    require(token in assistant, "AI assistant abuse-control contract missing: " + token)

# Football provider protection: GET-only, local burst guard, persistent quota, and fail-closed storage.
football = (ROOT / "supabase/functions/football-data/index.ts").read_text(encoding="utf-8")
for token in (
    'request.method !== "GET"',
    'origin !== ALLOWED_ORIGIN',
    'request.headers.get("x-forwarded-for")',
    'rateAllowed(ip)',
    'persistentRateAllowed(await hashClientKey(ip), 60)',
    'persistentRate === null',
    'if (!persistentRate)',
    'p_window_seconds: 60',
    'p_max_requests: maxRequests',
    'async function hashClientKey(value: string)',
):
    require(token in football, "Football API abuse-control contract missing: " + token)
require('user.appMetadata?.role === "OWNER" && user.appMetadata?.owner === true' in football,
        "Football owner-only authorization metadata contract missing")
require('const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")' in football,
        "Football provider data access must use server-side service credentials")

# Frontend section assistant must be explicit-send only and must not expose secrets.
gemini = re.search(r'<script id="ofoq-section-gemini-v2">([\s\S]*?)</script>', html)
require(gemini, "section Gemini panel missing")
for token in ("send.addEventListener", "site-assistant", "profiles[sec.id]", "history.length>10", "maxLength=1200"):
    require(token in gemini.group(1), "Gemini frontend contract missing: " + token)
for secret_marker in ("GEMINI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEYS", "x-goog-api-key"):
    require(secret_marker not in html, "server secret marker leaked into index.html: " + secret_marker)
require("functions/v1/football-data" not in gemini.group(1), "Gemini assistant must not trigger football API calls")

# The deployed AI source is kept in Git with its real global daily quota guard.
for token in (
    'Deno.env.get("GEMINI_API_KEY")',
    "reserve_ai_provider_request",
    'p_provider: "gemini"',
    "p_daily_limit: 30",
    "budgetAllowed !== true",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEYS",
    "sectionProfiles",
    "maxOutputTokens: 850",
):
    require(token in assistant, "AI backend protection missing: " + token)
require("x-goog-api-key" in assistant, "Gemini key must be sent server-side only")
require("console.info(\"Nibras context received\", { messageCount:" in assistant,
        "AI logs should record counters, not conversation text")

front_profiles = object_body(gemini.group(1), "const profiles=")
back_profiles = object_body(assistant, "const sectionProfiles: Record<string, string> =")
front_values = set(re.findall(r':\s*"([a-z_]+)"', front_profiles))
back_values = set(re.findall(r'^\s*([a-z_]+):\s*"', back_profiles, re.M))
require(front_values <= back_values, "frontend routes to unknown backend profiles: " + repr(sorted(front_values - back_values)))

# E-commerce studio is local-first, mounted only in its own section, and covered by syntax CI.
require("ecommerce-studio.js" in html, "e-commerce studio script not loaded by the portal")
for token in ("ofoq-ecom-studio", "calculatePrice", "ROAS", "ofoq_ecommerce_scenarios_v1", "ofoq_ecommerce_launch_checklist_v1", "importScenarios", "512000", "ofoq-ecommerce-scenarios", "role", "tablist"):
    require(token in ecommerce, "e-commerce studio feature missing: " + token)
require("fetch(" not in ecommerce and "XMLHttpRequest" not in ecommerce and "site-assistant" not in ecommerce, "e-commerce studio must remain local-first and API-free")
require("./ecommerce-studio.js" in worker, "e-commerce studio missing from offline app shell")

# Authenticated commerce cloud bridge: manual sync only, owner-scoped by RLS.
require("./ofoq-commerce-cloud.js" in html, "commerce cloud bridge not loaded by the portal")
require("./ofoq-commerce-cloud.js" in worker and "ofoq-commerce-cloud.js" in worker, "commerce cloud bridge missing from offline app shell")
for token in ("ofoq_cloud_backup_session_v1", "ofoq_store_products", "ofoq_store_orders", "مزامنة الآن", "ofoq:commerce-synced"):
    require(token in commerce_cloud or token in html, "commerce cloud contract missing: " + token)
require("service_role" not in commerce_cloud and "SUPABASE_SERVICE_ROLE_KEY" not in commerce_cloud, "browser commerce bridge must not contain privileged server credentials")
require("fetch(" in commerce_cloud and "Authorization" in commerce_cloud, "commerce cloud bridge must use authenticated API requests")

# Career and freelance studios are isolated, local-first workspaces with tested contracts.
require("career-studio.js" in html, "career studio script not loaded by the portal")
for token in ("jobs", "freelance_vip", "ofc-studio", "ofoq_career_applications_v1", "STAR", "portfolio", "proposal"):
    require(token in career, "career studio feature missing: " + token)
require("fetch(" not in career and "XMLHttpRequest" not in career and "site-assistant" not in career, "career studio must remain local-first and API-free")
require("./career-studio.js" in worker, "career studio missing from offline app shell")

# Unified operations hub: local-first project, task, ledger and backup workspace.
require("operations-hub.js" in html, "operations hub script not loaded by the portal")
for token in ("ofoq_operations_hub_v1", "ofoq-operations-hub", "transactions", "projects", "tasks", "1024*1024", "persist"):
    require(token in operations, "operations hub feature missing: " + token)
require("تعذر إنشاء نقطة الاستعادة" in operations and "أُعيدت البيانات إلى الحالة السابقة" in operations, "operations hub must roll back failed local writes")
require('Math.abs(n-Math.round(n*100)/100)>1e-8' in operations and 'lf.amount.step="0.01"' in operations, "operations ledger must reject sub-cent values")
require("const sumMoney=rows=>" in operations, "operations ledger totals must sum integer cents")
require('amountInput.fill("125.567")' in (ROOT / "tests/browser-smoke.mjs").read_text(encoding="utf-8"), "browser suite must cover sub-cent ledger rejection")
require("النسخ السحابية الاختيارية في أُفُق" in html, "privacy center cloud backup disclosure missing")
for token in ("user_workspace_backups", "cloudRequest", "/token?grant_type=password", "/signup", "sessionStorage", "createCloudBackup", "validCloudBackup", "refresh_token"):
    require(token in operations, "opt-in cloud backup contract missing: " + token)
require("fetch(" in operations and "XMLHttpRequest" not in operations, "cloud backup must use bounded fetch requests only")
require("SUPABASE_SERVICE_ROLE_KEY" not in operations and "service_role" not in operations, "server credentials must never appear in the browser")
require("site-assistant" not in operations and "functions/v1/football-data" not in operations, "operations hub must not consume AI or football provider quotas")
backup_migration = ROOT / "supabase/migrations/20261111160644_user_workspace_backup_vault.sql"
require(backup_migration.is_file(), "cloud backup RLS migration missing")
retention_migration = ROOT / "supabase/migrations/20261111161225_bound_workspace_backup_retention.sql"
require(retention_migration.is_file(), "cloud backup retention migration missing")
retention_sql = retention_migration.read_text(encoding="utf-8")
require("security invoker" in retention_sql and "limit 19" in retention_sql and "user_workspace_backups_keep_20" in retention_sql, "cloud backup retention must be bounded and invoker-safe")
backup_sql = backup_migration.read_text(encoding="utf-8")
for token in ("enable row level security", "Users read own workspace backups", "Users create own workspace backups", "Users delete own workspace backups", "revoke all on public.user_workspace_backups from anon"):
    require(token in backup_sql, "cloud backup database security contract missing: " + token)
cache_version = re.search(r'const CACHE_NAME = CACHE_PREFIX \+ "v(\d+)"', worker)
require("./operations-hub.js" in worker and cache_version and int(cache_version.group(1)) >= 48, "operations hub missing from offline shell or cache version is invalid")

# Merchant catalogue and order desk: local records, no storefront or payment claims.
for token in ("ofoq_ecommerce_products_v1", "ofoq_ecommerce_orders_v1", "📦 المنتجات والمخزون", "🧾 الطلبات", "إضافة منتج", "إضافة طلب", "لا خصم تلقائي للمخزون"):
    require(token in ecommerce, "merchant catalogue/order workflow missing: " + token)
require("ofoq_ecommerce_products_v1" in operations and "ofoq_ecommerce_orders_v1" in operations, "merchant records are not connected to Operations Hub")
require("ofoq-ecom-import-file" in ecommerce and "استيراد نسخة الكتالوج والطلبات" in ecommerce, "merchant backup import and restore control missing")
require("commerceBackup" in (ROOT / "tests/browser-smoke.mjs").read_text(encoding="utf-8"), "browser suite must exercise merchant backup restore")
require("reserved+qty>productRow.stock" in ecommerce and "button(\"تعديل\"" in ecommerce, "merchant stock reservation and product editing checks missing")
require("لا يمكن إعادة تفعيل الطلب" in ecommerce and "archived!==true" in ecommerce and "button(\"أرشفة\"" in ecommerce, "merchant order reactivation and reversible archive guards missing")
require('x.status!=="cancelled"' in ecommerce and "بعد التسليم حدّث المخزون يدوياً" in ecommerce, "all non-cancelled orders, including delivered orders, must remain allocated until manual stock reconciliation")
require("commerceProducts" in operations and "commerceOrders" in operations, "merchant records missing from unified backup snapshot")
require("ls.commerceProducts.length<=500" in operations and "ls.commerceOrders.length<=1000" in operations, "cloud backup must validate merchant snapshot bounds and records")
require("منتجات المتجر" in operations and "طلبات المتجر" in operations, "merchant data indicators missing from linked dashboard")
require("commerceOrderValue" in operations and "قيمة الطلبات غير الملغاة" in operations, "merchant order value KPI missing")

# Cross-tool local data adapters and non-destructive recovery archive.
for token in (
    "bawabatsyria_stock_v1",
    "bawabatsyria_trade_ledger_v1",
    "bawabatsyria_trade_expenses_v1",
    "bawabatsyria_trade_settlements_v1",
    "bawabatsyria_trade_invoice_numbers_v1",
    "bawabatsyria_trade_parties_v1",
    "ofoq_career_applications_v1",
    "ofoq_ecommerce_scenarios_v1",
    "ofoq_ecommerce_products_v1",
    "ofoq_ecommerce_orders_v1",
    "sourceSnapshot",
    "renderLinked",
    "linkedSources",
    "ofoq_operations_recovery_archive_v1",
    "ofoq_operations_hub_recovery_v1",
    "تحديث البيانات الآن",
):
    require(token in operations, "cross-tool sync or recovery feature missing: " + token)
require('localStorage.setItem(ARCHIVE_KEY' in operations, "linked source archive must be stored separately")
require('localStorage.setItem(RECOVERY_KEY' in operations, "safe pre-write recovery point missing")
source_adapter = operations[operations.find("const readSource"):operations.find("const sourceTotals")]
require("fetch(" not in source_adapter and "XMLHttpRequest" not in source_adapter, "cross-tool data readers must stay local-only")

# Accounting and trade ledger monetary inputs are constrained to minor-unit precision.
# Backup imports must reject duplicate identifiers, orphan settlements and over-reconciliation.
for token in ("const uniqueIds=rows=>new Set(rows.map(x=>x.id)).size===rows.length", "const transactionMap=new Map(data.transactions.map(x=>[x.id,x]))", "توجد دفعة مرتبطة بعملية غير موجودة", "اتجاه إحدى الدفعات لا يطابق نوع العملية", "مجموع الدفعات لا يتطابق"):
    require(token in html, "trade backup reconciliation guard missing: " + token)
require('orphanSettlementBackup' in (ROOT / "tests/browser-smoke.mjs").read_text(encoding="utf-8"), "browser suite must reject orphan settlement backups")
require("const mergedTransactionMap=new Map(current.concat(incoming)" in html and "الدمج سيجعل مجموع الدفعات" in html, "merged backups must reconcile settlements against existing transactions")

# Treasury cash, asset, obligation and reconciliation amounts use the same minor-unit rule.
for token in ("const treasuryIsCent=v=>Number.isFinite(v)", "treasuryCents((Math.round(rows[i].paid*100)+Math.round(amount*100))/100)", "const difference=treasuryCents(actual-x.bookBalance)", "movementAmount.step='0.01'", "transferAmount.step='0.01'", "obligationPayAmount.step='0.01'", "الرصيد الفعلي الصحيح بمنزلتين عشريتين"):
    require(token in html, "treasury minor-unit precision contract missing: " + token)
require("const moneyOk=v=>Number.isFinite(v)&&treasuryIsCent(v)" in html, "treasury backup imports must reject sub-cent monetary values")
require("paidByObligation" in html and "مجموع دفعات الالتزام يتجاوز إجمالي المبلغ المدفوع" in html, "treasury backup imports must reject overpaid obligations")
require("treasuryCents(Number(account.opening||0)+moves.reduce" in html, "treasury reconciliation book balances must be rounded to cents")
require("overpaid-treasury-backup.json" in (ROOT / "tests/browser-smoke.mjs").read_text(encoding="utf-8"), "browser suite must reject overpaid treasury backups")

for token in ("unit.step='0.01'", "paid.step='0.01'", "expenseAmount.step='0.01'", "expensePaid.step='0.01'", "settlementAmount.step='0.01'", "Math.round(n*Math.round(p*100))/100", "Math.round(rawAmount*100)/100", "const nextPaid=Math.round("):
    require(token in html, "trade/accounting cent precision contract missing: " + token)
require('العملة تقبل منزلتين عشريتين فقط' in html, "trade ledger must reject sub-cent values")
require('منزلتين عشريتين كحد أقصى' in html, "settlements must reject sub-cent values")
require('سعر الوحدة").fill("1.239")' in (ROOT / "tests/browser-smoke.mjs").read_text(encoding="utf-8"), "browser suite must cover sub-cent trade rejection")

# Browser-level regression coverage runs after Pages deployment and blocks provider traffic.
require((ROOT / "tests/browser-smoke.mjs").is_file(), "Playwright browser smoke test missing")
require("playwright@1.65.0" in (ROOT / ".github/workflows/pages.yml").read_text(encoding="utf-8"), "pinned Playwright CI dependency missing")

# OFOQ personal space: local-only favorites, recent history, and filter integrity.
require((ROOT / "ofoq-core.js").is_file(), "OFOQ core script missing")
require('<script src="./ofoq-core.js" defer></script>' in html, "OFOQ core script is not loaded")
for token in ("ofoq_personal_space_v1", "getFavorites", "getRecent", "toggleFavorite", "recordVisit", "data-ofoq-view", "aria-pressed", "لا تحفظ أي بيانات شخصية"):
    if token == "لا تحفظ أي بيانات شخصية":
        continue
    require(token in core, "OFOQ personal space feature missing: " + token)
require("fetch(" not in core and "XMLHttpRequest" not in core, "OFOQ personal space must remain local-only")
require("./ofoq-core.js" in worker and cache_version, "OFOQ core missing from offline shell or cache version is invalid")

# Public/private boundary: assemble a dedicated public artifact without deleting the test workspace.
pages_workflow = (ROOT / ".github/workflows/pages.yml").read_text(encoding="utf-8")
for token in (
    "Assemble public-only Pages artifact without mutating test workspace",
    "mkdir -p dist",
    "--exclude='.github/'",
    "--exclude='docs/'",
    "--exclude='tests/'",
    "--exclude='scripts/'",
    "--exclude='supabase/'",
    "--exclude='backend/'",
    "test -f dist/index.html",
    "test -f dist/manifest.json",
    "test -f dist/service-worker.js",
    "test -f dist/ofoq-core.js",
    "test ! -e dist/docs",
    "test ! -e dist/tests",
    "test ! -e dist/scripts",
    "test ! -e dist/supabase",
    "test ! -e dist/backend",
    "test -f tests/browser-smoke.mjs",
    "test -f tests/mobile-smoke.mjs",
    "test -f scripts/validate_lighthouse.mjs",
    "path: dist",
):
    require(token in pages_workflow, "public Pages artifact boundary missing: " + token)

# Public documentation must not expose project-specific operational identifiers.
public_docs = (
    ROOT / "docs/ALOOSH_FUTURE_INTELLIGENCE_MASTER_STATE.md",
    ROOT / "docs/OFOQ_AUTH_COMMERCE_AUDIT.md",
    ROOT / "docs/OFOQ_FOOTBALL_QUOTA_AUDIT.md",
    ROOT / "docs/OFOQ_GLOBAL_EXCELLENCE_ROADMAP.md",
    ROOT / "docs/OFOQ_SECTION_STANDARD.md",
    ROOT / "docs/OFOQ_SCOPE_RECONCILIATION.md",
    ROOT / "GEMINI_ASSISTANT_SETUP.md",
    ROOT / "MONETIZATION_SETUP.md",
    ROOT / "PAYMENT_SETUP_SYRIA.md",
)
for public_doc in public_docs:
    if public_doc.is_file():
        public_text = public_doc.read_text(encoding="utf-8")
        for forbidden in (
            "elzquyehghuxhswogsch", "SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY", "GEMINI_API_KEY",
            "football_api_budget_reserve", "football_rate_limit_hit", "reserve_ai_provider_request",
            "PAYMENTS_ENABLED", "payment_methods", "payment_orders", "trial_free_all_features",
            "football_api_cache", "membership-api", "site-assistant", "football-data",
        ):
            require(forbidden not in public_text, "public documentation contains internal operational detail: " + public_doc.name + " / " + forbidden)

# Personal workspace continuity in local/cloud operations backups.
for token in (
    "const PERSONAL_SPACE_KEY=\"ofoq_personal_space_v1\"",
    "const personalSpaceSnapshot=()=>",
    "const validPersonalSpaceSnapshot=p=>",
    "const applyPersonalSpaceSnapshot=p=>",
    "personalSpace:personalSpaceSnapshot()",
    "payload.personalSpace",
    "raw.personalSpace",
    "applyPersonalSpaceSnapshot(payload.personalSpace)",
    "applyPersonalSpaceSnapshot(raw.personalSpace)",
):
    require(token in operations, "personal workspace backup/restore contract missing: " + token)

# Cloud merchant tables and ownership/inventory invariants.
commerce_sql = (ROOT / "supabase/migrations/20261113134758_ofoq_store_cloud_catalog_and_orders.sql").read_text(encoding="utf-8")
archive_sql = (ROOT / "supabase/migrations/20261113134838_ofoq_store_product_archiving.sql").read_text(encoding="utf-8")
archive_guard_sql = (ROOT / "supabase/migrations/20261113134941_ofoq_store_archived_product_order_guard.sql").read_text(encoding="utf-8")
for token in ("enable row level security", "to authenticated", "auth.uid()", "grant select, insert, update, delete", "ofoq_store_orders_integrity", "Insufficient available stock", "on delete restrict", "revoke all on function"):
    require(token in commerce_sql, "commerce database security contract missing: " + token)
require("add column archived boolean not null default false" in archive_sql, "commerce product archiving migration missing")
require("Archived products cannot receive new orders" in archive_guard_sql and "A product with active orders cannot be archived" in archive_guard_sql, "archived product order guard missing")

# PWA and shell integrity.
require((ROOT / "manifest.json").is_file(), "manifest missing")
require((ROOT / "service-worker.js").is_file(), "service worker missing")
require(bool(re.search(r'const CACHE_NAME = CACHE_PREFIX \+ "v\d+"', worker)), "service worker cache version missing")
require(bool(manifest.get("name")) and bool(manifest.get("start_url")), "manifest metadata incomplete")

print(
    f"PASS: {len(section_ids)} unique sections; {len(priority_ids)} priority entries; "
    f"{len(front_values)} AI profiles; global Gemini 30/day guard; keyboard navigation; PWA shell."
)
