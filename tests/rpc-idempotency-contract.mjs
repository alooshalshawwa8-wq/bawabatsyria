import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const ledger = await read("supabase/migrations/20261115192000_add_rpc_idempotency_keys.sql");
const journal = await read("supabase/migrations/20261115190000_create_atomic_journal_draft_rpc.sql");
const inventory = await read("supabase/migrations/20261115191000_create_atomic_inventory_item_rpc.sql");
const data = await read("ofoq-data.js");
const journalUi = await read("ofoq-workspace-extensions.js");
const inventoryUi = await read("ofoq-workspaces.js");

assert.match(ledger, /create schema if not exists ofoq_private/i);
assert.match(ledger, /primary key \(user_id, operation, request_id\)/i);
assert.match(ledger, /enable row level security/i);
assert.match(ledger, /user_id = \(select auth\.uid\(\)\)/i);
assert.match(ledger, /revoke all on ofoq_private\.rpc_idempotency_keys from public, anon, authenticated/i);
assert.match(ledger, /grant select, insert, update on ofoq_private\.rpc_idempotency_keys to authenticated/i);

for (const [sql, operation, fn] of [[journal, "journal_draft", "create_journal_draft"], [inventory, "inventory_item_opening", "create_inventory_item_with_opening_movement"]]) {
  assert.match(sql, /p_request_id uuid/i, fn + " must require a request UUID");
  assert.match(sql, /insert into ofoq_private\.rpc_idempotency_keys[\s\S]*?on conflict \(user_id, operation, request_id\) do nothing/i);
  assert.match(sql, new RegExp("values\\s*\\(v_user_id, '" + operation + "', p_request_id, v_payload\\)", "i"));
  assert.match(sql, /for update/i, fn + " must serialize duplicate request attempts");
  assert.match(sql, /v_existing_payload is distinct from v_payload/i, fn + " must reject key reuse with different data");
  assert.match(sql, /if v_existing_result is not null then\s+return v_existing_result/i, fn + " must return the original result");
  assert.match(sql, /set result_id = v_(entry|item)_id/i, fn + " must persist its result id");
}
assert.match(data, /async function requestKey\(scope,identity\)/);
assert.match(data, /crypto\.subtle\.digest\("SHA-256"/);
assert.match(data, /clearRequestKey/);
assert.match(data, /requestKey,clearRequestKey/);
assert.match(journalUi, /D\.requestKey\("journal-draft"/);
assert.match(journalUi, /p_request_id:requestId/);
assert.match(journalUi, /entry_date:entryDate/);
assert.match(journalUi, /p_entry_date:entryDate/);
assert.match(journalUi, /await load\(\);D\.clearRequestKey\("journal-draft",requestId\)/);
assert.match(inventoryUi, /D\.requestKey\("inventory-opening"/);
assert.match(inventoryUi, /p_request_id:requestId/);
assert.match(inventoryUi, /await load\(\);D\.clearRequestKey\("inventory-opening",requestId\)/);
console.log("Owner-scoped RPC idempotency contract passed.");
