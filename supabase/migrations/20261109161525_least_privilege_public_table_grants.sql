
revoke all privileges on table public.accounting_accounts, public.entitlements,
  public.inventory_items, public.inventory_movements, public.journal_entries,
  public.journal_lines, public.membership_plans, public.points_balances,
  public.points_ledger, public.profiles, public.subscriptions from anon;

grant select on table public.membership_plans to anon;

revoke all privileges on table public.accounting_accounts, public.entitlements,
  public.inventory_items, public.inventory_movements, public.journal_entries,
  public.journal_lines, public.membership_plans, public.points_balances,
  public.points_ledger, public.profiles, public.subscriptions from authenticated;

grant select, insert, update, delete on table public.accounting_accounts to authenticated;
grant select on table public.entitlements to authenticated;
grant select, insert, update, delete on table public.inventory_items to authenticated;
grant select, insert on table public.inventory_movements to authenticated;
grant select, insert, update, delete on table public.journal_entries to authenticated;
grant select, insert, update, delete on table public.journal_lines to authenticated;
grant select on table public.membership_plans to authenticated;
grant select on table public.points_balances to authenticated;
grant select, insert on table public.points_ledger to authenticated;
grant select, update on table public.profiles to authenticated;
grant select on table public.subscriptions to authenticated;
