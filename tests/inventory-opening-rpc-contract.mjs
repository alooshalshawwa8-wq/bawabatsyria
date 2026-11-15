import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const migration = await read("supabase/migrations/20261115191000_create_atomic_inventory_item_rpc.sql");
const data = await read("ofoq-data.js");
const ui = await read("ofoq-workspaces.js");

assert.match(migration, /create or replace function public\.create_inventory_item_with_opening_movement\(/i);
assert.match(migration, /security invoker/i, "Inventory RPC must respect caller RLS");
assert.match(migration, /set search_path = ''/i, "Inventory RPC must pin an empty search_path");
assert.match(migration, /auth\.uid\(\)/, "Inventory RPC must derive owner from the authenticated session");
assert.match(migration, /insert into public\.inventory_items[\s\S]*?insert into public\.inventory_movements/i, "Item and opening movement must share one transaction");
assert.match(migration, /if p_quantity > 0 then[\s\S]*?movement_type, reference[\s\S]*?'opening'/i);
assert.match(migration, /revoke all on function public\.create_inventory_item_with_opening_movement[\s\S]*?from public, anon/i);
assert.match(migration, /grant execute on function public\.create_inventory_item_with_opening_movement[\s\S]*?to authenticated/i);
assert.doesNotMatch(migration, /security definer/i, "Inventory RPC must not bypass RLS");

assert.match(data, /async function rpc\(name,args,retried\)/);
const start = ui.indexOf('btn(a,"إضافة صنف"');
const end = ui.indexOf('btn(a,"تحديث المخزون"', start);
assert.ok(start >= 0 && end > start, "Inventory creation handler boundaries must exist");
const handler = ui.slice(start, end);
assert.match(handler, /D\.rpc\("create_inventory_item_with_opening_movement"/, "Inventory UI must use atomic creation");
assert.doesNotMatch(handler, /D\.request\("inventory_items",\{method:"POST"/, "Inventory UI must not create an item separately");
assert.doesNotMatch(handler, /D\.request\("inventory_movements",\{method:"POST"/, "Inventory UI must not create opening stock separately");

console.log("Atomic inventory opening balance contract passed.");
