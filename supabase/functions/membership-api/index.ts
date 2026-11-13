import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateStripeEventEnvelope, verifyStripeSignature } from "./stripe-webhook-security.mjs";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const PUBLISHABLE_KEYS = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
const API_KEY = PUBLISHABLE_KEYS.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
// Payments intentionally remain disabled until the platform owner explicitly enables monetization.
const PAYMENTS_ENABLED = Deno.env.get("PAYMENTS_ENABLED") === "true";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://alooshalshawwa8-wq.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function pathOf(url: URL) {
  const marker = "/membership-api";
  const index = url.pathname.indexOf(marker);
  return index >= 0 ? (url.pathname.slice(index + marker.length) || "/") : "/";
}

async function readBoundedText(request: Request, maxBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("BODY_TOO_LARGE");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

async function supabaseFetch(path: string, token?: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", API_KEY);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", "Bearer " + token);
  else headers.delete("Authorization");
  return fetch(SUPABASE_URL + path, { ...init, headers });
}

async function authenticatedUser(request: Request) {
  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const response = await supabaseFetch("/auth/v1/user", token);
  if (!response.ok) return null;
  const user = await response.json();
  if (!user?.id) return null;
  const metadata = user.app_metadata ?? {};
  const isOwner = metadata.role === "OWNER" && metadata.owner === true && metadata.owner_access === "lifetime";
  return {
    id: user.id as string,
    email: typeof user.email === "string" ? user.email : null,
    role: isOwner ? "OWNER" : "USER",
    owner: isOwner,
    ownerAccess: isOwner ? "lifetime" : null,
  };
}

async function getAllRows(path: string, token?: string, pageSize = 1000) {
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; offset < 50000; offset += pageSize) {
    const response = await supabaseFetch(path, token, {
      headers: { Range: offset + "-" + (offset + pageSize - 1), "Range-Unit": "items" },
    });
    if (!response.ok) throw new Error("Supabase paged data request failed: " + response.status);
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error("Unexpected paged data response");
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
  throw new Error("Points ledger exceeds safe pagination limit");
}


const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://alooshalshawwa8-wq.github.io/bawabatsyria";

async function adminFetch(path: string, init: RequestInit = {}) {
  if (!SERVICE_ROLE_KEY) throw new Error("Supabase service role key is not configured");
  const headers = new Headers(init.headers);
  headers.set("apikey", SERVICE_ROLE_KEY);
  headers.set("Authorization", "Bearer " + SERVICE_ROLE_KEY);
  headers.set("Accept", "application/json");
  return fetch(SUPABASE_URL + path, { ...init, headers });
}

async function billingGateOpen(): Promise<boolean> {
  try {
    const response = await adminFetch("/rest/v1/platform_launch_config?select=launch_mode,billing_enabled,paid_features_enforced&singleton=eq.true&limit=1");
    if (!response.ok) return false;
    const rows = await response.json();
    const config = Array.isArray(rows) ? rows[0] : null;
    return config?.launch_mode === "production" &&
      config?.billing_enabled === true &&
      config?.paid_features_enforced === true;
  } catch {
    return false;
  }
}

