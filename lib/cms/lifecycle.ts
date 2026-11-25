import "server-only";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { contentRevisions, db, listings } from "@/lib/db";
import type { Viewer } from "@/lib/types";
import { auditEntry } from "./audit";
import { fail, isId } from "./util";
import {
  CONFLICT, diffFields, ENTITY, getPage, getRow, guardedUpdate, guardedUpdatePage, ok, record, refreshFor, shortTitle,
  tableOf, type ItemType, type Row,
} from "./revisions";
import { isVersion } from "./save";
import { listingPhotos, syncPhotos } from "./media";
import { TASK_FIELDS } from "./tasks";
import { LISTING_FIELDS } from "./listings";
import { UPDATE_FIELDS } from "./updates";
import { LINK_FIELDS } from "./links";
import { PAGE_FIELDS } from "./pages";
import type { CmsResult, ContentStatus, ContentType } from "./types";

const TYPES: ContentType[] = ["task", "listing", "update", "link", "page"];
const isType = (v: unknown): v is ContentType => TYPES.includes(v as ContentType);
const isItem = (v: unknown): v is ItemType => isType(v) && v !== "page";
const RESTORE_FIELDS: Record<ContentType, readonly string[]> = {
  task: TASK_FIELDS,
  listing: LISTING_FIELDS,
  update: [...UPDATE_FIELDS.filter((f) => f !== "pinned"), "pinned", "meta"],
  link: LINK_FIELDS,
  page: PAGE_FIELDS,
};
const DATE_FIELDS = new Set(["eventAt", "publishAt", "expiresAt"]);
const OFFICIAL_TEXT = ["category", "title", "description", "eventAt", "venue", "linkLabel", "linkUrl"];
const titleOf = (type: ContentType, r: Row) => String(r.title ?? r.label ?? r.key);

/** draft / archived / published (publish rules apply; Official Announcements publish only through approval). */
export async function setStatus(viewer: Viewer, type: unknown, id: unknown, version: unknown, status: unknown): Promise<CmsResult> {
  if (!isType(type) || !isVersion(version)) return fail("Invalid request.");
  if (status !== "draft" && status !== "archived" && status !== "published") return fail("Invalid status.");
  const next = status as ContentStatus;
  let prev: Row | undefined;
  if (type === "page") {
    if (typeof id !== "string") return fail("Invalid request.");
    prev = await getPage(id);
  } else {
    if (!isId(id)) return fail("Invalid request.");
    prev = await getRow(type, id);
  }
  if (!prev || prev.deletedAt) return fail("That item no longer exists.");
  if (type === "update" && next === "published" && prev.category === "Official Announcements")
    return fail("Official Announcements are published by recording UTM approval.");
  if (type === "listing" && next === "published" && (await listingPhotos(prev.id)).some((p) => !p.alt))
    return fail("Every photo needs a short description before publishing.");
  const row = type === "page"
    ? await guardedUpdatePage(prev.key, version, { status: next }, viewer)
    : await guardedUpdate(type, prev.id, version, { status: next }, viewer);
  if (!row) return fail(CONFLICT);
  const action = next === "published" ? "publish" : next === "archived" ? "archive" : "unpublish";
  await record(viewer, {
    type, entityId: type === "page" ? prev.key : prev.id, row, action, changed: ["status"],
    summary: `${action === "publish" ? "Published" : action === "archive" ? "Archived" : "Moved to draft:"} ${type} "${shortTitle(titleOf(type, row))}"`,
  });
  refreshFor(type);
  return ok(type === "page" ? prev.key : prev.id, row.version, action === "publish" ? "Published." : action === "archive" ? "Archived." : "Moved to draft.");
}

/** Soft delete (hidden everywhere, restorable). Site pages cannot be deleted: use Reset to default. */
export async function deleteContent(viewer: Viewer, type: unknown, id: unknown, version: unknown): Promise<CmsResult> {
  if (!isItem(type) || !isId(id) || !isVersion(version)) return fail("Invalid request.");
  const prev = await getRow(type, id);
  if (!prev || prev.deletedAt) return fail("That item no longer exists.");
  const row = await guardedUpdate(type, id, version, { deletedAt: new Date() }, viewer);
  if (!row) return fail(CONFLICT);
  await record(viewer, { type, entityId: id, row, action: "delete", changed: ["deletedAt"], summary: `Deleted ${type} "${shortTitle(titleOf(type, row))}"` });
  refreshFor(type);
  return ok(id, row.version, "Deleted. You can restore it from the Deleted filter.");
}

export async function restoreDeleted(viewer: Viewer, type: unknown, id: unknown): Promise<CmsResult> {
  if (!isItem(type) || !isId(id)) return fail("Invalid request.");
  const prev = await getRow(type, id);
  if (!prev || !prev.deletedAt) return fail("That item is not deleted.");
  const row = await guardedUpdate(type, id, prev.version, { deletedAt: null, status: "draft" }, viewer);
  if (!row) return fail(CONFLICT);
  await record(viewer, { type, entityId: id, row, action: "restore", changed: ["deletedAt", "status"], summary: `Restored ${type} "${shortTitle(titleOf(type, row))}"` });
  refreshFor(type);
  return ok(id, row.version, "Restored as a draft.");
}

