import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { cleanup, adminCount, adminPage, idOf, MARK, PNG, statusOf, title } from "./cms-helpers";
import { statePath } from "./roles";
import { cleanText, firstBadLink, sniffImage, validateDate, validateUrl, parseMuDateTime } from "../lib/cms/validate";

// Admin-side CMS flows. Rows are created under the E2E-CMS marker and removed by direct SQL (production shares this DB).
// Student-visible assertions (C2, C6, C7, C8, C9, C10, C12) need the integrator's read-path wiring: they are test.fixme below.
test.beforeAll(cleanup);
test.afterAll(cleanup);

const url = (p: string) => `/admin/content${p}`;

async function saved(page: Page, text: RegExp | string) {
  await expect(page.getByRole("status").filter({ hasText: text })).toBeVisible({ timeout: 15_000 });
}

async function newUpdate(page: Page, o: { title: string; category?: string; body?: string; venue?: string }) {
  await page.goto(url("/updates/new"));
  await page.getByLabel("Category").selectOption(o.category ?? "ISC Membership");
  await page.getByLabel(/^Title/).fill(o.title);
  await page.getByLabel(/^Details/).fill(o.body ?? "Plain body text.");
  if ((o.category ?? "") === "Events") {
    await page.getByLabel(/^Date and time/).fill("2026-12-20T14:30");
    await page.getByLabel(/^Venue/).fill(o.venue ?? "Main hall");
  }
}

test.describe("validators", () => {
  test("urls are https only; links, dates and image bytes are checked", () => {
    expect(validateUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "http://example.com", "https://user:pw@example.com", "https://localhost", "https://exa mple.com", "//example.com", ""])
      expect(validateUrl(bad), bad).toBeNull();
    expect(validateUrl("mailto:a@b.co")).toBeNull();
    expect(validateUrl("mailto:a@b.co", { rich: true })).toBe("mailto:a@b.co");
    expect(firstBadLink("ok [a](https://example.com) bad [b](javascript:alert(1))")).toBe("javascript:alert(1)");
    expect(firstBadLink("[a](https://example.com)")).toBeNull();
    expect(cleanText("  hi\u0000 there  ", 20)).toBe("hi there");
    expect(cleanText("x".repeat(11), 10)).toBeNull();
    expect(cleanText("a\nb", 10)).toBe("a b");
    expect(cleanText("a\nb", 10, 1, true)).toBe("a\nb");
    expect(validateDate("2026-02-30")).toBeNull();
    expect(validateDate("2026-02-28")).toBe("2026-02-28");
    expect(parseMuDateTime("2026-12-20T14:30")?.toISOString()).toBe("2026-12-20T10:30:00.000Z");
    expect(sniffImage(Uint8Array.from(PNG))?.ext).toBe("png");
    expect(sniffImage(new TextEncoder().encode("hello world, not an image"))).toBeNull();
    expect(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))?.ext).toBe("jpg");
  });

  test("every exported server action starts with requireAdmin()", () => {
    const src = fs.readFileSync(path.join(__dirname, "../app/(app)/admin/content/actions.ts"), "utf8");
    const exported = [...src.matchAll(/export async function (\w+)/g)].map((m) => m[1]);
    const guarded = [...src.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{\s*\n\s*const a = await requireAdmin\(\);\s*\n\s*if \("error" in a\) return a\.error;/g)].map((m) => m[1]);
    expect(exported.length).toBeGreaterThan(10);
    expect(guarded).toEqual(exported);
  });
});

test.describe("access", () => {
  for (const role of ["student", "welfare_staff"] as const) {
    test(`${role} cannot open any /admin/content route`, async ({ browser }) => {
      const context = await browser.newContext({ storageState: statePath(role) });
      const page = await context.newPage();
      for (const p of ["", "/updates", "/updates/new", "/guide", "/housing/new", "/links", "/pages", "/pages/contact", "/updates/1/history", "/updates/1/preview"]) {
        const res = await page.goto(url(p));
        await expect(page.getByRole("heading", { name: /^(Content|Club updates|New club update|Arrival guide|Housing)/ }), p).toHaveCount(0);
        await expect(page.getByText(/could not be found|404/i).first(), p).toBeVisible();
        expect([200, 404]).toContain(res?.status());
      }
      await context.close();
    });
  }
});

