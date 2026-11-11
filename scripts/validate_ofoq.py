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
require("النسخ السحابية الاختيارية في أُفُق" in html, "privacy center cloud backup disclosure missing")
for token in ("user_workspace_backups", "cloudRequest", "/token?grant_type=password", "/signup", "sessionStorage", "createCloudBackup", "validCloudBackup", "refresh_token"):
    require(token in operations, "opt-in cloud backup contract missing: " + token)
require("fetch(" in operations and "XMLHttpRequest" not in operations, "cloud backup must use bounded fetch requests only")
require("SUPABASE_SERVICE_ROLE_KEY" not in operations and "service_role" not in operations, "server credentials must never appear in the browser")
require("site-assistant" not in operations and "functions/v1/football-data" not in operations, "operations hub must not consume AI or football provider quotas")
backup_migration = ROOT / "supabase/migrations/20261111160644_user_workspace_backup_vault.sql"
require(backup_migration.is_file(), "cloud backup RLS migration missing")
backup_sql = backup_migration.read_text(encoding="utf-8")
for token in ("enable row level security", "Users read own workspace backups", "Users create own workspace backups", "Users delete own workspace backups", "revoke all on public.user_workspace_backups from anon"):
    require(token in backup_sql, "cloud backup database security contract missing: " + token)
require("./operations-hub.js" in worker and "ofoq-shell-v30" in worker, "operations hub missing from offline shell or cache not refreshed")

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

# PWA and shell integrity.
require((ROOT / "manifest.json").is_file(), "manifest missing")
require((ROOT / "service-worker.js").is_file(), "service worker missing")
require("ofoq-shell-v" in worker, "service worker cache version missing")
require(bool(manifest.get("name")) and bool(manifest.get("start_url")), "manifest metadata incomplete")

print(
    f"PASS: {len(section_ids)} unique sections; {len(priority_ids)} priority entries; "
    f"{len(front_values)} AI profiles; global Gemini 30/day guard; keyboard navigation; PWA shell."
)
