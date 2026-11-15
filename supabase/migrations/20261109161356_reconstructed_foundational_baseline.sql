-- OFOQ reconstructed foundational baseline
-- Reconstructed from read-only PostgreSQL catalog evidence captured 2026-11-15.
-- This is NOT the original historical migration. It restores the prerequisite
-- relations absent from the tracked migration lineage so a clean database can
-- replay subsequent migrations deterministically.
-- Do not apply to an existing production database; this is a clean-install baseline.

create table public.membership_plans (
  id text primary key,
  name_ar text not null,
  description_ar text not null default '',
  billing_interval text not null,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  stripe_price_id text,
  price_minor bigint,
  currency text,
  constraint membership_plans_billing_interval_check
    check (billing_interval = any (array['none'::text,'month'::text,'year'::text])),
  constraint membership_plans_id_check
    check (id = any (array['free'::text,'pro_monthly'::text,'vip_monthly'::text,'business_monthly'::text]))
);
create unique index membership_plans_stripe_price_id_key
  on public.membership_plans(stripe_price_id) where stripe_price_id is not null;

create table public.entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_key text not null,
  active boolean not null default false,
  source text not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id,entitlement_key)
);
create index entitlements_active_user_idx on public.entitlements(user_id,active);

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  reason text not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  constraint points_ledger_delta_check check (delta <> 0),
  constraint points_ledger_reason_check check (length(trim(reason)) between 1 and 160)
);
create index points_ledger_user_created_idx on public.points_ledger(user_id,created_at desc);

create table public.ai_provider_daily_usage (
  provider text not null,
  usage_date date not null default (timezone('utc',now()))::date,
  requests_used integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (provider,usage_date),
  constraint ai_provider_daily_usage_requests_used_check check (requests_used >= 0)
);
alter table public.ai_provider_daily_usage enable row level security;
revoke all privileges on table public.ai_provider_daily_usage from anon,authenticated;
grant all privileges on table public.ai_provider_daily_usage to service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  locale text not null default 'ar',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.membership_plans(id),
  provider text not null default 'stripe',
  provider_subscription_id text unique,
  provider_customer_id text,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_provider_check check (provider = any (array['stripe'::text,'manual'::text])),
  constraint subscriptions_status_check check (status = any (array['incomplete'::text,'trialing'::text,'active'::text,'past_due'::text,'canceled'::text,'unpaid'::text,'paused'::text,'expired'::text]))
);
create index subscriptions_plan_id_idx on public.subscriptions(plan_id);
create index subscriptions_user_status_idx on public.subscriptions(user_id,status,updated_at desc);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sku text,
  name text not null,
  description text,
  unit text not null default 'piece',
  quantity numeric(14,3) not null default 0,
  reorder_level numeric(14,3) not null default 0,
  unit_cost numeric(14,2) not null default 0,
  currency character(3) not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_name_check check (length(trim(name)) between 1 and 180),
  constraint inventory_items_quantity_check check (quantity >= 0),
  constraint inventory_items_reorder_level_check check (reorder_level >= 0),
  constraint inventory_items_unit_cost_check check (unit_cost >= 0),
  constraint inventory_items_user_id_id_key unique (user_id,id),
  constraint inventory_items_user_id_sku_key unique (user_id,sku)
);
create index inventory_items_user_name_idx on public.inventory_items(user_id,name);

