-- Persistent, privacy-preserving rate limits for the public Nibras assistant.
-- Store only an HMAC of the client IP; never persist raw network addresses.

create table public.site_assistant_rate_limits (
  bucket_key text primary key
    constraint site_assistant_rate_limits_bucket_key_check
    check (bucket_key ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null default 0
    constraint site_assistant_rate_limits_request_count_check
    check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create index site_assistant_rate_limits_updated_at_idx
  on public.site_assistant_rate_limits(updated_at);

alter table public.site_assistant_rate_limits enable row level security;
revoke all privileges on table public.site_assistant_rate_limits from anon, authenticated;
grant all privileges on table public.site_assistant_rate_limits to service_role;

create or replace function public.reserve_site_assistant_rate_limit(
  p_bucket_key text,
  p_window_seconds integer default 60,
  p_max_requests integer default 12
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_count integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_bucket_key is null
     or p_bucket_key !~ '^[0-9a-f]{64}$'
     or p_window_seconds is null
     or p_window_seconds < 1
     or p_window_seconds > 3600
     or p_max_requests is null
     or p_max_requests < 1
     or p_max_requests > 1000 then
    return false;
  end if;

  delete from public.site_assistant_rate_limits
  where updated_at < v_now - interval '24 hours';

  insert into public.site_assistant_rate_limits(
    bucket_key, window_started_at, request_count, updated_at
  )
  values (p_bucket_key, v_now, 1, v_now)
  on conflict (bucket_key) do update
    set window_started_at = case
          when public.site_assistant_rate_limits.window_started_at
               <= v_now - make_interval(secs => p_window_seconds)
          then v_now
          else public.site_assistant_rate_limits.window_started_at
        end,
        request_count = case
          when public.site_assistant_rate_limits.window_started_at
               <= v_now - make_interval(secs => p_window_seconds)
          then 1
          else least(public.site_assistant_rate_limits.request_count + 1, p_max_requests + 1)
        end,
        updated_at = v_now
  returning request_count into v_count;

  return v_count <= p_max_requests;
end;
$function$;

revoke all on function public.reserve_site_assistant_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_site_assistant_rate_limit(text, integer, integer)
  to service_role;
