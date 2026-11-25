import "server-only";
import { db, sitePages } from "@/lib/db";
import type { Viewer } from "@/lib/types";
import { fail } from "./util";
import { cleanText, firstBadLink, isEnum, validateUrl } from "./validate";
import { CONFLICT, diffFields, getPage, guardedUpdatePage, ok, record, refreshFor, type Row } from "./revisions";
import { isIntent, isVersion } from "./save";
import { PAGE_KEYS, type CmsResult } from "./types";

export const PAGE_FIELDS = ["title", "heading", "body", "linkLabel", "linkUrl"] as const;

export async function savePage(viewer: Viewer, raw: unknown): Promise<CmsResult> {
  const i = (raw ?? {}) as Row;
  if (!isEnum(PAGE_KEYS, i.key)) return fail("Unknown page.");
  const title = cleanText(i.title, 80);
  if (!title) return fail("Add the window title (up to 80 characters).");
  const heading = cleanText(i.heading, 100);
  if (!heading) return fail("Add a heading (up to 100 characters).");
  const body = cleanText(i.body, 6000, 1, true);
  if (!body) return fail("Add the text (up to 6000 characters).");
  if (firstBadLink(body)) return fail("A link in the text is not a safe https:// address.");
  const label = cleanText(i.linkLabel ?? "", 80, 0);
  if (label === null) return fail("Keep the link label under 80 characters.");
  const rawUrl = typeof i.linkUrl === "string" ? i.linkUrl.trim() : "";
  const linkUrl = rawUrl ? validateUrl(rawUrl) : null;
  if (rawUrl && !linkUrl) return fail("The link must be a full https:// address.");
  if (linkUrl && !label) return fail("Add a label for the link.");
  if (!isIntent(i.intent) || i.intent === "submit") return fail("Invalid request.");

  const values: Row = { title, heading, body, linkLabel: linkUrl ? label : null, linkUrl };
  const prev = await getPage(i.key);
  const status = i.intent === "publish" ? "published" : (prev?.status ?? "draft");
  let row: Row | null;
  if (prev) {
    if (!isVersion(i.version)) return fail("Reload the page and try again.");
    const changed = diffFields(prev, values, PAGE_FIELDS);
    if (!changed.length && status === prev.status) return ok(i.key, prev.version, "No changes to save.");
    row = await guardedUpdatePage(i.key, i.version, { ...values, status }, viewer);
    if (!row) return fail(CONFLICT);
  } else {
    [row] = (await db.insert(sitePages).values({ key: i.key, ...values, status, updatedBy: viewer.userId } as never).onConflictDoNothing().returning()) as Row[];
    if (!row) return fail(CONFLICT);
  }
  const published = status === "published" && prev?.status !== "published";
  await record(viewer, {
    type: "page", entityId: i.key, row, action: !prev ? "create" : published ? "publish" : "update",
    changed: prev ? diffFields(prev, values, PAGE_FIELDS) : [...PAGE_FIELDS], summary: `${published ? "Published" : "Edited"} page "${i.key}"`,
  });
  refreshFor("page");
  return ok(i.key, row.version, published ? "Published." : "Saved.");
}