async function stripeRequest(path: string, body?: URLSearchParams, idempotencyKey?: string) {
  if (!STRIPE_SECRET_KEY) throw new Error("Stripe secret key is not configured");
  const response = await fetch("https://api.stripe.com/v1/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Authorization": "Bearer " + STRIPE_SECRET_KEY,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: body?.toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Stripe API request failed: " + (data?.error?.message ?? response.status));
  return data;
}

function planEntitlements(planId: string) {
  if (planId === "pro_monthly") return ["pro_access"];
  if (planId === "vip_monthly") return ["pro_access", "vip_access"];
  if (planId === "business_monthly") return ["pro_access", "vip_access", "business_access", "all_features"];
  return [];
}

async function syncStripeSubscription(subscriptionId: string, fallbackUserId?: string, fallbackPlanId?: string) {
  const subscription = await stripeRequest("subscriptions/" + encodeURIComponent(subscriptionId));
  let userId = String(subscription.metadata?.user_id ?? fallbackUserId ?? "");
  let planId = String(subscription.metadata?.plan_id ?? fallbackPlanId ?? "");
  if (!userId || !planId) {
    const existingResponse = await adminFetch("/rest/v1/subscriptions?select=user_id,plan_id&provider_subscription_id=eq." + encodeURIComponent(subscriptionId) + "&limit=1");
    if (!existingResponse.ok) throw new Error("Unable to locate existing subscription");
    const existing = await existingResponse.json();
    userId ||= String(existing[0]?.user_id ?? "");
    planId ||= String(existing[0]?.plan_id ?? "");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) ||
      !["pro_monthly", "vip_monthly", "business_monthly"].includes(planId)) {
    throw new Error("Stripe subscription metadata is missing a valid user or plan");
  }
  const statusMap: Record<string, string> = {
    incomplete: "incomplete", trialing: "trialing", active: "active",
    past_due: "past_due", canceled: "canceled", unpaid: "unpaid",
    paused: "paused", incomplete_expired: "expired",
  };
  const status = statusMap[String(subscription.status)] ?? "expired";
  const periodEnd = Number(subscription.current_period_end ?? 0);
  const periodStart = Number(subscription.current_period_start ?? 0);
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null;
  const nowIso = new Date().toISOString();
  const row = {
    user_id: userId, plan_id: planId, provider: "stripe",
    provider_subscription_id: subscription.id, provider_customer_id: customerId,
    status,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end === true,
    updated_at: nowIso,
  };
  const saved = await adminFetch("/rest/v1/subscriptions?on_conflict=provider_subscription_id", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(row),
  });
  if (!saved.ok) throw new Error("Unable to save Stripe subscription");

  const adminUserResponse = await adminFetch("/auth/v1/admin/users/" + encodeURIComponent(userId));
  if (!adminUserResponse.ok) throw new Error("Unable to verify subscription account");
  const adminUser = await adminUserResponse.json();
  const appMeta = adminUser.app_metadata ?? {};
  if (appMeta.role === "OWNER" && appMeta.owner === true && appMeta.owner_access === "lifetime") return;

  const existingResponse = await adminFetch("/rest/v1/entitlements?select=entitlement_key,source&user_id=eq." + encodeURIComponent(userId));
  if (!existingResponse.ok) throw new Error("Unable to read account entitlements");
  const existing = await existingResponse.json();
  const protectedKeys = new Set(existing.filter((item: Record<string, unknown>) => item.source !== "stripe").map((item: Record<string, unknown>) => item.entitlement_key));
  const active = periodEnd * 1000 > Date.now() && ["active", "trialing", "past_due", "canceled"].includes(status);
  const entitlements = planEntitlements(planId).filter(key => !protectedKeys.has(key)).map(entitlement_key => ({
    user_id: userId, entitlement_key, active, source: "stripe",
    expires_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    updated_at: nowIso,
  }));
  const deactivated = await adminFetch("/rest/v1/entitlements?user_id=eq." + encodeURIComponent(userId) + "&source=eq.stripe", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Prefer": "return=minimal" },
    body: JSON.stringify({ active: false, updated_at: nowIso }),
  });
  if (!deactivated.ok) throw new Error("Unable to update existing subscription entitlements");
  if (entitlements.length) {
    const granted = await adminFetch("/rest/v1/entitlements?on_conflict=user_id,entitlement_key", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(entitlements),
    });
    if (!granted.ok) throw new Error("Unable to apply subscription entitlements");
  }
}

async function recordRevenueEvent(input: { eventId: string; userId?: string; eventType: string; amount: number; currency: string; occurredAt: number }) {
  if (!input.eventId || !Number.isSafeInteger(input.amount) || input.amount < 0) return;
  const currency = input.currency.toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return;
  const response = await adminFetch("/rest/v1/ofoq_revenue_events?on_conflict=provider_event_id", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Prefer": "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: input.userId || null, provider: "stripe", provider_event_id: input.eventId,
      event_type: input.eventType, amount_minor: input.amount, currency,
      occurred_at: new Date(input.occurredAt * 1000).toISOString(),
    }),
  });
  if (!response.ok) throw new Error("Unable to record verified Stripe revenue event");
}

async function resolveSubscriptionOwner(subscriptionId: string): Promise<string | undefined> {
  if (!subscriptionId) return undefined;
  const response = await adminFetch("/rest/v1/subscriptions?select=user_id&provider_subscription_id=eq." + encodeURIComponent(subscriptionId) + "&limit=1");
  if (!response.ok) throw new Error("Unable to resolve subscription owner");
  const rows = await response.json();
  return typeof rows?.[0]?.user_id === "string" ? rows[0].user_id : undefined;
}

