import { chromium } from "playwright";

const baseUrl = process.env.OFOQ_BASE_URL || "https://alooshalshawwa8-wq.github.io/bawabatsyria/";
const failures = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
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
  await page.waitForFunction(() => Array.isArray(window.BAWABA_SECTIONS) && typeof window.openSection === "function", null, { timeout: 30000 });

  const sections = await page.evaluate(() => window.BAWABA_SECTIONS.map(section => ({ id: section.id, title: section.title })));
  if (sections.length !== 78) throw new Error("Expected 78 sections; found " + sections.length);

  for (const section of sections) {
    await page.evaluate(async id => {
      const target = window.BAWABA_SECTIONS.find(item => item.id === id);
      if (!target) throw new Error("Missing section: " + id);
      await window.openSection(target);
    }, section.id);
    const title = (await page.locator("#detailTitle").innerText()).trim();
    if (title !== section.title) throw new Error("Section title mismatch for " + section.id + ": " + title);
    const workspace = await page.locator("#specialTool").innerText();
    if (!workspace.trim()) throw new Error("Empty workspace for " + section.id);
  }

  await page.keyboard.press("Control+k");
  const commandDialog = page.locator("#ofoq-command-overlay");
  await commandDialog.waitFor({ state: "visible", timeout: 5000 });
  await page.keyboard.press("Escape");
  await commandDialog.waitFor({ state: "hidden", timeout: 5000 });

  await page.evaluate(async () => {
    const commerce = window.BAWABA_SECTIONS.find(item => item.id === "ecommerce_studio");
    await window.openSection(commerce);
  });
  const merchant = page.locator(".ofoq-ecom-studio");
  await merchant.waitFor({ state: "visible", timeout: 10000 });
  await merchant.getByRole("tab", { name: "📦 المنتجات والمخزون" }).click();
  await merchant.locator("#ofoq-ecom-catalog-name").fill("OFOQ Browser Test Product");
  await merchant.locator("#ofoq-ecom-catalog-cost").fill("12");
  await merchant.locator("#ofoq-ecom-catalog-price").fill("25");
  await merchant.locator("#ofoq-ecom-catalog-stock").fill("7");
  await merchant.getByRole("button", { name: "إضافة منتج" }).click();
  await merchant.getByText("OFOQ Browser Test Product").waitFor({ state: "visible" });
  await merchant.getByRole("tab", { name: "🧾 الطلبات" }).click();
  await merchant.locator("#ofoq-ecom-order-no").fill("OFOQ-BROWSER-001");
  await merchant.locator("#ofoq-ecom-order-qty").fill("2");
  await merchant.getByRole("button", { name: "إضافة طلب" }).click();
  await merchant.getByText("OFOQ-BROWSER-001").waitFor({ state: "visible" });
  await merchant.locator("#ofoq-ecom-order-no").fill("OFOQ-BROWSER-002");
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
  await merchant.getByText("OFOQ TEMP Product").waitFor({ state: "visible" });
  page.once("dialog", dialog => dialog.accept());
  await merchant.locator("#ofoq-ecom-import-file").setInputFiles({
    name: "ofoq-commerce-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(commerceBackup))
  });
  await merchant.getByText("OFOQ TEMP Product").waitFor({ state: "detached" });
  await merchant.getByText("OFOQ Browser Test Product").waitFor({ state: "visible" });

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
  await hub.getByLabel("المبلغ").fill("125");
  await hub.getByLabel("التصنيف").fill("اختبار");
  await hub.getByRole("button", { name: "تسجيل الحركة" }).click();
  await hub.getByText("125").first().waitFor({ state: "visible" });

  await hub.getByRole("tab", { name: "⇄ البيانات المرتبطة" }).click();
  await hub.getByRole("button", { name: "تحديث البيانات الآن" }).click();
  await hub.getByText("منتجات المتجر").waitFor({ state: "visible" });
  await hub.getByText("طلبات المتجر").waitFor({ state: "visible" });

  await hub.getByRole("tab", { name: "⇧ النسخ الاحتياطي" }).click();
  const downloadPromise = page.waitForEvent("download");
  await hub.getByRole("button", { name: "تنزيل نسخة JSON" }).click();
  const download = await downloadPromise;
  if (download.suggestedFilename() !== "ofoq-complete-operations-backup.json") throw new Error("Unexpected backup filename");

  await hub.getByRole("button", { name: "إنشاء نسخة سحابية الآن" }).click();
  await hub.getByText(/سجّل الدخول أولاً/).waitFor({ state: "visible" });
  await hub.getByRole("button", { name: "تسجيل الدخول" }).click();
  await hub.getByText(/أدخل البريد الإلكتروني وكلمة المرور/).waitFor({ state: "visible" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const widthCheck = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
  if (widthCheck.document > widthCheck.viewport + 2) throw new Error("Horizontal overflow on mobile: " + JSON.stringify(widthCheck));

  if (pageErrors.length) throw new Error("Uncaught browser errors: " + pageErrors.join(" | "));
  console.log("PASS: " + sections.length + " section workspaces, command-center keyboard controls, Operations Hub tabs and CRUD, local JSON export, cloud-backup guardrails, and mobile overflow check.");
  console.log("External requests blocked during test: " + [...new Set(externalRequests)].join(", "));
} finally {
  await context.close();
  await browser.close();
}
