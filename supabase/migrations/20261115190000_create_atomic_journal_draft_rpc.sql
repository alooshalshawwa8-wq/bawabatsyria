-- Create a balanced draft journal entry and both lines atomically for the signed-in owner.
create or replace function public.create_journal_draft(
  p_description text,
  p_entry_date date,
  p_debit_account_id uuid,
  p_credit_account_id uuid,
  p_amount numeric,
  p_request_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_payload jsonb;
  v_existing_payload jsonb;
  v_existing_result uuid;
  v_debit_currency character(3);
  v_credit_currency character(3);
  v_entry_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_description is null or length(trim(p_description)) not between 1 and 500 then
    raise exception 'Journal description must contain 1 to 500 characters'
      using errcode = '22023';
  end if;

  if p_entry_date is null then
    raise exception 'Journal date is required' using errcode = '22023';
  end if;

  if p_debit_account_id is null or p_credit_account_id is null
     or p_debit_account_id = p_credit_account_id then
    raise exception 'Choose two different accounts' using errcode = '22023';
  end if;

  if p_amount is null or p_amount <= 0
     or p_amount > 999999999999.99
     or p_amount <> round(p_amount, 2) then
    raise exception 'Amount must be positive and have at most two decimal places'
      using errcode = '22023';
  end if;

  if p_request_id is null then
    raise exception 'A request id is required for safe retries' using errcode = '22023';
  end if;

  v_payload := jsonb_build_object(
    'description', trim(p_description),
    'entry_date', p_entry_date,
    'debit_account_id', p_debit_account_id,
    'credit_account_id', p_credit_account_id,
    'amount', p_amount
  );
  insert into ofoq_private.rpc_idempotency_keys
    (user_id, operation, request_id, payload)
  values
    (v_user_id, 'journal_draft', p_request_id, v_payload)
  on conflict (user_id, operation, request_id) do nothing;

  select k.payload, k.result_id
    into v_existing_payload, v_existing_result
    from ofoq_private.rpc_idempotency_keys as k
   where k.user_id = v_user_id
     and k.operation = 'journal_draft'
     and k.request_id = p_request_id
   for update;

  if v_existing_payload is distinct from v_payload then
    raise exception 'Request id was already used with different input'
      using errcode = '23505';
  end if;
  if v_existing_result is not null then
    return v_existing_result;
  end if;

  select a.currency into v_debit_currency
    from public.accounting_accounts as a
   where a.id = p_debit_account_id
     and a.user_id = v_user_id
     and a.is_active = true
   for share;
  if not found then
    raise exception 'Active debit account not found' using errcode = '23503';
  end if;

  select a.currency into v_credit_currency
    from public.accounting_accounts as a
   where a.id = p_credit_account_id
     and a.user_id = v_user_id
     and a.is_active = true
   for share;
  if not found then
    raise exception 'Active credit account not found' using errcode = '23503';
  end if;

  if v_debit_currency is distinct from v_credit_currency then
    raise exception 'Both journal accounts must use the same currency'
      using errcode = '23514';
  end if;

  insert into public.journal_entries (user_id, entry_date, description, status)
  values (v_user_id, p_entry_date, trim(p_description), 'draft')
  returning id into v_entry_id;

  insert into public.journal_lines
    (user_id, entry_id, account_id, description, debit, credit)
  values
    (v_user_id, v_entry_id, p_debit_account_id, trim(p_description), p_amount, 0),
    (v_user_id, v_entry_id, p_credit_account_id, trim(p_description), 0, p_amount);

  update ofoq_private.rpc_idempotency_keys
     set result_id = v_entry_id
   where user_id = v_user_id
     and operation = 'journal_draft'
     and request_id = p_request_id;

  return v_entry_id;
end;
$function$;

revoke all on function public.create_journal_draft(text,date,uuid,uuid,numeric,uuid)
  from public, anon;
grant execute on function public.create_journal_draft(text,date,uuid,uuid,numeric,uuid)
  to authenticated;

comment on function public.create_journal_draft(text,date,uuid,uuid,numeric,uuid)
  is 'Atomically creates one balanced draft journal entry for the authenticated user; posting remains a separate explicit operation.';
