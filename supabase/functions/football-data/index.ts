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
  } else if (action === "leaders") {
    const league = url.searchParams.get("league") ?? "";
    const season = url.searchParams.get("season") ?? "";
    const type = url.searchParams.get("type") ?? "scorers";
    const allowed: Record<string,string> = { scorers: "players/topscorers", assists: "players/topassists", yellow: "players/topyellowcards", red: "players/topredcards", keypasses: "players" };
    if (!/^\d+$/.test(league) || !/^20\d{2}$/.test(season) || !allowed[type]) return reply({ error: "معرّف البطولة أو الموسم أو نوع الإحصاء غير صالح." }, 400);
    endpoint = allowed[type];
    params.set("league", league);
    params.set("season", season);
    if (type === "keypasses") params.set("page", "1");
    ttl = 6 * 60 * 60_000;
  } else if (action === "match") {
    const fixture = url.searchParams.get("fixture") ?? "";
    if (!/^\d+$/.test(fixture)) return reply({ error: "رقم المباراة غير صالح." }, 400);
    const cacheKey = "match:" + fixture;
    const cachedMatch = cache.get(cacheKey);
    if (cachedMatch && cachedMatch.until > Date.now()) return reply({ ...cachedMatch.data as Record<string, unknown>, cached: true });
    try {
      const paths = ["fixtures/events", "fixtures/lineups", "fixtures/players", "fixtures/statistics"];
      const results = await Promise.allSettled(paths.map(async path => {
        const response = await fetch("https://v3.football.api-sports.io/" + path + "?fixture=" + fixture, {
          headers: { "x-apisports-key": apiKey, "Accept": "application/json" }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || (Array.isArray(data.errors) && data.errors.length)) throw new Error("تعذر تحميل " + path);
        return Array.isArray(data.response) ? data.response : [];
      }));
      const unpack = (index: number) => results[index].status === "fulfilled" ? results[index].value : [];
      const unavailable = paths.filter((_path, index) => results[index].status === "rejected");
      const result = { events: unpack(0), lineups: unpack(1), players: unpack(2), statistics: unpack(3), unavailable, provider: "API-Football", fetchedAt: new Date().toISOString(), cached: false };
      cache.set(cacheKey, { until: Date.now() + 60_000, data: result });
      return reply(result);
    } catch (_error) {
      return reply({ error: "تعذر تحميل تفاصيل المباراة أو أن بعض إحصاءاتها غير مشمولة في تغطية البطولة." }, 502);
    }
  } else if (action === "studio") {
    const fixtureId = url.searchParams.get("fixture") ?? "";
    if (!/^\d+$/.test(fixtureId)) return reply({ error: "رقم المباراة غير صالح." }, 400);
    const studioCacheKey = "studio:" + fixtureId;
    const previous = cache.get(studioCacheKey);
    if (previous && previous.until > Date.now()) return reply({ ...previous.data as Record<string, unknown>, cached: true });
    const apiFetch = async (path: string, query: Record<string,string> = {}) => {
      const qs = new URLSearchParams(query).toString();
      const response = await fetch("https://v3.football.api-sports.io/" + path + (qs ? "?" + qs : ""), {
        headers: { "x-apisports-key": apiKey, "Accept": "application/json" }
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || (Array.isArray(body.errors) && body.errors.length)) {
        throw new Error(path + " returned " + response.status);
      }
      return Array.isArray(body.response) ? body.response : [];
    };
    try {
      const fixtureRows = await apiFetch("fixtures", { id: fixtureId, timezone: "Asia/Damascus" });
      const match = fixtureRows[0];
      if (!match) return reply({ error: "لم يعثر API-Football على المباراة بهذا الرقم." }, 404);
      const homeId = String(match.teams?.home?.id ?? "");
      const awayId = String(match.teams?.away?.id ?? "");
      const leagueId = String(match.league?.id ?? "");
      const season = String(match.league?.season ?? "");
      if (![homeId, awayId, leagueId].every(value => /^\d+$/.test(value)) || !/^\d{4}$/.test(season)) {
        return reply({ error: "بيانات الفريقين أو البطولة أو الموسم غير مكتملة لهذه المباراة." }, 422);
      }
      const pair = homeId + "-" + awayId;
      const specs: Record<string, [string, Record<string,string>]> = {
        events: ["fixtures/events", { fixture: fixtureId }],
        lineups: ["fixtures/lineups", { fixture: fixtureId }],
        players: ["fixtures/players", { fixture: fixtureId }],
        statistics: ["fixtures/statistics", { fixture: fixtureId }],
        predictions: ["predictions", { fixture: fixtureId }],
        injuries: ["injuries", { fixture: fixtureId }],
        headtohead: ["fixtures/headtohead", { h2h: pair, last: "10" }],
        homeTeamStats: ["teams/statistics", { league: leagueId, season, team: homeId }],
        awayTeamStats: ["teams/statistics", { league: leagueId, season, team: awayId }],
        homeRecent: ["fixtures", { team: homeId, last: "5", timezone: "Asia/Damascus" }],
        awayRecent: ["fixtures", { team: awayId, last: "5", timezone: "Asia/Damascus" }],
        standings: ["standings", { league: leagueId, season }],
        odds: ["odds", { fixture: fixtureId }],
        coverage: ["leagues", { id: leagueId, season }],
        homeTeam: ["teams", { id: homeId }],
        awayTeam: ["teams", { id: awayId }]
      };
      const names = Object.keys(specs);
      const results = await Promise.allSettled(names.map(name => apiFetch(specs[name][0], specs[name][1])));
      const sections: Record<string, unknown> = {};
      const unavailable: string[] = [];
      results.forEach((result, index) => {
        const name = names[index];
        if (result.status === "fulfilled") sections[name] = result.value;
        else { sections[name] = []; unavailable.push(name); }
      });
      const status = String(match.fixture?.status?.short ?? "");
      const live = ["1H","HT","2H","ET","BT","P","LIVE"].includes(status);
      const result = {
        fixture: match,
        ...sections,
        unavailable,
        requestsMade: 1 + names.length,
        provider: "API-Football",
        fetchedAt: new Date().toISOString(),
        cacheSeconds: live ? 30 : (["FT","AET","PEN"].includes(status) ? 21600 : 900),
        cached: false
      };
      cache.set(studioCacheKey, { until: Date.now() + (live ? 30_000 : (["FT","AET","PEN"].includes(status) ? 6 * 60 * 60_000 : 15 * 60_000)), data: result });
      return reply(result);
    } catch (error) {
      console.error("Football studio error", String(error).slice(0, 300));
      return reply({ error: "تعذر تجهيز الاستوديو لهذه المباراة. تحقق من تغطية البطولة أو معرّف المباراة." }, 502);
    }
  } else if (action === "team") {
    endpoint = "teams";
    const id = url.searchParams.get("id") ?? "";
    if (!/^\d+$/.test(id)) return reply({ error: "معرّف النادي غير صالح." }, 400);
    params.set("id", id);
    ttl = 24 * 60 * 60_000;
  } else if (action === "trophies") {
    endpoint = "trophies";
    const player = url.searchParams.get("player") ?? "";
    const coach = url.searchParams.get("coach") ?? "";
    if (player && /^\d+$/.test(player)) params.set("player", player);
    else if (coach && /^\d+$/.test(coach)) params.set("coach", coach);
    else return reply({ error: "معرّف اللاعب أو المدرب غير صالح." }, 400);
    ttl = 24 * 60 * 60_000;

  } else if (action === "catalog") {
    const dataset = url.searchParams.get("dataset") ?? "";
    const catalog: Record<string, { path: string; keys: string[]; ttl: number }> = {
      countries: { path: "countries", keys: ["name","search"], ttl: 86400000 },
      seasons: { path: "leagues/seasons", keys: [], ttl: 86400000 },
      timezones: { path: "timezone", keys: [], ttl: 86400000 },
      rounds: { path: "fixtures/rounds", keys: ["league","season","current"], ttl: 86400000 },
      standings: { path: "standings", keys: ["league","season"], ttl: 3600000 },
      scorers: { path: "players/topscorers", keys: ["league","season"], ttl: 21600000 },
      assists: { path: "players/topassists", keys: ["league","season"], ttl: 21600000 },
      yellow_cards: { path: "players/topyellowcards", keys: ["league","season"], ttl: 21600000 },
      red_cards: { path: "players/topredcards", keys: ["league","season"], ttl: 21600000 },
      headtohead: { path: "fixtures/headtohead", keys: ["h2h","date","league","season","last","next","from","to","status","venue","timezone"], ttl: 3600000 },
      venues: { path: "venues", keys: ["id","name","city","country","search"], ttl: 86400000 },
      team_stats: { path: "teams/statistics", keys: ["league","season","team","date"], ttl: 43200000 },
      team_seasons: { path: "teams/seasons", keys: ["team"], ttl: 86400000 },
      team_countries: { path: "teams/countries", keys: [], ttl: 86400000 },
      players: { path: "players", keys: ["id","team","league","season","search","page"], ttl: 21600000 },
      player_seasons: { path: "players/seasons", keys: ["player"], ttl: 86400000 },
      squads: { path: "players/squads", keys: ["team","player"], ttl: 86400000 },
      coaches: { path: "coachs", keys: ["id","team","search"], ttl: 86400000 },
      transfers: { path: "transfers", keys: ["player","team"], ttl: 21600000 },
      sidelined: { path: "sidelined", keys: ["player","players","coach","coachs"], ttl: 21600000 },
      injuries: { path: "injuries", keys: ["league","season","fixture","team","player","date","ids","timezone"], ttl: 14400000 },
      predictions: { path: "predictions", keys: ["fixture"], ttl: 3600000 },
      odds: { path: "odds", keys: ["fixture","league","season","date","timezone","page","bookmaker","bet"], ttl: 10800000 },
      odds_live: { path: "odds/live", keys: ["fixture","league","bet"], ttl: 5000 },
      odds_bets: { path: "odds/live/bets", keys: ["id","search"], ttl: 60000 },
      odds_mapping: { path: "odds/mapping", keys: ["page"], ttl: 86400000 },
      bookmakers: { path: "odds/bookmakers", keys: ["id","search"], ttl: 86400000 },
      fixture_events: { path: "fixtures/events", keys: ["fixture","team","player","type"], ttl: 60000 },
      fixture_lineups: { path: "fixtures/lineups", keys: ["fixture","team","player","type"], ttl: 900000 },
      fixture_stats: { path: "fixtures/statistics", keys: ["fixture","team","type","half"], ttl: 60000 },
      fixture_players: { path: "fixtures/players", keys: ["fixture","team"], ttl: 60000 },
      team_list: { path: "teams", keys: ["id","name","league","season","country","code","venue","search"], ttl: 86400000 },
      league_list: { path: "leagues", keys: ["id","name","country","code","season","team","type","current","search"], ttl: 86400000 },
      fixture_list: { path: "fixtures", keys: ["id","ids","live","date","league","season","team","last","next","from","to","round","status","venue","timezone"], ttl: 60000 }
    };
    const config = catalog[dataset];
    if (!config) return reply({ error: "قسم البيانات غير معروف." }, 400);
    for (const key of config.keys) {
      const value = url.searchParams.get(key);
      if (value !== null && value.trim() !== "") params.set(key, value.trim().slice(0, 120));
    }
    if (["standings","scorers","assists","yellow_cards","red_cards"].includes(dataset) && (!params.has("league") || !params.has("season"))) {
      return reply({ error: "يتطلب هذا القسم league و season، مثال league=39&season=2025." }, 400);
    }
    if (dataset === "team_stats" && (!params.has("team") || !params.has("league") || !params.has("season"))) {
      return reply({ error: "إحصاءات الفريق تتطلب team و league و season." }, 400);
    }
    if (dataset === "team_seasons" && !params.has("team")) return reply({ error: "أدخل team لمعرف النادي." }, 400);
    if (["team_countries","team_list"].includes(dataset) && !params.has("team") && !params.has("id") && !params.has("league") && !params.has("search") && !params.has("country") && !params.has("name") && !params.has("venue")) {
      return reply({ error: "أدخل مُعرّفاً أو معيار بحث صالحاً لهذا القسم." }, 400);
    }
    if (["players","player_seasons","squads","coaches","transfers","sidelined","injuries","venues","odds_bets","bookmakers"].includes(dataset) && params.size === 0) {
      return reply({ error: "أدخل معيار بحث واحداً على الأقل لهذا القسم." }, 400);
    }
    if (["fixture_events","fixture_lineups","fixture_stats","fixture_players","predictions","headtohead"].includes(dataset) && !params.has("fixture") && !params.has("h2h")) {
      return reply({ error: dataset === "headtohead" ? "أدخل h2h بصيغة teamID-teamID." : "أدخل رقم المباراة fixture." }, 400);
    }
    if (["players","team_stats","team_seasons","team_list","fixture_list","rounds","odds","injuries"].includes(dataset) && params.has("season") && !/^\d{4}$/.test(params.get("season")!)) {
      return reply({ error: "الموسم يجب أن يكون أربع خانات مثل 2025." }, 400);
    }
    endpoint = config.path;
    ttl = config.ttl;
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