test.describe("club updates", () => {
  test("draft, publish, edit, history, restore, unpublish, delete, restore deleted", async ({ browser }) => {
    const page = await adminPage(browser);
    const t = title("event");
    await newUpdate(page, { title: t, category: "Events", venue: "Main hall" });
    await page.getByRole("button", { name: "Save draft" }).click();
    await page.waitForURL(/\/updates\/\d+$/);
    const id = await idOf("club_updates", t);
    expect((await statusOf("club_updates", id))?.status).toBe("draft");

    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await saved(page, "Published.");
    expect((await statusOf("club_updates", id))?.status).toBe("published");

    const t2 = `${t} edited`;
    await page.getByLabel(/^Title/).fill(t2);
    await page.getByRole("button", { name: "Save changes" }).click();
    await saved(page, "Saved.");
    await page.goto(url(`/updates/${id}/history`));
    await expect(page.getByText(/title/).first()).toBeVisible();
    await page.getByRole("button", { name: "Restore this version" }).last().click();
    await page.getByRole("button", { name: "Yes, restore" }).click();
    await page.waitForURL(new RegExp(`/updates/${id}$`));
    await expect(page.getByLabel(/^Title/)).toHaveValue(t);

    await page.getByRole("button", { name: "Unpublish" }).click();
    await saved(page, "Archived.");
    expect((await statusOf("club_updates", id))?.status).toBe("archived");

    await page.goto(url(`/updates?status=archived&q=${encodeURIComponent(t)}`));
    await expect(page.getByRole("heading", { name: t })).toBeVisible();
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page.getByText("Deleted. You can restore it")).toBeVisible();
    expect((await statusOf("club_updates", id))?.deleted_at).not.toBeNull();
    await page.goto(url(`/updates?status=deleted&q=${encodeURIComponent(t)}`));
    await page.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByText("Restored as a draft.")).toBeVisible();
    const after = await statusOf("club_updates", id);
    expect([after?.deleted_at, after?.status]).toEqual([null, "draft"]);
  });

  test("a future publish date shows as Scheduled", async ({ browser }) => {
    const page = await adminPage(browser);
    const t = title("scheduled");
    await newUpdate(page, { title: t });
    await page.getByText("More options: schedule").click();
    await page.getByLabel(/^Publish at/).fill("2099-01-01T09:00");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await saved(page, "Published.");
    await page.goto(url(`/updates?status=scheduled&q=${encodeURIComponent(t)}`));
    await expect(page.getByRole("heading", { name: t })).toBeVisible();
    await expect(page.locator("article", { hasText: t }).getByText("Scheduled")).toBeVisible();
  });

  test("Official Announcements need approval with a reference", async ({ browser }) => {
    const page = await adminPage(browser);
    const t = title("official");
    await newUpdate(page, { title: t, category: "Official Announcements" });
    await expect(page.getByRole("button", { name: "Publish", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Submit for UTM approval" }).click();
    await page.waitForURL(/\/updates\/\d+$/);
    const id = await idOf("club_updates", t);
    expect((await statusOf("club_updates", id))?.status).toBe("pending_approval");
    await page.getByRole("button", { name: "Record UTM approval" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Record who at UTM approved" })).toBeVisible();
    await page.getByLabel(/^UTM approval reference/).fill("Student Affairs email, ref E2E-1");
    await page.getByRole("button", { name: "Record UTM approval" }).click();
    if ((await adminCount()) > 1) {
      await expect(page.getByRole("alert").filter({ hasText: "Another committee member must record" })).toBeVisible();
      expect((await statusOf("club_updates", id))?.status).toBe("pending_approval");
    } else {
      await saved(page, /only committee admin/);
      expect((await statusOf("club_updates", id))?.status).toBe("published");
    }
  });

  test("conflicting saves are stopped", async ({ browser }) => {
    const a = await adminPage(browser);
    const b = await adminPage(browser);
    const t = title("conflict");
    await newUpdate(a, { title: t });
    await a.getByRole("button", { name: "Save draft" }).click();
    await a.waitForURL(/\/updates\/\d+$/);
    await b.goto(a.url());
    await a.getByLabel(/^Title/).fill(`${t} A`);
    await a.getByRole("button", { name: "Save draft" }).click();
    await saved(a, "Saved.");
    await b.getByLabel(/^Title/).fill(`${t} B`);
    await b.getByRole("button", { name: "Save draft" }).click();
    await expect(b.getByRole("alert").filter({ hasText: "Someone else changed this" }).first()).toBeVisible();
    await expect(b.getByText("Your unsaved text")).toBeVisible();
  });

  test("XSS fixtures render as literal text; unsafe links are rejected", async ({ browser }) => {
    const page = await adminPage(browser);
    const t = `${title("xss")} "><img src=x onerror=window.__x=1>`;
    await newUpdate(page, { title: t, body: "<script>window.__x=1</script> **bold** [ok](https://example.com)" });
    await page.getByRole("button", { name: "Save draft" }).click();
    await page.waitForURL(/\/updates\/\d+$/);
    await page.goto(`${page.url()}/preview`);
    await expect(page.locator(".cms-preview-frame h2")).toHaveText(t);
    await expect(page.locator(".rich script, .rich img, .cms-preview-frame img")).toHaveCount(0);
    await expect(page.locator(".rich strong")).toHaveText("bold");
    await expect(page.locator(".rich")).toContainText("<script>window.__x=1</script>");
    await expect(page.locator('.rich a[href="https://example.com/"]')).toHaveAttribute("rel", "noopener noreferrer");
    expect(await page.evaluate(() => (window as unknown as { __x?: number }).__x)).toBeUndefined();

    for (const bad of ["[x](javascript:alert(1))", "[x](http://example.com)", "[x](data:text/html,hi)"]) {
      await newUpdate(page, { title: title("badlink"), body: `hi ${bad}` });
      await page.getByRole("button", { name: "Save draft" }).click();
      await expect(page.getByRole("alert").filter({ hasText: "not a safe https" })).toBeVisible();
    }
    await newUpdate(page, { title: title("badurl"), body: "hi" });
    await page.getByLabel(/^Link label/).fill("Go");
    await page.getByLabel(/^Link address/).fill("javascript:alert(1)");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "full https:// address" })).toBeVisible();
  });
});

