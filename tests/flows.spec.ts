import { test, expect } from "@playwright/test";
import { pageAs } from "./roles";

// Data now lives in Postgres. Flows that create one-off records (buddy request, volunteer,
// membership) assume a freshly seeded database and run on desktop only.
const desktopOnly = () =>
  test.skip(test.info().project.name !== "desktop", "creates one-off records; reseed to rerun");

test("1. arrival guidance expands and progress stays connected to overview", async ({ page }) => {
  await page.goto("/arrival");
  const heading = page.getByRole("heading", { name: /of 8 steps completed/ });
  const before = Number((await heading.textContent())?.match(/\d+/)?.[0]);
  await page.getByRole("button", { name: /First 48 Hours/ }).click();
  await page.getByRole("button", { name: /Get a local SIM card/ }).click();
  await expect(page.getByText("Original passport · Local accommodation address")).toBeVisible();
  const box = page.getByRole("checkbox", { name: "Complete Get a local SIM card" });
  const after = (await box.isChecked()) ? before - 1 : before + 1;
  await box.click();
  await expect(page.getByRole("heading", { name: `${after} of 8 steps completed` })).toBeVisible();
  await page.goto("/");
  await expect(page.getByText(`${after} of 8 settling-in steps completed`)).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(after));
});

test("2–3. housing filters, report, admin verification and date refresh", async ({
  page,
  browser,
}) => {
  await page.goto("/housing");
  await page.getByLabel("Area", { exact: true }).selectOption("La Tour Koenig");
  await page.getByLabel("Maximum monthly budget").selectOption("10000");
  await page.getByLabel("Room type", { exact: true }).selectOption("Studio");
  const card = page.locator(".listing-card");
  await expect(card).toHaveCount(1);
  await page.getByRole("button", { name: "View Contact & Details" }).click();
  await expect(page.getByRole("dialog").getByText("Demo landlord · +230 5XXX XXXX")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Report outdated info", exact: true }).click();
  await page.getByLabel("Rent price changed").check();
  await page.getByLabel("Anything else?").fill("The quoted rent has changed to Rs 10,000.");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(card.getByText("Reported — Under Review")).toBeVisible();

  const admin = await pageAs(browser, "isc_admin");
  await admin.goto("/admin/housing");
  const report = admin.locator(".queue-card").filter({ hasText: "A quiet studio, close to campus" });
  await expect(report.getByText(/Rent price changed/).first()).toBeVisible();
  await report.getByRole("button", { name: "Verify & Refresh Date" }).click();
  await expect(report).toHaveCount(0);

  const today = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
  await expect(async () => {
    await page.reload(); // filters reset on reload, so target the listing by title
    const studio = page.locator(".listing-card").filter({ hasText: "A quiet studio, close to campus" });
    await expect(studio.getByText("Reported — Under Review")).toHaveCount(0);
    await expect(studio.getByText(`Last checked: ${today}`)).toBeVisible();
  }).toPass();
});

test("4. buddy request can be assigned by admin and appears as active match", async ({
  page,
  browser,
}) => {
  desktopOnly();
  await page.goto("/buddy");
  await page.locator("[aria-pressed]").filter({ hasText: "Request a buddy" }).click();
  await page.getByLabel("Home country").fill("Zimbabwe");
  await page.getByLabel("Preferred language").selectOption("English");
  await page.getByLabel("Faculty / programme").fill("BSc Software Engineering");
  await page.getByLabel("Campus tour", { exact: true }).check();
  await page.locator("form").getByRole("button", { name: "Request a buddy" }).click();
  await expect(page.getByText("Pending Match", { exact: true })).toBeVisible();

  const admin = await pageAs(browser, "isc_admin");
  await admin.goto("/admin/buddies");
  const request = admin.locator(".queue-card").filter({ hasText: "BSc Software Engineering" }).first();
  const sameer = await request.locator("option", { hasText: "Sameer Seebaluck" }).getAttribute("value");
  await request.getByLabel("Available volunteer").selectOption(sameer!);
  await request.getByRole("button", { name: "Assign Match" }).click();
  await expect(request).toHaveCount(0); // leaves the pending list once matched
  await admin.goto("/admin/buddies?status=matched");
  await expect(admin.getByText("Matched with Sameer Seebaluck").first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Sameer Seebaluck" })).toBeVisible();
  await expect(page.getByText("Active match", { exact: true })).toBeVisible();
});

test("4b. volunteer form retains languages and offered capacity", async ({ page }) => {
  desktopOnly();
  await page.goto("/buddy");
  await page.getByRole("button", { name: "Volunteer as a buddy", exact: true }).click();
  await page.getByLabel("Year of study").selectOption("Year 3");
  await page.getByLabel("Maximum students I can support").selectOption("2");
  await page.getByLabel("Languages spoken").fill("English, French");
  await page.locator("form").getByRole("checkbox").check();
  await page.locator("form").getByRole("button", { name: "Volunteer as a buddy" }).click();
  await expect(page.getByText("You’ve offered to support up to 2 students.")).toBeVisible();
  await page.getByRole("button", { name: "Edit volunteer details" }).click();
  await expect(page.getByLabel("Languages spoken")).toHaveValue("English, French");
  await expect(page.getByLabel("Maximum students I can support")).toHaveValue("2");
});

test("5. RSVP toggles and membership registration confirms", async ({ page }) => {
  desktopOnly();
  await page.goto("/updates");
  const feed = page.locator(".editorial-feed");
  await page.getByRole("button", { name: "Events", exact: true }).click();
  await feed.getByRole("button", { name: "RSVP Going" }).first().click();
  await expect(feed.getByRole("button", { name: "Going", exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "You’re going" }).first().click();
  await expect(feed.getByRole("button", { name: "RSVP Going" }).first()).toBeVisible();
  await page.getByRole("button", { name: "ISC Membership", exact: true }).click();
  await page.getByRole("button", { name: /Renew \/ Register/ }).click();
  await page.getByLabel("Student email").fill("student@example.com");
  await page.getByLabel("Programme", { exact: true }).fill("BSc Software Engineering");
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page.getByRole("button", { name: "Register membership", exact: true }).click();
  await expect(page.getByText("2026–2027 registration received")).toBeVisible();
});

test("5b. admin can publish a notice to the student feed", async ({ page, browser }) => {
  const title = `Demo transport update ${Date.now()}`;
  const admin = await pageAs(browser, "isc_admin");
  await admin.goto("/admin/publish");
  await admin.getByLabel("Update category").selectOption("Weather & Holidays");
  await admin.getByLabel("Title", { exact: true }).fill(title);
  await admin
    .getByLabel("Update details")
    .fill("Please confirm your campus bus route before travelling this afternoon.");
  await admin.locator("form").getByRole("checkbox").check();
  await admin.getByRole("button", { name: "Publish club update", exact: true }).last().click();

  await expect(async () => {
    await page.goto("/updates");
    await expect(
      page.locator(".editorial-feed").getByRole("button", { name: title, exact: true }),
    ).toBeVisible({ timeout: 2_000 });
  }).toPass();
});

test("6. welfare enquiry is hidden from admin; staff status reaches student tracker", async ({
  page,
  browser,
}) => {
  const description = `Fictional demo enquiry ${Date.now()} requesting a wellbeing appointment.`;
  await page.goto("/welfare");
  const before = await page.locator(".enquiry-row").count();
  await page.getByLabel("Enquiry category").selectOption("Health & Wellbeing");
  await page.getByLabel("Urgent — 24h", { exact: true }).check();
  await page.getByLabel("Brief description").fill(description);
  await page.getByRole("button", { name: "Submit confidential enquiry" }).click();
  // Newest enquiry is listed first; its generated reference ties the three views together.
  // Wait for the tracker to refresh before reading the newest row.
  await expect(page.locator(".enquiry-row")).toHaveCount(before + 1);
  const newest = page.locator(".enquiry-row").first();
  await expect(newest).toContainText("Submitted");
  const id = (await newest.textContent())?.match(/WLF-\d{4}-\d{3}/)?.[0];
  expect(id).toBeTruthy();

  const admin = await pageAs(browser, "isc_admin");
  await admin.goto("/admin");
  await expect(admin.getByText(description)).toHaveCount(0);
  await expect(admin.getByText(id!)).toHaveCount(0);
  await admin.goto("/welfare-staff");
  await expect(admin.getByText("Authorised Welfare Access Only")).toHaveCount(0);
  await expect(admin.getByText(description)).toHaveCount(0);
  await expect(admin.getByText(id!)).toHaveCount(0);

  const staff = await pageAs(browser, "welfare_staff");
  await staff.goto("/welfare-staff");
  await expect(staff.getByText("Authorised Welfare Access Only")).toBeVisible();
  const ticket = staff.locator(".queue-card").filter({ hasText: id! });
  await ticket.getByRole("button", { name: "Inspect enquiry" }).click();
  await expect(ticket.getByText(description)).toBeVisible();
  const status = ticket.getByLabel("Update support status");
  await status.selectOption("Acknowledged");
  await expect(status).toHaveValue("Acknowledged");
  await status.selectOption("Referred to Counsellor");
  await expect(status).toHaveValue("Referred to Counsellor");

  const row = page.locator(".enquiry-row").filter({ hasText: id! });
  await expect(async () => {
    await page.reload();
    await expect(row).toContainText("Referred to Counsellor", { timeout: 2_000 });
  }).toPass();
});

test("all screens fit the viewport, imagery loads, dialogs close with Escape", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const photo = page.locator(".island-photo img");
  await expect(photo).toBeVisible();
  expect(
    await photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
  ).toBe(true);
  for (const path of ["/", "/arrival", "/housing", "/buddy", "/updates", "/welfare"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(
      true,
    );
  }
  await page.getByRole("button", { name: "Privacy & care" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("student is kept out of staff workspaces", async ({ page }) => {
  for (const path of ["/admin", "/admin/housing", "/admin/buddies", "/admin/people", "/admin/activity", "/admin/publish", "/welfare-staff"]) {
    await page.goto(path);
    await expect(page.getByText("Authorised Welfare Access Only")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Verify & Refresh Date" })).toHaveCount(0);
  }
});

test("housing report photo is stored in Neon Object Storage and readable by admin only", async ({
  page,
  browser,
}) => {
  test.skip(test.info().project.name !== "desktop", "creates a report; run once");
  const title = "Bright apartment near the market";
  await page.goto("/housing");
  const card = page.locator(".listing-card").filter({ hasText: title });
  await card.getByRole("button", { name: "Report outdated info", exact: true }).click();
  await page.getByLabel("Inaccurate details").check();
  await page.locator('input[name="photo"]').setInputFiles("public/icon-192.png");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(card.getByText("Reported — Under Review")).toBeVisible();
  // Students never receive the photo link.
  expect(await page.content()).not.toContain("housing-reports/");

  const admin = await pageAs(browser, "isc_admin");
  await admin.goto("/admin/housing");
  const queued = admin.locator(".queue-card").filter({ hasText: title });
  const link = queued.getByRole("link", { name: "View attached photo" });
  await expect(link).toBeVisible();
  const res = await admin.request.get((await link.getAttribute("href"))!);
  expect(res.status()).toBe(200);
  expect((await res.body()).subarray(1, 4).toString()).toBe("PNG");

  await queued.getByRole("button", { name: "Verify & Refresh Date" }).click();
  await expect(queued).toHaveCount(0);
});
