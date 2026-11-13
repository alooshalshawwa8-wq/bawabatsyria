import { chromium } from "playwright";
import { readFile } from "node:fs/promises";

const baseUrl = process.env.OFOQ_BASE_URL || "https://alooshalshawwa8-wq.github.io/bawabatsyria/";
const failures = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1440, height: 1000 }, acceptDownloads: true, reducedMotion: "reduce" });
const page = await context.newPage();
const pageErrors = [];
const externalRequests = [];

page.on("pageerror", error => pageErrors.push(error.message));
await page.route("**/*", route => {
  const url = new URL(route.request().url());
  if (url.hostname === "alooshalshawwa8-wq.github.io") return route.continue();
  externalRequests.push(url.hostname);
  return route.abort();
});

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  // Keep browser automation deterministic: the portal intentionally uses smooth page transitions.
  // Disable motion only in this test context so controls can be checked without racing animations.
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}*,*::before,*::after{animation:none!important;transition:none!important}" });
  const welcomeSkip = page.locator("#bawaba-welcome-skip");
  if (await welcomeSkip.isVisible().catch(() => false)) await welcomeSkip.click();
  await page.waitForFunction(() => Array.isArray(window.BAWABA_SECTIONS) && typeof window.openSection === "function", null, { timeout: 30000 });

  const sections = await page.evaluate(() => window.BAWABA_SECTIONS.map(section => ({ id: section.id, title: section.title })));
  if (sections.length !== 78) throw new Error("Expected 78 sections; found " + sections.length);
  const vault = page.locator(".ofoq-personal-vault");
  await vault.waitFor({ state: "visible", timeout: 5000 });
  if (!(await vault.innerText()).includes("نسخة شاملة لمساحات العمل")) throw new Error("Full-site personal vault was not mounted");
  if (!(await vault.innerText()).includes("النسخ لا تشمل كلمات المرور")) throw new Error("Full-site vault privacy notice missing");

  await page.evaluate(async () => {
    const section = window.BAWABA_SECTIONS.find(item => item.id === "social_media_hub");
    await window.openSection(section);
  });
  await page.locator("#util_brand").fill("OFOQ Smoke Brand");
  await page.locator("#util_platforms").fill("Instagram");
  await page.locator("#util_goal").fill("زيادة الطلبات");
  await page.locator("#util_offer").fill("خدمة رقمية تجريبية");
  await page.locator("#specialTool").getByRole("button", { name: "أنشئ النتيجة" }).click();
  const utilityOutput = page.locator("#specialTool textarea[readonly]").first();
  if (!(await utilityOutput.inputValue()).includes("خطة محتوى أولية")) throw new Error("Utility module did not generate a usable content plan");
  await page.locator("#specialTool").getByRole("button", { name: "حفظ النتيجة في ملاحظاتي" }).click();
  const savedUtilityNote = await page.evaluate(() => JSON.parse(localStorage.getItem("ofoq-notes-social_media_hub") || "{}").notes || "");
  if (!savedUtilityNote.includes("خطة محتوى أولية") || !savedUtilityNote.includes("OFOQ Smoke Brand")) throw new Error("Utility output was not saved to the section notes");

  for (const section of sections) {
    await page.evaluate(async id => {
      const target = window.BAWABA_SECTIONS.find(item => item.id === id);
      if (!target) throw new Error("Missing section: " + id);
      await window.openSection(target);
    }, section.id);
    const title = (await page.locator("#detailTitle").innerText()).trim();
    if (title !== section.title) throw new Error("Section title mismatch for " + section.id + ": " + title);
    const workspace = page.locator("#specialTool .bw-workspace");
    await workspace.waitFor({ state: "visible", timeout: 5000 });
    const workspaceTabList = workspace.locator('.bw-tabs[role="tablist"][aria-label^="تبويبات مساحة العمل"]');
    for (const [tabName, paneId] of [["🗂️ خطة التنفيذ", "tasks"], ["📝 ملاحظاتي", "notes"], ["🧰 أدوات القسم", "tools"]]) {
      const tab = workspaceTabList.locator('button[role="tab"][aria-controls="ofoq-pane-' + section.id + '-' + paneId + '"]');
      if (await tab.count() !== 1) throw new Error("Missing unique core workspace tab for " + section.id + ": " + paneId);
      await tab.click();
      if (await tab.getAttribute("aria-selected") !== "true") throw new Error("Workspace tab failed for " + section.id + ": " + tabName);
    }
    const aiHelper = page.locator("#specialTool .ai-helper");
    await aiHelper.waitFor({ state: "visible", timeout: 5000 });
    const workspaceText = await page.locator("#specialTool").innerText();
    if (!workspaceText.trim()) throw new Error("Empty workspace for " + section.id);
  }

  const commandDialog = page.locator("#ofoq-command-overlay");
  await page.keyboard.press("Control+k");
  await commandDialog.waitFor({ state: "visible", timeout: 5000 });
  const commandSearch = commandDialog.locator(".ofoq-command-search");
  const firstSectionTitle = sections[0].title;
  await commandSearch.fill(firstSectionTitle);
  const commandResults = commandDialog.locator(".ofoq-command-result");
  await commandResults.first().waitFor({ state: "visible", timeout: 5000 });
  if (await commandResults.count() < 1) throw new Error("Command center search returned no result for a known section");
  await page.locator("#ofoq-launcher").focus();
  await page.keyboard.press("Escape");
  await commandDialog.waitFor({ state: "hidden", timeout: 5000 });
  if (!(await page.locator("#detailPanel").evaluate(element => element.classList.contains("open")))) {
    throw new Error("Escape closed the active section instead of only closing the command center");
  }
  await page.keyboard.press("Control+k");
  await commandDialog.waitFor({ state: "visible", timeout: 5000 });
  await page.keyboard.press("Escape");
  await commandDialog.waitFor({ state: "hidden", timeout: 5000 });
  if (!(await page.locator("#detailPanel").evaluate(element => element.classList.contains("open")))) {
    throw new Error("Escape closed the active section instead of only closing the command center");
  }

  // Exercise the detail favorite while its section panel is still open.
  const favoriteCurrent = page.locator("#ofoq-favorite-current");
  await favoriteCurrent.waitFor({ state: "attached", timeout: 5000 });
  const favoriteVisibleBeforeScroll = await favoriteCurrent.isVisible();
  const favoriteState = await favoriteCurrent.evaluate(element => {
    const chain = [];
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      chain.push({
        tag: node.tagName,
        id: node.id || "",
        className: typeof node.className === "string" ? node.className : "",
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        hidden: node.hidden,
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    }
    return chain;
  });
  if (!favoriteVisibleBeforeScroll) throw new Error("Current-section favorite action is hidden before scrolling: " + JSON.stringify(favoriteState));
  await favoriteCurrent.scrollIntoViewIfNeeded({ timeout: 10000 });
  const lastVisitedTitle = (await page.locator("#detailTitle").innerText()).trim();
  const lastVisitedId = await favoriteCurrent.getAttribute("data-section-id");
  if (!lastVisitedId) throw new Error("Current favorite action has no section ID");
  await favoriteCurrent.click({ timeout: 10000 });
  if (await favoriteCurrent.getAttribute("aria-pressed") !== "true") throw new Error("Favorite toggle did not activate");
  await page.keyboard.press("Control+k");
  const nexusDialog = page.locator("#ofoq-command-overlay");
  await nexusDialog.waitFor({ state: "visible", timeout: 5000 });
  await nexusDialog.locator('[data-filter="favorites"]').click();
  const nexusFavorites = nexusDialog.locator(".ofoq-command-result");
  if (await nexusFavorites.count() !== 1) throw new Error("NEXUS favorites filter should return the one saved section");
  if (!(await nexusFavorites.first().innerText()).includes(lastVisitedTitle)) throw new Error("NEXUS favorites filter returned the wrong section");
  await nexusDialog.locator('[data-filter="recent"]').click();
  if (await nexusDialog.locator(".ofoq-command-result").count() < 1) throw new Error("NEXUS recent filter returned no visited sections");
  await page.keyboard.press("Escape");

  // Return home only after the detail-page favorite action and command filters are verified.
  await page.locator("#homeBtn").click();
  await page.locator("#detailPanel").waitFor({ state: "hidden", timeout: 5000 }).catch(async () => {
    if (await page.locator("#detailPanel").evaluate(element => element.classList.contains("open"))) {
      throw new Error("Home control did not close the active section before catalogue testing");
    }
  });
  await page.locator("#sectionsGrid").waitFor({ state: "visible", timeout: 5000 });

  const personalSpace = page.locator("#ofoq-personal-space");
  await personalSpace.waitFor({ state: "visible", timeout: 5000 });
  await personalSpace.locator('[data-ofoq-view="favorites"]').click();
  const favoriteTiles = page.locator("#sectionsGrid .tile:visible");
  if (await favoriteTiles.count() !== 1) throw new Error("Favorites filter should show exactly one saved section");
  if (!(await favoriteTiles.first().innerText()).includes(lastVisitedTitle)) throw new Error("Favorite filter showed the wrong section");
  await personalSpace.locator('[data-ofoq-view="recent"]').click();
  if (!(await page.locator("#ofoq-recent-links").innerText()).includes(lastVisitedTitle)) throw new Error("Recent visits did not record the last opened section");
  await personalSpace.locator('[data-ofoq-view="all"]').click();
  if (await page.locator("#sectionsGrid .tile:visible").count() !== 78) throw new Error("Returning to all sections did not restore the full catalogue");

  await page.evaluate(async () => {
    const commerce = window.BAWABA_SECTIONS.find(item => item.id === "ecommerce_studio");
    await window.openSection(commerce);
  });
  const merchant = page.locator(".ofoq-ecom-studio");
  await merchant.waitFor({ state: "visible", timeout: 10000 });
  await merchant.locator(".ofoq-commerce-cloud").waitFor({ state: "visible", timeout: 5000 });
  if (!(await merchant.locator(".ofoq-commerce-cloud").innerText()).includes("مزامنة يدوية آمنة")) throw new Error("Commerce cloud bridge did not explain authenticated manual sync");
  await merchant.locator("#ofoq-ecom-cost").fill("10");
  await merchant.locator("#ofoq-ecom-price").fill("25");
  await merchant.locator("#ofoq-ecom-target").fill("20");
  await merchant.getByRole("button", { name: "احسب اقتصاديات الطلب" }).click();
  const pricingOutput = merchant.locator(".ofoq-ecom-output").first();
  if (await pricingOutput.getAttribute("data-valid") !== "1") throw new Error("Valid pricing calculation was not marked successful");
  if (await merchant.locator(".ofoq-ecom-metrics .ofoq-ecom-metric").count() !== 6) throw new Error("Expected six pricing metrics after a valid calculation");
  await merchant.locator("#ofoq-ecom-target").fill("100");
  await merchant.getByRole("button", { name: "احسب اقتصاديات الطلب" }).click();
  if (await pricingOutput.getAttribute("data-valid") !== "0") throw new Error("Invalid pricing input did not clear the success state");
  if (await merchant.locator(".ofoq-ecom-metrics .ofoq-ecom-metric").count() !== 0) throw new Error("Stale pricing metrics remained visible after invalid input");
  if (!(await pricingOutput.innerText()).includes("لم تُعرض نتائج قديمة")) throw new Error("Invalid pricing feedback did not explain that stale results were cleared");
  await merchant.getByRole("tab", { name: "📦 المنتجات والمخزون" }).click();
  await merchant.locator("#ofoq-ecom-catalog-name").fill("OFOQ Browser Test Product");
  await merchant.locator("#ofoq-ecom-catalog-cost").fill("12");
  await merchant.locator("#ofoq-ecom-catalog-price").fill("25");
  await merchant.locator("#ofoq-ecom-catalog-stock").fill("7");
  await merchant.getByRole("button", { name: "إضافة منتج" }).click();
  await merchant.locator(".ofoq-ecom-saved-row").filter({ hasText: "OFOQ Browser Test Product" }).waitFor({ state: "visible" });
  await merchant.getByRole("tab", { name: "🧾 الطلبات" }).click();
  await merchant.locator("#ofoq-ecom-order-no").fill("OFOQ-BROWSER-001");
  await merchant.locator("#ofoq-ecom-order-qty").fill("2");
  await merchant.getByRole("button", { name: "إضافة طلب" }).click();
  await merchant.getByText("OFOQ-BROWSER-001").waitFor({ state: "visible" });
  await merchant.locator("#ofoq-ecom-order-no").fill("OFOQ-BROWSER-002");
  await merchant.locator("#ofoq-ecom-order-qty").fill("6");
  await merchant.getByRole("button", { name: "إضافة طلب" }).click();
  await merchant.getByText(/الكمية تتجاوز المتاح/).waitFor({ state: "visible" });
  await merchant.getByLabel("حالة الطلب OFOQ-BROWSER-001").selectOption("delivered");
  const activeOrderRow = merchant.locator(".ofoq-ecom-saved-row").filter({ hasText: "OFOQ-BROWSER-001" });
  await activeOrderRow.getByRole("button", { name: "حذف" }).click();
  if (await activeOrderRow.count() !== 1) throw new Error("Active merchant order was deleted without cancellation");
  await merchant.getByText(/ألغِ الطلب أولاً/).waitFor({ state: "visible" });
  await merchant.locator("#ofoq-ecom-order-no").fill("OFOQ-BROWSER-003");
  await merchant.locator("#ofoq-ecom-order-qty").fill("6");
  await merchant.getByRole("button", { name: "إضافة طلب" }).click();
  await merchant.getByText(/الكمية تتجاوز المتاح/).waitFor({ state: "visible" });
  await merchant.getByLabel("حالة الطلب OFOQ-BROWSER-001").selectOption("processing");
  const commerceBackup = await page.evaluate(() => ({
    app: "ofoq-ecommerce-commerce",
    version: 1,
    products: JSON.parse(localStorage.getItem("ofoq_ecommerce_products_v1") || "[]"),
    orders: JSON.parse(localStorage.getItem("ofoq_ecommerce_orders_v1") || "[]")
  }));
  await merchant.getByRole("tab", { name: "📦 المنتجات والمخزون" }).click();
  await merchant.locator("#ofoq-ecom-catalog-name").fill("OFOQ TEMP Product");
  await merchant.locator("#ofoq-ecom-catalog-price").fill("3");
  await merchant.locator("#ofoq-ecom-catalog-stock").fill("1");
  await merchant.getByRole("button", { name: "إضافة منتج" }).click();
  await merchant.locator(".ofoq-ecom-saved-row").filter({ hasText: "OFOQ TEMP Product" }).waitFor({ state: "visible" });
  await merchant.locator(".ofoq-ecom-saved-row").filter({ hasText: "OFOQ TEMP Product" }).getByRole("button", { name: "أرشفة" }).click();
  await merchant.locator(".ofoq-ecom-saved-row").filter({ hasText: "OFOQ TEMP Product" }).waitFor({ state: "detached" });
  const archivedTemp = await page.evaluate(() => JSON.parse(localStorage.getItem("ofoq_ecommerce_products_v1") || "[]").some(row => row.name === "OFOQ TEMP Product" && row.archived === true));
  if (!archivedTemp) throw new Error("Product archive did not preserve a reversible local record");
  await merchant.locator("#ofoq-ecom-catalog-name").fill("OFOQ Post Archive Product");
  await merchant.locator("#ofoq-ecom-catalog-price").fill("4");
  await merchant.locator("#ofoq-ecom-catalog-stock").fill("2");
  await merchant.getByRole("button", { name: "إضافة منتج" }).click();
  const archivedPreservedAfterAdd = await page.evaluate(() => JSON.parse(localStorage.getItem("ofoq_ecommerce_products_v1") || "[]").some(row => row.name === "OFOQ TEMP Product" && row.archived === true));
  if (!archivedPreservedAfterAdd) throw new Error("Adding a new product discarded an archived product record");
  page.once("dialog", dialog => dialog.accept());
  await merchant.locator("#ofoq-ecom-import-file").setInputFiles({
    name: "ofoq-commerce-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(commerceBackup))
  });
  await merchant.locator(".ofoq-ecom-saved-row").filter({ hasText: /^OFOQ TEMP Product/ }).waitFor({ state: "detached" });
  await merchant.locator(".ofoq-ecom-saved-row").filter({ hasText: /^OFOQ Browser Test Product/ }).waitFor({ state: "visible" });

  await page.evaluate(() => {
    localStorage.setItem("bawabatsyria_stock_v1", JSON.stringify([
      { name: "OFOQ Cent Precision Test", qty: 5, cost: 2, sale: 3, min: 0 }
    ]));
  });
  await page.evaluate(async () => {
    const accounting = window.BAWABA_SECTIONS.find(item => item.id === "accounting_vip");
    await window.openSection(accounting);
  });
  await page.getByText("دفتر المبيعات والمشتريات").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#specialTool").getByPlaceholder("عدد صحيح", { exact: true }).fill("1");
  await page.getByLabel("سعر الوحدة").fill("1.239");
  await page.getByLabel("المبلغ المدفوع").fill("0");
  await page.getByLabel("حالة الدفع").selectOption("unpaid");
  await page.getByRole("button", { name: "حفظ العملية" }).click();
  await page.getByText(/العملة تقبل منزلتين عشريتين فقط/).waitFor({ state: "visible" });
  const rejectedTrade = await page.evaluate(() => JSON.parse(localStorage.getItem("bawabatsyria_trade_ledger_v1") || "[]").length);
  if (rejectedTrade !== 0) throw new Error("Sub-cent unit price was incorrectly recorded");
  await page.getByLabel("سعر الوحدة").fill("1.23");
  await page.getByRole("button", { name: "حفظ العملية" }).click();
  await page.getByText("حُفظت العملية وتم تحديث رصيد المخزون.").waitFor({ state: "visible" });
  const centTrade = await page.evaluate(() => JSON.parse(localStorage.getItem("bawabatsyria_trade_ledger_v1") || "[]"));
  if (centTrade.length !== 1 || centTrade[0].total !== 1.23) throw new Error("Cent-precision trade was not saved correctly");
  const orphanSettlementBackup = {
    app: "ofoq-trade-ledger", version: 2, createdAt: new Date().toISOString(),
    transactions: [{ id: "tx_valid", type: "sale", date: "2026-11-11", item: "OFOQ Cent Precision Test", qty: 1, unitPrice: 1.23, total: 1.23, paid: 1, party: "اختبار" }],
    parties: [], expenses: [],
    settlements: [{ id: "pay_orphan", transactionId: "tx_missing", date: "2026-11-11", amount: 1, direction: "in" }],
    invoiceNumbers: {}
  };
  await page.locator("#specialTool input[type=file]").last().setInputFiles({
    name: "orphan-settlement.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(orphanSettlementBackup))
  });
  await page.getByText(/توجد دفعة مرتبطة بعملية غير موجودة/).waitFor({ state: "visible" });
  const unchangedTradeCount = await page.evaluate(() => JSON.parse(localStorage.getItem("bawabatsyria_trade_ledger_v1") || "[]").length);
  if (unchangedTradeCount !== 1) throw new Error("Invalid settlement backup changed the local trade ledger");

  await page.evaluate(async () => {
    const accounting = window.BAWABA_SECTIONS.find(item => item.id === "accounting_vip");
    await window.openSection(accounting);
  });
  const treasuryBackup = {
    app: "ofoq-treasury", version: 2, createdAt: new Date().toISOString(),
    accounts: [], movements: [], assets: [],
    obligations: [{ id: "obl_import_test", name: "OFOQ import test", date: "2026-11-11", amount: 10, paid: 1 }],
    payments: [{ id: "pay_import_test", obligationId: "obl_import_test", date: "2026-11-11", amount: 1.01 }],
    reconciliations: []
  };
  const treasuryBefore = await page.evaluate(() => localStorage.getItem("bawabatsyria_treasury_obligations_v1"));
  await page.getByLabel("استيراد نسخة الخزينة").setInputFiles({
    name: "overpaid-treasury-backup.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(treasuryBackup))
  });
  await page.getByText(/مجموع دفعات الالتزام يتجاوز إجمالي المبلغ المدفوع/).waitFor({ state: "visible" });
  const treasuryAfter = await page.evaluate(() => localStorage.getItem("bawabatsyria_treasury_obligations_v1"));
  if (treasuryAfter !== treasuryBefore) throw new Error("Invalid overpaid treasury backup changed local obligations");

  await page.evaluate(async () => {
    const business = window.BAWABA_SECTIONS.find(item => item.id === "business");
    await window.openSection(business);
  });
  const hub = page.locator(".oph-hub");
  await hub.waitFor({ state: "visible", timeout: 10000 });

  for (const label of ["◈ الملخص", "▣ المشاريع", "✓ المهام", "＄ الدفتر المالي", "⇄ البيانات المرتبطة", "⇧ النسخ الاحتياطي"]) {
    await hub.getByRole("tab", { name: label }).click();
    const selected = await hub.getByRole("tab", { name: label }).getAttribute("aria-selected");
    if (selected !== "true") throw new Error("Operations tab did not activate: " + label);
  }

  await hub.getByRole("tab", { name: "▣ المشاريع" }).click();
  await hub.getByLabel("اسم المشروع").fill("OFOQ Browser Smoke Test");
  await hub.getByRole("button", { name: "إضافة مشروع" }).click();
  await hub.getByText("OFOQ Browser Smoke Test").waitFor({ state: "visible" });

  page.once("dialog", dialog => dialog.accept());
  const projectRow = hub.locator(".oph-item").filter({ hasText: "OFOQ Browser Smoke Test" });
  await projectRow.getByRole("button", { name: "حذف" }).click();
  await projectRow.waitFor({ state: "detached" });

  await hub.getByRole("tab", { name: "✓ المهام" }).click();
  await hub.getByLabel("وصف المهمة").fill("OFOQ task smoke test");
  await hub.getByRole("button", { name: "إضافة مهمة" }).click();
  await hub.getByText("OFOQ task smoke test").waitFor({ state: "visible" });

  await hub.getByRole("tab", { name: "＄ الدفتر المالي" }).click();
  const amountInput = hub.getByLabel("المبلغ");
  await amountInput.fill("125.567");
  await hub.getByLabel("التصنيف").fill("اختبار");
  await hub.getByRole("button", { name: "تسجيل الحركة" }).click();
  await hub.getByText(/المبلغ يجب ألا يتجاوز منزلتين عشريتين/).waitFor({ state: "visible" });
  if (await hub.locator(".oph-item").filter({ hasText: "إيراد +" }).count() !== 0) throw new Error("Sub-cent amount was incorrectly recorded");
  await amountInput.fill("125.56");
  await hub.getByRole("button", { name: "تسجيل الحركة" }).click();
  await hub.getByText("125.56").first().waitFor({ state: "visible" });

  await hub.getByRole("tab", { name: "⇄ البيانات المرتبطة" }).click();
  await hub.getByRole("button", { name: "تحديث البيانات الآن" }).click();
  await hub.locator("#oph-pane-linked").getByText("منتجات المتجر", { exact: true }).waitFor({ state: "visible" });
  await hub.locator("#oph-pane-linked small").filter({ hasText: /^طلبات المتجر$/ }).waitFor({ state: "visible" });

  await hub.getByRole("tab", { name: "⇧ النسخ الاحتياطي" }).click();
  const downloadPromise = page.waitForEvent("download");
  await hub.getByRole("button", { name: "تنزيل نسخة JSON" }).click();
  const download = await downloadPromise;
  if (download.suggestedFilename() !== "ofoq-complete-operations-backup.json") throw new Error("Unexpected backup filename");
  const backupPath = await download.path();
  if (!backupPath) throw new Error("Operations backup download did not produce a readable file");
  const backupJson = JSON.parse(await readFile(backupPath, "utf8"));
  if (!backupJson.personalSpace || !backupJson.personalSpace.favorites.includes(lastVisitedId)) {
    throw new Error("Operations backup did not preserve the saved favorite");
  }
  if (!backupJson.personalSpace.recent.includes(lastVisitedId)) {
    throw new Error("Operations backup did not preserve recent section visits");
  }

  await hub.getByRole("button", { name: "إنشاء نسخة سحابية الآن" }).click();
  await hub.locator(".oph-cloud-panel .oph-status").getByText(/سجّل الدخول أولاً/).waitFor({ state: "visible" });
  const cloudPanel = hub.locator(".oph-cloud-panel");
  const cloudEmail = cloudPanel.locator('input[name="cloud-email"]');
  const cloudPassword = cloudPanel.locator('input[name="cloud-password"]');
  await cloudEmail.evaluate(el => { el.value = ""; el.dispatchEvent(new Event("input", { bubbles: true })); });
  await cloudPassword.evaluate(el => { el.value = ""; el.dispatchEvent(new Event("input", { bubbles: true })); });
  const emptyCloudCredentials = await Promise.all([cloudEmail.inputValue(), cloudPassword.inputValue()]);
  if (emptyCloudCredentials.some(Boolean)) throw new Error("Cloud credential fields were not empty before local validation");
  await cloudPanel.getByRole("button", { name: "تسجيل الدخول" }).click();
  const cloudStatus = cloudPanel.locator(".oph-status");
  await cloudStatus.getByText(/تعذر تسجيل الدخول/).waitFor({ state: "visible" });
  const cloudStatusText = await cloudStatus.textContent() || "";
  if (!cloudStatusText.includes("البريد الإلكتروني وكلمة المرور")) {
    throw new Error("Cloud login empty-credential validation mismatch: " + cloudStatusText);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const widthCheck = await page.evaluate(() => {
    const viewport = window.innerWidth;
    const offenders = [...document.querySelectorAll("body *")].map(el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || "",
        className: typeof el.className === "string" ? el.className.slice(0, 100) : "",
        right: Math.round(rect.right * 10) / 10,
        left: Math.round(rect.left * 10) / 10,
        width: Math.round(rect.width * 10) / 10,
        position: style.position,
        overflow: style.overflowX
      };
    }).filter(item => item.width > 0 && (item.right > viewport + 2 || item.left < -2))
      .sort((a, b) => b.right - a.right).slice(0, 12);
    return { viewport, document: document.documentElement.scrollWidth, offenders };
  });
  if (widthCheck.document > widthCheck.viewport + 2) throw new Error("Horizontal overflow on mobile: " + JSON.stringify(widthCheck));

  if (pageErrors.length) throw new Error("Uncaught browser errors: " + pageErrors.join(" | "));
  console.log("PASS: " + sections.length + " section workspaces, command-center keyboard controls, local favorites/recent filters, Operations Hub tabs and CRUD, local JSON export, cloud-backup guardrails, and mobile overflow check.");
  console.log("External requests blocked during test: " + [...new Set(externalRequests)].join(", "));
} finally {
  await context.close();
  await browser.close();
}
