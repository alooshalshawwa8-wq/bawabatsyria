-- Private, append-only cloud backup vault. No existing local data is copied automatically.
create table if not exists public.user_workspace_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  backup_type text not null check (backup_type in ('operations_hub','ecommerce','career','all_local')),
  schema_version smallint not null default 1 check (schema_version between 1 and 20),
  label text not null default 'نسخة احتياطية' check (char_length(label) between 1 and 120),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 2097152),
  created_at timestamptz not null default now()
);
create index if not exists user_workspace_backups_owner_created_idx
  on public.user_workspace_backups (user_id, created_at desc);
alter table public.user_workspace_backups enable row level security;
revoke all on public.user_workspace_backups from anon, public;
revoke all on public.user_workspace_backups from authenticated;
grant select, insert, delete on public.user_workspace_backups to authenticated;
create policy "Users read own workspace backups"
  on public.user_workspace_backups for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users create own workspace backups"
  on public.user_workspace_backups for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users delete own workspace backups"
  on public.user_workspace_backups for delete to authenticated
  using ((select auth.uid()) = user_id);
comment on table public.user_workspace_backups is
  'Private append-only user-owned JSON snapshots. Upload only after explicit user action; no automatic sync.';
comment on column public.user_workspace_backups.payload is
  'User-provided snapshot JSON. Not client-side encrypted; access is restricted by RLS.';
