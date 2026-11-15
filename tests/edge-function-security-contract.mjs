import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const [assistant, football, membership, index, aiRegistry, geminiAdapter, aiTaskRouter] = await Promise.all([
  read("supabase/functions/site-assistant/index.ts"),
  read("supabase/functions/football-data/index.ts"),
  read("supabase/functions/membership-api/index.ts"),
  read("index.html"),
  read("supabase/functions/site-assistant/ai-provider-registry.ts"),
  read("supabase/functions/site-assistant/gemini-adapter.ts"),
  read("supabase/functions/site-assistant/ai-task-router.ts"),
]);

// AI provider registry: fixed server-side allowlist, no client-selected URLs/models or paid fallback.
assert.match(assistant, /import \{ resolveAiProvider \} from "\.\/ai-provider-registry\.ts"/);
assert.match(assistant, /resolveAiProvider\("gemini", Deno\.env\.get\("GEMINI_API_KEY"\)/);
assert.match(assistant, /generateWithGemini\(/);
assert.match(assistant, /resolveAiRoute\(/);
assert.match(assistant, /from "\.\/ai-task-router\.ts"/);
assert.match(assistant, /taskBySection/);
assert.match(aiTaskRouter, /SUPPORTED_TASKS/);
assert.match(aiTaskRouter, /resolveAiProvider\("gemini", apiKey\)/);
assert.doesNotMatch(aiTaskRouter, /body\.provider|body\.model|body\.endpoint|openrouter|groq|cloudflare/);
assert.match(assistant, /from "\.\/gemini-adapter\.ts"/);
assert.doesNotMatch(assistant, /fetch\(provider\.endpoint/);
assert.match(geminiAdapter, /x-goog-api-key/);
assert.match(geminiAdapter, /AbortSignal\.timeout\(25_000\)/);
assert.match(geminiAdapter, /response\.status === 429/);
assert.doesNotMatch(geminiAdapter, /console\.(log|error).*data|JSON\.stringify\(data\.error/);
assert.match(geminiAdapter, /"x-goog-api-key": provider\.apiKey/);
assert.match(aiRegistry, /export type AiProviderId = "gemini"/);
assert.match(aiRegistry, /providerId !== "gemini"/);
assert.match(aiRegistry, /https:\/\/generativelanguage\.googleapis\.com/);
assert.match(aiRegistry, /pricingStatus: "free-tier-unverified"/);
assert.doesNotMatch(aiRegistry, /process\.env|localStorage|window\./);
assert.doesNotMatch(assistant, /body\.provider|body\.model|body\.endpoint/);
assert.doesNotMatch(assistant, /apiKey\s*:\s*body\./);

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

// Nibras rate limits must use the Cloudflare client IP, HMAC it, and
// reserve a persistent database slot; caller-controlled X-Forwarded-For is forbidden.
assert.match(assistant, /request\.headers\.get\("cf-connecting-ip"\)/);
assert.doesNotMatch(assistant, /request\.headers\.get\(["']x-forwarded-for/i);
assert.match(assistant, /hashClientIp\(clientIp, serviceKey\)/);
assert.match(assistant, /reserve_site_assistant_rate_limit/);
assert.match(assistant, /rateAllowed !== true/);
assert.ok(assistant.indexOf("reserve_site_assistant_rate_limit") < assistant.indexOf("const ownerAuth = await authenticatedOfoqOwner(request)"), "Nibras must rate-limit before Auth lookup");
assert.match(assistant, /Deno\.env\.get\("OFOQ_ALLOWED_ORIGIN"\)/);
assert.match(assistant, /async function authenticatedOfoqOwner/);
assert.match(assistant, /request\.headers\.get\("authorization"\)/);
assert.match(assistant, /metadata\.role === "OWNER" && metadata\.owner === true && metadata\.owner_access === "lifetime"/);
assert.match(assistant, /Owner access required/);
assert.match(assistant, /Access-Control-Allow-Headers": "content-type, apikey, authorization"/);
assert.match(index, /refreshMembershipSession\(\)/);
assert.match(index, /Authorization':'Bearer '\+token/);
assert.match(index, /functions\/v1\/site-assistant/);
assert.match(index, /fetch\("https:\/\/elzquyehghuxhswogsch\.supabase\.co\/functions\/v1\/site-assistant",\{method:"POST",headers:\{"Content-Type":"application\/json","apikey":window\.BAWABA_SUPABASE_ANON_KEY,"Authorization":"Bearer "\+token/);
assert.doesNotMatch(index, /functions\/v1\/site-assistant",\{method:"POST",headers:\{"Content-Type":"application\/json"\}/);


// Football API: request throttles must fail closed if persistent rate checks fail.
assert.match(football, /request\.method !== "GET"/);
assert.match(football, /Deno\.env\.get\("OFOQ_ALLOWED_ORIGIN"\)/);
assert.match(football, /const ownerUser = await authenticatedFootballUser\(request\)/);
assert.match(football, /ownerMetadata\.role !== "OWNER"/);
assert.match(football, /ownerMetadata\.owner !== true/);
assert.match(football, /ownerMetadata\.owner_access !== "lifetime"/);
assert.ok(football.indexOf("const ownerUser = await authenticatedFootballUser(request)") < football.indexOf("const clientIp = request.headers.get"), "football API must authenticate owner before provider/IP processing");

assert.match(football, /request\.headers\.get\("cf-connecting-ip"\)/);
assert.doesNotMatch(football, /request\.headers\.get\(["']x-forwarded-for/i);
assert.match(football, /isValidClientIp\(clientIp\)/);
assert.match(football, /hashClientKey\(clientIp\)/);
assert.match(football, /name: "HMAC", hash: "SHA-256"/);
assert.match(football, /persistentRateAllowed\(clientBucket, 60\)/);
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
assert.match(membership, /Deno\.env\.get\("OFOQ_ALLOWED_ORIGIN"\)/);
assert.match(membership, /if \(origin !== ALLOWED_ORIGIN\) return new Response\(null, \{ status: 403 \}\)/, "membership OPTIONS must use the configured exact origin");
assert.match(membership, /origin !== ALLOWED_ORIGIN\) \{/, "membership requests must use the configured exact origin");
assert.doesNotMatch(membership, /origin !== "https:\/\/alooshalshawwa8-wq\.github\.io"/, "membership must not retain hard-coded old-origin guards");
assert.match(membership, /if \(!user\.owner\) return reply\(\{ error: "Platform owner access required" \}, 403\)/);

console.log("OFOQ Edge Function security contracts passed.");
