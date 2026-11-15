-- Durable, provider/model-scoped AI quota ledger.
-- Additive only. This migration does not modify the live project until separately deployed.
begin;

create table if not exists public.ai_quota_model_policies (
  provider_id text not null,
  model_id text not null,
  enabled boolean not null default false,
  free_tier_verified boolean not null default false,
  daily_request_limit integer not null check (daily_request_limit > 0),
  minute_request_limit integer not null check (minute_request_limit > 0),
  daily_token_limit bigint null check (daily_token_limit is null or daily_token_limit > 0),
  minute_token_limit bigint null check (minute_token_limit is null or minute_token_limit > 0),
  verification_note text null,
  updated_at timestamptz not null default now(),
  primary key (provider_id, model_id),
  check (not enabled or free_tier_verified)
);

insert into public.ai_quota_model_policies
  (provider_id, model_id, enabled, free_tier_verified, daily_request_limit, minute_request_limit, verification_note)
values
  ('gemini', 'gemini-3.5-flash-lite', false, false, 30, 5, 'Disabled until exact account/model free-tier eligibility is verified.')
on conflict (provider_id, model_id) do nothing;

create table if not exists public.ai_quota_windows (
  provider_id text not null,
  model_id text not null,
  window_kind text not null check (window_kind in ('minute', 'day')),
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  token_count bigint not null default 0 check (token_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (provider_id, model_id, window_kind, window_start)
);

create table if not exists public.ai_quota_reservations (
  request_id uuid primary key,
  provider_id text not null,
  model_id text not null,
  task text not null,
  state text not null check (state in ('reserved', 'settled', 'released', 'rejected')),
  provider_attempted boolean not null default false,
  day_window_start timestamptz not null,
  minute_window_start timestamptz not null,
  reserved_at timestamptz not null default now(),
  provider_started_at timestamptz null,
  finalized_at timestamptz null,
  rejection_reason text null,
  foreign key (provider_id, model_id)
    references public.ai_quota_model_policies(provider_id, model_id)
);

create index if not exists ai_quota_reservations_model_time_idx
  on public.ai_quota_reservations(provider_id, model_id, reserved_at desc);

create table if not exists public.ai_usage_events (
  event_id bigint generated always as identity primary key,
  request_id uuid not null unique references public.ai_quota_reservations(request_id),
  provider_id text not null,
  model_id text not null,
  task text not null,
  status text not null check (status in ('success', 'quota_exhausted', 'failed')),
  latency_ms integer not null check (latency_ms >= 0),
  input_tokens bigint null check (input_tokens is null or input_tokens >= 0),
  output_tokens bigint null check (output_tokens is null or output_tokens >= 0),
  total_tokens bigint null check (total_tokens is null or total_tokens >= 0),
  cost_amount numeric(18,8) null check (cost_amount is null or cost_amount >= 0),
  cost_currency text null,
  cost_basis text null check (cost_basis is null or cost_basis in ('provider_reported', 'verified_rate_estimate')),
  provider_http_status integer null,
  occurred_at timestamptz not null default now()
);

alter table public.ai_quota_model_policies enable row level security;
alter table public.ai_quota_windows enable row level security;
alter table public.ai_quota_reservations enable row level security;
alter table public.ai_usage_events enable row level security;

revoke all on public.ai_quota_model_policies from public, anon, authenticated;
revoke all on public.ai_quota_windows from public, anon, authenticated;
revoke all on public.ai_quota_reservations from public, anon, authenticated;
revoke all on public.ai_usage_events from public, anon, authenticated;
grant all on public.ai_quota_model_policies to service_role;
grant all on public.ai_quota_windows to service_role;
grant all on public.ai_quota_reservations to service_role;
grant all on public.ai_usage_events to service_role;
grant usage, select on sequence public.ai_usage_events_event_id_seq to service_role;

create or replace function public.reserve_ai_model_quota(
  p_provider_id text,
  p_model_id text,
  p_request_id uuid,
  p_task text
)
returns table (allowed boolean, reason text, retry_after_seconds integer, already_reserved boolean)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_policy public.ai_quota_model_policies%rowtype;
  v_now timestamptz := now();
  v_day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_minute_start timestamptz := date_trunc('minute', now() at time zone 'UTC') at time zone 'UTC';
  v_day_count integer;
  v_minute_count integer;
  v_existing public.ai_quota_reservations%rowtype;
begin
  if p_provider_id is null or length(p_provider_id) > 64
     or p_model_id is null or length(p_model_id) > 128
     or p_request_id is null
     or p_task is null or length(p_task) = 0 or length(p_task) > 64 then
    return query select false, 'invalid_request'::text, 0, false;
    return;
  end if;

  select * into v_policy
  from public.ai_quota_model_policies
  where provider_id = p_provider_id and model_id = p_model_id
  for share;

  if not found or not v_policy.enabled or not v_policy.free_tier_verified then
    return query select false, 'provider_not_verified_free'::text, 0, false;
    return;
  end if;

  select * into v_existing
  from public.ai_quota_reservations
  where request_id = p_request_id;

  if found then
    if v_existing.provider_id <> p_provider_id or v_existing.model_id <> p_model_id then
      return query select false, 'request_id_conflict'::text, 0, false;
    elsif v_existing.state = 'reserved' then
      return query select true, 'already_reserved'::text, 0, true;
    else
      return query select false, 'already_final'::text, 0, true;
    end if;
    return;
  end if;

  insert into public.ai_quota_windows
    (provider_id, model_id, window_kind, window_start)
  values
    (p_provider_id, p_model_id, 'day', v_day_start),
    (p_provider_id, p_model_id, 'minute', v_minute_start)
  on conflict do nothing;

  -- Stable lock order prevents deadlocks when both windows are touched.
  perform 1
  from public.ai_quota_windows
  where provider_id = p_provider_id
    and model_id = p_model_id
    and ((window_kind = 'day' and window_start = v_day_start)
      or (window_kind = 'minute' and window_start = v_minute_start))
  order by window_kind
  for update;

  select request_count into v_day_count
  from public.ai_quota_windows
  where provider_id = p_provider_id and model_id = p_model_id
    and window_kind = 'day' and window_start = v_day_start;

  select request_count into v_minute_count
  from public.ai_quota_windows
  where provider_id = p_provider_id and model_id = p_model_id
    and window_kind = 'minute' and window_start = v_minute_start;

  if v_day_count >= v_policy.daily_request_limit then
    return query select false, 'daily_quota_exhausted'::text, 0, false;
    return;
  end if;
  if v_minute_count >= v_policy.minute_request_limit then
    return query select false, 'minute_quota_exhausted'::text, 60 - extract(second from v_now)::integer, false;
    return;
  end if;

  update public.ai_quota_windows
  set request_count = request_count + 1, updated_at = v_now
  where provider_id = p_provider_id and model_id = p_model_id
    and ((window_kind = 'day' and window_start = v_day_start)
      or (window_kind = 'minute' and window_start = v_minute_start));

  insert into public.ai_quota_reservations
    (request_id, provider_id, model_id, task, state, day_window_start, minute_window_start)
  values
    (p_request_id, p_provider_id, p_model_id, p_task, 'reserved', v_day_start, v_minute_start);

  return query select true, 'reserved'::text, 0, false;
end;
$function$;

create or replace function public.mark_ai_model_provider_attempt(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_rows integer;
begin
  update public.ai_quota_reservations
  set provider_attempted = true,
      provider_started_at = coalesce(provider_started_at, now())
  where request_id = p_request_id and state = 'reserved';
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$function$;

create or replace function public.release_ai_model_quota(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_res public.ai_quota_reservations%rowtype;
  v_rows integer;
begin
  select * into v_res
  from public.ai_quota_reservations
  where request_id = p_request_id
  for update;

  if not found or v_res.state <> 'reserved' or v_res.provider_attempted then
    return false;
  end if;

  update public.ai_quota_reservations
  set state = 'released', finalized_at = now()
  where request_id = p_request_id and state = 'reserved' and provider_attempted = false;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then return false; end if;

  update public.ai_quota_windows
  set request_count = greatest(0, request_count - 1), updated_at = now()
  where provider_id = v_res.provider_id and model_id = v_res.model_id
    and ((window_kind = 'day' and window_start = v_res.day_window_start)
      or (window_kind = 'minute' and window_start = v_res.minute_window_start));
  return true;
end;
$function$;

create or replace function public.settle_ai_model_quota(
  p_request_id uuid,
  p_status text,
  p_latency_ms integer,
  p_input_tokens bigint default null,
  p_output_tokens bigint default null,
  p_total_tokens bigint default null,
  p_cost_amount numeric default null,
  p_cost_currency text default null,
  p_cost_basis text default null,
  p_provider_http_status integer default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_res public.ai_quota_reservations%rowtype;
  v_total bigint;
  v_rows integer;
begin
  if p_status not in ('success', 'quota_exhausted', 'failed')
     or p_latency_ms is null or p_latency_ms < 0
     or (p_input_tokens is not null and p_input_tokens < 0)
     or (p_output_tokens is not null and p_output_tokens < 0)
     or (p_total_tokens is not null and p_total_tokens < 0)
     or (p_cost_amount is not null and p_cost_amount < 0)
     or (p_cost_basis is not null and p_cost_basis not in ('provider_reported', 'verified_rate_estimate')) then
    return false;
  end if;

  select * into v_res
  from public.ai_quota_reservations
  where request_id = p_request_id
  for update;

  if not found or v_res.state <> 'reserved' or not v_res.provider_attempted then
    return false;
  end if;

  update public.ai_quota_reservations
  set state = 'settled', finalized_at = now()
  where request_id = p_request_id and state = 'reserved';
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then return false; end if;

  v_total := coalesce(p_total_tokens,
    case when p_input_tokens is not null and p_output_tokens is not null
      then p_input_tokens + p_output_tokens else null end);

  insert into public.ai_usage_events
    (request_id, provider_id, model_id, task, status, latency_ms,
     input_tokens, output_tokens, total_tokens, cost_amount, cost_currency,
     cost_basis, provider_http_status)
  values
    (p_request_id, v_res.provider_id, v_res.model_id, v_res.task, p_status, p_latency_ms,
     p_input_tokens, p_output_tokens, v_total, p_cost_amount, p_cost_currency,
     p_cost_basis, p_provider_http_status)
  on conflict (request_id) do nothing;

  if v_total is not null then
    update public.ai_quota_windows
    set token_count = token_count + v_total, updated_at = now()
    where provider_id = v_res.provider_id and model_id = v_res.model_id
      and ((window_kind = 'day' and window_start = v_res.day_window_start)
        or (window_kind = 'minute' and window_start = v_res.minute_window_start));
  end if;
  return true;
end;
$function$;

revoke all on function public.reserve_ai_model_quota(text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.mark_ai_model_provider_attempt(uuid) from public, anon, authenticated;
revoke all on function public.release_ai_model_quota(uuid) from public, anon, authenticated;
revoke all on function public.settle_ai_model_quota(uuid, text, integer, bigint, bigint, bigint, numeric, text, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_model_quota(text, text, uuid, text) to service_role;
grant execute on function public.mark_ai_model_provider_attempt(uuid) to service_role;
grant execute on function public.release_ai_model_quota(uuid) to service_role;
grant execute on function public.settle_ai_model_quota(uuid, text, integer, bigint, bigint, bigint, numeric, text, text, integer) to service_role;

comment on table public.ai_quota_model_policies is 'Server-owned allowlist of explicitly verified free AI provider/model quotas. Paid routes are not eligible.';
comment on table public.ai_usage_events is 'Append-only normalized AI usage outcomes; no prompt or response content is stored.';

commit;
