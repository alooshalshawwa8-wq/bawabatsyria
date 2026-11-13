/* OFOQ Personal Vault v1 — explicit user-owned backups for allowlisted local workspaces. */
(function () {
  "use strict";
  if (window.__OFOQ_PERSONAL_VAULT_V1__) return;
  window.__OFOQ_PERSONAL_VAULT_V1__ = true;

  const SESSION_KEY = "ofoq_cloud_backup_session_v1";
  const TABLE = "user_workspace_backups";
  const BASE = String(window.BAWABA_SUPABASE_URL || "").replace(/\/$/, "");
  const ANON = String(window.BAWABA_SUPABASE_ANON_KEY || "");
  const FIXED_KEYS = [
    "ofoq_personal_space_v1",
    "ofoq_operations_hub_v1",
    "ofoq_operations_recovery_archive_v1",
    "ofoq_operations_hub_recovery_v1",
    "ofoq_ecommerce_scenarios_v1",
    "ofoq_ecommerce_launch_checklist_v1",
    "ofoq_ecommerce_products_v1",
    "ofoq_ecommerce_orders_v1",
    "ofoq_ecommerce_deleted_orders_v1",
    "ofoq_career_applications_v1",
    "ofoq_football_fan_passport_v1",
    "ofoq_football_fan_poll_v1",
    "ofoq_football_fan_vote_v1",
    "ofoq_trading_journal_v1",
    "ofoq_trading_checklist_v1",
    "ofoq-favorites-v1",
    "bawabatsyria_football_favorites_v1",
    "bawabatsyria_stock_v1",
    "bawabatsyria_trade_ledger_v1",
    "bawabatsyria_trade_expenses_v1",
    "bawabatsyria_trade_invoice_numbers_v1",
    "bawabatsyria_trade_settlements_v1",
    "bawabatsyria_trade_parties_v1",
    "bawabatsyria_treasury_accounts_v1",
    "bawabatsyria_treasury_moves_v1",
    "bawabatsyria_treasury_assets_v1",
    "bawabatsyria_treasury_obligations_v1",
    "bawabatsyria_treasury_obligation_payments_v1",
    "bawabatsyria_treasury_reconciliations_v1"
  ];
  const MAX_BYTES = 1_800_000;
  const MAX_KEYS = 120;
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const readSession = () => {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      return s && typeof s.access_token === "string" && typeof s.refresh_token === "string" &&
        s.user && typeof s.user.id === "string" ? s : null;
    } catch (_) { return null; }
  };
  const isAllowedKey = key => FIXED_KEYS.includes(key) || key.startsWith("ofoq-notes-");
  const allCurrentKeys = () => {
    const found = new Set(FIXED_KEYS);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("ofoq-notes-")) found.add(key);
    }
    return [...found];
  };
  const capture = () => {
    const keys = {};
    for (const key of allCurrentKeys()) {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      try { keys[key] = JSON.parse(raw); }
      catch (_) { throw new Error("توجد بيانات غير صالحة في مساحة العمل (" + key + ")؛ لم تُنشأ النسخة."); }
    }
    return keys;
  };
  const byteLength = value => new TextEncoder().encode(value).length;

  async function mount() {
    const host = document.getElementById("ofoq-personal-space");
    if (!host || host.querySelector(".ofoq-personal-vault")) return;
    const panel = el("section", "ofoq-personal-vault");
    const style = el("style");
    style.textContent = `
      .ofoq-personal-vault{margin-top:15px;padding:14px;border:1px solid var(--line,#2a3a55);border-radius:14px;background:#0d1b2d}
      .ofoq-personal-vault h3{margin:0 0 6px;color:var(--gold2,#ffda83);font-size:14px}
      .ofoq-personal-vault p{margin:7px 0;color:var(--muted,#a8b4c8);font-size:11px;line-height:1.8}
      .ofoq-personal-vault .opv-actions{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}
      .ofoq-personal-vault button,.ofoq-personal-vault select{border:1px solid var(--line,#2a3a55);border-radius:9px;background:#101f33;color:#eef4fb;padding:9px 11px;font:inherit;font-size:11px}
      .ofoq-personal-vault button{cursor:pointer}
      .ofoq-personal-vault button:focus-visible,.ofoq-personal-vault select:focus-visible{outline:2px solid var(--gold,#e8b44d);outline-offset:2px}
      .ofoq-personal-vault button:disabled{opacity:.55;cursor:wait}
      .ofoq-personal-vault select{min-width:min(100%,250px);max-width:100%}
      .ofoq-personal-vault .opv-status{padding:9px;border:1px solid #30445e;border-radius:9px;background:#091525;white-space:pre-wrap;overflow-wrap:anywhere}
    `;
    const title = el("h3", "", "☁️ خزنة أُفُق — نسخة شاملة لمساحات العمل");
    const description = el("p", "", "احفظ المفضلات وملاحظات الأقسام وسجلات التجارة والمحاسبة والعمل والملفات المحلية المسموح بها في حسابك، ثم استعدها على جهاز آخر. النسخ لا تشمل كلمات المرور أو رموز الدخول أو سجل محادثات المساعد. التخزين خاص بالحساب عبر RLS لكنه غير مشفر من طرف العميل.");
    const actions = el("div", "opv-actions");
    const saveButton = el("button", "", "حفظ نسخة شاملة");
    const listButton = el("button", "", "عرض النسخ المحفوظة");
    const loginButton = el("button", "", "تسجيل الدخول عبر بوابة الأعمال");
    const backupSelect = el("select");
    backupSelect.setAttribute("aria-label", "النسخة السحابية المراد استعادتها أو حذفها");
    const restoreButton = el("button", "", "استعادة النسخة المحددة");
    const deleteButton = el("button", "", "حذف النسخة المحددة");
    const status = el("p", "opv-status", "تحتاج إلى تسجيل الدخول عبر الخزنة السحابية في بوابة الأعمال.");
    [saveButton, listButton, loginButton, restoreButton, deleteButton].forEach(button => { button.type = "button"; });
    actions.append(saveButton, listButton, loginButton);
    const selection = el("div", "opv-actions");
    selection.append(backupSelect, restoreButton, deleteButton);
    panel.append(style, title, description, actions, selection, status);
    host.append(panel);

    let backups = [];
    const setStatus = text => { status.textContent = text; };
    const setBusy = busy => [saveButton, listButton, loginButton, restoreButton, deleteButton].forEach(button => { button.disabled = busy; });
    const authRequest = async (path, body) => {
      const response = await fetch(BASE + "/auth/v1" + path, {
        method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
        body: JSON.stringify(body), cache: "no-store"
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "تعذر تحديث جلسة الدخول.");
      return data;
    };
    const refresh = async () => {
      const current = readSession();
      if (!current) throw new Error("سجّل الدخول أولاً.");
      const next = await authRequest("/token?grant_type=refresh_token", { refresh_token: current.refresh_token });
      if (!next.access_token || !next.refresh_token || !next.user || next.user.id !== current.user.id) {
        throw new Error("تعذر التحقق من جلسة الحساب؛ سجّل الدخول مجدداً.");
      }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        access_token: next.access_token, refresh_token: next.refresh_token,
        user: { id: next.user.id, email: next.user.email || null }
      }));
      return readSession();
    };
    const api = async (path, options = {}, retry = true) => {
      let current = readSession();
      if (!current) throw new Error("سجّل الدخول عبر بوابة الأعمال أولاً.");
      const headers = Object.assign({
        apikey: ANON, Authorization: "Bearer " + current.access_token,
        "Content-Type": "application/json"
      }, options.headers || {});
      let response = await fetch(BASE + "/rest/v1/" + path, Object.assign({}, options, { headers, cache: "no-store" }));
      if (response.status === 401 && retry) {
        await refresh();
        return api(path, options, false);
      }
      const raw = await response.text();
      let data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch (_) { data = { message: raw }; }
      if (!response.ok) throw new Error(data && (data.message || data.details || data.hint) || "فشل الوصول إلى الخزنة (" + response.status + ").");
      return data;
    };
    const renderBackups = () => {
      backupSelect.replaceChildren();
      const empty = el("option", "", "اختر نسخة محفوظة");
      empty.value = "";
      backupSelect.append(empty);
      backups.forEach(backup => {
        const date = new Date(backup.created_at).toLocaleString("ar");
        const option = el("option", "", (backup.label || "نسخة") + " · " + date);
        option.value = backup.id;
        backupSelect.append(option);
      });
    };
    const loadBackups = async () => {
      const rows = await api(TABLE + "?select=id,label,created_at,schema_version&backup_type=eq.all_local&order=created_at.desc&limit=20");
      backups = Array.isArray(rows) ? rows : [];
      renderBackups();
      setStatus("عدد النسخ الشاملة المحفوظة في حسابك: " + backups.length + ". النسخ تخص هذا الحساب فقط.");
    };

    saveButton.addEventListener("click", async () => {
      setBusy(true);
      try {
        const current = readSession();
        if (!current) throw new Error("سجّل الدخول عبر بوابة الأعمال أولاً.");
        const keys = capture();
        if (Object.keys(keys).length > MAX_KEYS) throw new Error("تجاوز عدد مفاتيح النسخة الحد الآمن.");
        const payload = { app: "ofoq-full-local-workspace", version: 1, capturedAt: new Date().toISOString(), keys };
        const serialized = JSON.stringify(payload);
        if (byteLength(serialized) > MAX_BYTES) throw new Error("حجم النسخة أكبر من الحد الآمن؛ صدّر بعض السجلات منفصلة.");
        const label = "نسخة أُفُق الشاملة · " + new Date().toLocaleString("ar");
        await api(TABLE, {
          method: "POST", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ user_id: current.user.id, backup_type: "all_local", schema_version: 1, label, payload })
        });
        await loadBackups();
        setStatus("تم حفظ نسخة شاملة بنجاح. السجلات المحفوظة: " + Object.keys(keys).length + ". لم تُرسل كلمات المرور أو رموز الدخول أو محادثات المساعد.");
      } catch (error) { setStatus("تعذر حفظ النسخة: " + (error.message || "خطأ غير معروف")); }
      finally { setBusy(false); }
    });

    listButton.addEventListener("click", async () => {
      setBusy(true);
      try { await loadBackups(); }
      catch (error) { setStatus("تعذر تحميل النسخ: " + (error.message || "خطأ غير معروف")); }
      finally { setBusy(false); }
    });

    restoreButton.addEventListener("click", async () => {
      const selected = backups.find(backup => backup.id === backupSelect.value);
      if (!selected) { setStatus("اختر نسخة محفوظة أولاً."); return; }
      if (!confirm("ستُستبدل مفاتيح مساحة العمل المسموح بها فقط بالبيانات الموجودة في هذه النسخة. لن تتغير جلسة الدخول أو كلمات المرور أو محادثات المساعد. هل تريد المتابعة؟")) return;
      setBusy(true);
      try {
        const selectedRows = await api(TABLE + "?select=id,payload,schema_version&backup_type=eq.all_local&id=eq." + encodeURIComponent(selected.id) + "&limit=1");
        const payload = Array.isArray(selectedRows) && selectedRows[0] ? selectedRows[0].payload : null;
        if (!payload || payload.app !== "ofoq-full-local-workspace" || payload.version !== 1 ||
            !payload.keys || typeof payload.keys !== "object" || Array.isArray(payload.keys)) {
          throw new Error("صيغة النسخة غير متوافقة.");
        }
        const entries = Object.entries(payload.keys);
        if (entries.length > MAX_KEYS || byteLength(JSON.stringify(payload)) > MAX_BYTES ||
            !entries.every(([key]) => isAllowedKey(key))) {
          throw new Error("تحتوي النسخة على مفاتيح غير مسموح بها أو تجاوزت الحدود.");
        }
        const targetKeys = new Set([...allCurrentKeys(), ...entries.map(([key]) => key)]);
        const previous = new Map([...targetKeys].map(key => [key, localStorage.getItem(key)]));
        try {
          for (const key of targetKeys) {
            if (Object.prototype.hasOwnProperty.call(payload.keys, key)) {
              localStorage.setItem(key, JSON.stringify(payload.keys[key]));
            } else {
              localStorage.removeItem(key);
            }
          }
        } catch (writeError) {
          for (const [key, raw] of previous) {
            try { if (raw === null) localStorage.removeItem(key); else localStorage.setItem(key, raw); } catch (_) {}
          }
          throw new Error("تعذر استعادة بعض البيانات؛ تمت محاولة إعادة الحالة السابقة. " + (writeError.message || ""));
        }
        window.dispatchEvent(new CustomEvent("ofoq:personal-space-restored"));
        window.dispatchEvent(new CustomEvent("ofoq:commerce-synced"));
        setStatus("تمت استعادة " + entries.length + " مفتاحاً من النسخة المحددة. أعد فتح أي قسم لمعاينة بياناته.");
      } catch (error) { setStatus("تعذر استعادة النسخة: " + (error.message || "خطأ غير معروف")); }
      finally { setBusy(false); }
    });

    deleteButton.addEventListener("click", async () => {
      const selected = backups.find(backup => backup.id === backupSelect.value);
      if (!selected) { setStatus("اختر نسخة محفوظة أولاً."); return; }
      if (!confirm("هل تريد حذف النسخة السحابية المحددة نهائياً؟")) return;
      setBusy(true);
      try {
        await api(TABLE + "?id=eq." + encodeURIComponent(selected.id) + "&backup_type=eq.all_local", {
          method: "DELETE", headers: { Prefer: "return=minimal" }
        });
        await loadBackups();
        setStatus("تم حذف النسخة السحابية المحددة.");
      } catch (error) { setStatus("تعذر حذف النسخة: " + (error.message || "خطأ غير معروف")); }
      finally { setBusy(false); }
    });

    loginButton.addEventListener("click", () => {
      const business = (window.BAWABA_SECTIONS || []).find(section => section.id === "business");
      if (business && typeof window.openSection === "function") window.openSection(business);
      else setStatus("تعذر فتح بوابة الأعمال؛ أعد تحميل الموقع وحاول مجدداً.");
    });
    if (readSession()) setStatus("تم العثور على جلسة حساب. يمكنك حفظ نسخة شاملة أو عرض النسخ السابقة.");
    else setStatus("سجّل الدخول عبر الخزنة السحابية في بوابة الأعمال أولاً، ثم عُد إلى هذه الصفحة.");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
