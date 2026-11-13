/* OFOQ Commerce Cloud Bridge v1 — explicit, owner-scoped sync; no public storefront or payment processing. */
(function () {
  "use strict";
  if (window.__OFOQ_COMMERCE_CLOUD_V1__) return;
  const prior = window.openSection;
  if (typeof prior !== "function" || prior.__ofoqCommerceCloudWrapped) return;
  window.__OFOQ_COMMERCE_CLOUD_V1__ = true;

  const PRODUCT_KEY = "ofoq_ecommerce_products_v1";
  const ORDER_KEY = "ofoq_ecommerce_orders_v1";
  const ORDER_DELETE_KEY = "ofoq_ecommerce_deleted_orders_v1";
  const SESSION_KEY = "ofoq_cloud_backup_session_v1";
  const MAX_PRODUCTS = 500;
  const MAX_ORDERS = 1000;
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const readArray = key => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  };
  const writeArray = (key, rows) => {
    try { localStorage.setItem(key, JSON.stringify(rows)); return true; }
    catch (_) { return false; }
  };
  const validProduct = row => row && typeof row.id === "string" && row.id.length > 0 &&
    typeof row.name === "string" && row.name.trim().length > 0 &&
    Number.isFinite(Number(row.price)) && Number(row.price) >= 0 &&
    Number.isFinite(Number(row.cost || 0)) && Number(row.cost || 0) >= 0 &&
    Number.isInteger(Number(row.stock)) && Number(row.stock) >= 0;
  const validOrder = row => row && typeof row.id === "string" &&
    typeof row.orderNo === "string" && row.orderNo.trim().length > 0 &&
    typeof row.productId === "string" && typeof row.productName === "string" &&
    Number.isInteger(Number(row.qty)) && Number(row.qty) > 0 &&
    ["new", "processing", "shipped", "delivered", "cancelled"].includes(row.status);
  const time = value => {
    const parsed = Date.parse(value || "");
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const session = () => {
    try {
      const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      return value && typeof value.access_token === "string" &&
        typeof value.refresh_token === "string" && value.user && typeof value.user.id === "string"
        ? value : null;
    } catch (_) { return null; }
  };

  function mount() {
    const host = document.getElementById("specialTool");
    const root = host && host.querySelector(".ofoq-ecom-studio");
    if (!root || root.querySelector(".ofoq-commerce-cloud")) return;

    const panel = el("section", "ofoq-commerce-cloud");
    const style = el("style");
    style.textContent = `
      .ofoq-commerce-cloud{margin-top:18px;padding:17px;border:1px solid #477b9d;border-radius:18px;background:linear-gradient(145deg,#10283c,#0a1929);color:#e8f4fb}
      .ofoq-commerce-cloud h3{margin:0 0 8px;color:#bde7ff;font-size:18px}
      .ofoq-commerce-cloud p{color:#b9cbd8;font-size:12px;line-height:1.8}
      .ofoq-commerce-cloud .occ-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
      .ofoq-commerce-cloud button{border:1px solid #4b8bb1;border-radius:10px;padding:10px 13px;background:#123650;color:#e9f7ff;font:inherit;font-size:12px;cursor:pointer}
      .ofoq-commerce-cloud button:focus-visible{outline:2px solid #bde7ff;outline-offset:2px}
      .ofoq-commerce-cloud button:disabled{opacity:.55;cursor:wait}
      .ofoq-commerce-cloud .occ-status{padding:11px;border:1px solid #345a73;border-radius:10px;background:#081a29;white-space:pre-wrap;overflow-wrap:anywhere}
      .ofoq-commerce-cloud .occ-meta{display:flex;gap:8px;flex-wrap:wrap}
      .ofoq-commerce-cloud .occ-meta span{padding:6px 9px;border:1px solid #31546b;border-radius:20px;font-size:11px;color:#c9e5f4}
    `;
    const title = el("h3", "", "☁️ حفظ كتالوج المتجر والطلبات عبر حسابك");
    const description = el("p", "", "مزامنة يدوية آمنة بين أجهزتك. السجلات محفوظة لكل حساب على حدة بسياسات RLS، وتتحقق قاعدة البيانات من ملكية المنتجات والطلبات وحجز المخزون. لا تنشر المنتجات للعامة ولا تنفذ مدفوعات.");
    const meta = el("div", "occ-meta");
    meta.append(el("span", "", "بيانات خاصة بالحساب"), el("span", "", "دمج دون حذف السجلات السحابية"), el("span", "", "لا توجد مدفوعات"));
    const actions = el("div", "occ-actions");
    const syncButton = el("button", "", "مزامنة الآن");
    const loginButton = el("button", "", "فتح تسجيل الدخول الآمن");
    const status = el("p", "occ-status", "تسجيل الدخول عبر الخزنة السحابية في بوابة الأعمال مطلوب قبل المزامنة.");
    syncButton.type = loginButton.type = "button";
    actions.append(syncButton, loginButton);
    panel.append(style, title, description, meta, actions, status);
    root.append(panel);

    const base = String(window.BAWABA_SUPABASE_URL || "").replace(/\/$/, "");
    const anon = String(window.BAWABA_SUPABASE_ANON_KEY || "");
    const setStatus = message => { status.textContent = message; };
    const authRequest = async (path, body) => {
      const response = await fetch(base + "/auth/v1" + path, {
        method: "POST",
        headers: { apikey: anon, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store"
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "تعذر تحديث جلسة الدخول.");
      return data;
    };
    const refresh = async () => {
      const current = session();
      if (!current) throw new Error("سجّل الدخول من بوابة الأعمال أولاً.");
      const next = await authRequest("/token?grant_type=refresh_token", { refresh_token: current.refresh_token });
      if (!next.access_token || !next.refresh_token || !next.user || next.user.id !== current.user.id) {
        throw new Error("تعذر التحقق من جلسة الحساب؛ سجّل الدخول مجدداً.");
      }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        access_token: next.access_token, refresh_token: next.refresh_token,
        user: { id: next.user.id, email: next.user.email || null }
      }));
      return session();
    };
    const api = async (path, options = {}, retry = true) => {
      let current = session();
      if (!current) throw new Error("سجّل الدخول من بوابة الأعمال أولاً.");
      const headers = Object.assign({
        apikey: anon, Authorization: "Bearer " + current.access_token,
        "Content-Type": "application/json"
      }, options.headers || {});
      let response = await fetch(base + "/rest/v1/" + path, Object.assign({}, options, { headers, cache: "no-store" }));
      if (response.status === 401 && retry) {
        await refresh();
        return api(path, options, false);
      }
      const raw = await response.text();
      let data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch (_) { data = { message: raw }; }
      if (!response.ok) {
        const message = data && (data.message || data.details || data.hint || data.error_description);
        throw new Error(message || "فشل الاتصال بقاعدة البيانات (" + response.status + ").");
      }
      return data;
    };
    const getCloud = async () => {
      const products = await api("ofoq_store_products?select=id,user_id,name,sku,category,cost,price,stock,currency,archived,created_at,updated_at&order=updated_at.desc");
      const orders = await api("ofoq_store_orders?select=id,user_id,order_no,product_id,product_name,qty,unit_price,total,status,created_at,updated_at&order=created_at.desc");
      return { products: Array.isArray(products) ? products : [], orders: Array.isArray(orders) ? orders : [] };
    };
    const productPayload = (row, userId) => ({
      id: row.id, user_id: userId, name: row.name.trim().slice(0, 120),
      sku: String(row.sku || "").trim().slice(0, 50) || null,
      category: String(row.category || "").trim().slice(0, 60),
      cost: Number(row.cost || 0), price: Number(row.price), stock: Number(row.stock),
      currency: /^[A-Z]{3}$/.test(row.currency || "") ? row.currency : "USD",
      archived: row.archived === true,
      created_at: row.createdAt && Number.isFinite(Date.parse(row.createdAt)) ? row.createdAt : new Date().toISOString()
    });
    const mergeById = (local, cloud, mapper) => {
      const map = new Map();
      cloud.forEach(row => map.set(row.id, mapper(row)));
      local.forEach(row => { if (!map.has(row.id)) map.set(row.id, row); });
      return [...map.values()];
    };
    const cloudProductToLocal = row => ({
      id: row.id, name: row.name, sku: row.sku || "", category: row.category || "",
      cost: Number(row.cost), price: Number(row.price), stock: Number(row.stock),
      currency: row.currency || "USD", archived: row.archived === true,
      createdAt: row.created_at, updatedAt: row.updated_at
    });
    const cloudOrderToLocal = row => ({
      id: row.id, orderNo: row.order_no, productId: row.product_id,
      productName: row.product_name, qty: Number(row.qty), unitPrice: Number(row.unit_price),
      total: Number(row.total), status: row.status, createdAt: row.created_at,
      updatedAt: row.updated_at
    });

    async function sync() {
      if (!base || !anon) throw new Error("إعداد الاتصال السحابي غير مكتمل.");
      let current = session();
      if (!current) {
        setStatus("لا توجد جلسة حساب نشطة. افتح تسجيل الدخول من بوابة الأعمال، ثم عُد إلى استوديو المتجر.");
        return;
      }
      syncButton.disabled = loginButton.disabled = true;
      syncButton.textContent = "جارٍ المزامنة…";
      let pushedProducts = 0, pushedOrders = 0, updatedOrders = 0, deletedOrders = 0, conflicts = 0;
      const errors = [];
      try {
        let cloud = await getCloud();
        const localProducts = readArray(PRODUCT_KEY).filter(validProduct).slice(-MAX_PRODUCTS);
        const localOrders = readArray(ORDER_KEY).filter(validOrder).slice(-MAX_ORDERS);
        const pendingDeletes = [...new Set(readArray(ORDER_DELETE_KEY).filter(id => typeof id === "string" && id.length > 0))];
        const cloudProducts = new Map(cloud.products.map(row => [row.id, row]));
        const cloudOrders = new Map(cloud.orders.map(row => [row.id, row]));
        const cloudOrderNumbers = new Set(cloud.orders.map(row => String(row.order_no).toLowerCase()));

        const pendingAfter = [];
        for (const id of pendingDeletes) {
          const remote = cloud.orders.find(row => row.id === id);
          try {
            if (remote && remote.status !== "cancelled") {
              await api("ofoq_store_orders?id=eq." + encodeURIComponent(id), {
                method: "PATCH", headers: { Prefer: "return=minimal" },
                body: JSON.stringify({ status: "cancelled" })
              });
            }
            if (remote) {
              await api("ofoq_store_orders?id=eq." + encodeURIComponent(id), {
                method: "DELETE", headers: { Prefer: "return=minimal" }
              });
              deletedOrders++;
            }
          } catch (error) {
            pendingAfter.push(id);
            errors.push("حذف الطلب " + id + ": " + error.message);
          }
        }
        if (!writeArray(ORDER_DELETE_KEY, pendingAfter)) {
          pendingAfter.forEach(id => errors.push("تعذر حفظ حالة حذف الطلب " + id + " محلياً."));
        }
        cloud = await getCloud();

        for (const row of localProducts) {
          const existing = cloudProducts.get(row.id);
          if (existing && time(row.updatedAt || row.createdAt) <= time(existing.updated_at)) continue;
          const payload = productPayload(row, current.user.id);
          try {
            if (existing) {
              await api("ofoq_store_products?id=eq." + encodeURIComponent(row.id), {
                method: "PATCH", headers: { Prefer: "return=minimal" },
                body: JSON.stringify({
                  name: payload.name, sku: payload.sku, category: payload.category,
                  cost: payload.cost, price: payload.price, stock: payload.stock,
                  currency: payload.currency, archived: payload.archived
                })
              });
            } else {
              await api("ofoq_store_products", {
                method: "POST", headers: { Prefer: "return=minimal" },
                body: JSON.stringify(payload)
              });
            }
            pushedProducts++;
          } catch (error) { errors.push("المنتج " + row.name + ": " + error.message); }
        }

        cloud = await getCloud();
        const remoteOrders = new Map(cloud.orders.map(row => [row.id, row]));
        const remoteNumbers = new Set(cloud.orders.map(row => String(row.order_no).toLowerCase()));
        const remoteProductIds = new Set(cloud.products.map(row => row.id));
        for (const row of localOrders.slice().sort((a, b) => time(a.createdAt) - time(b.createdAt))) {
          const existing = remoteOrders.get(row.id);
          if (existing) {
            if (row.status !== existing.status && time(row.updatedAt) > time(existing.updated_at)) {
              try {
                await api("ofoq_store_orders?id=eq." + encodeURIComponent(row.id), {
                  method: "PATCH", headers: { Prefer: "return=minimal" },
                  body: JSON.stringify({ status: row.status })
                });
                updatedOrders++;
              } catch (error) { errors.push("الطلب " + row.orderNo + ": " + error.message); }
            }
            continue;
          }
          const normalizedNo = row.orderNo.toLowerCase();
          if (remoteNumbers.has(normalizedNo) || !remoteProductIds.has(row.productId)) {
            conflicts++;
            continue;
          }
          try {
            await api("ofoq_store_orders", {
              method: "POST", headers: { Prefer: "return=minimal" },
              body: JSON.stringify({
                id: row.id, user_id: current.user.id, order_no: row.orderNo.slice(0, 60),
                product_id: row.productId, product_name: row.productName,
                qty: Number(row.qty), status: row.status
              })
            });
            pushedOrders++;
            remoteNumbers.add(normalizedNo);
            // Record only after the owner-scoped cloud insert succeeds; no order contents or PII enter analytics.
            if (window.OFOQData && typeof window.OFOQData.track === "function") {
              await window.OFOQData.track("order_created", "ecommerce_studio");
            }
          } catch (error) { errors.push("الطلب " + row.orderNo + ": " + error.message); }
        }

        cloud = await getCloud();
        const nextProducts = mergeById(localProducts, cloud.products, cloudProductToLocal);
        const nextOrders = mergeById(localOrders, cloud.orders, cloudOrderToLocal);
        const previousProducts = localStorage.getItem(PRODUCT_KEY);
        const previousOrders = localStorage.getItem(ORDER_KEY);
        if (!writeArray(PRODUCT_KEY, nextProducts)) throw new Error("تعذر حفظ المنتجات المدمجة محلياً.");
        if (!writeArray(ORDER_KEY, nextOrders)) {
          try {
            if (previousProducts === null) localStorage.removeItem(PRODUCT_KEY);
            else localStorage.setItem(PRODUCT_KEY, previousProducts);
            if (previousOrders === null) localStorage.removeItem(ORDER_KEY);
            else localStorage.setItem(ORDER_KEY, previousOrders);
          } catch (_) {}
          throw new Error("تعذر حفظ الطلبات المدمجة؛ تمت محاولة إعادة الحالة المحلية السابقة.");
        }
        window.dispatchEvent(new CustomEvent("ofoq:commerce-synced"));
        const summary = "اكتملت دورة المزامنة.\nالمنتجات المرفوعة/المحدثة: " + pushedProducts +
          "\nالطلبات الجديدة: " + pushedOrders + "\nحالات الطلبات المحدثة: " + updatedOrders + "\nالطلبات الملغاة المحذوفة: " + deletedOrders +
          "\nسجلات تعارض/تحتاج مراجعة: " + conflicts +
          "\nالسجلات السحابية المدمجة: " + cloud.products.length + " منتج و" + cloud.orders.length + " طلب.";
        setStatus(errors.length ? summary + "\n\nتنبيهات:\n• " + errors.slice(0, 8).join("\n• ") : summary);
      } catch (error) {
        setStatus("لم تكتمل المزامنة: " + (error && error.message ? error.message : "خطأ غير معروف"));
      } finally {
        syncButton.disabled = loginButton.disabled = false;
        syncButton.textContent = "مزامنة الآن";
      }
    }

    loginButton.addEventListener("click", () => {
      const business = (window.BAWABA_SECTIONS || []).find(section => section.id === "business");
      if (business && typeof window.openSection === "function") window.openSection(business);
      else setStatus("تعذر فتح بوابة الأعمال؛ أعد تحميل الموقع وحاول مجدداً.");
    });
    syncButton.addEventListener("click", sync);
    if (session()) setStatus("تم العثور على جلسة دخول. اضغط «مزامنة الآن» لحفظ بيانات المتجر واستعادتها بين أجهزتك.");
    else setStatus("سجّل الدخول عبر الخزنة السحابية في بوابة الأعمال أولاً. لا تُرسل كلمة المرور إلى هذه النافذة.");
  }

  const wrapped = async function (section) {
    await prior(section);
    if (section && section.id === "ecommerce_studio") mount();
  };
  wrapped.__ofoqCommerceCloudWrapped = true;
  window.openSection = wrapped;
})();