async function processStripeWebhook(request: Request) {
  if (!STRIPE_WEBHOOK_SECRET || !STRIPE_SECRET_KEY || !SERVICE_ROLE_KEY) return reply({ error: "Stripe webhook configuration is incomplete; no event was accepted." }, 503);
  let payload: string;
  try {
    payload = await readBoundedText(request, 262_144);
  } catch {
    return reply({ error: "Stripe webhook payload is too large or invalid." }, 413);
  }
  if (!(await verifyStripeSignature(payload, request.headers.get("Stripe-Signature") ?? "", STRIPE_WEBHOOK_SECRET))) return reply({ error: "Invalid Stripe signature" }, 400);
  let event: Record<string, unknown>;
  try { event = JSON.parse(payload); } catch { return reply({ error: "Invalid webhook payload" }, 400); }
  const validatedEvent = validateStripeEventEnvelope(event);
  if (!validatedEvent) return reply({ error: "Invalid Stripe event envelope" }, 400);
  const eventId = validatedEvent.eventId;
  const eventType = validatedEvent.eventType;
  const created = validatedEvent.created;
  const data = validatedEvent.data as Record<string, unknown>;
  if (eventType === "checkout.session.completed" || eventType === "checkout.session.async_payment_succeeded") {
    if (data.mode === "subscription" && data.subscription) {
      const metadata = (data.metadata ?? {}) as Record<string, unknown>;
      await syncStripeSubscription(String(data.subscription), String(data.client_reference_id ?? metadata.user_id ?? ""), String(metadata.plan_id ?? ""));
    } else if (data.mode === "payment" && data.payment_status === "paid") {
      await recordRevenueEvent({
        eventId: eventId, userId: String(data.client_reference_id ?? ""),
        eventType: "payment_succeeded", amount: Number(data.amount_total ?? 0),
        currency: String(data.currency ?? "USD"), occurredAt: created,
      });
    }
  } else if (eventType.startsWith("customer.subscription.")) {
    const metadata = (data.metadata ?? {}) as Record<string, unknown>;
    const subscriptionId = String(data.id ?? "");
    await syncStripeSubscription(subscriptionId, String(metadata.user_id ?? ""), String(metadata.plan_id ?? ""));
    if (eventType === "customer.subscription.deleted") {
      const userId = String(metadata.user_id ?? "") || await resolveSubscriptionOwner(subscriptionId);
      const firstItem = ((data.items as Record<string, unknown> | undefined)?.data as Record<string, unknown>[] | undefined)?.[0];
      const price = firstItem?.price as Record<string, unknown> | undefined;
      await recordRevenueEvent({
        eventId: eventId, userId, eventType: "subscription_canceled",
        amount: 0, currency: String(price?.currency ?? "USD"),
        occurredAt: created,
      });
    }
  } else if (eventType === "invoice.payment_failed") {
    const parent = (data.parent ?? {}) as Record<string, unknown>;
    const details = (parent.subscription_details ?? {}) as Record<string, unknown>;
    const sub = data.subscription ?? details.subscription;
    const subscriptionId = typeof sub === "string" ? sub : String((sub as Record<string, unknown> | null)?.id ?? "");
    if (subscriptionId) await syncStripeSubscription(subscriptionId);
  } else if (eventType === "invoice.paid") {
    const parent = (data.parent ?? {}) as Record<string, unknown>;
    const details = (parent.subscription_details ?? {}) as Record<string, unknown>;
    const sub = data.subscription ?? details.subscription;
    const subscriptionId = typeof sub === "string" ? sub : String((sub as Record<string, unknown> | null)?.id ?? "");
    const metadata = (details.metadata ?? data.metadata ?? {}) as Record<string, unknown>;
    const userId = String(metadata.user_id ?? "") || await resolveSubscriptionOwner(subscriptionId);
    const billingReason = String(data.billing_reason ?? "");
    await recordRevenueEvent({
      eventId: eventId, userId, eventType: billingReason === "subscription_create" ? "subscription_started" : "subscription_renewed",
      amount: Number(data.amount_paid ?? 0), currency: String(data.currency ?? "USD"),
      occurredAt: created,
    });
  } else if (eventType === "charge.refunded") {
    const customerId = String(data.customer ?? "");
    let userId: string | undefined;
    if (customerId) {
      const ownerResponse = await adminFetch("/rest/v1/subscriptions?select=user_id&provider_customer_id=eq." + encodeURIComponent(customerId) + "&order=updated_at.desc&limit=1");
      if (!ownerResponse.ok) throw new Error("Unable to resolve refunded customer");
      const owners = await ownerResponse.json();
      userId = typeof owners?.[0]?.user_id === "string" ? owners[0].user_id : undefined;
    }
    await recordRevenueEvent({
      eventId: eventId, userId, eventType: "refund_succeeded",
      amount: Number(data.amount_refunded ?? 0), currency: String(data.currency ?? "USD"),
      occurredAt: created,
    });
  }

  return reply({ received: true });
}

