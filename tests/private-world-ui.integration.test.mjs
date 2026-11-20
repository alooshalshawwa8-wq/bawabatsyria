import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

function makeStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  };
}

test("app shell loads the private-world adapter after the shared Auth data layer", () => {
  const html = read("index.html");
  const dataAt = html.indexOf('<script src="./ofoq-data.js" defer></script>');
  const gateAt = html.indexOf('<script src="./ofoq-private-world.js" defer></script>');
  assert.ok(dataAt >= 0, "shared data layer script is present");
  assert.ok(gateAt > dataAt, "private-world adapter loads after the data layer");
});

test("shared data layer invokes the PostgreSQL owner RPC with the current authenticated JWT", async () => {
  const localStorage = makeStorage({
    bawabatsyria_auth_session: JSON.stringify({ access_token: "test-owner-jwt", refresh_token: "", expires_at: Date.now() + 3600000 })
  });
  const calls = [];
  const window = { BAWABA_SUPABASE_URL: "https://isolated.test", BAWABA_SUPABASE_ANON_KEY: "test-anon" };
  const context = {
    window, localStorage, sessionStorage: makeStorage(),
    URLSearchParams, Date, JSON, Error, Object, String, Number, Math, Promise,
    crypto: { randomUUID: () => "test-session" },
    fetch: async (url, init = {}) => {
      calls.push({ url, init });
      if (url.endsWith("/auth/v1/user")) return { ok: true, status: 200, json: async () => ({ id: "owner-fixture", email: "owner@example.invalid" }) };
      if (url.endsWith("/rest/v1/rpc/private_world_is_owner")) return { ok: true, status: 200, text: async () => "true" };
      throw new Error("Unexpected URL " + url);
    }
  };
  vm.runInNewContext(read("ofoq-data.js"), context);
  const result = await window.OFOQData.rpc("private_world_is_owner", {});
  assert.equal(result, true);
  const rpc = calls.find((x) => x.url.endsWith("/rest/v1/rpc/private_world_is_owner"));
  assert.ok(rpc);
  assert.equal(rpc.init.headers.Authorization, "Bearer test-owner-jwt");
  assert.equal(rpc.init.headers.apikey, "test-anon");
});

test("RPC rejects unsafe procedure names before making a request", async () => {
  const localStorage = makeStorage({
    bawabatsyria_auth_session: JSON.stringify({ access_token: "test-jwt", refresh_token: "", expires_at: Date.now() + 3600000 })
  });
  let requests = 0;
  const window = { BAWABA_SUPABASE_URL: "https://isolated.test", BAWABA_SUPABASE_ANON_KEY: "test-anon" };
  const context = { window, localStorage, sessionStorage: makeStorage(), URLSearchParams, Date, JSON, Error, Object, String, Number, Math, Promise, crypto: { randomUUID: () => "x" }, fetch: async () => { requests++; throw new Error("unexpected"); } };
  vm.runInNewContext(read("ofoq-data.js"), context);
  await assert.rejects(window.OFOQData.rpc("private_world_is_owner;drop_table", {}), /اسم إجراء/);
  assert.equal(requests, 0);
});

test("owner gate reads private tasks only after PostgreSQL returns true", async () => {
  const calls = [];
  const window = {
    OFOQData: {
      getUser: async () => ({ id: "owner-fixture" }),
      rpc: async (name, args) => { calls.push(["rpc", name, args]); return true; },
      request: async (table, options) => { calls.push(["select", table, options]); return [{ id: "task-1", title: "fixture", status: "inbox" }]; }
    },
    addEventListener() {}
  };
  const document = { getElementById: () => null, createElement: () => ({}) };
  vm.runInNewContext(read("ofoq-private-world.js"), { window, document, Object, String, Error });
  const result = await window.OFOQPrivateWorld.verify();
  assert.equal(result.owner, true);
  assert.equal(result.taskCount, 1);
  assert.deepEqual(calls.map((x) => x[0]), ["rpc", "select"]);
  assert.equal(calls[1][1], "private_world_tasks");
});

test("non-owner gate never queries private tables", async () => {
  const calls = [];
  const window = {
    OFOQData: {
      getUser: async () => ({ id: "ordinary-user-fixture" }),
      rpc: async (name) => { calls.push(["rpc", name]); return false; },
      request: async (...args) => { calls.push(["select", ...args]); throw new Error("private query must not run"); }
    },
    addEventListener() {}
  };
  const document = { getElementById: () => null, createElement: () => ({}) };
  vm.runInNewContext(read("ofoq-private-world.js"), { window, document, Object, String, Error });
  const result = await window.OFOQPrivateWorld.verify();
  assert.equal(result.owner, false);
  assert.equal(result.taskCount, 0);
  assert.deepEqual(calls, [["rpc", "private_world_is_owner"]]);
});

test("owner gate fails closed when auth or RPC validation fails", async () => {
  const window = { OFOQData: { getUser: async () => ({ id: "fixture" }), rpc: async () => { throw new Error("JWT rejected"); }, request: async () => { throw new Error("must not query"); } }, addEventListener() {} };
  const document = { getElementById: () => null, createElement: () => ({}) };
  vm.runInNewContext(read("ofoq-private-world.js"), { window, document, Object, String, Error });
  await assert.rejects(window.OFOQPrivateWorld.verify(), /JWT rejected/);
});
