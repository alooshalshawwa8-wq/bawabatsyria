create or replace function public.football_api_usage_summary()
returns jsonb language sql security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'requests_24h', count(*),
    'successful_24h', count(*) filter (where http_status between 200 and 299 and provider_errors is null),
    'failed_24h', count(*) filter (where http_status is null or http_status < 200 or http_status >= 300 or provider_errors is not null),
    'avg_duration_ms', coalesce(round(avg(duration_ms))::integer, 0),
    'last_remaining', (select requests_remaining from public.football_api_usage where created_at >= now() - interval '24 hours' and requests_remaining is not null order by created_at desc limit 1),
    'last_limit', (select requests_limit from public.football_api_usage where created_at >= now() - interval '24 hours' and requests_limit is not null order by created_at desc limit 1),
    'last_request_at', max(created_at),
    'by_endpoint', coalesce((select jsonb_agg(jsonb_build_object('endpoint', e.endpoint, 'requests', e.n, 'failures', e.failures) order by e.n desc) from (select endpoint, count(*) as n, count(*) filter (where http_status is null or http_status < 200 or http_status >= 300 or provider_errors is not null) as failures from public.football_api_usage where created_at >= now() - interval '24 hours' group by endpoint) e), '[]'::jsonb)
  )
  from public.football_api_usage where created_at >= now() - interval '24 hours';
$$;
revoke all on function public.football_api_usage_summary() from public, anon, authenticated;
grant execute on function public.football_api_usage_summary() to service_role;
