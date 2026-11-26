import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { toCsv } from "../lib/admin/csv";
import { formatDate } from "../lib/admin/format";
import { accounts, pageAs } from "./roles";

// Tests that create records or change roles run on desktop only and assume `pnpm db:reset-e2e` beforehand.
const desktopOnly = () => test.skip(test.info().project.name !== "desktop", "creates records; reset to rerun");

const ADMIN_ROUTES = ["/admin", "/admin/housing", "/admin/buddies", "/admin/people", "/admin/activity", "/admin/content"];
const HOUSING = "Room in a friendly shared home";

// A5 registers the E2E student as a volunteer with a request of its own. Remove both so the
// volunteer/buddy flows in flows.spec.ts start clean (they assume a student with no volunteer row).
test.afterAll(async () => {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  await sql`delete from buddy_requests where programme = 'BSc A5 Buddy Check'`;
  await sql`delete from volunteers where lower(email) = ${accounts.student().email.toLowerCase()}`;
});

async function reportListing(page: Page, title: string, reason: string, note: string) {
  await page.goto("/housing");
  const card = page.locator(".listing-card").filter({ hasText: title });
  await card.getByRole("button", { name: "Report outdated info", exact: true }).click();
  await page.getByLabel(reason).check();
  await page.getByLabel("Anything else?").fill(note);
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(card.getByText("Reported — Under Review")).toBeVisible();
}

test("A1. dashboard shows attention, KPIs and no support-service data", async ({ browser }) => {
  const admin = await pageAs(browser, "isc_admin");
  await admin.goto("/admin");
  await expect(admin.getByRole("heading", { name: "Committee dashboard." })).toBeVisible();
  await expect(admin.getByRole("heading", { name: "Needs attention" })).toBeVisible();
  await expect(admin.locator(".adm-tile")).toHaveCount(7);
  await expect(admin.getByRole("navigation", { name: "Committee sections" })).toBeVisible();
  const html = await admin.content();
  expect(html).not.toMatch(/WLF-/);
  expect(html).not.toMatch(/welfare/i);
  for (const c of ["Accommodation Crisis", "Financial / Tuition", "Health & Wellbeing", "Academic / Visa Support", "Personal / Safety"])
    expect(html).not.toContain(c);
  await admin.goto("/admin?range=7");
  await expect(admin.locator(".adm-tile")).toHaveCount(7);
});

test("A2. students and staff cannot reach admin pages or exports; admin cannot reach staff queue", async ({ browser }) => {
  for (const role of ["student", "welfare_staff"] as const) {
    const p = await pageAs(browser, role);
    for (const path of ADMIN_ROUTES) {
      await p.goto(path);
      await expect(p.getByText(/could not be found/i), `${role} ${path}`).toBeVisible();
      await expect(p.getByRole("navigation", { name: "Committee sections" })).toHaveCount(0);
    }
    for (const kind of ["members", "volunteers", "kpis"]) {
      const res = await p.request.get(`/api/admin/export/${kind}`);
      expect([401, 403], `${role} export ${kind}`).toContain(res.status());
      expect(await res.text()).not.toContain("@");
    }
  }
  const admin = await pageAs(browser, "isc_admin");
  await admin.goto("/welfare-staff");
  await expect(admin.getByText("Authorised Welfare Access Only")).toHaveCount(0);
});

