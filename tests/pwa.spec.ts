import { test, expect } from "@playwright/test";

// Runs against the `next start` production build from playwright.config webServer.
test("manifest, service worker and offline reload of a visited page", async ({ page, context }) => {
  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  for (const icon of manifest.icons) expect((await page.request.get(icon.src)).ok()).toBe(true);

  const sw = await page.request.get("/sw.js");
  expect(sw.headers()["service-worker-allowed"]).toBe("/");
  expect(sw.headers()["content-type"]).toContain("javascript");

  await page.goto("/arrival");
  const heading = page.getByRole("heading", { name: /of 8 steps completed/ });
  await expect(heading).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  // The worker stores the already-open page during activation.
  await expect
    .poll(() => page.evaluate(async () => !!(await caches.match("/arrival"))))
    .toBe(true);

  await context.setOffline(true);
  const offline = await page.reload();
  expect(offline?.fromServiceWorker()).toBe(true);
  await expect(heading).toBeVisible();
  await expect(page.getByText("You’re offline.", { exact: false })).toBeVisible();
  await context.setOffline(false);
});

test("welfare pages are never stored by the service worker", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.goto("/welfare");
  expect(await page.evaluate(async () => !!(await caches.match("/welfare")))).toBe(false);
});
