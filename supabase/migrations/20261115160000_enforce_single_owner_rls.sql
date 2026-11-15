-- Enforce the single-owner private-workspace boundary in every authenticated RLS policy.
-- Public, non-sensitive catalog reads remain available on membership_plans and enabled payment_methods.

create or replace function public.is_ofoq_owner()
returns boolean
language sql
stable
set search_path = ''
as $function$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'OWNER')
    and (auth.jwt() -> 'app_metadata' ->> 'owner' = 'true')
    and (auth.jwt() -> 'app_metadata' ->> 'owner_access' = 'lifetime'),
    false
  );
$function$;

revoke all on function public.is_ofoq_owner() from public, anon;
grant execute on function public.is_ofoq_owner() to authenticated, service_role;

do $migration$
declare
  policy_row record;
  using_expression text;
  check_expression text;
  alter_statement text;
begin
  for policy_row in
    select schemaname, tablename, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and roles @> array['authenticated']::name[]
      and tablename not in ('membership_plans', 'payment_methods')
  loop
    using_expression := null;
    check_expression := null;

    if policy_row.qual is not null then
      using_expression := 'public.is_ofoq_owner() AND (' || policy_row.qual || ')';
    elsif policy_row.cmd in ('SELECT', 'UPDATE', 'DELETE', 'ALL') then
      using_expression := 'public.is_ofoq_owner()';
    end if;

    if policy_row.with_check is not null then
      check_expression := 'public.is_ofoq_owner() AND (' || policy_row.with_check || ')';
    elsif policy_row.cmd in ('INSERT', 'UPDATE', 'ALL') then
      check_expression := 'public.is_ofoq_owner()';
    end if;

    alter_statement := format(
      'ALTER POLICY %I ON %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
    if using_expression is not null then
      alter_statement := alter_statement || format(' USING (%s)', using_expression);
    end if;
    if check_expression is not null then
      alter_statement := alter_statement || format(' WITH CHECK (%s)', check_expression);
    end if;

    execute alter_statement;
  end loop;
end;
$migration$;

comment on function public.is_ofoq_owner() is
  'True only for the server-assigned OFOQ owner app_metadata claims; used by single-owner RLS policies.';
