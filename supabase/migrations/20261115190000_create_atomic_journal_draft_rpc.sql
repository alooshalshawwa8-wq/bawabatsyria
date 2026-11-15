-- Create a balanced draft journal entry and both lines atomically for the signed-in owner.
create or replace function public.create_journal_draft(
  p_description text,
  p_entry_date date,
  p_debit_account_id uuid,
  p_credit_account_id uuid,
  p_amount numeric
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
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

  return v_entry_id;
end;
$function$;

revoke all on function public.create_journal_draft(text,date,uuid,uuid,numeric)
  from public, anon;
grant execute on function public.create_journal_draft(text,date,uuid,uuid,numeric)
  to authenticated;

comment on function public.create_journal_draft(text,date,uuid,uuid,numeric)
  is 'Atomically creates one balanced draft journal entry for the authenticated user; posting remains a separate explicit operation.';