test("A3. source guard: every action and data function starts with its guard; no support-service data", () => {
  const root = process.cwd();
  const firstStatements = (file: string, guards: RegExp) => {
    const src = readFileSync(join(root, "lib/admin", file), "utf8");
    const chunks = src.split(/^export async function /m).slice(1);
    expect(chunks.length, file).toBeGreaterThan(0);
    for (const chunk of chunks) {
      const body = chunk.slice(chunk.search(/\{\r?\n/) + 1).trimStart();
      expect(body, `${file}: ${chunk.slice(0, 40)}`).toMatch(guards);
    }
    return src;
  };
  for (const f of readdirSync(join(root, "lib/admin")).filter((f) => f.startsWith("actions-"))) {
    const src = firstStatements(f, /^const g = await adminGate\(\);/);
    expect(src.startsWith('"use server"'), f).toBe(true);
  }
  for (const f of readdirSync(join(root, "lib/admin")).filter((f) => f.startsWith("data-")))
    firstStatements(f, /^(const \w+ = )?await requireAdmin\(\);/);

  // No admin code may touch the support-service tables or mention them (audit.ts only rejects them).
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? (e.name === "content" ? [] : walk(join(dir, e.name))) : [join(dir, e.name)]);
  const files = [...walk(join(root, "lib/admin")), ...walk(join(root, "app/(app)/admin")), ...walk(join(root, "app/api/admin"))]
    .filter((f) => !f.endsWith("audit.ts") && !f.endsWith(".css"));
  for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/welfare/i);
});

test("A4. housing: report, dismiss needs a note, verify refreshes the date, activity records both", async ({ page, browser }) => {
  desktopOnly();
  test.setTimeout(120_000);
  const dismissNote = `Checked by phone ${Date.now()}, details are correct.`;
  await page.goto("/housing");
  const before = await page.locator(".listing-card").filter({ hasText: HOUSING }).getByText(/Last checked:/).textContent();
  await reportListing(page, HOUSING, "Inaccurate details", "A4 first report");

  const admin = await pageAs(browser, "isc_admin");
  await admin.goto("/admin/housing");
  const card = admin.locator(".queue-card").filter({ hasText: HOUSING });
  await expect(card.getByText(/Report 1: Inaccurate details/)).toBeVisible();
  await expect(card.getByText(/just now|minutes? ago|hours? ago/)).toBeVisible();

  await card.getByRole("button", { name: "Dismiss report..." }).click();
  const dialog = admin.getByRole("dialog");
  await dialog.getByRole("button", { name: "Dismiss reports" }).click(); // no note: the form refuses
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Reason for dismissing").fill(dismissNote);
  await dialog.getByRole("button", { name: "Dismiss reports" }).click();
  await expect(card).toHaveCount(0);

  // Dismissal does not refresh the checked date.
  await expect(async () => {
    await page.goto("/housing");
    const listing = page.locator(".listing-card").filter({ hasText: HOUSING });
    await expect(listing.getByText("Reported — Under Review")).toHaveCount(0);
    await expect(listing.getByText(/Last checked:/)).toHaveText(before!);
  }).toPass({ timeout: 20_000 });

  await reportListing(page, HOUSING, "Rent price changed", "A4 second report");
  await admin.goto("/admin/housing");
  await card.getByRole("button", { name: "Verify & Refresh Date" }).click();
  await expect(card).toHaveCount(0);
  await expect(async () => {
    await page.goto("/housing");
    await expect(page.locator(".listing-card").filter({ hasText: HOUSING }).getByText(`Last checked: ${formatDate(new Date())}`)).toBeVisible();
  }).toPass({ timeout: 20_000 });

  await admin.goto("/admin/housing?tab=resolved");
  await expect(admin.getByText("Dismissed", { exact: true }).first()).toBeVisible();
  await expect(admin.getByText(dismissNote)).toBeVisible();

  await admin.goto("/admin/activity");
  await expect(admin.getByText(`Dismissed reports on listing "${HOUSING}"`).first()).toBeVisible();
  await expect(admin.getByText(`Verified listing "${HOUSING}"`).first()).toBeVisible();
  await expect(admin.getByText(dismissNote)).toHaveCount(0);

  // A stale listing can be verified without any report.
  await admin.goto("/admin/housing?tab=stale");
  const stale = admin.locator(".queue-card").first();
  if (await stale.count()) {
    await stale.getByRole("button", { name: "Verify & Refresh Date" }).click();
    await expect(async () => {
      await admin.goto("/admin/activity");
      await expect(admin.getByText(/Verified listing/).first()).toBeVisible();
    }).toPass();
  }
});

