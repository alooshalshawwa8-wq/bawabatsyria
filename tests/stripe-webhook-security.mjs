import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { validateStripeEventEnvelope, verifyStripeSignature } from "../supabase/functions/membership-api/stripe-webhook-security.mjs";

const now = 1_800_000_000;
const secret = "whsec_test_secret_only";
const payload = JSON.stringify({
  id: "evt_123abc",
  type: "customer.subscription.updated",
  created: now,
  data: { object: { id: "sub_123" } },
});
const signature = createHmac("sha256", secret).update(`${now}.${payload}`).digest("hex");
const header = `t=${now},v1=${signature}`;

assert.equal(await verifyStripeSignature(payload, header, secret, now), true);
assert.equal(await verifyStripeSignature(payload + " ", header, secret, now), false);
assert.equal(await verifyStripeSignature(payload, header, "wrong_secret", now), false);
assert.equal(await verifyStripeSignature(payload, header, secret, now + 301), false);
assert.equal(await verifyStripeSignature(payload, `t=${now},v1=not-a-signature`, secret, now), false);
assert.equal(await verifyStripeSignature(payload, `t=${now}e0,v1=${signature}`, secret, now), false);
assert.equal(await verifyStripeSignature(payload, `t=${now},t=${now},v1=${signature}`, secret, now), false);

const valid = JSON.parse(payload);
assert.deepEqual(validateStripeEventEnvelope(valid), {
  eventId: "evt_123abc",
  eventType: "customer.subscription.updated",
  created: now,
  data: { id: "sub_123" },
});
for (const invalid of [
  null,
  [],
  { ...valid, id: "event_123" },
  { ...valid, type: "Customer.Subscription.Updated" },
  { ...valid, created: String(now) },
  { ...valid, created: 0 },
  { ...valid, data: [] },
  { ...valid, data: { object: [] } },
  { ...valid, data: { object: null } },
]) assert.equal(validateStripeEventEnvelope(invalid), null);

console.log("Stripe webhook signature and event-envelope runtime tests passed.");
