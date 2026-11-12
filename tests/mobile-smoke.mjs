import { chromium } from "playwright";

const baseUrl = process.env.OFOQ_BASE_URL || "https://alooshalshawwa8-wq.github.io/bawabatsyria/";
const browser = await chromium.launch({ headless: true });
const failures = [];
const pageErrors = [];

try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 800 }]) {
    const context = await browser.newContext({
      viewport,
      serviceWorkers: "block",
      reducedMotion: "reduce",
      isMobile: true,
      hasTouch: true
    });
    const page = await context.newPage();
    page.on("pageerror", error => pageErrors.push(viewport.width + "px: " + error.message));
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      return url.hostname === "alooshalshawwa8-wq.github.io" ? route.continue() : route.abort();
    });

    try {
      await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForFunction(() => Array.isArray(window.BAWABA_SECTIONS) && typeof window.openSection === "function", null, { timeout: 30000 });
      const skip = page.locator("#bawaba-welcome-skip");
      if (await skip.isVisible().catch(() => false)) await skip.click();

      const assertNoHorizontalOverflow = async label => {
        const dimensions = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth
        }));
        if (dimensions.document > dimensions.viewport + 1 || dimensions.body > dimensions.viewport + 1) {
          failures.push(viewport.width + "px " + label + " horizontal overflow: " + JSON.stringify(dimensions));
        }
      };

      await assertNoHorizontalOverflow("home");
      const firstTitle = await page.evaluate(() => window.BAWABA_SECTIONS[0]?.title || "");
      await page.locator("#searchInput").fill(firstTitle);
      await page.waitForTimeout(100);
      if (await page.locator("#sectionsGrid .tile:visible").count() < 1) {
        failures.push(viewport.width + "px search returned no visible result for the first known section");
      }
      await page.locator("#searchInput").fill("");
      await page.evaluate(async () => {
        const section = window.BAWABA_SECTIONS.find(item => item.id === "prices") || window.BAWABA_SECTIONS[0];
        await window.openSection(section);
      });
      await page.locator("#specialTool .bw-workspace").waitFor({ state: "visible", timeout: 10000 });
      await assertNoHorizontalOverflow("section workspace");
      if (!(await page.locator("#backBtn").isVisible())) {
        failures.push(viewport.width + "px section back control is not visible");
      }
    } catch (error) {
      failures.push(viewport.width + "px: " + (error?.stack || error?.message || String(error)));
    } finally {
      await context.close();
    }
  }

  if (pageErrors.length) failures.push("Browser page errors: " + pageErrors.join(" | "));
  if (failures.length) throw new Error(failures.join("\n"));
  console.log("OFOQ mobile smoke tests passed at 390x844 and 360x800.");
} finally {
  await browser.close();
}
