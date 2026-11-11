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
for token in ("ofoq-ecom-studio", "calculatePrice", "ROAS", "ofoq_ecommerce_scenarios_v1", "ofoq_ecommerce_launch_checklist_v1", "role", "tablist"):
    require(token in ecommerce, "e-commerce studio feature missing: " + token)
require("fetch(" not in ecommerce and "XMLHttpRequest" not in ecommerce and "site-assistant" not in ecommerce, "e-commerce studio must remain local-first and API-free")
require("./ecommerce-studio.js" in worker, "e-commerce studio missing from offline app shell")

# Career and freelance studios are isolated, local-first workspaces with tested contracts.
require("career-studio.js" in html, "career studio script not loaded by the portal")
for token in ("jobs", "freelance_vip", "ofoq-studio", "ofoq_career_applications_v1", "STAR", "portfolio", "proposal"):
    require(token in career, "career studio feature missing: " + token)
require("fetch(" not in career and "XMLHttpRequest" not in career and "site-assistant" not in career, "career studio must remain local-first and API-free")
require("./career-studio.js" in worker, "career studio missing from offline app shell")

# PWA and shell integrity.
require((ROOT / "manifest.json").is_file(), "manifest missing")
require((ROOT / "service-worker.js").is_file(), "service worker missing")
require("ofoq-shell-v" in worker, "service worker cache version missing")
require(bool(manifest.get("name")) and bool(manifest.get("start_url")), "manifest metadata incomplete")

print(
    f"PASS: {len(section_ids)} unique sections; {len(priority_ids)} priority entries; "
    f"{len(front_values)} AI profiles; global Gemini 30/day guard; keyboard navigation; PWA shell."
)
