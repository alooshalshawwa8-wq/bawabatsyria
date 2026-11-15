-- Exercise atomic inventory and journal RPC retries against a disposable local database.
-- The enclosing transaction is rolled back; no production data is involved.
begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous
) values (
  '00000000-0000-4000-8000-000000000035',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'ofoq-rpc-idempotency@example.invalid', '',
  now(), now(), now(),
  '{"provider":"email","providers":["email"],"role":"OWNER","owner":true,"owner_access":"lifetime"}'::jsonb,
  '{}'::jsonb, false, false, false
) on conflict (id) do nothing;

insert into public.accounting_accounts (user_id, code, name, account_type, currency, is_active)
values
  ('00000000-0000-4000-8000-000000000035', 'IDEM-1000', 'Idempotency Test Cash', 'asset', 'USD', true),
  ('00000000-0000-4000-8000-000000000035', 'IDEM-4000', 'Idempotency Test Revenue', 'revenue', 'USD', true)
on conflict (user_id, code) do nothing;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000035","role":"authenticated","app_metadata":{"role":"OWNER","owner":true,"owner_access":"lifetime"}}',
  true
);

do $test$
declare
  v_item_first uuid;
  v_item_retry uuid;
  v_entry_first uuid;
  v_entry_retry uuid;
begin
  v_item_first := public.create_inventory_item_with_opening_movement(
    'Idempotency Test Item', 'IDEM-ITEM-01', 'piece', 5, 2.50, 'USD',
    '10000000-0000-4000-8000-000000000035'
  );
  v_item_retry := public.create_inventory_item_with_opening_movement(
    'Idempotency Test Item', 'IDEM-ITEM-01', 'piece', 5, 2.50, 'USD',
    '10000000-0000-4000-8000-000000000035'
  );
  if v_item_first is distinct from v_item_retry then
    raise exception 'Inventory retry returned a different item id';
  end if;
  if (select count(*) from public.inventory_items where id = v_item_first) <> 1 then
    raise exception 'Inventory retry created duplicate items';
  end if;
  if (select count(*) from public.inventory_movements where item_id = v_item_first) <> 1 then
    raise exception 'Inventory retry created duplicate opening movements';
  end if;
  if (select quantity from public.inventory_items where id = v_item_first) <> 5 then
    raise exception 'Inventory opening quantity was not applied exactly once';
  end if;

  begin
    perform public.create_inventory_item_with_opening_movement(
      'Idempotency Test Item', 'IDEM-ITEM-01', 'piece', 6, 2.50, 'USD',
      '10000000-0000-4000-8000-000000000035'
    );
    raise exception 'Inventory request-key payload mismatch was accepted';
  exception when unique_violation then
    null;
  end;

  v_entry_first := public.create_journal_draft(
    'Idempotency Test Journal', current_date,
    (select id from public.accounting_accounts where code = 'IDEM-1000'),
    (select id from public.accounting_accounts where code = 'IDEM-4000'),
    10.00, '20000000-0000-4000-8000-000000000035'
  );
  v_entry_retry := public.create_journal_draft(
    'Idempotency Test Journal', current_date,
    (select id from public.accounting_accounts where code = 'IDEM-1000'),
    (select id from public.accounting_accounts where code = 'IDEM-4000'),
    10.00, '20000000-0000-4000-8000-000000000035'
  );
  if v_entry_first is distinct from v_entry_retry then
    raise exception 'Journal retry returned a different entry id';
  end if;
  if (select count(*) from public.journal_entries where id = v_entry_first) <> 1 then
    raise exception 'Journal retry created duplicate entries';
  end if;
  if (select count(*) from public.journal_lines where entry_id = v_entry_first) <> 2 then
    raise exception 'Journal retry created duplicate or missing lines';
  end if;
end;
$test$;

rollback;
