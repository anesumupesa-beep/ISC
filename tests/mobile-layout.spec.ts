import { test, expect } from "@playwright/test";

test.beforeEach(({ page }, testInfo) => {
  void page;
  test.skip(testInfo.project.name !== "mobile", "phone layout guard");
});

const routes = ["/", "/arrival", "/housing", "/buddy", "/updates", "/welfare"];

for (const route of routes) {
  test(`no horizontal overflow on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });
}

test("bottom nav and form controls are comfortable to tap", async ({ page }) => {
  await page.goto("/housing");
  await page.waitForLoadState("networkidle");
  const small = await page.evaluate(() => {
    const sel = ".bottom-nav button, .filter-bar select, .filter-bar .toggle-label, .listing-actions .button";
    return [...document.querySelectorAll<HTMLElement>(sel)]
      .map((el) => ({ el: el.className || el.tagName, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && (r.height < 44 || r.width < 44))
      .map(({ el, r }) => `${el} ${Math.round(r.width)}x${Math.round(r.height)}`);
  });
  expect(small).toEqual([]);
  const fonts = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("select, input:not([type=checkbox])")]
      .filter((el) => el.offsetParent)
      .map((el) => parseFloat(getComputedStyle(el).fontSize)),
  );
  expect(Math.min(...fonts)).toBeGreaterThanOrEqual(16);
});
