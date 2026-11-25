import "server-only";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { arrivalProgress, arrivalTasks, clubUpdates, contentMedia, db, listings, resourceLinks, sitePages } from "@/lib/db";
import { formatDate } from "@/lib/admin/format";
import { defaultLinks, defaultPages } from "./defaults";
import { mediaUrl } from "./media";
import { PAGE_KEYS, type ListingBasics, type QuickLink, type SitePage, type StudentListing, type StudentTask, type StudentUpdate } from "./types";

// Student read path: published-only getters. Scheduling and expiry are evaluated in SQL on every read,
// so nothing needs a cron job or a revalidate when a time passes.
// Imported lazily: lib/data.ts will import this file, so a static import back would be circular.
async function viewerOf() {
  const { getViewer } = await import("@/lib/data");
  return getViewer();
}
const MU = "Indian/Mauritius";

/** Published, not deleted arrival tasks in guide order. [] when signed out. */
export async function getPublishedTasks(): Promise<StudentTask[]> {
  if (!(await viewerOf())) return [];
  const rows = await db.select({
    id: arrivalTasks.id, section: arrivalTasks.section, title: arrivalTasks.title, detail: arrivalTasks.detail,
    documents: arrivalTasks.documents, link: arrivalTasks.link, url: arrivalTasks.url,
  }).from(arrivalTasks)
    .where(and(eq(arrivalTasks.status, "published"), isNull(arrivalTasks.deletedAt)))
    .orderBy(asc(arrivalTasks.section), asc(arrivalTasks.position), asc(arrivalTasks.id));
  return rows;
}

/** Task ids the viewer completed, limited to tasks students can still see (so "x of y done" never exceeds 100%). */
export async function getCompletedPublishedTaskIds(): Promise<number[]> {
  const viewer = await viewerOf();
  if (!viewer) return [];
  const rows = await db.select({ id: arrivalProgress.taskId }).from(arrivalProgress)
    .innerJoin(arrivalTasks, eq(arrivalTasks.id, arrivalProgress.taskId))
    .where(and(eq(arrivalProgress.userId, viewer.userId), eq(arrivalTasks.status, "published"), isNull(arrivalTasks.deletedAt)));
  return rows.map((r) => r.id);
}

/** Published listings with photos and contact (signed-in viewers only; all callers are). Report data stays in lib/data.ts. */
export async function getPublishedListings(): Promise<StudentListing[]> {
  if (!(await viewerOf())) return [];
  const rows = await db.select({
    id: listings.id, title: listings.title, area: listings.area, type: listings.type, price: listings.price,
    walk: listings.walk, includes: listings.includes, checkedAt: listings.checkedAt, contact: listings.contact, isSample: listings.isSample,
    stale: sql<boolean>`${listings.checkedAt} < (now() at time zone ${MU})::date - 30`,
  }).from(listings)
    .where(and(eq(listings.status, "published"), isNull(listings.deletedAt)))
    .orderBy(asc(listings.id));
  const ids = rows.map((r) => String(r.id));
  const media = ids.length
    ? await db.select().from(contentMedia).where(and(
        eq(contentMedia.entityType, "listing"), inArray(contentMedia.entityId, ids), isNull(contentMedia.detachedAt),
      )).orderBy(asc(contentMedia.position))
    : [];
  return rows.map(({ checkedAt, stale, contact, isSample, ...l }) => ({
    ...l,
    checked: formatDate(`${checkedAt}T12:00:00+04:00`),
    ...(stale && { stale: true as const }),
    ...(contact && { contact }),
    photos: media.filter((m) => m.entityId === String(l.id)).map((m) => ({ url: mediaUrl(m.key), alt: m.alt })),
    ...(isSample && { sample: true as const }),
  }));
}

const dateBits = (d: Date) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: MU, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  return { day: p.day, month: p.month.toUpperCase(), time: `${p.hour}:${p.minute}` };
};

/** Live club updates: published, not deleted, publish_at reached, not expired. Pinned first, then newest. */
export async function getPublishedUpdates(): Promise<StudentUpdate[]> {
  if (!(await viewerOf())) return [];
  const u = clubUpdates;
  const rows = await db.select().from(u).where(and(
    eq(u.status, "published"), isNull(u.deletedAt),
    or(isNull(u.publishAt), sql`${u.publishAt} <= now()`),
    or(isNull(u.expiresAt), sql`${u.expiresAt} > now()`),
  )).orderBy(desc(u.pinned), desc(sql`coalesce(${u.publishAt}, ${u.createdAt})`));
  return rows.map((r) => {
    const event = r.category === "Events" && r.eventAt ? r.eventAt : null;
    const bits = dateBits(event ?? r.publishAt ?? r.createdAt);
    return {
      id: r.id, category: r.category, title: r.title, description: r.description, meta: r.meta,
      day: bits.day, month: bits.month,
      ...(r.pinned && { pinned: true as const }),
      ...(event && { time: bits.time }),
      ...(r.venue && { venue: r.venue }),
      ...(r.linkUrl && r.linkLabel && { link: { label: r.linkLabel, url: r.linkUrl } }),
      ...(r.category === "Official Announcements" && r.approvedAt && { approved: true as const }),
      ...(r.isSample && { sample: true as const }),
    };
  });
}

/** Footer/overview links: published rows, or the built-in default when none are published. */
export async function getQuickLinks(): Promise<QuickLink[]> {
  const rows = await db.select({ id: resourceLinks.id, label: resourceLinks.label, url: resourceLinks.url }).from(resourceLinks)
    .where(and(eq(resourceLinks.status, "published"), isNull(resourceLinks.deletedAt)))
    .orderBy(asc(resourceLinks.position), asc(resourceLinks.id));
  return rows.length ? rows : defaultLinks;
}

/** about / privacy / contact: the published row, else the built-in default. Never blank. */
export async function getSitePages(): Promise<Record<(typeof PAGE_KEYS)[number], SitePage>> {
  const rows = await db.select().from(sitePages).where(eq(sitePages.status, "published"));
  const out = {} as Record<(typeof PAGE_KEYS)[number], SitePage>;
  for (const key of PAGE_KEYS) {
    const r = rows.find((x) => x.key === key);
    out[key] = r
      ? { key, title: r.title, heading: r.heading, body: r.body, ...(r.linkUrl && r.linkLabel && { linkLabel: r.linkLabel, linkUrl: r.linkUrl }), isDefault: false }
      : { key, ...defaultPages[key], isDefault: true };
  }
  return out;
}

/** Listing identity for the admin report queue, whatever the publish status (unpublished listings keep their reports). Admin only. */
export async function getListingBasics(ids: number[]): Promise<ListingBasics[]> {
  const viewer = await viewerOf();
  if (viewer?.role !== "isc_admin" || !ids.length) return [];
  const rows = await db.select({ id: listings.id, title: listings.title, area: listings.area, status: listings.status, deletedAt: listings.deletedAt })
    .from(listings).where(inArray(listings.id, ids));
  return rows.map(({ deletedAt, ...r }) => ({ ...r, deleted: deletedAt !== null }));
}