/** Apply an old snapshot as a NEW version (history is never rewritten). */
export async function restoreRevision(viewer: Viewer, revisionId: unknown): Promise<CmsResult> {
  if (!isId(revisionId)) return fail("Invalid request.");
  const [rev] = await db.select().from(contentRevisions).where(eq(contentRevisions.id, revisionId));
  const type = TYPES.find((t) => ENTITY[t] === rev?.entityType);
  if (!rev || !type) return fail("That version no longer exists.");
  const snap = rev.snapshot as Row;
  const current = type === "page" ? await getPage(rev.entityId) : await getRow(type as ItemType, Number(rev.entityId));
  if (!current) return fail("The item behind this version no longer exists.");
  if (current.deletedAt) return fail("Restore the deleted item first.");
  const set: Row = {};
  for (const f of RESTORE_FIELDS[type]) if (f in snap) set[f] = DATE_FIELDS.has(f) && snap[f] ? new Date(snap[f]) : (snap[f] ?? null);
  const changed = diffFields(current, set, RESTORE_FIELDS[type]);
  let note = "";
  if (type === "update" && (set.category ?? current.category) === "Official Announcements" && current.status === "published" && changed.some((f) => OFFICIAL_TEXT.includes(f))) {
    Object.assign(set, { status: "pending_approval", approvedBy: null, approvedAt: null, approvalRef: null, publishedBy: viewer.userId });
    note = " It is waiting for UTM approval again.";
  }
  const row = type === "page"
    ? await guardedUpdatePage(rev.entityId, current.version, set, viewer)
    : await guardedUpdate(type as ItemType, current.id, current.version, set, viewer);
  if (!row) return fail(CONFLICT);
  let extra: Row | undefined;
  if (type === "listing" && Array.isArray(snap.photos)) {
    const wanted = (snap.photos as { id: string; alt: string }[]);
    await syncPhotos(row.id, wanted);
    const kept = await listingPhotos(row.id);
    extra = { photos: kept.map((p) => ({ id: p.id, alt: p.alt })) };
    if (kept.length < wanted.length) note += ` ${wanted.length - kept.length} photo(s) had been cleaned up and could not be restored.`;
  }
  await record(viewer, {
    type, entityId: rev.entityId, row, action: "restore", changed, extra,
    summary: `Restored ${type} "${shortTitle(titleOf(type, row))}" to version ${rev.version}`,
  });
  refreshFor(type);
  return ok(rev.entityId, row.version, `Restored version ${rev.version} as a new version.${note}`);
}

export async function markSampleReal(viewer: Viewer, type: unknown, id: unknown, version: unknown): Promise<CmsResult> {
  if (!isItem(type) || type === "link" || !isId(id) || !isVersion(version)) return fail("Invalid request.");
  const row = await guardedUpdate(type, id, version, { isSample: false }, viewer);
  if (!row) return fail(CONFLICT);
  await record(viewer, { type, entityId: id, row, action: "update", changed: ["isSample"], summary: `Marked ${type} "${shortTitle(titleOf(type, row))}" as real` });
  refreshFor(type);
  return ok(id, row.version, "Marked as real content.");
}

/** Go-live helper: archive every sample listing and update still live. */
export async function archiveAllSamples(viewer: Viewer): Promise<CmsResult> {
  let n = 0;
  for (const type of ["listing", "update", "task"] as ItemType[]) {
    const tt = tableOf(type) as unknown as typeof listings; // all three share isSample + publishing columns
    const rows = await db.update(tt)
      .set({ status: "archived", version: sql`${tt.version} + 1`, updatedAt: new Date(), updatedBy: viewer.userId })
      .where(and(eq(tt.isSample, true), isNull(tt.deletedAt), ne(tt.status, "archived")))
      .returning() as Row[];
    if (rows.length) {
      await db.batch([
        ...rows.map((r) => db.insert(contentRevisions).values({
          entityType: ENTITY[type], entityId: String(r.id), version: r.version, action: "archive", snapshot: JSON.parse(JSON.stringify(r)),
          changedFields: ["status"], changedBy: viewer.userId, changedByName: viewer.name,
        })),
        auditEntry({ actorId: viewer.userId, actorName: viewer.name, action: "content.archive", entityType: `content_${type}`, summary: `Archived ${rows.length} sample ${type}(s)` }),
      ] as never);
      n += rows.length;
      refreshFor(type);
    }
  }
  return { ok: true, message: n ? `Archived ${n} sample item${n === 1 ? "" : "s"}.` : "No sample items are live." };
}