test.describe("housing", () => {
  test("listing with photo: validation, upload rules, publish, verify", async ({ browser }) => {
    const page = await adminPage(browser);
    const t = title("room");
    await page.goto(url("/housing/new"));
    await page.getByLabel(/^Title/).fill(t);
    await page.getByLabel(/^Area/).fill("Rose Hill");
    await page.getByLabel(/^Rent \(Rs/).fill("9500");
    await page.getByLabel(/^Walk to campus/).fill("10 min walk");
    await page.getByLabel(/^Rent includes/).fill("Water");
    await page.getByLabel(/^Contact/).fill("WhatsApp 5555 0000");

    const err = page.getByRole("alert");
    await page.getByLabel("Choose photo").setInputFiles({ name: "a.png", mimeType: "image/png", buffer: Buffer.from("this is text renamed to png") });
    await page.getByLabel("Photo description").fill(`${MARK} alt`);
    await page.getByRole("button", { name: "Add photo" }).click();
    await expect(err.filter({ hasText: "JPG, PNG or WebP" })).toBeVisible();
    const big = Buffer.concat([PNG, Buffer.alloc(4.2 * 1024 * 1024)]);
    await page.getByLabel("Choose photo").setInputFiles({ name: "big.png", mimeType: "image/png", buffer: big });
    await page.getByRole("button", { name: "Add photo" }).click();
    await expect(err.filter({ hasText: "under 4 MB" })).toBeVisible();

    await page.getByLabel("Choose photo").setInputFiles({ name: "ok.png", mimeType: "image/png", buffer: PNG });
    await page.getByRole("button", { name: "Add photo" }).click();
    const thumb = page.locator("img.cms-thumb");
    await expect(thumb).toHaveCount(1);
    await expect.poll(() => thumb.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Save draft" }).click();
    await page.waitForURL(/\/housing\/\d+$/);
    const id = await idOf("listings", t);
    expect((await statusOf("listings", id))?.status).toBe("draft");
    await expect(page.locator("img.cms-thumb")).toHaveCount(1);
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await saved(page, "Published.");
    await page.getByRole("button", { name: "Verified today" }).click();
    await saved(page, "Marked as checked today.");
    await page.goto(url(`/housing/${id}/preview`));
    await expect(page.locator(".cms-preview-frame img")).toHaveCount(1);
  });
});

test.describe("arrival guide, links, pages", () => {
  test("tasks can be added, reordered and archived", async ({ browser }) => {
    const page = await adminPage(browser);
    const t1 = title("task A");
    const t2 = title("task B");
    for (const t of [t1, t2]) {
      await page.goto(url("/guide/new"));
      await page.getByLabel("Stage").selectOption("2");
      await page.getByLabel(/^Title/).fill(t);
      await page.getByLabel(/^Details/).fill("Do this **today**.");
      await page.getByRole("button", { name: "Publish", exact: true }).click();
      await page.waitForURL(/\/guide\/\d+$/);
    }
    const pos = async (id: number) => (await neon(process.env.DATABASE_URL!).query("select position from arrival_tasks where id=$1", [id]))[0].position as number;
    const [a, b] = [await idOf("arrival_tasks", t1), await idOf("arrival_tasks", t2)];
    expect(await pos(a)).toBeLessThan(await pos(b));
    await page.goto(url(`/guide?q=${encodeURIComponent(MARK)}`));
    await page.locator("article", { hasText: t2 }).getByRole("button", { name: "Up" }).click();
    await expect.poll(async () => (await pos(b)) < (await pos(a))).toBe(true);
    await page.locator("article", { hasText: t2 }).getByRole("button", { name: "Unpublish" }).click();
    await expect.poll(async () => (await statusOf("arrival_tasks", b))?.status).toBe("archived");
  });

  test("quick links accept https only", async ({ browser }) => {
    const page = await adminPage(browser);
    const label = title("link");
    await page.goto(url("/links/new"));
    await page.getByLabel(/^Label/).fill(label);
    for (const bad of ["javascript:alert(1)", "http://example.com", "example.com"]) {
      await page.getByLabel(/^Address/).fill(bad);
      await page.getByRole("button", { name: "Publish", exact: true }).click();
      await expect(page.getByRole("alert").filter({ hasText: "full https:// address" })).toBeVisible();
    }
    await page.getByLabel(/^Address/).fill("https://example.com/info");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await page.waitForURL(/\/links\/\d+$/);
    expect((await statusOf("resource_links", await idOf("resource_links", label)))?.status).toBe("published");
  });

  test("a site page can be published and reset to the built-in text", async ({ browser }) => {
    const existing = await neon(process.env.DATABASE_URL!).query("select 1 from site_pages where key = 'contact'");
    test.skip(existing.length > 0, "A real contact page exists; not touching it.");
    const page = await adminPage(browser);
    await page.goto(url("/pages/contact"));
    await expect(page.getByText("the built-in text").first()).toBeVisible();
    await page.getByLabel(/^Window title/).fill(title("contact"));
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await saved(page, "Published.");
    await expect(page.getByText("your text").first()).toBeVisible();
    await page.getByRole("button", { name: "Reset to default" }).click();
    await expect(page.getByText("the built-in text").first()).toBeVisible();
  });
});

test.describe("phone layout 360px", () => {
  test("content screens fit, targets are 44px, inputs 16px, save bar stays visible", async ({ browser }) => {
    const page = await adminPage(browser);
    await page.setViewportSize({ width: 360, height: 740 });
    for (const p of ["", "/updates", "/updates/new", "/housing/new", "/guide/new", "/links/new", "/pages/contact", "/housing", "/guide"]) {
      await page.goto(url(p));
      await expect(page.locator("main, .page, body").first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal scroll on ${p}`).toBeLessThanOrEqual(0);
      for (const el of await page.locator(".cms-btn:visible, .cms-input:visible").all()) {
        const box = await el.boundingBox();
        expect(box!.height, `${p} target height`).toBeGreaterThanOrEqual(43.5);
      }
      for (const el of await page.locator(".cms-input:visible").all())
        expect(await el.evaluate((n) => parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(16);
    }
    await page.setViewportSize({ width: 360, height: 400 }); // keyboard-sized
    await page.goto(url("/updates/new"));
    await page.getByLabel(/^Title/).focus();
    await expect(page.getByRole("button", { name: "Save draft" })).toBeInViewport();
  });
});

// Student-facing: enable once lib/data.ts and the student pages read through lib/cms/read.ts (integrator).
test.describe("student visibility (needs read-path wiring)", () => {
  test.fixme("C2/C3 published event shows with date tile and venue; archived is hidden", async ({ page }) => {
    await page.goto("/updates");
  });
  test.fixme("C6 scheduled and expired updates are hidden", async ({ page }) => {
    await page.goto("/updates");
  });
  test.fixme("C7 published listing shows photo and contact; draft is hidden", async ({ page }) => {
    await page.goto("/housing");
  });
  test.fixme("C8 new arrival task appears in its stage in position order; archived task leaves progress <= 100%", async ({ page }) => {
    await page.goto("/arrival");
  });
  test.fixme("C9 edited contact page text appears in the student contact modal; reset restores the default", async ({ page }) => {
    await page.goto("/");
  });
  test.fixme("C10 published quick link appears on Overview", async ({ page }) => {
    await page.goto("/");
  });
  test.fixme("C12 XSS title and body render as literal text on student pages", async ({ page }) => {
    await page.goto("/updates");
  });
});
