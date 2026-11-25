import "server-only";
import { and, eq } from "drizzle-orm";
import { db, housingReports } from "@/lib/db";
import type { Viewer } from "@/lib/types";
import { todayMu } from "@/lib/admin/format";
import { fail, isId } from "./util";
import { cleanText, isEnum, validateDate } from "./validate";
import { getRow, guardedUpdate, CONFLICT, ok, record, refreshFor, shortTitle, type Row } from "./revisions";
import { isIntent, isVersion, saveItem } from "./save";
import { listingPhotos, MAX_PHOTOS, syncPhotos } from "./media";
import { ROOM_TYPES, type CmsResult } from "./types";

export const LISTING_FIELDS = ["title", "area", "type", "price", "walk", "includes", "contact", "checkedAt"] as const;

export async function saveListing(viewer: Viewer, raw: unknown): Promise<CmsResult> {
  const i = (raw ?? {}) as Row;
  const title = cleanText(i.title, 100);
  if (!title) return fail("Add a title (up to 100 characters).");
  const area = cleanText(i.area, 60);
  if (!area) return fail("Add the area (up to 60 characters).");
  if (!isEnum(ROOM_TYPES, i.type)) return fail("Choose a room type.");
  const price = typeof i.price === "number" ? i.price : Number(i.price);
  if (!Number.isInteger(price) || price < 1 || price > 500000) return fail("Rent must be a whole number from 1 to 500000 Rs.");
  const walk = cleanText(i.walk, 80);
  if (!walk) return fail("Add the walking distance or travel time (up to 80 characters).");
  const includes = cleanText(i.includes, 120);
  if (!includes) return fail("Add what the rent includes (up to 120 characters).");
  const contact = cleanText(i.contact ?? "", 120, 0);
  if (contact === null) return fail("Keep the contact under 120 characters.");
  const checkedAt = validateDate(i.checkedAt);
  if (!checkedAt) return fail("Choose the date the listing was last checked.");
  if (checkedAt > todayMu()) return fail("The last-checked date cannot be in the future.");
  if (!isIntent(i.intent) || i.intent === "submit") return fail("Invalid request.");
  if (i.id !== undefined && !isId(i.id)) return fail("Invalid listing.");
  if (i.id !== undefined && !isVersion(i.version)) return fail("Reload the page and try again.");

  const photos: { id: string; alt: string }[] = [];
  for (const p of Array.isArray(i.photos) ? i.photos : []) {
    const alt = cleanText(p?.alt ?? "", 120, 0);
    if (typeof p?.id !== "string" || !/^[0-9a-f-]{36}$/i.test(p.id) || alt === null) return fail("A photo is invalid. Remove it and add it again.");
    photos.push({ id: p.id, alt });
  }
  if (photos.length > MAX_PHOTOS) return fail(`A listing can have up to ${MAX_PHOTOS} photos.`);
  if (i.intent === "publish" && photos.some((p) => !p.alt)) return fail("Every photo needs a short description before publishing.");

  const before = i.id ? await listingPhotos(i.id) : [];
  const same = before.length === photos.length && before.every((b, n) => b.id === photos[n].id && b.alt === photos[n].alt);
  const values: Row = { title, area, type: i.type, price, walk, includes, contact: contact || null, checkedAt };
  return saveItem(viewer, "listing", {
    id: i.id, version: i.version, values, fields: LISTING_FIELDS, intent: i.intent, label: title,
    extraChanged: same ? [] : ["photos"],
    after: async (row) => {
      if (!same || !i.id) await syncPhotos(row.id, photos);
      return { photos: photos.map((p) => ({ id: p.id, alt: p.alt })) };
    },
  });
}

/** "Verified today": checked date = today and resolve open reports (same behaviour as the legacy action). */
export async function verifyListingCms(viewer: Viewer, id: unknown, version: unknown): Promise<CmsResult> {
  if (!isId(id) || !isVersion(version)) return fail("Invalid request.");
  const prev = await getRow("listing", id);
  if (!prev || prev.deletedAt) return fail("That listing no longer exists.");
  const row = await guardedUpdate("listing", id, version, { checkedAt: todayMu() }, viewer);
  if (!row) return fail(CONFLICT);
  await db.update(housingReports).set({ resolved: true, outcome: "verified", resolvedBy: viewer.userId, resolvedAt: new Date() })
    .where(and(eq(housingReports.listingId, id), eq(housingReports.resolved, false)));
  await record(viewer, { type: "listing", entityId: id, row, action: "verify", changed: ["checkedAt"], summary: `Verified listing "${shortTitle(row.title)}"` });
  refreshFor("listing");
  return ok(id, row.version, "Marked as checked today.");
}
