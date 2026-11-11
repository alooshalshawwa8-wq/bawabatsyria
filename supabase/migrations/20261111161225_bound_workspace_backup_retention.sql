-- Keep the cloud vault bounded on the free project: at most 20 snapshots per user.
create or replace function public.trim_user_workspace_backup_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));
  delete from public.user_workspace_backups
  where user_id = new.user_id
    and id not in (
      select id
      from public.user_workspace_backups
      where user_id = new.user_id
      order by created_at desc, id desc
      limit 19
    );
  return new;
end;
$$;

drop trigger if exists user_workspace_backups_keep_20 on public.user_workspace_backups;
create trigger user_workspace_backups_keep_20
before insert on public.user_workspace_backups
for each row execute function public.trim_user_workspace_backup_history();

comment on function public.trim_user_workspace_backup_history() is
  'Keeps at most 20 user-owned workspace snapshots; runs as invoker under owner RLS policies.';
