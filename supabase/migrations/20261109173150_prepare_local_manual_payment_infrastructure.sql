alter table public.membership_plans
  add column if not exists price_minor bigint,
  add column if not exists currency text;

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  instructions text not null default '',
  currency text not null default 'SYP',
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_methods_code_format check (code ~ '^[a-z0-9_-]{2,40}$'),
  constraint payment_methods_currency_format check (currency ~ '^[A-Z]{3}$')
);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.membership_plans(id),
  payment_method_code text not null references public.payment_methods(code),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending'
    check (status in ('pending','paid','rejected','expired')),
  payer_reference text,
  proof_path text,
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  idempotency_key text not null unique,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_orders_user_created_idx
  on public.payment_orders(user_id, created_at desc);
create index if not exists payment_orders_status_created_idx
  on public.payment_orders(status, created_at desc);

alter table public.payment_methods enable row level security;
alter table public.payment_orders enable row level security;

drop policy if exists "Enabled payment methods are public" on public.payment_methods;
create policy "Enabled payment methods are public"
  on public.payment_methods for select to anon, authenticated
  using (enabled = true);

drop policy if exists "Owner manages payment methods" on public.payment_methods;
create policy "Owner manages payment methods"
  on public.payment_methods for all to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') = 'OWNER'
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'owner','false') = 'true'
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'owner_access','') = 'lifetime'
  )
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') = 'OWNER'
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'owner','false') = 'true'
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'owner_access','') = 'lifetime'
  );

drop policy if exists "Users read own payment orders" on public.payment_orders;
create policy "Users read own payment orders"
  on public.payment_orders for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner reads all payment orders" on public.payment_orders;
create policy "Owner reads all payment orders"
  on public.payment_orders for select to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role','') = 'OWNER'
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'owner','false') = 'true'
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'owner_access','') = 'lifetime'
  );
