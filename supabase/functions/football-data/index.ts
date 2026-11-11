import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGIN = "https://alooshalshawwa8-wq.github.io";
const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};
const headers = { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const cache = new Map<string, { until: number; data: unknown }>();
const requests = new Map<string, number[]>();

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}
function rateAllowed(ip: string) {
  const now = Date.now();
  const recent = (requests.get(ip) ?? []).filter(t => now - t < 60_000);
  if (recent.length >= 30) return false;
  recent.push(now);
  requests.set(ip, recent);
  return true;
}
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"));
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin") ?? "";
  if (request.method === "OPTIONS") {
    if (origin !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: cors });
  }
  if (origin !== ALLOWED_ORIGIN) return reply({ error: "Origin not allowed" }, 403);
  if (request.method !== "GET") return reply({ error: "Method not allowed" }, 405);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateAllowed(ip)) return reply({ error: "تم تجاوز عدد الطلبات المؤقت. حاول بعد دقيقة." }, 429);

  const apiKey = Deno.env.get("API_FOOTBALL_KEY") ?? "";
  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "status";
  if (action === "status") {
    return reply({ provider: "API-Football", configured: Boolean(apiKey), message: apiKey ? "مزود البيانات جاهز." : "أضف API_FOOTBALL_KEY إلى أسرار Supabase لتفعيل البيانات." });
  }
  if (!apiKey) return reply({ error: "لم تتم إضافة مفتاح مزود البيانات إلى إعدادات الخادم بعد.", code: "PROVIDER_NOT_CONFIGURED" }, 503);

  const params = new URLSearchParams();
  let endpoint = "";
  let ttl = 60_000;

  if (action === "fixtures") {
    endpoint = "fixtures";
    const mode = url.searchParams.get("mode") ?? "date";
    if (mode === "live") {
      params.set("live", "all");
      ttl = 20_000;
    } else if (mode === "last") {
      const league = url.searchParams.get("league") ?? "";
      const season = url.searchParams.get("season") ?? "";
      const last = url.searchParams.get("last") ?? "10";
      if (!/^\d+$/.test(league) || !/^20\d{2}$/.test(season) || !/^([1-9]|1\d|20)$/.test(last)) {
        return reply({ error: "معرّف البطولة أو الموسم أو عدد المباريات غير صالح." }, 400);
      }
      params.set("league", league);
      params.set("season", season);
      params.set("last", last);
      ttl = 24 * 60 * 60_000;
    } else if (mode === "season") {
      const league = url.searchParams.get("league") ?? "";
      const season = url.searchParams.get("season") ?? "";
      const from = url.searchParams.get("from") ?? "";
      const to = url.searchParams.get("to") ?? "";
      const page = url.searchParams.get("page") ?? "1";
      if (!/^\d+$/.test(league) || !/^20\d{2}$/.test(season) || !/^\d+$/.test(page)) {
        return reply({ error: "معرّف البطولة أو الموسم أو الصفحة غير صالح." }, 400);
      }
      if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to)) {
        return reply({ error: "نطاق التاريخ غير صالح." }, 400);
      }
      params.set("league", league);
      params.set("season", season);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("page", page);
      ttl = 15 * 60_000;
    } else {
      const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
      if (!validDate(date)) return reply({ error: "صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD." }, 400);
      params.set("date", date);
      ttl = 10 * 60_000;
    }
    params.set("timezone", "Asia/Damascus");
  } else if (action === "teams") {
    endpoint = "teams";
    const league = url.searchParams.get("league") ?? "";
    const season = url.searchParams.get("season") ?? "";
    if (!/^\d+$/.test(league) || !/^20\d{2}$/.test(season)) {
      return reply({ error: "معرّف البطولة أو الموسم غير صالح." }, 400);
    }
    params.set("league", league);
    params.set("season", season);
    ttl = 24 * 60 * 60_000;
  } else if (action === "leagues") {
    endpoint = "leagues";
    const search = (url.searchParams.get("search") ?? "").trim().slice(0, 60);
    const country = (url.searchParams.get("country") ?? "").trim().slice(0, 40);
    if (search.length >= 3) params.set("search", search);
    else if (country) params.set("country", country);
    else return reply({ error: "اكتب اسم بطولة من 3 أحرف على الأقل أو اسم الدولة." }, 400);
    ttl = 24 * 60 * 60_000;
  } else if (action === "standings") {
    endpoint = "standings";
    const league = url.searchParams.get("league") ?? "";
    const season = url.searchParams.get("season") ?? "";
    if (!/^\d+$/.test(league) || !/^20\d{2}$/.test(season)) return reply({ error: "معرّف البطولة أو الموسم غير صالح." }, 400);
    params.set("league", league);
    params.set("season", season);
    ttl = 60 * 60_000;
  } else {
    return reply({ error: "نوع الطلب غير مدعوم." }, 400);
  }

  const cacheKey = endpoint + "?" + params.toString();
  const cached = cache.get(cacheKey);
  if (cached && cached.until > Date.now()) return reply({ ...cached.data as Record<string, unknown>, cached: true });

  try {
    const upstream = await fetch("https://v3.football.api-sports.io/" + endpoint + "?" + params.toString(), {
      headers: { "x-apisports-key": apiKey, "Accept": "application/json" },
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("API-Football upstream error", upstream.status);
      return reply({ error: "تعذر جلب البيانات من مزود كرة القدم.", providerStatus: upstream.status }, upstream.status === 429 ? 429 : 502);
    }
    if (Array.isArray(data.errors) && data.errors.length) {
      console.error("API-Football returned validation errors", JSON.stringify(data.errors).slice(0, 500));
      return reply({ error: "رفض مزود البيانات الطلب. تحقق من صلاحية الخطة أو بيانات البطولة.", details: data.errors }, 502);
    }
    const result = { response: Array.isArray(data.response) ? data.response : [], results: Number(data.results ?? 0), paging: data.paging ?? null, provider: "API-Football", fetchedAt: new Date().toISOString(), cached: false };
    cache.set(cacheKey, { until: Date.now() + ttl, data: result });
    return reply(result);
  } catch (_error) {
    return reply({ error: "تعذر الاتصال بمزود البيانات حالياً." }, 502);
  }
});
