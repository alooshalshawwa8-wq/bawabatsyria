drop policy if exists "Enabled payment methods are public" on public.payment_methods;
drop policy if exists "Owner manages payment methods" on public.payment_methods;
create policy "Read enabled methods or owner"
on public.payment_methods for select to anon, authenticated
using (
  enabled = true
  or (
    coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role','') = 'OWNER'
    and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'owner','false') = 'true'
    and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'owner_access','') = 'lifetime'
  )
);
create policy "Owner inserts payment methods"
on public.payment_methods for insert to authenticated
with check (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role','') = 'OWNER'
  and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'owner','false') = 'true'
  and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'owner_access','') = 'lifetime'
);
create policy "Owner updates payment methods"
on public.payment_methods for update to authenticated
using (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role','') = 'OWNER'
  and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'owner','false') = 'true'
  and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'owner_access','') = 'lifetime'
)
with check (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role','') = 'OWNER'
  and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'owner','false') = 'true'
  and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'owner_access','') = 'lifetime'
);
create policy "Owner deletes payment methods"
on public.payment_methods for delete to authenticated
using (
  coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role','') = 'OWNER'
  and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'owner','false') = 'true'
  and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'owner_access','') = 'lifetime'
);

drop policy if exists "Users read own payment orders" on public.payment_orders;
drop policy if exists "Owner reads all payment orders" on public.payment_orders;
create policy "Users or owner read payment orders"
on public.payment_orders for select to authenticated
using (
  (select auth.uid()) = user_id
  or (
    coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role','') = 'OWNER'
    and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'owner','false') = 'true'
    and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'owner_access','') = 'lifetime'
  )
);

create index if not exists payment_orders_method_idx on public.payment_orders(payment_method_code);
create index if not exists payment_orders_plan_idx on public.payment_orders(plan_id);
create index if not exists payment_orders_reviewer_idx on public.payment_orders(reviewer_id);
