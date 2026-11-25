import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, profiles } from "@/lib/db";
import type { Viewer } from "@/lib/types";
import { formatDateTime } from "@/lib/admin/format";
import { fail, isId } from "./util";
import { cleanText, firstBadLink, isEnum, parseMuDateTime, validateUrl } from "./validate";
import { getRow, guardedUpdate, CONFLICT, ok, record, refreshFor, shortTitle, type Row } from "./revisions";
import { isIntent, isVersion, saveItem } from "./save";
import { UPDATE_CATEGORIES, type CmsResult } from "./types";

export const UPDATE_FIELDS = ["category", "title", "description", "pinned", "eventAt", "venue", "linkLabel", "linkUrl", "publishAt", "expiresAt"] as const;
// Changing any of these on a published Official Announcement sends it back for UTM approval.
const OFFICIAL_TEXT = ["category", "title", "description", "eventAt", "venue", "linkLabel", "linkUrl"];
const OFFICIAL = "Official Announcements";
const RESET_APPROVAL = { approvedBy: null, approvedAt: null, approvalRef: null };

export async function saveUpdate(viewer: Viewer, raw: unknown): Promise<CmsResult> {
  const i = (raw ?? {}) as Row;
  if (!isEnum(UPDATE_CATEGORIES, i.category)) return fail("Choose a category.");
  const title = cleanText(i.title, 150);
  if (!title) return fail("Add a title (up to 150 characters).");
  const body = cleanText(i.body, 2000, 1, true);
  if (!body) return fail("Add the details (up to 2000 characters).");
  if (firstBadLink(body)) return fail("A link in the details is not a safe https:// address.");
  const isEvent = i.category === "Events";
  const eventAt = isEvent ? parseMuDateTime(i.eventAt) : null;
  const venue = isEvent ? cleanText(i.venue, 120) : null;
  if (isEvent && (!eventAt || !venue)) return fail("Events need a date, a time and a venue.");
  const publishAt = i.publishAt ? parseMuDateTime(i.publishAt) : null;
  const expiresAt = i.expiresAt ? parseMuDateTime(i.expiresAt) : null;
  if ((i.publishAt && !publishAt) || (i.expiresAt && !expiresAt)) return fail("Check the schedule dates.");
  if (expiresAt && publishAt && expiresAt <= publishAt) return fail("The hide date must be after the publish date.");
  const label = cleanText(i.linkLabel ?? "", 80, 0);
  if (label === null) return fail("Keep the link label under 80 characters.");
  const rawUrl = typeof i.linkUrl === "string" ? i.linkUrl.trim() : "";
  const linkUrl = rawUrl ? validateUrl(rawUrl) : null;
  if (rawUrl && !linkUrl) return fail("The link must be a full https:// address.");
  if (linkUrl && !label) return fail("Add a label for the link.");
  if (typeof i.pinned !== "boolean") return fail("Invalid request.");
  if (!isIntent(i.intent)) return fail("Invalid request.");
  if (i.id !== undefined && (!isId(i.id) || !isVersion(i.version))) return fail("Reload the page and try again.");

  const official = i.category === OFFICIAL;
  const values: Row = {
    category: i.category, title, description: body, pinned: i.pinned, eventAt, venue,
    linkLabel: linkUrl ? label : null, linkUrl, publishAt, expiresAt,
    meta: isEvent ? `${venue} · ${formatDateTime(eventAt!)}` : "ISC Committee",
    ...(i.id === undefined && { publishedBy: viewer.userId }),
  };
  return saveItem(viewer, "update", {
    id: i.id, version: i.version, values, fields: UPDATE_FIELDS, intent: i.intent, label: title,
    plan: (prev, changed) => {
      if (i.intent === "publish") {
        return official ? { error: "Official Announcements need UTM approval first. Use Submit for UTM approval." } : { status: "published" };
      }
      if (i.intent === "submit") {
        return official
          ? { status: "pending_approval", set: { ...RESET_APPROVAL, publishedBy: viewer.userId } }
          : { error: "Only Official Announcements go through approval." };
      }
      const status = prev?.status ?? "draft";
      if (!official && status === "pending_approval") return { status: "draft" };
      if (official && status === "published" && changed.some((f) => OFFICIAL_TEXT.includes(f)))
        return { status: "pending_approval", set: { ...RESET_APPROVAL, publishedBy: viewer.userId } };
      return { status };
    },
  });
}

/** Record UTM approval. A different admin must do it, unless there is only one admin (then allowed with a warning). */
export async function approveUpdate(viewer: Viewer, id: unknown, version: unknown, approvalRef: unknown): Promise<CmsResult> {
  if (!isId(id) || !isVersion(version)) return fail("Invalid request.");
  const ref = cleanText(approvalRef, 200, 5);
  if (!ref) return fail("Record who at UTM approved this, and when (5 to 200 characters).");
  const prev = await getRow("update", id);
  if (!prev || prev.deletedAt) return fail("That update no longer exists.");
  if (prev.category !== OFFICIAL || prev.status !== "pending_approval") return fail("This update is not waiting for approval.");
  let warning = "";
  if (prev.publishedBy === viewer.userId) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(profiles).where(eq(profiles.role, "isc_admin"));
    if (Number(n) > 1) return fail("Another committee member must record the UTM approval for this announcement.");
    warning = " Warning: you approved your own submission because you are the only committee admin.";
  }
  const row = await guardedUpdate("update", id, version, { status: "published", approvedBy: viewer.userId, approvedAt: new Date(), approvalRef: ref }, viewer);
  if (!row) return fail(CONFLICT);
  await record(viewer, { type: "update", entityId: id, row, action: "approve", changed: ["status", "approvalRef"], summary: `UTM approval recorded for "${shortTitle(row.title)}"` });
  refreshFor("update");
  return ok(id, row.version, `Approved and published.${warning}`);
}

/** Send a saved draft Official Announcement for UTM approval without re-saving its fields. */
export async function submitForApproval(viewer: Viewer, id: unknown, version: unknown): Promise<CmsResult> {
  if (!isId(id) || !isVersion(version)) return fail("Invalid request.");
  const prev = await getRow("update", id);
  if (!prev || prev.deletedAt) return fail("That update no longer exists.");
  if (prev.category !== OFFICIAL) return fail("Only Official Announcements go through approval.");
  if (prev.status === "pending_approval") return fail("Already waiting for approval.");
  const row = await guardedUpdate("update", id, version, { status: "pending_approval", ...RESET_APPROVAL, publishedBy: viewer.userId }, viewer);
  if (!row) return fail(CONFLICT);
  await record(viewer, { type: "update", entityId: id, row, action: "submit", changed: ["status"], summary: `Submitted "${shortTitle(row.title)}" for UTM approval` });
  refreshFor("update");
  return ok(id, row.version, "Submitted for UTM approval.");
}