create table public.accounting_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  name text not null,
  account_type text not null,
  currency character(3) not null default 'USD',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint accounting_accounts_account_type_check
    check (account_type = any (array['asset'::text,'liability'::text,'equity'::text,'revenue'::text,'expense'::text])),
  constraint accounting_accounts_name_check check (length(trim(name)) between 1 and 160),
  constraint accounting_accounts_user_id_code_key unique (user_id,code),
  constraint accounting_accounts_user_id_id_key unique (user_id,id)
);
create index accounting_accounts_user_type_idx on public.accounting_accounts(user_id,account_type);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_number bigint generated by default as identity,
  entry_date date not null default current_date,
  description text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journal_entries_description_check check (length(trim(description)) between 1 and 500),
  constraint journal_entries_status_check check (status = any (array['draft'::text,'posted'::text,'void'::text])),
  constraint journal_entries_user_id_id_key unique (user_id,id)
);
create index journal_entries_user_date_idx on public.journal_entries(user_id,entry_date desc);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null,
  account_id uuid not null,
  description text,
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint journal_lines_check
    check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0)),
  constraint journal_lines_credit_check check (credit >= 0),
  constraint journal_lines_debit_check check (debit >= 0),
  constraint journal_lines_user_id_entry_id_fkey
    foreign key (user_id,entry_id) references public.journal_entries(user_id,id) on delete cascade,
  constraint journal_lines_user_id_account_id_fkey
    foreign key (user_id,account_id) references public.accounting_accounts(user_id,id) on delete restrict
);
create index journal_lines_entry_idx on public.journal_lines(user_id,entry_id);
create index journal_lines_user_account_idx on public.journal_lines(user_id,account_id);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null,
  quantity_delta numeric(14,3) not null,
  movement_type text not null,
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  constraint inventory_movements_movement_type_check
    check (movement_type = any (array['opening'::text,'purchase'::text,'sale'::text,'return'::text,'adjustment'::text,'waste'::text])),
  constraint inventory_movements_quantity_delta_check check (quantity_delta <> 0),
  constraint inventory_movements_user_id_item_id_fkey
    foreign key (user_id,item_id) references public.inventory_items(user_id,id) on delete restrict
);
create index inventory_movements_item_created_idx on public.inventory_movements(user_id,item_id,created_at desc);

-- Preserve the current production row-level access model for the reconstructed
-- foundational tables. Subsequent historical migrations still apply their
-- recorded grants and function hardening in their original order.
alter table public.membership_plans enable row level security;
alter table public.entitlements enable row level security;
alter table public.points_ledger enable row level security;
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.accounting_accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;

create policy "Membership plans readable by everyone" on public.membership_plans
  for select to anon,authenticated using (active = true);
