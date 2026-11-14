import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const [assistant, football, membership] = await Promise.all([
  read("supabase/functions/site-assistant/index.ts"),
  read("supabase/functions/football-data/index.ts"),
  read("supabase/functions/membership-api/index.ts"),
]);

// Nibras / AI assistant: bounded, normalized input and fail-closed provider budget.
assert.match(assistant, /request\.method !== "POST"/);
assert.match(assistant, /origin !== ALLOWED_ORIGIN/);
assert.match(assistant, /readBoundedBody\(request, 24_000\)/);
assert.match(assistant, /body\.messages\.length > 12/);
assert.match(assistant, /item\.content\.trim\(\)\.slice\(0, 2000\)/);
assert.match(assistant, /contents\[contents\.length - 1\]\.role !== "user"/);
assert.match(assistant, /reserve_ai_provider_request/);
assert.match(assistant, /p_daily_limit: 30/);
assert.match(assistant, /if \(!budgetResponse\.ok\)[\s\S]{0,220}return reply\([\s\S]{0,180}503\)/);
assert.match(assistant, /budgetAllowed !== true/);
assert.match(assistant, /console\.info\("Nibras context received", \{ messageCount:/);
assert.doesNotMatch(assistant, /console\.log\(.*contents/);

// Known limitation, intentionally asserted as a review marker rather than
// misrepresented as a trusted client identity: x-forwarded-for is used for
// best-effort throttling and must be overwritten/validated by the edge gateway.
assert.match(assistant, /Best-effort per-runtime throttling/);
assert.match(assistant, /request\.headers\.get\("x-forwarded-for"\)/);

// Football API: request throttles must fail closed if persistent rate checks fail.
assert.match(football, /request\.method !== "GET"/);
assert.match(football, /persistentRateAllowed\(await hashClientKey\(ip\), 60\)/);
assert.match(football, /persistentRate === null[\s\S]{0,180}503/);
assert.match(football, /persistentRate\) return reply[\s\S]{0,100}429/);
assert.match(football, /const catalog: Record<string, \{ path: string; keys: string\[\]; ttl: number \}>/);
assert.match(football, /const config = catalog\[dataset\]/);
assert.match(football, /if \(!config\) return reply\(\{ error: "قسم البيانات غير معروف\." \}, 400\)/);
assert.match(football, /providerBlocked: true/);
assert.match(football, /FOOTBALL_BUDGET_GUARD_UNAVAILABLE/);
assert.match(football, /usageTracked: true/);

// Membership and payment paths: disabled by default and webhook signature checked.
assert.match(membership, /PAYMENTS_ENABLED = Deno\.env\.get\("PAYMENTS_ENABLED"\) === "true"/);
assert.match(membership, /verifyStripeSignature\(payload,/);
assert.match(membership, /validateStripeEventEnvelope\(event\)/);
assert.match(membership, /if \(!PAYMENTS_ENABLED\)/);
assert.match(membership, /billingGateOpen\(\)/);
assert.match(membership, /readBoundedText\(request, 262_144\)/);

console.log("OFOQ Edge Function security contracts passed.");
