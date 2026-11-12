#!/usr/bin/env python3
"""Fast, dependency-free contract checks for the OFOQ portal and AI budget."""
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text(encoding="utf-8")
assistant = (ROOT / "supabase/functions/site-assistant/index.ts").read_text(encoding="utf-8")
worker = (ROOT / "service-worker.js").read_text(encoding="utf-8")
core = (ROOT / "ofoq-core.js").read_text(encoding="utf-8")
ecommerce = (ROOT / "ecommerce-studio.js").read_text(encoding="utf-8")
career = (ROOT / "career-studio.js").read_text(encoding="utf-8")
operations = (ROOT / "operations-hub.js").read_text(encoding="utf-8")
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

# PWA and shell integrity.
require((ROOT / "manifest.json").is_file(), "manifest missing")
require((ROOT / "service-worker.js").is_file(), "service worker missing")
require(bool(re.search(r'const CACHE_NAME = CACHE_PREFIX \+ "v\d+"', worker)), "service worker cache version missing")
require(bool(manifest.get("name")) and bool(manifest.get("start_url")), "manifest metadata incomplete")

print(
    f"PASS: {len(section_ids)} unique sections; {len(priority_ids)} priority entries; "
    f"{len(front_values)} AI profiles; global Gemini 30/day guard; keyboard navigation; PWA shell."
)
