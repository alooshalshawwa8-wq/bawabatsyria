-- OFOQ authenticated merchant catalog and order records.
-- Data API access is explicitly granted only to authenticated; RLS enforces row ownership.
create table public.ofoq_store_products (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  sku text,
  category text not null default '' check (char_length(category) <= 60),
  cost numeric(14,2) not null default 0 check (cost >= 0),
  price numeric(14,2) not null default 0 check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ofoq_store_products_user_id_id_key unique (user_id, id)
);
create unique index ofoq_store_products_user_sku_uidx
  on public.ofoq_store_products(user_id, lower(sku))
  where sku is not null and btrim(sku) <> '';
create index ofoq_store_products_user_updated_idx
  on public.ofoq_store_products(user_id, updated_at desc);

create table public.ofoq_store_orders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_no text not null check (char_length(btrim(order_no)) between 1 and 60),
  product_id text not null,
  product_name text not null check (char_length(btrim(product_name)) between 1 and 120),
  qty integer not null check (qty between 1 and 100000),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  status text not null default 'new' check (status in ('new','processing','shipped','delivered','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ofoq_store_orders_user_order_no_key unique (user_id, order_no),
  constraint ofoq_store_orders_user_id_id_key unique (user_id, id),
  constraint ofoq_store_orders_product_owner_fkey
    foreign key (user_id, product_id)
    references public.ofoq_store_products(user_id, id)
    on delete restrict
);
create index ofoq_store_orders_user_created_idx
  on public.ofoq_store_orders(user_id, created_at desc);
create index ofoq_store_orders_user_product_status_idx
  on public.ofoq_store_orders(user_id, product_id, status);

alter table public.ofoq_store_products enable row level security;
alter table public.ofoq_store_orders enable row level security;

create policy "OFOQ store products owner select" on public.ofoq_store_products
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "OFOQ store products owner insert" on public.ofoq_store_products
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "OFOQ store products owner update" on public.ofoq_store_products
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "OFOQ store products owner delete" on public.ofoq_store_products
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "OFOQ store orders owner select" on public.ofoq_store_orders
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "OFOQ store orders owner insert" on public.ofoq_store_orders
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "OFOQ store orders owner update" on public.ofoq_store_orders
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "OFOQ store orders owner delete cancelled" on public.ofoq_store_orders
  for delete to authenticated using ((select auth.uid()) = user_id and status = 'cancelled');

-- Explicit Data API grants: the tables remain inaccessible to anon.
grant select, insert, update, delete on public.ofoq_store_products to authenticated;
grant select, insert, update, delete on public.ofoq_store_orders to authenticated;

create or replace function public.enforce_ofoq_store_product_stock()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_reserved bigint;
begin
  if auth.uid() is not null and new.user_id is distinct from auth.uid() then
    raise exception 'Product ownership mismatch' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception 'Product identifiers are immutable' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.stock is distinct from old.stock then
    select coalesce(sum(o.qty), 0)::bigint into v_reserved
    from public.ofoq_store_orders o
    where o.user_id = new.user_id
      and o.product_id = new.id
      and o.status <> 'cancelled';
    if new.stock < v_reserved then
      raise exception 'Stock cannot be lower than active reserved order quantity (%).', v_reserved
        using errcode = '23514';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger ofoq_store_products_stock_guard
before insert or update on public.ofoq_store_products
for each row execute function public.enforce_ofoq_store_product_stock();

create or replace function public.enforce_ofoq_store_order_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_product public.ofoq_store_products%rowtype;
  v_reserved bigint;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'Authenticated owner context required' using errcode = '42501';
  end if;
  if new.status not in ('new','processing','shipped','delivered','cancelled') then
    raise exception 'Invalid order status' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    select * into v_product
    from public.ofoq_store_products p
    where p.user_id = auth.uid() and p.id = new.product_id
    for update;
    if not found then
      raise exception 'Product not found for this account' using errcode = '23503';
    end if;
    select coalesce(sum(o.qty), 0)::bigint into v_reserved
    from public.ofoq_store_orders o
    where o.user_id = auth.uid()
      and o.product_id = new.product_id
      and o.status <> 'cancelled';
    if new.status <> 'cancelled' and v_reserved + new.qty > v_product.stock then
      raise exception 'Insufficient available stock. Reserved %, stock %.', v_reserved, v_product.stock
        using errcode = '23514';
    end if;
    new.product_name := v_product.name;
    new.unit_price := v_product.price;
    new.total := round(v_product.price * new.qty, 2);
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.order_no is distinct from old.order_no
    or new.product_id is distinct from old.product_id
    or new.product_name is distinct from old.product_name
    or new.qty is distinct from old.qty
    or new.unit_price is distinct from old.unit_price
    or new.total is distinct from old.total
    or new.created_at is distinct from old.created_at then
    raise exception 'Order identity and financial snapshot are immutable' using errcode = '23514';
  end if;

  select * into v_product
  from public.ofoq_store_products p
  where p.user_id = auth.uid() and p.id = old.product_id
  for update;
  if not found then
    raise exception 'Order product no longer exists' using errcode = '23503';
  end if;
  select coalesce(sum(o.qty), 0)::bigint into v_reserved
  from public.ofoq_store_orders o
  where o.user_id = auth.uid()
    and o.product_id = old.product_id
    and o.id <> old.id
    and o.status <> 'cancelled';
  if new.status <> 'cancelled' and v_reserved + old.qty > v_product.stock then
    raise exception 'Insufficient available stock to reactivate order' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger ofoq_store_orders_integrity
before insert or update on public.ofoq_store_orders
for each row execute function public.enforce_ofoq_store_order_integrity();

revoke all on function public.enforce_ofoq_store_product_stock() from public, anon, authenticated;
revoke all on function public.enforce_ofoq_store_order_integrity() from public, anon, authenticated;
