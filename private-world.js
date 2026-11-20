/* Private World — owner-claim gated local task workspace.
 * This is NOT an access-control boundary and does NOT make the public site private.
 * Task data stays in this browser's localStorage; it is not encrypted or synced.
 */
(() => {
  "use strict";
  if (window.__PRIVATE_WORLD_SHELL_V2__) return;
  window.__PRIVATE_WORLD_SHELL_V2__ = true;

  const SESSION_KEY = "bawabatsyria_auth_session";
  const TASKS_KEY = "private_world_tasks_v1";
  const ROOT_ID = "private-world-shell";
  const MAX_TASKS = 100;
  const MAX_TITLE = 240;
  const PRIORITIES = ["low", "normal", "high"];
  const STATUSES = ["todo", "doing", "done"];

  const safeClone = value => JSON.parse(JSON.stringify(value));
  const validTask = task => Boolean(task && typeof task === "object" &&
    typeof task.id === "string" && typeof task.title === "string" &&
    task.title.length > 0 && task.title.length <= MAX_TITLE &&
    PRIORITIES.includes(task.priority) && STATUSES.includes(task.status) &&
    typeof task.createdAt === "string" && typeof task.updatedAt === "string");

  function createTaskEngine(storage, key = TASKS_KEY) {
    if (!storage || typeof storage.getItem !== "function" ||
        typeof storage.setItem !== "function") {
      throw new TypeError("A compatible storage adapter is required");
    }
    let tasks = [];
    const raw = storage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length > MAX_TASKS ||
          !parsed.every(validTask)) {
        throw new Error("Stored task data is invalid; it was not overwritten");
      }
      tasks = parsed.map(safeClone);
    }
    const persist = next => {
      storage.setItem(key, JSON.stringify(next));
      tasks = next;
    };
    const makeId = () => {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
      }
      return "task-" + Date.now().toString(36) + "-" +
        Math.random().toString(36).slice(2, 12);
    };
    return Object.freeze({
      list() { return tasks.map(safeClone); },
      add(input) {
        const title = String(input && input.title || "").trim();
        const priority = input && input.priority || "normal";
        if (!title || title.length > MAX_TITLE) throw new TypeError("Task title must contain 1–240 characters");
        if (!PRIORITIES.includes(priority)) throw new TypeError("Invalid task priority");
        if (tasks.length >= MAX_TASKS) throw new Error("Task limit reached");
        const now = new Date().toISOString();
        const task = { id: makeId(), title, priority, status: "todo", createdAt: now, updatedAt: now };
        persist([...tasks, task]);
        return safeClone(task);
      },
      update(id, patch) {
        const index = tasks.findIndex(task => task.id === id);
        if (index < 0) throw new Error("Task not found");
        const current = tasks[index];
        const next = { ...current };
        if (Object.prototype.hasOwnProperty.call(patch || {}, "title")) {
          const title = String(patch.title || "").trim();
          if (!title || title.length > MAX_TITLE) throw new TypeError("Task title must contain 1–240 characters");
          next.title = title;
        }
        if (Object.prototype.hasOwnProperty.call(patch || {}, "priority")) {
          if (!PRIORITIES.includes(patch.priority)) throw new TypeError("Invalid task priority");
          next.priority = patch.priority;
        }
        if (Object.prototype.hasOwnProperty.call(patch || {}, "status")) {
          if (!STATUSES.includes(patch.status)) throw new TypeError("Invalid task status");
          next.status = patch.status;
        }
        next.updatedAt = new Date().toISOString();
        const updated = tasks.slice();
        updated[index] = next;
        persist(updated);
        return safeClone(next);
      },
      remove(id) {
        if (!tasks.some(task => task.id === id)) return false;
        persist(tasks.filter(task => task.id !== id));
        return true;
      }
    });
  }

  // Exposed only as a local test seam; it grants no server or account privileges.
  window.PrivateWorldTaskEngine = Object.freeze({ create: createTaskEngine });

  const make = (tag, value, className) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };

  function readSession() {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (saved && typeof saved.access_token === "string" && saved.access_token) return saved;
      const legacy = localStorage.getItem("bawabatsyria_access_token");
      return legacy ? { access_token: legacy } : null;
    } catch (_) {
      return null;
    }
  }

  async function verifyOwner() {
    const base = String(window.BAWABA_SUPABASE_URL || "").replace(/\/$/, "");
    const key = String(window.BAWABA_SUPABASE_ANON_KEY || "");
    const session = readSession();
    if (!base || !key || !session) return false;
    const response = await fetch(base + "/auth/v1/user", {
      method: "GET",
      headers: { apikey: key, Authorization: "Bearer " + session.access_token },
      cache: "no-store"
    });
    if (!response.ok) return false;
    const user = await response.json().catch(() => null);
    return Boolean(user && user.id && user.app_metadata &&
      user.app_metadata.private_world_owner === true);
  }

  function mount() {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = make("section");
      root.id = ROOT_ID;
      root.setAttribute("aria-label", "مدخل العالم الرقمي الشخصي");
      document.body.append(root);
    }
    if (root.querySelector(".pws-launch")) return;

    const style = make("style");
    style.textContent = `
      .pws-launch{position:fixed;z-index:9990;inset-inline-start:14px;bottom:14px;border:1px solid #527b9a;border-radius:999px;background:#102b40;color:#f0f8ff;padding:12px 16px;font:600 13px system-ui;box-shadow:0 8px 28px #0005;cursor:pointer}
      .pws-backdrop{position:fixed;z-index:9991;inset:0;background:#020914eF;display:grid;place-items:center;padding:12px}
      .pws-panel{width:min(760px,100%);max-height:94dvh;overflow:auto;background:#0c1b2b;color:#eaf3fb;border:1px solid #35536d;border-radius:18px;padding:18px;font:14px/1.8 system-ui;box-shadow:0 18px 60px #0008}
      .pws-panel h2{margin:0 0 6px;color:#d5ecff;font-size:21px}
      .pws-muted{color:#afc1d2;font-size:12px}
      .pws-warning{border:1px solid #8c6332;background:#392a18;color:#ffe6bd;padding:10px;border-radius:12px;font-size:12px;margin:12px 0}
      .pws-form{display:grid;grid-template-columns:1fr auto auto;gap:8px;margin:14px 0}
      .pws-form input,.pws-form select{min-width:0;background:#091626;color:#fff;border:1px solid #45617a;border-radius:9px;padding:10px;font:inherit}
      .pws-btn{border:1px solid #54728b;background:#17344d;color:white;border-radius:9px;padding:9px 12px;cursor:pointer;font:inherit}
      .pws-btn.primary{background:#b77b28;color:#101a29;border-color:#e5b85e;font-weight:700}
      .pws-list{display:grid;gap:8px;margin:12px 0}
      .pws-task{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;border:1px solid #29445c;border-radius:11px;padding:10px;background:#10243a}
      .pws-task-title{overflow-wrap:anywhere;font-weight:600}
      .pws-task-meta{font-size:11px;color:#afc1d2}
      .pws-task-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
      .pws-empty{padding:16px;text-align:center;color:#afc1d2;border:1px dashed #45617a;border-radius:10px}
      .pws-status{min-height:24px;color:#f3d28b;font-size:12px}
      .pws-close{margin-top:8px}
      .pws-launch:focus-visible,.pws-btn:focus-visible{outline:3px solid #f4d28b;outline-offset:3px}
      @media(max-width:560px){.pws-form{grid-template-columns:1fr 1fr}.pws-form input{grid-column:1/-1}.pws-task{grid-template-columns:1fr}.pws-task-actions{justify-content:flex-start}}
    `;

    const launch = make("button", "فتح مساحة المالك", "pws-launch");
    launch.type = "button";
    launch.addEventListener("click", () => {
      if (root.querySelector(".pws-backdrop")) return;
      const backdrop = make("div", undefined, "pws-backdrop");
      backdrop.setAttribute("role", "dialog");
      backdrop.setAttribute("aria-modal", "true");
      backdrop.setAttribute("aria-labelledby", "pws-title");
      const panel = make("div", undefined, "pws-panel");
      const heading = make("h2", "مساحة العالم الرقمي الشخصي");
      heading.id = "pws-title";
      panel.append(heading, make("p", "محرك المهام المحلي — الإصدار الأول", "pws-muted"));

      let engine;
      try {
        engine = createTaskEngine(window.localStorage);
      } catch (_) {
        panel.append(make("p", "تعذر قراءة المهام المحفوظة؛ لم يتم استبدال بيانات التخزين.", "pws-warning"));
      }

      const warning = make("p",
        "تنبيه: المهام محفوظة في هذا المتصفح فقط، دون تشفير أو مزامنة أو نسخ احتياطي. لا تحفظ كلمات مرور أو بيانات مالية أو معلومات حساسة. هذه الواجهة لا تجعل الموقع خاصاً ولا تحمي الصفحات العامة.",
        "pws-warning");
      panel.append(warning);

      const form = make("form", undefined, "pws-form");
      const title = make("input");
      title.type = "text"; title.maxLength = MAX_TITLE;
      title.placeholder = "اكتب مهمة جديدة…";
      title.setAttribute("aria-label", "عنوان المهمة");
      title.required = true;
      const priority = make("select");
      priority.setAttribute("aria-label", "أولوية المهمة");
      [["normal","عادية"],["high","عالية"],["low","منخفضة"]].forEach(([value,label]) => {
        const option = make("option", label); option.value = value; priority.append(option);
      });
      const add = make("button", "إضافة", "pws-btn primary");
      add.type = "submit";
      form.append(title, priority, add);
      panel.append(form);

      const list = make("div", undefined, "pws-list");
      list.setAttribute("aria-live", "polite");
      const status = make("p", "", "pws-status");
      const close = make("button", "إغلاق", "pws-btn pws-close");
      close.type = "button";
      close.addEventListener("click", () => backdrop.remove());
      backdrop.addEventListener("click", event => { if (event.target === backdrop) backdrop.remove(); });

      function renderTasks() {
        list.replaceChildren();
        if (!engine) { list.append(make("div", "محرك المهام غير متاح بسبب مشكلة في التخزين.", "pws-empty")); return; }
        const tasks = engine.list();
        if (!tasks.length) { list.append(make("div", "لا توجد مهام بعد. أضف أول مهمة للبدء.", "pws-empty")); return; }
        tasks.forEach(task => {
          const item = make("article", undefined, "pws-task");
          const info = make("div");
          info.append(make("div", task.title, "pws-task-title"));
          const statusLabel = task.status === "done" ? "مكتملة" : task.status === "doing" ? "قيد التنفيذ" : "جديدة";
          const priorityLabel = task.priority === "high" ? "عالية" : task.priority === "low" ? "منخفضة" : "عادية";
          info.append(make("div", statusLabel + " · أولوية " + priorityLabel, "pws-task-meta"));
          const actions = make("div", undefined, "pws-task-actions");
          const nextStatus = task.status === "todo" ? "doing" : task.status === "doing" ? "done" : "todo";
          const nextLabel = task.status === "todo" ? "بدء" : task.status === "doing" ? "إنجاز" : "إعادة فتح";
          const advance = make("button", nextLabel, "pws-btn"); advance.type = "button";
          advance.addEventListener("click", () => {
            try { engine.update(task.id, { status: nextStatus }); renderTasks(); status.textContent = "تم تحديث حالة المهمة."; }
            catch (_) { status.textContent = "تعذر حفظ التغيير في التخزين المحلي."; }
          });
          const remove = make("button", "حذف", "pws-btn"); remove.type = "button";
          remove.addEventListener("click", () => {
            try { engine.remove(task.id); renderTasks(); status.textContent = "حُذفت المهمة من هذا المتصفح."; }
            catch (_) { status.textContent = "تعذر حذف المهمة."; }
          });
          actions.append(advance, remove);
          item.append(info, actions); list.append(item);
        });
      }
      form.addEventListener("submit", event => {
        event.preventDefault();
        if (!engine) { status.textContent = "محرك المهام غير متاح."; return; }
        try {
          engine.add({ title: title.value, priority: priority.value });
          title.value = ""; status.textContent = "أضيفت المهمة وحُفظت محلياً."; renderTasks(); title.focus();
        } catch (error) { status.textContent = error.message || "تعذر إضافة المهمة."; }
      });
      renderTasks();
      panel.append(list, status, close);
      backdrop.append(panel); root.append(backdrop); close.focus();
    });
    root.append(style, launch);
  }

  function start() {
    verifyOwner().then(isOwner => { if (isOwner) mount(); }).catch(() => {});
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();