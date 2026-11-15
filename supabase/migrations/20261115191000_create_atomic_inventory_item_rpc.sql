-- Create an inventory item and its optional opening movement atomically.
create or replace function public.create_inventory_item_with_opening_movement(
  p_name text,
  p_sku text,
  p_unit text,
  p_quantity numeric,
  p_unit_cost numeric,
  p_currency character(3)
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_item_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_sku text := nullif(trim(coalesce(p_sku, '')), '');
  v_unit text := trim(coalesce(p_unit, ''));
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if length(v_name) not between 1 and 180 then
    raise exception 'Item name must contain 1 to 180 characters' using errcode = '22023';
  end if;
  if length(v_unit) not between 1 and 40 then
    raise exception 'Unit must contain 1 to 40 characters' using errcode = '22023';
  end if;
  if v_sku is not null and length(v_sku) > 80 then
    raise exception 'SKU cannot exceed 80 characters' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity < 0 or p_quantity > 99999999999.999 then
    raise exception 'Opening quantity must be non-negative and within supported precision'
      using errcode = '22023';
  end if;
  if p_unit_cost is null or p_unit_cost < 0 or p_unit_cost > 999999999999.99
     or p_unit_cost <> round(p_unit_cost, 2) then
    raise exception 'Unit cost must be non-negative with at most two decimal places'
      using errcode = '22023';
  end if;
  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then
    raise exception 'Currency must be a three-letter uppercase code'
      using errcode = '22023';
  end if;

  insert into public.inventory_items
    (user_id, name, sku, unit, quantity, unit_cost, currency)
  values
    (v_user_id, v_name, v_sku, v_unit, 0, p_unit_cost, p_currency)
  returning id into v_item_id;

  if p_quantity > 0 then
    insert into public.inventory_movements
      (user_id, item_id, quantity_delta, movement_type, reference)
    values
      (v_user_id, v_item_id, p_quantity, 'opening', 'Opening balance');
  end if;

  return v_item_id;
end;
$function$;

revoke all on function public.create_inventory_item_with_opening_movement(text,text,text,numeric,numeric,character)
  from public, anon;
grant execute on function public.create_inventory_item_with_opening_movement(text,text,text,numeric,numeric,character)
  to authenticated;

comment on function public.create_inventory_item_with_opening_movement(text,text,text,numeric,numeric,character)
  is 'Atomically creates an inventory item and its opening movement for the authenticated user.';
