import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { isSupportedStripeEventType, validateStripeEventEnvelope, verifyStripeSignature } from "../supabase/functions/membership-api/stripe-webhook-security.mjs";

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

for (const supported of [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "invoice.payment_failed",
  "invoice.paid",
  "charge.refunded",
]) assert.equal(isSupportedStripeEventType(supported), true);
for (const ignored of [
  "customer.subscription.unknown",
  "invoice.created",
  "checkout.session.async_payment_failed",
  "",
  null,
]) assert.equal(isSupportedStripeEventType(ignored), false);

console.log("Stripe webhook signature and event-envelope runtime tests passed.");