test("A5. buddies: volunteers need approval, capacity is enforced, reassign/unassign/close are audited", async ({ page, browser }) => {
  desktopOnly();
  test.setTimeout(120_000);
  const email = new RegExp(accounts.student().email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  await page.goto("/buddy");
  await page.getByRole("button", { name: "Volunteer as a buddy", exact: true }).click();
  await page.getByLabel("Year of study").selectOption("Year 3");
  await page.getByLabel("Maximum students I can support").selectOption("1");
  await page.getByLabel("Languages spoken").fill("English, French");
  await page.locator("form").getByRole("checkbox").check();
  await page.locator("form").getByRole("button", { name: "Volunteer as a buddy" }).click();
  await expect(page.getByText("You’ve offered to support up to 1 student")).toBeVisible();
  await page.locator("[aria-pressed]").filter({ hasText: "Request a buddy" }).click();
  await page.getByLabel("Home country").fill("Zimbabwe");
  await page.getByLabel("Preferred language").selectOption("English");
  await page.getByLabel("Faculty / programme").fill("BSc A5 Buddy Check");
  await page.getByLabel("Campus tour", { exact: true }).check();
  await page.locator("form").getByRole("button", { name: "Request a buddy" }).click();
  await expect(page.getByText("Pending Match", { exact: true })).toBeVisible();

  const admin = await pageAs(browser, "isc_admin");
  await admin.goto("/admin/buddies?tab=volunteers");
  const vol = admin.locator(".queue-card").filter({ hasText: email });
  const volName = (await vol.locator("h3").textContent())!;
  await expect(vol.getByText("Pending", { exact: true })).toBeVisible();

  // Pending volunteers are not offered in the match list.
  await admin.goto("/admin/buddies");
  const request = admin.locator(".queue-card").filter({ hasText: "BSc A5 Buddy Check" });
  await expect(request.locator("option", { hasText: volName })).toHaveCount(0);

  await admin.goto("/admin/buddies?tab=volunteers");
  await vol.getByRole("button", { name: "Approve" }).click();
  await expect(vol.getByText("Approved", { exact: true })).toBeVisible();

  await admin.goto("/admin/buddies");
  const value = await request.locator("option", { hasText: volName }).getAttribute("value");
  await request.getByLabel("Available volunteer").selectOption(value!);
  await request.getByRole("button", { name: "Assign Match" }).click();
  await expect(request).toHaveCount(0);

  // Capacity 1 is now used up: the option is disabled, and the server refuses a forced attempt.
  const other = admin.locator(".queue-card").filter({ hasNotText: "BSc A5 Buddy Check" }).filter({ has: admin.getByRole("button", { name: "Assign Match" }) }).first();
  if (await other.count()) {
    const opt = other.locator("option", { hasText: volName });
    await expect(opt).toBeDisabled();
    await opt.evaluate((o: HTMLOptionElement) => { o.disabled = false; });
    await other.getByLabel("Available volunteer").selectOption(await opt.getAttribute("value") ?? "");
    await other.getByRole("button", { name: "Assign Match" }).click();
    await expect(admin.getByText(/already at capacity/)).toBeVisible();
  }

  // Reassign to another approved volunteer with room.
  await admin.goto("/admin/buddies?status=matched");
  const matched = admin.locator(".queue-card").filter({ hasText: "BSc A5 Buddy Check" });
  await matched.getByRole("button", { name: "Reassign" }).click();
  const dialog = admin.getByRole("dialog");
  const free = dialog.locator("option:not([disabled])").first();
  const freeName = (await free.textContent())!.split(" · ")[0];
  await dialog.getByLabel("Available volunteer").selectOption((await free.getAttribute("value"))!);
  await dialog.getByRole("button", { name: "Reassign", exact: true }).click();
  await expect(matched.getByText(`Matched with ${freeName}`)).toBeVisible();

  // Unassign: the student sees a pending request again.
  await matched.getByRole("button", { name: "Unassign" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Unassign" }).click();
  await expect(matched).toHaveCount(0);
  await page.goto("/buddy");
  await expect(page.getByText("Pending Match", { exact: true })).toBeVisible();

  // Match again, then close the request.
  await admin.goto("/admin/buddies");
  await request.getByRole("button", { name: "Assign Match" }).click();
  await expect(request).toHaveCount(0);
  await admin.goto("/admin/buddies?status=matched");
  await matched.getByRole("button", { name: "Close request" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Close request" }).click();
  await expect(matched).toHaveCount(0);
  await admin.goto("/admin/buddies?status=closed");
  await expect(admin.locator(".queue-card").filter({ hasText: "BSc A5 Buddy Check" })).toBeVisible();

  await admin.goto("/admin/activity");
  for (const text of ["Reassigned", "Unmatched", "Closed the buddy request", `Approved volunteer ${volName}`])
    await expect(admin.getByText(new RegExp(text)).first()).toBeVisible();
});

test("A6. people: search, protected rows, role changes and invites are owner-only", async ({ browser }) => {
  desktopOnly();
  test.setTimeout(120_000);
  const { email } = accounts.student();
  const admin = await pageAs(browser, "isc_admin");
  const student = await pageAs(browser, "student");
  const row = (p: Page, e: string) => p.locator(".adm-row").filter({ hasText: e });

  await admin.goto(`/admin/people?q=${encodeURIComponent(email)}`);
  await expect(row(admin, email)).toHaveCount(1);

  // Own row and the support-staff row have no Change role button.
  await admin.goto(`/admin/people?q=${encodeURIComponent(accounts.isc_admin().email)}`);
  await expect(row(admin, accounts.isc_admin().email).getByText("You", { exact: true })).toBeVisible();
  await expect(admin.getByRole("button", { name: "Change role" })).toHaveCount(0);
  await admin.goto(`/admin/people?q=${encodeURIComponent(accounts.welfare_staff().email)}`);
  await expect(admin.getByText("Managed by operator")).toBeVisible();
  await expect(admin.getByRole("button", { name: "Change role" })).toHaveCount(0);

  // The e2e admin is not the owner: no role changes and no invite panel, and the student stays a student.
  await admin.goto(`/admin/people?q=${encodeURIComponent(email)}`);
  await expect(row(admin, email).getByText("Owner only", { exact: true })).toBeVisible();
  await expect(admin.getByRole("button", { name: "Change role" })).toHaveCount(0);
  await expect(admin.getByRole("heading", { name: "Invite an admin" })).toHaveCount(0);
  await student.goto("/admin");
  await expect(student.getByText(/could not be found/i)).toBeVisible();
});

test("A7. export: members CSV is safe, minimal, no-store and audited", async ({ browser }) => {
  desktopOnly();
  test.setTimeout(120_000);
  expect(toCsv(["a", "b"], [["=1+1", "x,y"], ["+SUM(A1)", "@cmd"]])).toBe('﻿a,b\r\n\'=1+1,"x,y"\r\n\'+SUM(A1),\'@cmd\r\n');

  const admin = await pageAs(browser, "isc_admin");
  await admin.goto("/admin/people");
  await admin.getByRole("button", { name: "Export Members CSV" }).click();
  await expect(admin.getByRole("dialog").getByText(/contains personal data/)).toBeVisible();

  const res = await admin.request.get("/api/admin/export/members");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-disposition"]).toMatch(/^attachment; filename="isc-members-\d{4}-\d{2}-\d{2}\.csv"$/);
  expect(res.headers()["cache-control"]).toContain("no-store");
  const body = await res.text();
  expect(body.charCodeAt(0)).toBe(0xfeff);
  expect(body.split("\r\n")[0]).toBe("﻿name,email,programme,registered");
  expect((await admin.request.get("/api/admin/export/nope")).status()).toBe(404);
  expect((await admin.request.get("/api/admin/export/kpis")).status()).toBe(200);

  await admin.goto("/admin/activity?type=export");
  await expect(admin.getByText(/Exported members \(\d+ rows\)/).first()).toBeVisible();
});

test("A8. activity feed holds no note text, references or email addresses", async ({ browser }) => {
  const admin = await pageAs(browser, "isc_admin");
  await admin.goto("/admin/activity");
  await expect(admin.getByRole("heading", { name: "Activity" })).toBeVisible();
  const text = await admin.locator("main, #main-content").first().innerText();
  expect(text).not.toMatch(/WLF-/);
  expect(text).not.toContain("@");
  expect(text).not.toMatch(/Checked by phone|A4 first report|A4 second report/);
});

test("A9. every admin screen fits 360px with 44px targets", async ({ browser }) => {
  const admin = await pageAs(browser, "isc_admin", { width: 360, height: 740 });
  for (const path of [...ADMIN_ROUTES, "/admin/buddies?tab=volunteers", "/admin/housing?tab=stale"]) {
    await admin.goto(path);
    await expect(admin.getByRole("navigation", { name: "Committee sections" })).toBeVisible();
    await expect(admin.locator("h1, h2").first()).toBeVisible();
    expect(await admin.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(360);
    const small = await admin.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("main .button, main button, main select, main input:not([type=hidden]):not([type=checkbox]):not([type=radio]), .adm-attn, .adm-chips > *, .adm-subnav a")]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.height < 43.5)
        .map(({ el, r }) => `${el.tagName}.${el.className} ${Math.round(r.height)}px "${(el.textContent ?? "").slice(0, 30)}"`));
    expect(small, path).toEqual([]);
  }
  await admin.context().close();
});

test("A10. admin invite: only the invited email can accept, once, and it is audited", async ({ browser }) => {
  desktopOnly();
  test.setTimeout(120_000);
  const { createHash } = await import("node:crypto");
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  const token = `e2e-invite-${Date.now()}-abcdefghijklmnop`;
  const student = accounts.student().email.toLowerCase();
  const [owner] = await sql`select user_id from profiles where is_owner limit 1`;
  const hash = createHash("sha256").update(token).digest("hex");
  const add = (email: string, h: string) => sql`insert into admin_invites (email, token_hash, invited_by, invited_by_name, expires_at)
    values (${email}, ${h}, ${owner?.user_id ?? "e2e"}, 'E2E owner', now() + interval '1 day')`;
  await add(student, hash);
  const wrong = `e2e-invite-${Date.now()}-wrongemailtoken00`;
  await add("someone.else@example.com", createHash("sha256").update(wrong).digest("hex"));
  const user = await pageAs(browser, "student");
  try {
    await user.goto(`/invite/${wrong}`);
    await user.getByRole("button", { name: "Accept invite" }).click();
    await expect(user.getByText(/sent to a different email/)).toBeVisible();
    await user.goto(`/invite/${token}`);
    await user.getByRole("button", { name: "Accept invite" }).click();
    await expect(user.getByRole("heading", { name: "Committee dashboard." })).toBeVisible();
    await user.goto(`/invite/${token}`);
    await user.getByRole("button", { name: "Accept invite" }).click();
    await expect(user.getByText(/invalid, expired or already used|already has committee/)).toBeVisible();
  } finally {
    await sql`update profiles set role = 'student' where user_id in (select id::text from neon_auth."user" where lower(email) = ${student}) and not is_owner`;
    await sql`delete from admin_invites where email in (${student}, 'someone.else@example.com')`;
    await sql`delete from audit_log where action = 'admin.invite_accept' and detail->>'email' = ${student}`;
  }
});
