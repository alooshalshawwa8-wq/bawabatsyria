alter table public.membership_plans
  add column if not exists stripe_price_id text;
create unique index if not exists membership_plans_stripe_price_id_key
  on public.membership_plans(stripe_price_id)
  where stripe_price_id is not null;
