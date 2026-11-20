/* OFOQ Private World owner gate adapter v1.
 * Uses the existing Supabase Auth session, but asks PostgreSQL itself to decide ownership.
 * UI metadata, /api/me entitlements, and localStorage flags are never treated as proof.
 */
(function () {
  "use strict";
  if (window.__OFOQ_PRIVATE_WORLD_GATE_V1__) return;
  window.__OFOQ_PRIVATE_WORLD_GATE_V1__ = true;

  const PANEL_ID = "ofoq-private-world-gate";
  const el = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  };

  async function verify() {
    if (!window.OFOQData || typeof window.OFOQData.rpc !== "function") {
      throw new Error("طبقة الاتصال الآمن غير جاهزة.");
    }
    const user = await window.OFOQData.getUser(true);
    // The SECURITY INVOKER RPC reads verified app_metadata from the signed JWT.
    const owner = await window.OFOQData.rpc("private_world_is_owner", {});
    if (owner !== true) return { owner: false, userId: user.id, taskCount: 0 };
    // This SELECT is deliberately read-only; RLS remains the final authorization boundary.
    const tasks = await window.OFOQData.request("private_world_tasks", {
      query: { select: "id,title,status", order: "updated_at.desc", limit: "5" }
    });
    if (!Array.isArray(tasks)) throw new Error("استجابة مهام العالم الخاص غير صالحة.");
    return { owner: true, userId: user.id, taskCount: tasks.length };
  }

  function mount() {
    const host = document.getElementById("membershipPanel");
    if (!host || document.getElementById(PANEL_ID)) return;
    const card = el("section", "ofoq-private-world-gate");
    card.id = PANEL_ID;
    card.style.cssText = "margin:16px 0;padding:16px;border:1px solid #52718a;border-radius:14px;background:#0b1d30;color:#edf7ff";
    const title = el("h3", "", "النواة المركزية · العالم الرقمي الخاص");
    title.style.cssText = "margin:0 0 8px;color:#d5efff;font-size:16px";
    const description = el("p", "", "التحقق من صلاحية المالك يتم داخل PostgreSQL، وليس اعتماداً على شارة الحساب أو بيانات الواجهة.");
    description.style.cssText = "font-size:12px;line-height:1.8;color:#afc6d5";
    const status = el("div", "", "لم يُجرَ التحقق بعد.");
    status.id = "ofoq-private-world-gate-status";
    status.setAttribute("role", "status");
    const button = el("button", "btn secondary", "التحقق من بوابة العالم الخاص");
    button.type = "button";
    button.addEventListener("click", async () => {
      button.disabled = true;
      status.textContent = "جارٍ التحقق من الجلسة وصلاحية قاعدة البيانات…";
      try {
        const result = await verify();
        if (!result.owner) {
          status.textContent = "لم تمنح قاعدة البيانات هذه الجلسة صلاحية مالك العالم الخاص. لم تُطلب أي بيانات خاصة.";
          return;
        }
        status.textContent = "اجتاز الحساب بوابة PostgreSQL. اتصال القراءة ناجح؛ عدد المهام المعروضة: " + result.taskCount + ".";
      } catch (error) {
        status.textContent = error.message || "تعذر التحقق من بوابة العالم الخاص.";
      } finally {
        button.disabled = false;
      }
    });
    card.append(title, description, button, status);
    host.append(card);
  }

  window.OFOQPrivateWorld = Object.freeze({ verify, mount });
  mount();

  // The existing page calls this after login / opening the membership panel.
  // Wrap only that local function; no Auth settings or production services are changed.
  const originalLoad = window.loadMembership;
  if (typeof originalLoad === "function" && !originalLoad.__ofoqPrivateWorldWrapped) {
    const wrapped = async function () {
      const result = await originalLoad.apply(this, arguments);
      mount();
      return result;
    };
    wrapped.__ofoqPrivateWorldWrapped = true;
    window.loadMembership = wrapped;
  }
})();
