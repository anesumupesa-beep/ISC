import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { arrivalTasks, clubUpdates, contentRevisions, db, listings, resourceLinks, sitePages } from "@/lib/db";
import type { Viewer } from "@/lib/types";
import { auditEntry } from "./audit";
import { revalidate } from "./util";
import { SECTION_OF, type CmsResult, type ContentType } from "./types";

/** Tables with an integer id plus the shared publishing columns. */
export type ItemType = Exclude<ContentType, "page">;
type Pub = typeof resourceLinks; // same publishing shape as the other three tables
// shortcut: one loosely typed table map keeps the lifecycle code generic; columns shared by all four are asserted by the schema's publishing().
const TABLES = { task: arrivalTasks, listing: listings, update: clubUpdates, link: resourceLinks } as unknown as Record<ItemType, Pub>;
export const tableOf = (t: ItemType) => TABLES[t];

export const ENTITY: Record<ContentType, string> = {
  task: "arrival_task", listing: "listing", update: "update", link: "link", page: "page",
};
export const CONFLICT = "Someone else changed this while you were editing. Reload to see their version.";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows are heterogeneous by type
export type Row = Record<string, any>;

export async function getRow(type: ItemType, id: number): Promise<Row | undefined> {
  const t = tableOf(type);
  const [row] = await db.select().from(t).where(eq(t.id, id));
  return row as Row | undefined;
}

export async function getPage(key: string): Promise<Row | undefined> {
  const [row] = await db.select().from(sitePages).where(eq(sitePages.key, key));
  return row as Row | undefined;
}

/** Version-guarded update: null when the row is missing or someone else saved first. */
export async function guardedUpdate(type: ItemType, id: number, version: number, set: Row, viewer: Viewer): Promise<Row | null> {
  const t = tableOf(type);
  const rows = await db.update(t)
    .set({ ...set, version: sql`${t.version} + 1`, updatedAt: new Date(), updatedBy: viewer.userId })
    .where(and(eq(t.id, id), eq(t.version, version)))
    .returning();
  return (rows[0] as Row) ?? null;
}

export async function guardedUpdatePage(key: string, version: number, set: Row, viewer: Viewer): Promise<Row | null> {
  const rows = await db.update(sitePages)
    .set({ ...set, version: sql`${sitePages.version} + 1`, updatedAt: new Date(), updatedBy: viewer.userId })
    .where(and(eq(sitePages.key, key), eq(sitePages.version, version)))
    .returning();
  return (rows[0] as Row) ?? null;
}

/** Fields whose value differs (JSON comparison, so Dates and strings compare alike). */
export function diffFields(prev: Row | null | undefined, next: Row, fields: readonly string[]): string[] {
  return fields.filter((f) => JSON.stringify(prev?.[f] ?? null) !== JSON.stringify(next[f] ?? null));
}

export type Rec = {
  type: ContentType;
  entityId: string | number;
  row: Row;
  action: string; // create|update|publish|unpublish|verify|archive|delete|restore|approve|submit
  changed: string[];
  summary: string; // audit text, <= 200 chars
  extra?: Row; // merged into the snapshot (e.g. listing photos)
};

/** Revision + audit row, atomic with each other. The content change itself is already committed (neon-http cannot span reads). */
export async function record(viewer: Viewer, r: Rec): Promise<void> {
  try {
    await db.batch([
      db.insert(contentRevisions).values({
        entityType: ENTITY[r.type], entityId: String(r.entityId), version: r.row.version ?? 1, action: r.action,
        snapshot: JSON.parse(JSON.stringify({ ...r.row, ...r.extra })), changedFields: r.changed,
        changedBy: viewer.userId, changedByName: viewer.name,
      }),
      auditEntry({
        actorId: viewer.userId, actorName: viewer.name, action: `content.${r.action}`,
        entityType: `content_${r.type}`, entityId: r.entityId, summary: r.summary.slice(0, 200),
      }),
    ]);
  } catch (e) {
    // shortcut: the edit stands if the history write fails; logged, not surfaced. Upgrade by moving to a transactional driver.
    console.error("cms: revision/audit write failed", e);
  }
}

const PATHS: Record<ContentType, string[]> = {
  task: ["/", "/arrival", "/admin/content/guide"],
  listing: ["/", "/housing", "/admin", "/admin/housing", "/admin/content/housing"],
  update: ["/", "/updates", "/admin/content/updates"],
  link: ["/admin/content/links"],
  page: ["/admin/content/pages"],
};
/** Refresh student pages and the admin lists after any change. */
export function refreshFor(type: ContentType) {
  revalidate("/admin/content", ...PATHS[type]);
  if (type === "link" || type === "page") revalidatePathLayout();
}
import { revalidatePath } from "next/cache";
const revalidatePathLayout = () => revalidatePath("/", "layout");

export const ok = (id: string | number, version: number, message?: string): CmsResult => ({ ok: true, id: String(id), version, ...(message && { message }) });
export const adminListUrl = (type: ContentType) => `/admin/content/${SECTION_OF[type]}`;
export const shortTitle = (s: string) => (s.length > 60 ? `${s.slice(0, 57)}...` : s);
