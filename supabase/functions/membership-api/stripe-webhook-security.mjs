const EVENT_ID_PATTERN = /^evt_[A-Za-z0-9]+$/;
const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9_.]{2,120}$/;
const SIGNATURE_PATTERN = /^[a-f0-9]{64}$/i;

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export function validateStripeEventEnvelope(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) return null;
  const eventId = typeof event.id === "string" ? event.id : "";
  const eventType = typeof event.type === "string" ? event.type : "";
  const created = event.created;
  const data = event.data;
  if (!EVENT_ID_PATTERN.test(eventId) ||
      !EVENT_TYPE_PATTERN.test(eventType) ||
      !Number.isSafeInteger(created) || created <= 0 ||
      !data || typeof data !== "object" || Array.isArray(data) ||
      !data.object || typeof data.object !== "object" || Array.isArray(data.object)) {
    return null;
  }
  return { eventId, eventType, created, data: data.object };
}

export async function verifyStripeSignature(payload, header, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!secret || typeof payload !== "string" || typeof header !== "string") return false;
  const fields = header.split(",").map(part => part.trim().split("="));
  const timestampValues = fields.filter(([key]) => key === "t").map(([, value]) => value ?? "");
  const timestampText = timestampValues[0] ?? "";
  if (!/^\\d{1,12}$/.test(timestampText) || timestampValues.length !== 1) return false;
  const timestamp = Number(timestampText);
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0 || Math.abs(nowSeconds - timestamp) > 300) return false;
  const signatures = fields.filter(([key]) => key === "v1").map(([, value]) => value ?? "").filter(value => SIGNATURE_PATTERN.test(value));
  if (!signatures.length) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(timestamp + "." + payload));
  const expected = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  return signatures.some(signature => safeEqual(signature.toLowerCase(), expected));
}
