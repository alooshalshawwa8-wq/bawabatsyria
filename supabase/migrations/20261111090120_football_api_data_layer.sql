-- Persistent API-Football cache, provider usage telemetry, and durable rate limiting.
create table if not exists public.football_api_cache (
  cache_key text primary key,
  endpoint text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists football_api_cache_expires_idx on public.football_api_cache (expires_at);
alter table public.football_api_cache enable row level security;
revoke all on public.football_api_cache from anon, authenticated;
grant all on public.football_api_cache to service_role;

create table if not exists public.football_api_usage (
  id bigint generated always as identity primary key,
  endpoint text not null,
  cache_key text,
  http_status integer,
  provider_errors jsonb,
  response_count integer,
  requests_remaining integer,
  requests_limit integer,
  duration_ms integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists football_api_usage_created_idx on public.football_api_usage (created_at desc);
create index if not exists football_api_usage_endpoint_idx on public.football_api_usage (endpoint, created_at desc);
alter table public.football_api_usage enable row level security;
revoke all on public.football_api_usage from anon, authenticated;
grant all on public.football_api_usage to service_role;

create table if not exists public.football_api_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.football_api_rate_limits enable row level security;
revoke all on public.football_api_rate_limits from anon, authenticated;
grant all on public.football_api_rate_limits to service_role;

create or replace function public.football_rate_limit_hit(p_bucket_key text, p_window_seconds integer, p_max_requests integer)
returns integer language plpgsql security invoker set search_path = ''
as $$
declare v_count integer;
begin
  insert into public.football_api_rate_limits(bucket_key, window_started_at, request_count, updated_at)
  values (p_bucket_key, now(), 1, now())
  on conflict (bucket_key) do update
    set window_started_at = case when public.football_api_rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds) then now() else public.football_api_rate_limits.window_started_at end,
        request_count = case when public.football_api_rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds) then 1 else public.football_api_rate_limits.request_count + 1 end,
        updated_at = now()
  returning request_count into v_count;
  return v_count;
end;
$$;
revoke all on function public.football_rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.football_rate_limit_hit(text, integer, integer) to service_role;

create or replace function public.football_api_usage_summary()
returns jsonb language sql security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'requests_24h', count(*),
    'successful_24h', count(*) filter (where http_status between 200 and 299),
    'failed_24h', count(*) filter (where http_status is null or http_status < 200 or http_status >= 300),
    'avg_duration_ms', coalesce(round(avg(duration_ms))::integer, 0),
    'last_remaining', (select requests_remaining from public.football_api_usage where created_at >= now() - interval '24 hours' and requests_remaining is not null order by created_at desc limit 1),
    'last_limit', (select requests_limit from public.football_api_usage where created_at >= now() - interval '24 hours' and requests_limit is not null order by created_at desc limit 1),
    'last_request_at', max(created_at),
    'by_endpoint', coalesce((select jsonb_agg(jsonb_build_object('endpoint', e.endpoint, 'requests', e.n, 'failures', e.failures) order by e.n desc) from (select endpoint, count(*) as n, count(*) filter (where http_status is null or http_status < 200 or http_status >= 300) as failures from public.football_api_usage where created_at >= now() - interval '24 hours' group by endpoint) e), '[]'::jsonb)
  )
  from public.football_api_usage where created_at >= now() - interval '24 hours';
$$;
revoke all on function public.football_api_usage_summary() from public, anon, authenticated;
grant execute on function public.football_api_usage_summary() to service_role;
