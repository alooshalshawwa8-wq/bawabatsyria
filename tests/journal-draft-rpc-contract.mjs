import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const migration = await read("supabase/migrations/20261115190000_create_atomic_journal_draft_rpc.sql");
const data = await read("ofoq-data.js");
const ui = await read("ofoq-workspace-extensions.js");

assert.match(migration, /create or replace function public\.create_journal_draft\(/i);
assert.match(migration, /p_request_id uuid/i);
assert.match(migration, /for update/i);
assert.match(migration, /set result_id = v_entry_id/i);
assert.match(migration, /security invoker/i, "Draft RPC must respect caller RLS");
assert.match(migration, /set search_path = ''/i, "Draft RPC must pin an empty search_path");
assert.match(migration, /auth\.uid\(\)/, "Draft RPC must derive owner from the authenticated session");
assert.match(migration, /a\.user_id = v_user_id[\s\S]*?a\.is_active = true/i, "Only the current user's active accounts may be used");
assert.match(migration, /v_debit_currency is distinct from v_credit_currency/i, "Mixed-currency journal lines must be rejected");
assert.match(migration, /insert into public\.journal_entries[\s\S]*?insert into public\.journal_lines/i, "Header and both lines must be inserted in the same function transaction");
assert.match(migration, /revoke all on function public\.create_journal_draft[\s\S]*?from public, anon/i);
assert.match(migration, /grant execute on function public\.create_journal_draft[\s\S]*?to authenticated/i);
assert.doesNotMatch(migration, /security definer/i, "Draft RPC must not bypass RLS");

assert.match(data, /async function rpc\(name,args,retried\)/, "Shared data layer must expose authenticated RPC transport");
assert.match(data, /async function requestKey\(scope,identity\)/);
assert.match(data, /clearRequestKey/);
assert.match(data, /\/rest\/v1\/rpc\//, "RPC transport must use the PostgREST RPC endpoint");
assert.match(data, /Object\.freeze\(\{getUser,request,rpc,requestKey,clearRequestKey,track,edge,/, "RPC transport must be exported");

assert.match(ui, /D\.rpc\("create_journal_draft"/, "Journal UI must use the atomic draft RPC");
assert.doesNotMatch(ui, /D\.request\("journal_entries",\{method:"POST"/, "Journal UI must not create a header separately");
assert.doesNotMatch(ui, /D\.request\("journal_lines",\{method:"POST"/, "Journal UI must not create lines separately");
assert.match(ui, /لم تُرحّل إلى الدفاتر النهائية/, "Draft creation must remain separate from posting");

console.log("Atomic journal draft RPC contract passed.");
