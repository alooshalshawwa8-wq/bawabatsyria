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
  select coalesce(sum(o.qty), 0)::bigint into v_reserved
  from public.ofoq_store_orders o
  where o.user_id = new.user_id
    and o.product_id = new.id
    and o.status <> 'cancelled';
  if new.stock < v_reserved then
    raise exception 'Stock cannot be lower than active reserved order quantity (%).', v_reserved
      using errcode = '23514';
  end if;
  if new.archived and v_reserved > 0 then
    raise exception 'A product with active orders cannot be archived';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

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
    if v_product.archived then
      raise exception 'Archived products cannot receive new orders' using errcode = '23514';
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
  if v_product.archived and new.status <> 'cancelled' then
    raise exception 'Archived products cannot have active orders' using errcode = '23514';
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