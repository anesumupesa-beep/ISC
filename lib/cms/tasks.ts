import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { arrivalTasks, db } from "@/lib/db";
import { arrivalSections } from "@/lib/ui";
import type { Viewer } from "@/lib/types";
import { fail, isId } from "./util";
import { cleanText, firstBadLink, validateUrl } from "./validate";
import { getRow, guardedUpdate, ok, record, refreshFor, shortTitle, type Row } from "./revisions";
import { isIntent, saveItem } from "./save";
import type { CmsResult } from "./types";

export const TASK_FIELDS = ["section", "title", "detail", "documents", "link", "url"] as const;

export async function saveTask(viewer: Viewer, raw: unknown): Promise<CmsResult> {
  const i = (raw ?? {}) as Row;
  if (!Number.isInteger(i.stage) || i.stage < 0 || i.stage >= arrivalSections.length) return fail("Choose a stage.");
  const title = cleanText(i.title, 150);
  if (!title) return fail("Add a title (up to 150 characters).");
  const detail = cleanText(i.detail, 2000, 1, true);
  if (!detail) return fail("Add the details (up to 2000 characters).");
  if (firstBadLink(detail)) return fail("A link in the details is not a safe https:// address.");
  const documents = cleanText(i.documents ?? "", 300, 0);
  if (documents === null) return fail("Keep 'What to bring' under 300 characters.");
  const link = cleanText(i.linkLabel ?? "", 80, 0);
  if (link === null) return fail("Keep the link label under 80 characters.");
  const rawUrl = typeof i.url === "string" ? i.url.trim() : "";
  const url = rawUrl ? validateUrl(rawUrl) : "";
  if (url === null) return fail("The link must be a full https:// address.");
  if (url && !link) return fail("Add a label for the link.");
  if (!isIntent(i.intent) || i.intent === "submit") return fail("Invalid request.");
  if (i.id !== undefined && !isId(i.id)) return fail("Invalid task.");

  const position = i.id ? undefined : await nextPosition(i.stage);
  const values: Row = { section: i.stage, title, detail, documents, link, url, ...(position !== undefined && { position }) };
  return saveItem(viewer, "task", { id: i.id, version: i.version, values, fields: TASK_FIELDS, intent: i.intent, label: title });
}

async function nextPosition(section: number): Promise<number> {
  const [r] = await db.select({ m: sql<number>`coalesce(max(${arrivalTasks.position}), 0)` }).from(arrivalTasks).where(eq(arrivalTasks.section, section));
  return Number(r.m) + 10;
}

/** Swap position with the neighbour in the same stage (live rows only). */
export async function moveTask(viewer: Viewer, id: unknown, dir: unknown): Promise<CmsResult> {
  if (!isId(id) || (dir !== "up" && dir !== "down")) return fail("Invalid request.");
  const me = await getRow("task", id);
  if (!me || me.deletedAt) return fail("That task no longer exists.");
  const rows = await db.select().from(arrivalTasks)
    .where(and(eq(arrivalTasks.section, me.section), isNull(arrivalTasks.deletedAt)))
    .orderBy(arrivalTasks.position, arrivalTasks.id);
  const idx = rows.findIndex((r) => r.id === id);
  const other = rows[idx + (dir === "up" ? -1 : 1)];
  if (!other) return ok(id, me.version);
  // Distinct positions even when legacy rows tie: re-number the pair around each other.
  const a = Math.min(me.position, other.position);
  const b = Math.max(me.position, other.position);
  const [lo, hi] = a === b ? [a, a + 1] : [a, b];
  const first = dir === "up" ? me : other;
  const second = dir === "up" ? other : me;
  const r1 = await guardedUpdate("task", first.id, first.version, { position: lo }, viewer);
  const r2 = await guardedUpdate("task", second.id, second.version, { position: hi }, viewer);
  if (!r1 || !r2) return fail("The list changed. Reload and try again.");
  await record(viewer, { type: "task", entityId: id, row: r1.id === id ? r1 : r2, action: "update", changed: ["position"], summary: `Reordered task "${shortTitle(me.title)}"` });
  refreshFor("task");
  return ok(id, (r1.id === id ? r1 : r2).version);
}
