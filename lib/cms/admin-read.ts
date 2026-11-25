import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { clubUpdates, contentRevisions, db, housingReports, listings, profiles, resourceLinks, sitePages } from "@/lib/db";
import { getViewer } from "@/lib/data";
import { formatDate } from "@/lib/admin/format";
import { arrivalSections } from "@/lib/ui";
import { ENTITY, getPage, getRow, tableOf, type ItemType, type Row } from "./revisions";
import { listingPhotos, type Photo } from "./media";
import {
  PAGE_KEYS, type Attention, type ContentRow, type ContentType, type DisplayStatus, type StatusChip,
} from "./types";

// Admin reads. Every export returns empty / null for non-admins (the route also 404s; defence in depth).
async function isAdmin() {
  return (await getViewer())?.role === "isc_admin";
}
const MU = "Indian/Mauritius";
export const PAGE_SIZE = 20;

export function displayStatus(r: Row, now = Date.now()): DisplayStatus {
  if (r.deletedAt) return "deleted";
  if (r.status === "archived") return "archived";
  if (r.status === "pending_approval") return "pending";
  if (r.status === "draft") return "draft";
  if (r.publishAt && new Date(r.publishAt).getTime() > now) return "scheduled";
  if (r.expiresAt && new Date(r.expiresAt).getTime() <= now) return "expired";
  return "live";
}

function chipWhere(t: ReturnType<typeof tableOf>, type: ItemType, chip: StatusChip): SQL | undefined {
  const u = clubUpdates;
  const upd = type === "update";
  const notDeleted = isNull(t.deletedAt);
  const published = and(notDeleted, eq(t.status, "published"));
  switch (chip) {
    case "all": return notDeleted;
    case "deleted": return isNotNull(t.deletedAt);
    case "draft": return and(notDeleted, eq(t.status, "draft"));
    case "archived": return and(notDeleted, eq(t.status, "archived"));
    case "pending": return and(notDeleted, eq(t.status, "pending_approval"));
    case "scheduled": return upd ? and(published, sql`${u.publishAt} > now()`) : sql`false`;
    case "live": return upd ? and(published, or(isNull(u.publishAt), sql`${u.publishAt} <= now()`), or(isNull(u.expiresAt), sql`${u.expiresAt} > now()`)) : published;
  }
}

const nameMap = async (ids: (string | null)[]) => {
  const list = [...new Set(ids.filter((x): x is string => !!x))];
  if (!list.length) return new Map<string, string>();
  const rows = await db.select({ id: profiles.userId, name: profiles.name }).from(profiles).where(inArray(profiles.userId, list));
  return new Map(rows.map((r) => [r.id, r.name]));
};

export async function listContent(type: ContentType, o: { q?: string; chip?: StatusChip; page?: number } = {}): Promise<{ rows: ContentRow[]; total: number }> {
  if (!(await isAdmin())) return { rows: [], total: 0 };
  if (type === "page") {
    const have = await db.select().from(sitePages);
    const names = await nameMap(have.map((h) => h.updatedBy));
    return {
      total: PAGE_KEYS.length,
      rows: PAGE_KEYS.map((key) => {
        const r = have.find((h) => h.key === key);
        return {
          id: key, title: r?.title ?? key[0].toUpperCase() + key.slice(1), version: r?.version ?? 0,
          sub: r?.status === "published" ? "Showing your text" : "Showing the built-in text",
          status: r ? (r.status === "published" ? "live" : "draft") : "default",
          updatedAt: (r?.updatedAt ?? new Date(0)).toISOString(), updatedByName: names.get(r?.updatedBy ?? "") ?? "", sample: false,
        } satisfies ContentRow;
      }),
    };
  }
  const t = tableOf(type);
  const titleCol = type === "link" ? resourceLinks.label : (t as unknown as typeof listings).title;
  const search = o.q?.trim() ? ilike(titleCol, `%${o.q.trim().replace(/[%_\\]/g, "\\$&")}%`) : undefined;
  const where = and(chipWhere(t, type, o.chip ?? "all"), search);
  const size = type === "task" ? 200 : PAGE_SIZE;
  const page = Math.max(1, o.page ?? 1);
  const order = type === "task"
    ? [asc((t as never as { section: typeof t.id }).section), asc((t as never as { position: typeof t.id }).position), asc(t.id)]
    : [desc(t.updatedAt)];
  const [rows, [{ n }]] = await Promise.all([
    db.select().from(t).where(where).orderBy(...order).limit(size).offset((page - 1) * size) as Promise<Row[]>,
    db.select({ n: count() }).from(t).where(where),
  ]);
  const names = await nameMap(rows.map((r) => r.updatedBy));
  const stale = (r: Row) => type === "listing" && r.status === "published" && !r.deletedAt && Date.now() - new Date(`${r.checkedAt}T00:00:00+04:00`).getTime() > 30 * 86400_000;
  return {
    total: Number(n),
    rows: rows.map((r) => ({
      id: String(r.id), title: String(r.title ?? r.label), version: r.version, status: displayStatus(r),
      updatedAt: new Date(r.updatedAt).toISOString(), updatedByName: names.get(r.updatedBy) ?? "", sample: !!r.isSample,
      sub: type === "task" ? arrivalSections[r.section] ?? ""
        : type === "listing" ? `${r.area} · Rs ${Number(r.price).toLocaleString("en-US")} · checked ${formatDate(`${r.checkedAt}T12:00:00+04:00`)}`
        : type === "update" ? r.category
        : r.url,
      ...(stale(r) && { stale: true }),
      ...(type === "update" && r.category === "Official Announcements" && { official: true, approved: !!r.approvedAt }),
      ...(type === "task" && { section: r.section, position: r.position }),
    })),
  };
}

