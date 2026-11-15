drop policy if exists "Points ledger grant by platform owner" on public.points_ledger;
create policy "Points ledger grant by platform owner"
on public.points_ledger
for insert
to authenticated
with check (
  ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'OWNER'
  and ((select auth.jwt()) -> 'app_metadata' ->> 'owner') = 'true'
  and ((select auth.jwt()) -> 'app_metadata' ->> 'owner_access') = 'lifetime'
);
