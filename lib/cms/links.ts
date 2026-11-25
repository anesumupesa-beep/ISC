import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, resourceLinks } from "@/lib/db";
import type { Viewer } from "@/lib/types";
import { fail, isId } from "./util";
import { cleanText, validateUrl } from "./validate";
import { type Row } from "./revisions";
import { isIntent, isVersion, saveItem } from "./save";
import type { CmsResult } from "./types";

export const LINK_FIELDS = ["label", "url"] as const;

export async function saveLink(viewer: Viewer, raw: unknown): Promise<CmsResult> {
  const i = (raw ?? {}) as Row;
  const label = cleanText(i.label, 60);
  if (!label) return fail("Add a label (up to 60 characters).");
  const url = validateUrl(i.url);
  if (!url) return fail("The link must be a full https:// address.");
  if (!isIntent(i.intent) || i.intent === "submit") return fail("Invalid request.");
  if (i.id !== undefined && (!isId(i.id) || !isVersion(i.version))) return fail("Reload the page and try again.");
  let position: number | undefined;
  if (i.id === undefined) {
    const [r] = await db.select({ m: sql<number>`coalesce(max(${resourceLinks.position}), 0)` }).from(resourceLinks).where(eq(resourceLinks.status, "published"));
    position = Number(r.m) + 10;
  }
  return saveItem(viewer, "link", {
    id: i.id, version: i.version, values: { label, url, ...(position !== undefined && { position }) }, fields: LINK_FIELDS, intent: i.intent, label,
  });
}
