import "server-only";
import { db } from "@/lib/db";
import type { Viewer } from "@/lib/types";
import { fail } from "./util";
import { CONFLICT, diffFields, getRow, guardedUpdate, ok, record, refreshFor, shortTitle, tableOf, type ItemType, type Row } from "./revisions";
import type { CmsResult, ContentStatus } from "./types";

export type Intent = "save" | "publish" | "submit";
export const isIntent = (v: unknown): v is Intent => v === "save" || v === "publish" || v === "submit";
export const isVersion = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;

export type StatusPlan = { status: ContentStatus; set?: Row } | { error: string };

/** Shared create/update path: version guard, status plan, revision + audit, student path refresh. */
export async function saveItem(viewer: Viewer, type: ItemType, o: {
  id?: number;
  version?: number;
  values: Row; // column values to write
  fields: readonly string[]; // content fields compared for the revision's changed list
  intent: Intent;
  label: string; // title for the audit summary
  plan?: (prev: Row | undefined, changed: string[], values: Row) => StatusPlan;
  extraChanged?: string[]; // changes outside the columns (e.g. photos)
  after?: (row: Row) => Promise<Row | void>; // runs once the row id exists; returned object joins the snapshot
}): Promise<CmsResult> {
  const prev = o.id ? await getRow(type, o.id) : undefined;
  if (o.id && !prev) return fail("That item no longer exists.");
  if (prev?.deletedAt) return fail("Restore this item before editing it.");
  if (prev && !isVersion(o.version)) return fail("Reload the page and try again.");
  const changed = [...diffFields(prev, o.values, o.fields), ...(o.extraChanged ?? [])];
  const plan = o.plan
    ? o.plan(prev, changed, o.values)
    : { status: (o.intent === "publish" ? "published" : (prev?.status ?? "draft")) as ContentStatus };
  if ("error" in plan) return fail(plan.error);

  let row: Row | null;
  if (prev) {
    if (!changed.length && plan.status === prev.status && !plan.set) return ok(prev.id, prev.version, "No changes to save.");
    row = await guardedUpdate(type, o.id!, o.version!, { ...o.values, status: plan.status, ...plan.set }, viewer);
    if (!row) return fail(CONFLICT);
  } else {
    const t = tableOf(type);
    [row] = (await db.insert(t).values({ ...o.values, status: plan.status, updatedBy: viewer.userId, ...plan.set } as never).returning()) as Row[];
  }
  const extra = await o.after?.(row);
  const action = !prev ? "create"
    : plan.status !== prev.status
      ? (plan.status === "published" ? "publish" : plan.status === "pending_approval" ? "submit" : "unpublish")
      : "update";
  await record(viewer, {
    type, entityId: row.id, row, action, changed: !prev ? [...o.fields] : changed, extra: extra ?? undefined,
    summary: `${action === "create" ? "Created" : action === "publish" ? "Published" : action === "submit" ? "Submitted for approval:" : action === "unpublish" ? "Unpublished" : "Edited"} ${type} "${shortTitle(o.label)}"`,
  });
  refreshFor(type);
  return ok(row.id, row.version, action === "publish" ? "Published." : action === "submit" ? "Submitted for UTM approval." : "Saved.");
}
