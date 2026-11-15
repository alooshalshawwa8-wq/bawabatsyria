-- Private, owner-scoped idempotency ledger for financial and inventory create RPCs.
create schema if not exists ofoq_private;
revoke all on schema ofoq_private from public, anon, authenticated;
grant usage on schema ofoq_private to authenticated;

create table ofoq_private.rpc_idempotency_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check (operation in ('journal_draft','inventory_item_opening')),
  request_id uuid not null,
  payload jsonb not null,
  result_id uuid,
  created_at timestamptz not null default now(),
  primary key (user_id, operation, request_id)
);

alter table ofoq_private.rpc_idempotency_keys enable row level security;
create policy rpc_idempotency_keys_owner_only
  on ofoq_private.rpc_idempotency_keys
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on ofoq_private.rpc_idempotency_keys from public, anon, authenticated;
grant select, insert, update on ofoq_private.rpc_idempotency_keys to authenticated;
create index rpc_idempotency_keys_created_at_idx
  on ofoq_private.rpc_idempotency_keys(created_at);

comment on table ofoq_private.rpc_idempotency_keys is
  'Private owner-scoped idempotency records used only inside atomic create RPCs; no prompts or unrelated personal content.';