async function getJson(path: string, token?: string) {
  const response = await supabaseFetch(path, token);
  if (!response.ok) throw new Error("Supabase data request failed: " + response.status);
  return await response.json();
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    const origin = request.headers.get("Origin") ?? "";
    if (origin !== "https://alooshalshawwa8-wq.github.io") return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (!SUPABASE_URL || !API_KEY) return reply({ error: "Membership service is not configured" }, 503);

  const path = pathOf(new URL(request.url));
  const origin = request.headers.get("Origin") ?? "";
  if (path !== "/api/stripe/webhook" && origin && origin !== "https://alooshalshawwa8-wq.github.io") {
    return reply({ error: "Origin not allowed" }, 403);
  }
  try {
    if (request.method === "GET" && path === "/api/health") {
      return reply({ ok: true, service: "bawabatsyria-membership", provider: "supabase", version: 7 });
    }

    if (request.method === "GET" && path === "/api/plans") {
      const plans = await getJson("/rest/v1/membership_plans?select=id,name_ar,description_ar,billing_interval,active,display_order,stripe_price_id&active=eq.true&order=display_order.asc");
      const stripeReady = Boolean(PAYMENTS_ENABLED && await billingGateOpen() && STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET && SERVICE_ROLE_KEY);
      return reply({ plans: plans.map((plan: Record<string, unknown>) => ({
        id: plan.id, name: plan.name_ar, description: plan.description_ar,
        billingInterval: plan.billing_interval,
        checkoutEnabled: stripeReady && typeof plan.stripe_price_id === "string" && plan.stripe_price_id.startsWith("price_"),
      })) });
    }

    if (request.method === "POST" && path === "/api/stripe/webhook") {
      return await processStripeWebhook(request);
    }

    const user = await authenticatedUser(request);
    if (!user) return reply({ error: "Authentication required" }, 401);

    if (request.method === "GET" && path === "/api/admin/metrics") {
      if (!user.owner) return reply({ error: "Platform owner access required" }, 403);
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [usageResponse, revenueResponse] = await Promise.all([
        adminFetch("/rest/v1/ofoq_usage_events?select=user_id,event_name,section_id,created_at&created_at=gte." + encodeURIComponent(since) + "&limit=20000"),
        adminFetch("/rest/v1/ofoq_revenue_events?select=event_type,amount_minor,currency,occurred_at&occurred_at=gte." + encodeURIComponent(since) + "&limit=20000"),
      ]);
      if (!usageResponse.ok || !revenueResponse.ok) return reply({ error: "Unable to load platform metrics" }, 503);
      const usage = await usageResponse.json();
      const revenue = await revenueResponse.json();
      const uniqueUsers = new Set(usage.map((row: Record<string, unknown>) => String(row.user_id))).size;
      const byEvent: Record<string, number> = {};
      const bySection: Record<string, number> = {};
      for (const row of usage as Record<string, unknown>[]) {
        const eventName = String(row.event_name ?? "");
        const sectionId = String(row.section_id ?? "");
        byEvent[eventName] = (byEvent[eventName] ?? 0) + 1;
        bySection[sectionId] = (bySection[sectionId] ?? 0) + 1;
      }
      const revenueByCurrency: Record<string, { grossMinor: number; refundsMinor: number; payments: number }> = {};
      for (const row of revenue as Record<string, unknown>[]) {
        const currency = String(row.currency ?? "USD");
        const bucket = revenueByCurrency[currency] ?? { grossMinor: 0, refundsMinor: 0, payments: 0 };
        if (row.event_type === "refund_succeeded") bucket.refundsMinor += Number(row.amount_minor ?? 0);
        else if (row.event_type === "payment_succeeded" || row.event_type === "subscription_started" || row.event_type === "subscription_renewed") {
          bucket.grossMinor += Number(row.amount_minor ?? 0);
          bucket.payments += 1;
        }
        revenueByCurrency[currency] = bucket;
      }
      return reply({ periodDays: 30, usageEvents: usage.length, uniqueUsers, byEvent, bySection, revenueByCurrency });
    }

    if (request.method === "GET" && path === "/api/me") {
      const token = request.headers.get("Authorization")!.slice(7);
      const filter = encodeURIComponent(user.id);
      const [profile, entitlements, ledger, subscriptions] = await Promise.all([
        getJson("/rest/v1/profiles?select=id,display_name,avatar_url,locale&id=eq." + filter + "&limit=1", token),
        getJson("/rest/v1/entitlements?select=entitlement_key,active,source,expires_at,updated_at&user_id=eq." + filter, token),
        getAllRows("/rest/v1/points_ledger?select=delta&user_id=eq." + filter + "&order=created_at.asc", token),
        getJson("/rest/v1/subscriptions?select=plan_id,provider,status,current_period_end,cancel_at_period_end&user_id=eq." + filter + "&order=updated_at.desc", token),
      ]);
      const points = ledger.reduce((sum: number, entry: { delta?: number }) => sum + Number(entry.delta ?? 0), 0);
      return reply({
        user,
        owner: user.owner,
        role: user.role,
        ownerAccess: user.ownerAccess,
        profile: profile[0] ?? null,
        points,
        entitlements,
        subscriptions,
      });
    }

    if (request.method === "GET" && path === "/api/points") {
      const token = request.headers.get("Authorization")!.slice(7);
      const filter = encodeURIComponent(user.id);
      const allEntries = await getAllRows("/rest/v1/points_ledger?select=delta,reason,created_at&user_id=eq." + filter + "&order=created_at.desc", token);
      const balance = allEntries.reduce((sum: number, entry: { delta?: number }) => sum + Number(entry.delta ?? 0), 0);
      return reply({ balance, entries: allEntries.slice(0, 100), totalEntries: allEntries.length });
    }

    if (request.method === "POST" && path === "/api/points/grant") {
      if (!user.owner) return reply({ error: "Platform owner access required" }, 403);
      const body = await readBoundedText(request, 8_192)
        .then(raw => JSON.parse(raw))
        .catch(() => null);
      const targetUserId = typeof body?.userId === "string" ? body.userId.trim() : "";
      const delta = Number(body?.delta);
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetUserId)) return reply({ error: "A valid target userId is required" }, 400);
      if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 10000) return reply({ error: "delta must be a non-zero integer between -10000 and 10000" }, 400);
      if (!reason || reason.length > 160 || !/^[A-Za-z0-9:_-]{8,100}$/.test(idempotencyKey)) return reply({ error: "A reason and unique idempotencyKey are required" }, 400);
      const token = request.headers.get("Authorization")!.slice(7);
      const insert = await supabaseFetch("/rest/v1/points_ledger?on_conflict=idempotency_key", token, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Prefer": "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({ user_id: targetUserId, delta, reason, idempotency_key: idempotencyKey }),
      });
      if (!insert.ok) return reply({ error: "Unable to record points grant" }, 400);
      return reply({ ok: true, idempotencyKey });
    }

    if (request.method === "POST" && path === "/api/checkout") {
      if (!PAYMENTS_ENABLED) return reply({ error: "الاشتراكات والدفع مؤجلان حالياً؛ جميع أقسام المنصة متاحة مجاناً." }, 403);
      if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SERVICE_ROLE_KEY) return reply({ error: "الدفع غير مهيأ بعد؛ يلزم إعداد مفاتيح Stripe وSupabase الآمنة." }, 503);
      if (!await billingGateOpen()) return reply({ error: "الدفع غير متاح قبل اعتماد وضع الإطلاق التجاري وتفعيل ضوابط الفوترة على الخادم." }, 403);
      const body = await readBoundedText(request, 8_192)
        .then(raw => JSON.parse(raw))
        .catch(() => null);
      const planId = typeof body?.planId === "string" ? body.planId.trim() : "";
      if (!["pro_monthly", "vip_monthly", "business_monthly"].includes(planId)) return reply({ error: "خطة اشتراك غير صالحة" }, 400);
      if (!user.email) return reply({ error: "يلزم وجود بريد إلكتروني صالح في الحساب" }, 400);
      const plans = await getJson("/rest/v1/membership_plans?select=id,stripe_price_id,billing_interval&active=eq.true&id=eq." + encodeURIComponent(planId) + "&limit=1");
      const priceId = plans[0]?.stripe_price_id;
      if (typeof priceId !== "string" || !priceId.startsWith("price_") || plans[0]?.billing_interval === "none") return reply({ error: "لم يُربط سعر Stripe بهذه الخطة بعد." }, 503);
      const existingSubscriptions = await getJson(
        "/rest/v1/subscriptions?select=status,current_period_end&user_id=eq." + encodeURIComponent(user.id) + "&status=in.(active,trialing,past_due,canceled)&order=updated_at.desc&limit=10",
        request.headers.get("Authorization")!.slice(7),
      );
      const hasCurrentSubscription = existingSubscriptions.some((item: Record<string, unknown>) =>
        ["active", "trialing", "past_due", "canceled"].includes(String(item.status)) &&
        typeof item.current_period_end === "string" &&
        Date.parse(item.current_period_end) > Date.now()
      );
      if (hasCurrentSubscription) return reply({ error: "لديك اشتراك قائم أو فترة مدفوعة سارية. إدارة الترقية أو الإلغاء تحتاج بوابة إدارة الفوترة." }, 409);
      const siteUrl = SITE_URL.endsWith("/") ? SITE_URL.slice(0, -1) : SITE_URL;
      if (!siteUrl.startsWith("https://")) return reply({ error: "عنوان الموقع الآمن غير مضبوط." }, 503);
      const form = new URLSearchParams();
      form.set("mode", "subscription");
      form.set("line_items[0][price]", priceId);
      form.set("line_items[0][quantity]", "1");
      form.set("success_url", siteUrl + "/?membership=success&session_id={CHECKOUT_SESSION_ID}");
      form.set("cancel_url", siteUrl + "/?membership=cancelled");
      form.set("client_reference_id", user.id);
      form.set("customer_email", user.email);
      form.set("metadata[user_id]", user.id);
      form.set("metadata[plan_id]", planId);
      form.set("subscription_data[metadata][user_id]", user.id);
      form.set("subscription_data[metadata][plan_id]", planId);
      const session = await stripeRequest("checkout/sessions", form, "checkout-" + user.id + "-" + planId + "-" + Math.floor(Date.now() / 300000));
      if (typeof session.url !== "string" || !session.url.startsWith("https://checkout.stripe.com/")) return reply({ error: "تعذر إنشاء جلسة دفع آمنة." }, 502);
      return reply({ checkoutUrl: session.url, sessionId: session.id });
    }

    if (request.method === "POST" && path === "/api/billing-portal") {
      if (!PAYMENTS_ENABLED) return reply({ error: "إدارة الاشتراكات المدفوعة غير متاحة حالياً." }, 403);
      if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SERVICE_ROLE_KEY) return reply({ error: "إدارة الفوترة غير مهيأة بعد." }, 503);
      if (!await billingGateOpen()) return reply({ error: "إدارة الفوترة غير متاحة قبل اعتماد وضع الإطلاق التجاري." }, 403);
      const token = request.headers.get("Authorization")!.slice(7);
      const subscriptions = await getJson(
        "/rest/v1/subscriptions?select=provider,provider_customer_id,status,current_period_end&user_id=eq." +
          encodeURIComponent(user.id) +
          "&provider=eq.stripe&status=in.(active,trialing,past_due,canceled)&order=updated_at.desc&limit=10",
        token,
      );
      const current = subscriptions.find((item: Record<string, unknown>) =>
        typeof item.provider_customer_id === "string" &&
        /^cus_[A-Za-z0-9]+$/.test(item.provider_customer_id) &&
        typeof item.current_period_end === "string" &&
        Date.parse(item.current_period_end) > Date.now()
      );
      if (!current) return reply({ error: "لا يوجد اشتراك Stripe ساري مرتبط بهذا الحساب." }, 404);
      const siteUrl = SITE_URL.endsWith("/") ? SITE_URL.slice(0, -1) : SITE_URL;
      if (!siteUrl.startsWith("https://")) return reply({ error: "عنوان الموقع الآمن غير مضبوط." }, 503);
      const form = new URLSearchParams();
      form.set("customer", String(current.provider_customer_id));
      form.set("return_url", siteUrl + "/?membership=managed");
      const session = await stripeRequest("billing_portal/sessions", form);
      if (typeof session.url !== "string" || !session.url.startsWith("https://billing.stripe.com/")) {
        return reply({ error: "تعذر إنشاء رابط إدارة فوترة آمن." }, 502);
      }
      return reply({ portalUrl: session.url });
    }

    return reply({ error: "Not found" }, 404);
  } catch (error) {
    console.error("membership-api", error);
    return reply({ error: "Membership service temporarily unavailable" }, 500);
  }
});