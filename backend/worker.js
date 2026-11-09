const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const PLANS = {
  pro_monthly: { name: "احترافية", priceEnv: "STRIPE_PRICE_PRO_MONTHLY", entitlements: ["pro_access"] },
  vip_monthly: { name: "VIP", priceEnv: "STRIPE_PRICE_VIP_MONTHLY", entitlements: ["pro_access", "vip_access"] },
  business_monthly: { name: "أعمال", priceEnv: "STRIPE_PRICE_BUSINESS_MONTHLY", entitlements: ["pro_access", "vip_access", "business_access"] }
};
let jwksCache = null;
let jwksExpiresAt = 0;
function json(data, status = 200, extra = {}) { return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extra } }); }
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin"), allowed = env.ALLOWED_ORIGIN || "";
  if (!origin || !allowed || origin !== allowed) return {};
  return { "access-control-allow-origin": origin, "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "Authorization,Content-Type", "access-control-max-age": "86400", "vary": "Origin" };
}
function base64urlBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
function decodePart(value) { return JSON.parse(new TextDecoder().decode(base64urlBytes(value))); }
async function getJwks(env) {
  if (jwksCache && Date.now() < jwksExpiresAt) return jwksCache;
  if (!env.AUTH_JWKS_URL) throw new Error("AUTH_JWKS_URL is not configured");
  const response = await fetch(env.AUTH_JWKS_URL, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("Unable to load authentication signing keys");
  jwksCache = await response.json(); jwksExpiresAt = Date.now() + 5 * 60 * 1000; return jwksCache;
}
async function authenticate(request, env) {
  const header = request.headers.get("Authorization") || "", token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const parts = token.split("."); if (parts.length !== 3) return null;
    const head = decodePart(parts[0]), claims = decodePart(parts[1]);
    if (!["RS256", "ES256"].includes(head.alg) || !head.kid) return null;
    if (!Number.isFinite(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    if (claims.nbf && claims.nbf > Math.floor(Date.now() / 1000) + 30) return null;
    if (env.AUTH_ISSUER && claims.iss !== env.AUTH_ISSUER) return null;
    const audience = env.AUTH_AUDIENCE || "authenticated";
    if (claims.aud !== audience && !(Array.isArray(claims.aud) && claims.aud.includes(audience))) return null;
    if (!claims.sub || typeof claims.sub !== "string") return null;
    const jwks = await getJwks(env), jwk = (jwks.keys || []).find(key => key.kid === head.kid && key.use !== "enc");
    if (!jwk) return null;
    const algorithm = head.alg === "RS256" ? { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } : { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" };
    const key = await crypto.subtle.importKey("jwk", jwk, algorithm, false, ["verify"]);
    const signature = base64urlBytes(parts[2]), data = new TextEncoder().encode(parts[0] + "." + parts[1]);
    const valid = await crypto.subtle.verify(head.alg === "RS256" ? "RSASSA-PKCS1-v1_5" : { name: "ECDSA", hash: "SHA-256" }, key, signature, data);
    return valid ? { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null } : null;
  } catch (_) { return null; }
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0; for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
async function verifyStripeSignature(rawBody, header, secret) {
  if (!secret || !header) return false;
  const fields = Object.fromEntries(header.split(",").map(part => part.split("=", 2))), timestamp = Number(fields.t);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300 || !fields.v1) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = new TextEncoder().encode(fields.t + "." + rawBody), digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, signed));
  const expected = [...digest].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return fields.v1.split(";").some(signature => safeEqual(signature, expected));
}
async function stripeRequest(env, params) {
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { authorization: "Bearer " + env.STRIPE_SECRET_KEY, "content-type": "application/x-www-form-urlencoded" }, body: params.toString() });
  const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || "Stripe checkout request failed"); return data;
}
async function handleWebhook(request, env) {
  const raw = await request.text();
  if (!await verifyStripeSignature(raw, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET)) return json({ error: "Invalid webhook signature" }, 400);
  const event = JSON.parse(raw), object = event.data?.object || {};
  if (event.type === "checkout.session.completed" && object.mode === "subscription") {
    const userId = object.metadata?.user_id, planId = object.metadata?.plan_id;
    if (userId && PLANS[planId] && object.subscription) {
      await env.DB.prepare("INSERT OR IGNORE INTO checkout_sessions (stripe_session_id,user_id,plan_id,created_at) VALUES (?,?,?,?)").bind(object.id, userId, planId, Math.floor(Date.now() / 1000)).run();
      await env.DB.prepare("INSERT INTO subscriptions (stripe_subscription_id,user_id,plan_id,status,stripe_customer_id,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(stripe_subscription_id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at").bind(object.subscription, userId, planId, "active", object.customer || null, Math.floor(Date.now() / 1000)).run();
      for (const entitlement of PLANS[planId].entitlements) {
        await env.DB.prepare("INSERT INTO entitlements (user_id,entitlement_key,active,source,updated_at) VALUES (?,?,1,?,?) ON CONFLICT(user_id,entitlement_key) DO UPDATE SET active=1,source=excluded.source,updated_at=excluded.updated_at").bind(userId, entitlement, object.subscription, Math.floor(Date.now() / 1000)).run();
      }
    }
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const userId = object.metadata?.user_id, planId = object.metadata?.plan_id;
    if (userId && PLANS[planId]) {
      const active = event.type !== "customer.subscription.deleted" && ["active", "trialing"].includes(object.status);
      await env.DB.prepare("UPDATE subscriptions SET status=?,current_period_end=?,updated_at=? WHERE stripe_subscription_id=?").bind(object.status || "canceled", object.current_period_end || null, Math.floor(Date.now() / 1000), object.id).run();
      for (const entitlement of PLANS[planId].entitlements) {
        await env.DB.prepare("INSERT INTO entitlements (user_id,entitlement_key,active,source,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id,entitlement_key) DO UPDATE SET active=excluded.active,source=excluded.source,updated_at=excluded.updated_at").bind(userId, entitlement, active ? 1 : 0, object.id, Math.floor(Date.now() / 1000)).run();
      }
    }
  }
  return json({ received: true });
}
async function route(request, env) {
  const url = new URL(request.url), path = url.pathname.replace(/\/+$/, "") || "/";
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (path === "/api/health" && request.method === "GET") return json({ ok: true, service: "bawabatsyria-membership", version: 1 });
  if (path === "/api/plans" && request.method === "GET") return json({ plans: Object.entries(PLANS).map(([id, plan]) => ({ id, name: plan.name, checkoutEnabled: Boolean(env[plan.priceEnv] && env.STRIPE_SECRET_KEY) })) });
  if (path === "/api/stripe/webhook" && request.method === "POST") return handleWebhook(request, env);
  const user = await authenticate(request, env);
  if (!user) return json({ error: "Authentication required" }, 401);
  if (path === "/api/me" && request.method === "GET") {
    const [entitlements, points, subscriptions] = await Promise.all([
      env.DB.prepare("SELECT entitlement_key,active,source,updated_at FROM entitlements WHERE user_id=?").bind(user.id).all(),
      env.DB.prepare("SELECT COALESCE(SUM(delta),0) AS balance FROM points_ledger WHERE user_id=?").bind(user.id).first(),
      env.DB.prepare("SELECT plan_id,status,current_period_end FROM subscriptions WHERE user_id=? ORDER BY updated_at DESC").bind(user.id).all()
    ]);
    return json({ user: { id: user.id, email: user.email }, points: points?.balance || 0, entitlements: entitlements.results || [], subscriptions: subscriptions.results || [] });
  }
  if (path === "/api/points" && request.method === "GET") {
    const result = await env.DB.prepare("SELECT delta,reason,created_at FROM points_ledger WHERE user_id=? ORDER BY created_at DESC LIMIT 100").bind(user.id).all();
    const balance = await env.DB.prepare("SELECT COALESCE(SUM(delta),0) AS balance FROM points_ledger WHERE user_id=?").bind(user.id).first();
    return json({ balance: balance?.balance || 0, entries: result.results || [] });
  }
  if (path === "/api/checkout" && request.method === "POST") {
    if (!env.STRIPE_SECRET_KEY || !env.PUBLIC_SITE_URL) return json({ error: "Payment provider is not configured yet" }, 503);
    const body = await request.json().catch(() => null), plan = body && PLANS[body.planId];
    if (!plan || !env[plan.priceEnv]) return json({ error: "Selected plan is unavailable" }, 400);
    const params = new URLSearchParams();
    params.set("mode", "subscription"); params.set("line_items[0][price]", env[plan.priceEnv]); params.set("line_items[0][quantity]", "1");
    params.set("success_url", env.PUBLIC_SITE_URL + "?membership=success"); params.set("cancel_url", env.PUBLIC_SITE_URL + "?membership=cancelled");
    params.set("client_reference_id", user.id); params.set("metadata[user_id]", user.id); params.set("metadata[plan_id]", body.planId);
    params.set("subscription_data[metadata][user_id]", user.id); params.set("subscription_data[metadata][plan_id]", body.planId);
    if (user.email) params.set("customer_email", user.email);
    const session = await stripeRequest(env, params); return json({ checkoutUrl: session.url });
  }
  return json({ error: "Not found" }, 404);
}
export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      const response = await route(request, env), headers = new Headers(response.headers);
      Object.entries(cors).forEach(([key, value]) => headers.set(key, value));
      return new Response(response.body, { status: response.status, headers });
    } catch (_) { return json({ error: "Internal service error" }, 500, cors); }
  }
};