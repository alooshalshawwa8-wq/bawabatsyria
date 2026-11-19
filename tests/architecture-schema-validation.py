#!/usr/bin/env python3
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker, ValidationError

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_DIR = ROOT / "schemas"
FILES = ["task", "approval", "execution-event", "provider-usage"]

def load_schema(name):
    data = json.loads((SCHEMA_DIR / f"{name}.schema.json").read_text())
    Draft202012Validator.check_schema(data)
    return data

for name in FILES:
    schema = load_schema(name)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    assert schema.get("$schema") == "https://json-schema.org/draft/2020-12/schema", name
    assert schema.get("additionalProperties") is False, name

# Positive and negative task-contract checks
task_schema = load_schema("task")
task = {"schema_version":"1.0.0","task_id":"task-001","created_at":"2026-11-19T09:00:00Z",
         "task_type":"schema-test","status":"queued","permission_level":"R0","requested_actions":["read"]}
Draft202012Validator(task_schema, format_checker=FormatChecker()).validate(task)
for bad in [{**task,"unexpected":"blocked"}, {**task,"permission_level":"R9"}, {**task,"requested_actions":"read"}]:
    try:
        Draft202012Validator(task_schema, format_checker=FormatChecker()).validate(bad)
        raise AssertionError("Invalid task unexpectedly passed")
    except ValidationError:
        pass

# Approval fingerprint must be a SHA-256 hex string; extra keys are rejected.
approval_schema = load_schema("approval")
approval = {"schema_version":"1.0.0","approval_id":"approval-1","task_id":"task-001",
 "operation_fingerprint":"a"*64,"approved_by":"owner","approved_at":"2026-11-19T09:00:00Z",
 "expires_at":"2026-11-19T10:00:00Z","permission_level":"R1","status":"approved"}
Draft202012Validator(approval_schema, format_checker=FormatChecker()).validate(approval)
for bad in [{**approval,"operation_fingerprint":"short"}, {**approval,"unexpected":True}]:
    try:
        Draft202012Validator(approval_schema, format_checker=FormatChecker()).validate(bad)
        raise AssertionError("Invalid approval unexpectedly passed")
    except ValidationError:
        pass

# Event and provider-usage contracts reject unknown fields and invalid enum values.
event_schema = load_schema("execution-event")
event = {"schema_version":"1.0.0","event_id":"event-1","task_id":"task-001",
 "event_type":"task_created","occurred_at":"2026-11-19T09:00:00Z","permission_level":"R0",
 "outcome":"success","redaction_applied":True}
Draft202012Validator(event_schema, format_checker=FormatChecker()).validate(event)
usage_schema = load_schema("provider-usage")
usage = {"schema_version":"1.0.0","usage_id":"usage-1","provider_id":"gemini","model_id":"model-x",
 "recorded_at":"2026-11-19T09:00:00Z","request_count":1,"quota_state":"verified_free",
 "cost_usd":0,"decision":"allow"}
Draft202012Validator(usage_schema, format_checker=FormatChecker()).validate(usage)
for bad in [{**usage,"decision":"auto_paid_fallback"}, {**usage,"cost_usd":-1}]:
    try:
        Draft202012Validator(usage_schema, format_checker=FormatChecker()).validate(bad)
        raise AssertionError("Invalid provider usage unexpectedly passed")
    except ValidationError:
        pass

print("PASS: 4 JSON Schemas and positive/negative contract checks")
