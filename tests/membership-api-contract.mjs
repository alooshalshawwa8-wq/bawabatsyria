import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../supabase/functions/membership-api/index.ts", import.meta.url), "utf8");

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

console.log("Membership billing portal security contract checks passed.");
