create or replace function public.apply_inventory_movement_to_stock()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.inventory_items
     set quantity = quantity + new.quantity_delta,
         updated_at = now()
   where id = new.item_id
     and user_id = new.user_id
     and quantity + new.quantity_delta >= 0;
  if not found then
    raise exception 'Inventory item not found or movement would make stock negative'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_movement_apply_stock on public.inventory_movements;
create trigger inventory_movement_apply_stock
after insert on public.inventory_movements
for each row execute function public.apply_inventory_movement_to_stock();

create or replace function public.validate_posted_journal_entry()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  line_count bigint;
  debit_total numeric;
  credit_total numeric;
begin
  if new.status = 'posted' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    select count(*), coalesce(sum(debit),0), coalesce(sum(credit),0)
      into line_count, debit_total, credit_total
      from public.journal_lines
     where user_id = new.user_id and entry_id = new.id;
    if line_count < 2 then
      raise exception 'A posted journal entry must contain at least two lines'
        using errcode = '23514';
    end if;
    if debit_total <> credit_total then
      raise exception 'A posted journal entry must balance debits and credits'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists journal_entry_require_balance on public.journal_entries;
create trigger journal_entry_require_balance
before insert or update of status on public.journal_entries
for each row execute function public.validate_posted_journal_entry();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists inventory_items_set_updated_at on public.inventory_items;
create trigger inventory_items_set_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

drop trigger if exists journal_entries_set_updated_at on public.journal_entries;
create trigger journal_entries_set_updated_at
before update on public.journal_entries
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create index if not exists inventory_movements_user_created_idx
  on public.inventory_movements(user_id, created_at desc);
create index if not exists subscriptions_user_updated_idx
  on public.subscriptions(user_id, updated_at desc);