export type ContentItem = { row: Row; photos: Photo[] };

export async function getContentItem(type: ContentType, id: string): Promise<ContentItem | null> {
  if (!(await isAdmin())) return null;
  if (type === "page") {
    if (!PAGE_KEYS.includes(id as never)) return null;
    return { row: (await getPage(id)) ?? { key: id, version: 0 }, photos: [] };
  }
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) return null;
  const row = await getRow(type, n);
  return row ? { row, photos: type === "listing" ? await listingPhotos(n) : [] } : null;
}

export type RevisionView = {
  id: number; version: number; action: string; changedFields: string[]; changedByName: string; createdAt: string;
  diffs: { field: string; before: string; after: string }[];
};

const show = (v: unknown) => (v === null || v === undefined || v === "" ? "(empty)" : typeof v === "object" ? JSON.stringify(v) : String(v));

/** Newest first, each with old -> new values for the fields it changed. */
export async function getRevisions(type: ContentType, id: string): Promise<RevisionView[]> {
  if (!(await isAdmin())) return [];
  const rows = await db.select().from(contentRevisions)
    .where(and(eq(contentRevisions.entityType, ENTITY[type]), eq(contentRevisions.entityId, id)))
    .orderBy(desc(contentRevisions.createdAt), desc(contentRevisions.id)).limit(100);
  return rows.map((r, i) => {
    const prev = rows[i + 1]?.snapshot as Row | undefined;
    const snap = r.snapshot as Row;
    return {
      id: r.id, version: r.version, action: r.action, changedFields: r.changedFields, changedByName: r.changedByName, createdAt: r.createdAt.toISOString(),
      diffs: prev ? r.changedFields.filter((f) => f in snap).map((f) => ({ field: f, before: show(prev[f]), after: show(snap[f]) })) : [],
    };
  });
}

export async function getContentCounts() {
  if (!(await isAdmin())) return null;
  const out = {} as Record<ContentType, { live: number; draft: number; pending: number; archived: number }>;
  for (const type of ["task", "listing", "update", "link"] as ItemType[]) {
    const t = tableOf(type);
    const [row] = await db.select({
      live: count(sql`case when ${chipWhere(t, type, "live")} then 1 end`),
      draft: count(sql`case when ${chipWhere(t, type, "draft")} then 1 end`),
      pending: count(sql`case when ${chipWhere(t, type, "pending")} then 1 end`),
      archived: count(sql`case when ${chipWhere(t, type, "archived")} then 1 end`),
    }).from(t);
    out[type] = { live: Number(row.live), draft: Number(row.draft), pending: Number(row.pending), archived: Number(row.archived) };
  }
  const pages = await db.select({ n: count() }).from(sitePages).where(eq(sitePages.status, "published"));
  out.page = { live: Number(pages[0].n), draft: 0, pending: 0, archived: 0 };
  return out;
}

/** The "Needs attention" list: only entries with a non-zero count. */
export async function getAttention(): Promise<Attention[]> {
  if (!(await isAdmin())) return [];
  const [stale, pending, drafts, reports, sampleL, sampleU, sampleT, soon] = await Promise.all([
    db.select({ n: count() }).from(listings).where(and(eq(listings.status, "published"), isNull(listings.deletedAt), sql`${listings.checkedAt} < (now() at time zone ${MU})::date - 30`)),
    db.select({ n: count() }).from(clubUpdates).where(and(eq(clubUpdates.status, "pending_approval"), isNull(clubUpdates.deletedAt))),
    countDrafts(),
    db.select({ n: count() }).from(housingReports).where(eq(housingReports.resolved, false)),
    countSamples("listing"), countSamples("update"), countSamples("task"),
    db.select({ n: count() }).from(clubUpdates).where(and(eq(clubUpdates.status, "published"), isNull(clubUpdates.deletedAt), sql`${clubUpdates.publishAt} > now() and ${clubUpdates.publishAt} < now() + interval '7 days'`)),
  ]);
  const samples = sampleL + sampleU + sampleT;
  const items: Attention[] = [
    { key: "stale", label: "housing checks older than 30 days", href: "/admin/content/housing", count: Number(stale[0].n) },
    { key: "pending", label: "announcements awaiting UTM approval", href: "/admin/content/updates?status=pending", count: Number(pending[0].n) },
    { key: "drafts", label: "drafts older than 14 days", href: "/admin/content/updates?status=draft", count: drafts },
    { key: "reports", label: "open housing reports", href: "/admin/housing", count: Number(reports[0].n) },
    { key: "samples", label: "sample items still visible to students", href: "/admin/content", count: samples },
    { key: "soon", label: "updates scheduled in the next 7 days", href: "/admin/content/updates?status=scheduled", count: Number(soon[0].n) },
  ];
  return items.filter((i) => i.count > 0);
}

async function countDrafts() {
  let n = 0;
  const cutoff = new Date(Date.now() - 14 * 86400_000);
  for (const type of ["task", "listing", "update", "link"] as ItemType[]) {
    const t = tableOf(type);
    const [r] = await db.select({ n: count() }).from(t).where(and(eq(t.status, "draft"), isNull(t.deletedAt), lt(t.updatedAt, cutoff)));
    n += Number(r.n);
  }
  return n;
}

export async function countSamples(type: "listing" | "update" | "task"): Promise<number> {
  const t = tableOf(type) as unknown as typeof listings;
  const [r] = await db.select({ n: count() }).from(t).where(and(eq(t.isSample, true), eq(t.status, "published"), isNull(t.deletedAt), ne(t.status, "archived")));
  return Number(r.n);
}
