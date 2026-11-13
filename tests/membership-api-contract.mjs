import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../supabase/functions/membership-api/index.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.match(source, /request\.method === "POST" && path === "\/api\/billing-portal"/);
assert.match(source, /if \(!PAYMENTS_ENABLED\).*إدارة الاشتراكات المدفوعة غير متاحة حالياً/s);
assert.match(source, /if \(!await billingGateOpen\(\)\).*إدارة الفوترة غير متاحة قبل اعتماد وضع الإطلاق التجاري/s);
assert.match(source, /user_id=eq\." \+\s*encodeURIComponent\(user\.id\)/);
assert.match(source, /provider=eq\.stripe&status=in\.\(active,trialing,past_due,canceled\)/);
assert.match(source, /\^cus_\[A-Za-z0-9\]\+\$/);
assert.match(source, /form\.set\("customer", String\(current\.provider_customer_id\)\)/);
assert.match(source, /form\.set\("return_url", siteUrl \+ "\/\?membership=managed"\)/);
assert.match(source, /session\.url\.startsWith\("https:\/\/billing\.stripe\.com\/"\)/);
assert.doesNotMatch(source, /body\?\.customerId|body\.customerId/);
assert.match(source, /if \(!PAYMENTS_ENABLED\).*الاشتراكات والدفع مؤجلان حالياً/s);
assert.match(source, /if \(!await billingGateOpen\(\)\).*الدفع غير متاح قبل اعتماد وضع الإطلاق التجاري/s);

assert.match(source, /select=plan_id,provider,status,current_period_end,cancel_at_period_end/);
assert.match(page, /id="membershipBillingActions" hidden/);
assert.match(page, /id="membershipManageBilling"/);
assert.match(page, /x\.provider==='stripe'/);
assert.match(page, /Date\.parse\(x\.current_period_end\|\|''\)>Date\.now\(\)/);
assert.match(page, /membershipApi\+"\/api\/billing-portal"/);
assert.match(page, /body:"\{\}"/);
assert.match(page, /data\.portalUrl\.startsWith\("https:\/\/billing\.stripe\.com\/"\)/);

assert.match(source, /validateStripeEventEnvelope\(event\)/);
assert.match(source, /verifyStripeSignature\(payload,/);
assert.match(source, /Invalid Stripe event envelope/);
assert.match(await readFile(new URL("../supabase/functions/membership-api/stripe-webhook-security.mjs", import.meta.url), "utf8"), /Number\.isSafeInteger\(created\)/);
assert.match(await readFile(new URL("../supabase/functions/membership-api/stripe-webhook-security.mjs", import.meta.url), "utf8"), /!data\.object \|\| typeof data\.object !== "object" \|\| Array\.isArray\(data\.object\)/);

assert.doesNotMatch(page, /customerId\s*:/);

console.log("Membership billing portal security contract checks passed.");
