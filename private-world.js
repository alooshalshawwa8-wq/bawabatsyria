/* Private World entry shell — owner-claim gated prototype.
 * This is a UI gate only. It does NOT make GitHub Pages private or replace server-side authorization.
 */
(() => {
  "use strict";
  if (window.__PRIVATE_WORLD_SHELL_V1__) return;
  window.__PRIVATE_WORLD_SHELL_V1__ = true;

  const SESSION_KEY = "bawabatsyria_auth_session";
  const rootId = "private-world-shell";
  const text = (tag, value, className) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };

  function readSession() {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (saved && typeof saved.access_token === "string" && saved.access_token) return saved;
    } catch (_) {}
    const legacy = localStorage.getItem("bawabatsyria_access_token");
    return legacy ? { access_token: legacy } : null;
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
    if (document.getElementById(rootId)) return;
    const root = text("section", undefined, "pws-root");
    root.id = rootId;
    root.setAttribute("aria-label", "مدخل العالم الرقمي الشخصي");

    const style = text("style");
    style.textContent = `
      .pws-launch{position:fixed;z-index:9990;inset-inline-start:14px;bottom:14px;border:1px solid #527b9a;border-radius:999px;background:#102b40;color:#f0f8ff;padding:12px 16px;font:600 13px system-ui;box-shadow:0 8px 28px #0005;cursor:pointer}
      .pws-backdrop{position:fixed;z-index:9991;inset:0;background:#020914d9;display:grid;place-items:center;padding:16px}
      .pws-panel{width:min(720px,100%);max-height:90dvh;overflow:auto;background:#0c1b2b;color:#eaf3fb;border:1px solid #35536d;border-radius:18px;padding:20px;font:14px/1.8 system-ui;box-shadow:0 18px 60px #0008}
      .pws-panel h2{margin:0 0 6px;color:#d5ecff;font-size:21px}
      .pws-muted{color:#afc1d2;font-size:12px}
      .pws-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin:18px 0}
      .pws-card{border:1px solid #29445c;border-radius:12px;padding:12px;background:#10243a}
      .pws-card strong{display:block;color:#e4f2ff;margin-bottom:4px}
      .pws-state{font-size:11px;color:#f3d28b}
      .pws-warning{border:1px solid #8c6332;background:#392a18;color:#ffe6bd;padding:12px;border-radius:12px;font-size:12px}
      .pws-close{border:1px solid #54728b;background:#17344d;color:white;border-radius:10px;padding:9px 14px;cursor:pointer;font:inherit}
      .pws-launch:focus-visible,.pws-close:focus-visible{outline:3px solid #f4d28b;outline-offset:3px}
    `;

    const launch = text("button", "فتح مساحة المالك", "pws-launch");
    launch.type = "button";
    launch.addEventListener("click", () => {
      if (root.querySelector(".pws-backdrop")) return;
      const backdrop = text("div", undefined, "pws-backdrop");
      backdrop.setAttribute("role", "dialog");
      backdrop.setAttribute("aria-modal", "true");
      backdrop.setAttribute("aria-labelledby", "pws-title");
      const panel = text("div", undefined, "pws-panel");
      const heading = text("h2", "مساحة العالم الرقمي الشخصي");
      heading.id = "pws-title";
      panel.append(
        heading,
        text("p", "تم التحقق من مطالبة ملكية الحساب على خادم الهوية.", "pws-muted")
      );
      const grid = text("div", undefined, "pws-grid");
      [
        ["المركز الشخصي", "هيكل الواجهة الأولي فقط"],
        ["محرك المهام", "غير متصل بعد"],
        ["الذاكرة والمعرفة", "غير متصلة بعد"],
        ["توجيه الذكاء الاصطناعي", "غير متصل بعد"],
        ["التكاملات", "لم يتم التحقق من تشغيلها"],
        ["التشغيل والنسخ الاحتياطي", "يحتاج اختباراً مستقلاً"]
      ].forEach(([name, state]) => {
        const card = text("div", undefined, "pws-card");
        card.append(text("strong", name), text("span", state, "pws-state"));
        grid.append(card);
      });
      panel.append(grid);
      panel.append(text("p",
        "تنبيه أمني: هذه اللوحة لا تجعل الموقع الحالي خاصاً. ما زالت صفحات التطبيق العامة متاحة، ولا يجوز إدخال معلومات حساسة هنا. يلزم إغلاق الوصول العام وحماية الخادم والبيانات قبل اعتبار التحول مكتملاً.",
        "pws-warning"));
      const close = text("button", "إغلاق", "pws-close");
      close.type = "button";
      close.addEventListener("click", () => backdrop.remove());
      backdrop.addEventListener("click", event => {
        if (event.target === backdrop) backdrop.remove();
      });
      panel.append(close);
      backdrop.append(panel);
      root.append(backdrop);
      close.focus();
    });
    root.append(style, launch);
    document.body.append(root);
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