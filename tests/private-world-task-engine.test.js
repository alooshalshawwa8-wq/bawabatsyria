/* Node.js built-in tests for the local private-world task engine.
 * Run: node --test tests/private-world-task-engine.test.js
 * No network, Supabase, browser account, or production service is used.
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function loadEngine() {
  const source = fs.readFileSync(path.join(__dirname, "..", "private-world.js"), "utf8");
  const sandbox = {
    window: { crypto: { randomUUID: () => "test-id-" + Math.random().toString(16).slice(2) } },
    document: { readyState: "loading", addEventListener() {} },
    localStorage: { getItem() { return null; }, setItem() {} },
    fetch() { throw new Error("Network access is forbidden in this test"); },
    console,
    Date,
    Math,
    JSON,
    Object,
    String,
    TypeError,
    Error
  };
  vm.runInNewContext(source, sandbox, { filename: "private-world.js" });
  return sandbox.window.PrivateWorldTaskEngine;
}

function memoryStorage(seed = null) {
  const data = new Map();
  if (seed !== null) data.set("private_world_tasks_v1", seed);
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, value); },
    raw(key = "private_world_tasks_v1") { return data.get(key); }
  };
}

test("creates and persists a task with safe defaults", () => {
  const storage = memoryStorage();
  const engine = loadEngine().create(storage);
  const task = engine.add({ title: "مراجعة المخزون" });
  assert.equal(task.title, "مراجعة المخزون");
  assert.equal(task.status, "todo");
  assert.equal(task.priority, "normal");
  assert.equal(engine.list().length, 1);
  assert.equal(JSON.parse(storage.raw()).length, 1);
});

test("rejects empty, oversized, and invalid-priority input", () => {
  const engine = loadEngine().create(memoryStorage());
  assert.throws(() => engine.add({ title: "   " }), TypeError);
  assert.throws(() => engine.add({ title: "x".repeat(241) }), TypeError);
  assert.throws(() => engine.add({ title: "مهمة", priority: "urgent-root" }), TypeError);
  assert.equal(engine.list().length, 0);
});

test("updates task status, priority, and title with validation", () => {
  const engine = loadEngine().create(memoryStorage());
  const task = engine.add({ title: "مهمة" });
  const updated = engine.update(task.id, { status: "doing", priority: "high", title: "مهمة معدلة" });
  assert.equal(updated.status, "doing");
  assert.equal(updated.priority, "high");
  assert.equal(updated.title, "مهمة معدلة");
  assert.throws(() => engine.update(task.id, { status: "root" }), TypeError);
});

test("removes a task and reports missing IDs safely", () => {
  const engine = loadEngine().create(memoryStorage());
  const task = engine.add({ title: "حذف اختباري" });
  assert.equal(engine.remove(task.id), true);
  assert.equal(engine.remove(task.id), false);
  assert.equal(engine.list().length, 0);
});

test("enforces the maximum task count", () => {
  const engine = loadEngine().create(memoryStorage());
  for (let i = 0; i < 100; i++) engine.add({ title: "Task " + i });
  assert.throws(() => engine.add({ title: "overflow" }), /limit/i);
  assert.equal(engine.list().length, 100);
});

test("rejects corrupted stored data without overwriting it", () => {
  const corrupted = "{not-json";
  const storage = memoryStorage(corrupted);
  assert.throws(() => loadEngine().create(storage));
  assert.equal(storage.raw(), corrupted);
});

test("does not mutate internal task objects through returned values", () => {
  const engine = loadEngine().create(memoryStorage());
  const task = engine.add({ title: "Immutable result" });
  task.title = "tampered";
  assert.equal(engine.list()[0].title, "Immutable result");
});

test("fails closed when storage writes fail", () => {
  const storage = {
    getItem() { return null; },
    setItem() { throw new Error("quota exceeded"); }
  };
  const engine = loadEngine().create(storage);
  assert.throws(() => engine.add({ title: "لا تحفظ" }), /quota/);
  assert.equal(engine.list().length, 0);
});