create policy "Entitlements readable by owner" on public.entitlements
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Points ledger readable by owner" on public.points_ledger
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Points ledger grant by platform owner" on public.points_ledger
  for insert to authenticated with check (
    (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'OWNER'
    and (select auth.jwt()) -> 'app_metadata' ->> 'owner' = 'true'
    and (select auth.jwt()) -> 'app_metadata' ->> 'owner_access' = 'lifetime'
  );

create policy "Profiles readable by owner" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Profiles editable by owner" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
create policy "Subscriptions readable by owner" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Inventory items owner select" on public.inventory_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Inventory items owner insert" on public.inventory_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Inventory items owner update" on public.inventory_items
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Inventory items owner delete" on public.inventory_items
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Inventory movements owner select" on public.inventory_movements
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Inventory movements owner insert" on public.inventory_movements
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Accounting accounts owner select" on public.accounting_accounts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Accounting accounts owner insert" on public.accounting_accounts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Accounting accounts owner update" on public.accounting_accounts
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Accounting accounts owner delete" on public.accounting_accounts
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Journal entries owner select" on public.journal_entries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Journal entries owner insert" on public.journal_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Journal entries owner update draft" on public.journal_entries
  for update to authenticated using ((select auth.uid()) = user_id and status = 'draft')
  with check ((select auth.uid()) = user_id);
create policy "Journal entries owner delete draft" on public.journal_entries
  for delete to authenticated using ((select auth.uid()) = user_id and status = 'draft');

create policy "Journal lines owner select" on public.journal_lines
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Journal lines owner insert draft" on public.journal_lines
  for insert to authenticated with check (
    (select auth.uid()) = user_id and exists (
      select 1 from public.journal_entries e
      where e.id = journal_lines.entry_id and e.user_id = (select auth.uid()) and e.status = 'draft'
    )
  );
create policy "Journal lines owner update draft" on public.journal_lines
  for update to authenticated using (
    (select auth.uid()) = user_id and exists (
      select 1 from public.journal_entries e
      where e.id = journal_lines.entry_id and e.user_id = (select auth.uid()) and e.status = 'draft'
    )
  ) with check (
    (select auth.uid()) = user_id and exists (
      select 1 from public.journal_entries e
      where e.id = journal_lines.entry_id and e.user_id = (select auth.uid()) and e.status = 'draft'
    )
  );
create policy "Journal lines owner delete draft" on public.journal_lines
  for delete to authenticated using (
    (select auth.uid()) = user_id and exists (
      select 1 from public.journal_entries e
      where e.id = journal_lines.entry_id and e.user_id = (select auth.uid()) and e.status = 'draft'
    )
  );

-- Points summary view; a later recorded migration enables security_invoker.
create view public.points_balances as
  select user_id,coalesce(sum(delta),0::bigint) as balance
  from public.points_ledger
  group by user_id;

-- Trigger helper functions recovered from the current catalog. The private
-- schema is intentionally not exposed to API roles.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function private.apply_inventory_movement()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  if auth.uid() is distinct from new.user_id then
    raise exception 'Not authorized to change this inventory';
  end if;
  update public.inventory_items
     set quantity = quantity + new.quantity_delta,
         updated_at = now()
   where id = new.item_id
     and user_id = new.user_id
     and quantity + new.quantity_delta >= 0;
  if not found then
    raise exception 'Inventory item missing or movement would make stock negative';
  end if;
  return new;
end;
$function$;

create or replace function private.validate_journal_entry_status()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare
  v_count bigint;
  v_debit numeric(14,2);
  v_credit numeric(14,2);
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'New journal entries must start as draft';
    end if;
    return new;
  end if;

  if old.status = 'posted' and new.status <> 'posted' then
    raise exception 'Posted journal entries cannot be reopened or voided';
  end if;
  if old.status = 'void' and new.status <> 'void' then
    raise exception 'Voided journal entries cannot be reopened';
  end if;

  if new.status = 'posted' and old.status = 'draft' then
    if auth.uid() is distinct from new.user_id then
      raise exception 'Not authorized to post this journal entry';
    end if;
    select count(*),coalesce(sum(debit),0),coalesce(sum(credit),0)
      into v_count,v_debit,v_credit
      from public.journal_lines
     where entry_id = new.id and user_id = new.user_id;
    if v_count < 2 or v_debit <> v_credit or v_debit <= 0 then
      raise exception 'Journal entry must contain at least two balanced lines';
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.post_journal_entry(p_entry_id uuid)
returns void language plpgsql set search_path = ''
as $function$
declare
  v_count bigint;
  v_debit numeric(14,2);
  v_credit numeric(14,2);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  perform 1 from public.journal_entries
   where id = p_entry_id and user_id = auth.uid() and status = 'draft'
   for update;
  if not found then
    raise exception 'Draft journal entry not found';
  end if;

  select count(*),coalesce(sum(debit),0),coalesce(sum(credit),0)
    into v_count,v_debit,v_credit
    from public.journal_lines
   where entry_id = p_entry_id and user_id = auth.uid();
  if v_count < 2 or v_debit <> v_credit or v_debit <= 0 then
    raise exception 'Journal entry must contain at least two balanced lines';
  end if;

  update public.journal_entries
     set status = 'posted',updated_at = now()
   where id = p_entry_id and user_id = auth.uid() and status = 'draft';
end;
$function$;

create or replace function public.reserve_ai_provider_request(
  p_provider text,
  p_daily_limit integer default 30
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_used integer;
begin
  if p_provider is null or length(trim(p_provider)) = 0
     or p_daily_limit is null or p_daily_limit < 1 or p_daily_limit > 1000 then
    return false;
  end if;
  insert into public.ai_provider_daily_usage(provider,usage_date,requests_used)
  values (trim(p_provider),timezone('utc',now())::date,1)
  on conflict (provider,usage_date) do update
    set requests_used = public.ai_provider_daily_usage.requests_used + 1,
        updated_at = now()
    where public.ai_provider_daily_usage.requests_used < p_daily_limit
  returning requests_used into v_used;
  return v_used is not null;
end;
$function$;
revoke all on function public.reserve_ai_provider_request(text,integer) from public,anon,authenticated;
grant execute on function public.reserve_ai_provider_request(text,integer) to service_role;

create trigger inventory_items_set_updated_at
  before update on public.inventory_items for each row execute function public.set_updated_at();
create trigger inventory_movement_apply
  before insert on public.inventory_movements for each row execute function private.apply_inventory_movement();
create trigger journal_entries_set_updated_at
  before update on public.journal_entries for each row execute function public.set_updated_at();
create trigger validate_journal_entry_status
  before insert or update of status on public.journal_entries for each row execute function private.validate_journal_entry_status();
create trigger profiles_set_updated_at
  before update on public.profiles for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at
  before update on public.subscriptions for each row execute function private.set_updated_at();
