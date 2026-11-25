import "server-only";
import { and, eq, inArray, isNotNull, isNull, lt, notInArray, or } from "drizzle-orm";
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";
import { contentMedia, db } from "@/lib/db";
import type { Viewer } from "@/lib/types";
import { fail } from "./util";
import { logAudit } from "./audit";
import { cleanText, sniffImage } from "./validate";
import type { CmsResult } from "./types";

// Public-read bucket declared in neon.ts. Same env fallback chain as lib/storage.ts (Vercel sets NEON_STORAGE_*).
const env = process.env;
const endpoint = env.NEON_STORAGE_ENDPOINT ?? env.AWS_ENDPOINT_URL_S3;
const BUCKET = "content-public";
export const contentFiles = new Files({
  adapter: neon({
    bucket: BUCKET,
    endpoint,
    region: env.NEON_STORAGE_REGION ?? env.AWS_REGION,
    accessKeyId: env.NEON_STORAGE_ACCESS_KEY_ID ?? env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.NEON_STORAGE_SECRET_ACCESS_KEY ?? env.AWS_SECRET_ACCESS_KEY,
  }),
});

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_PHOTOS = 3;

/** Permanent public URL (anonymous GET verified against the bucket). */
export const mediaUrl = (key: string) => `${endpoint}/${BUCKET}/${key}`;

/** Upload one listing photo; the row stays unattached until the listing is saved. Returns the media id. */
export async function uploadImage(viewer: Viewer, form: FormData): Promise<CmsResult & { url?: string }> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a photo.");
  if (file.size > MAX_IMAGE_BYTES) return fail("Please keep the photo under 4 MB.");
  const alt = cleanText(form.get("alt"), 120);
  if (!alt) return fail("Describe the photo in a few words (up to 120 characters).");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return fail("Photos must be JPG, PNG or WebP.");
  const key = `content/listing/${crypto.randomUUID()}.${kind.ext}`;
  await contentFiles.upload(key, bytes, { contentType: kind.mime, cacheControl: "public, max-age=31536000, immutable" });
  const [row] = await db.insert(contentMedia).values({ key, mime: kind.mime, bytes: bytes.length, alt, uploadedBy: viewer.userId }).returning({ id: contentMedia.id });
  return { ok: true, id: row.id, url: mediaUrl(key) };
}

export type Photo = { id: string; url: string; alt: string };

/** Live photos of a listing, in order. */
export async function listingPhotos(listingId: number): Promise<Photo[]> {
  const rows = await db.select().from(contentMedia)
    .where(and(eq(contentMedia.entityType, "listing"), eq(contentMedia.entityId, String(listingId)), isNull(contentMedia.detachedAt)))
    .orderBy(contentMedia.position);
  return rows.map((r) => ({ id: r.id, url: mediaUrl(r.key), alt: r.alt }));
}

/** Attach `photos` (in order) to the listing and detach any others. Validates ownership and count. */
export async function syncPhotos(listingId: number, photos: { id: string; alt: string }[]): Promise<void> {
  const ids = photos.map((p) => p.id);
  const existing = await db.select().from(contentMedia).where(inArray(contentMedia.id, ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]));
  const usable = new Map(existing.filter((m) => m.entityId === null || (m.entityType === "listing" && m.entityId === String(listingId))).map((m) => [m.id, m]));
  const keep = photos.filter((p) => usable.has(p.id));
  const queries = keep.map((p, position) =>
    db.update(contentMedia).set({ entityType: "listing", entityId: String(listingId), position, alt: p.alt, detachedAt: null }).where(eq(contentMedia.id, p.id)));
  const detach = db.update(contentMedia).set({ detachedAt: new Date() })
    .where(and(eq(contentMedia.entityType, "listing"), eq(contentMedia.entityId, String(listingId)), isNull(contentMedia.detachedAt),
      keep.length ? notInArray(contentMedia.id, keep.map((p) => p.id)) : undefined));
  await db.batch([detach, ...queries] as [typeof detach, ...typeof queries]);
}

/** Delete unattached images older than 24 h and detached ones older than 7 days. */
export async function sweepMedia(viewer: Viewer): Promise<CmsResult> {
  const day = new Date(Date.now() - 24 * 3600_000);
  const week = new Date(Date.now() - 7 * 24 * 3600_000);
  const stale = await db.select().from(contentMedia).where(or(
    and(isNull(contentMedia.entityId), isNull(contentMedia.detachedAt), lt(contentMedia.createdAt, day)),
    and(isNotNull(contentMedia.detachedAt), lt(contentMedia.detachedAt, week)),
  ));
  if (!stale.length) return { ok: true, message: "Nothing to clean up." };
  await contentFiles.delete(stale.map((s) => s.key));
  await db.delete(contentMedia).where(inArray(contentMedia.id, stale.map((s) => s.id)));
  await logAudit({ actorId: viewer.userId, actorName: viewer.name, action: "content.sweep", entityType: "content_media", summary: `Removed ${stale.length} unused image(s)` });
  return { ok: true, message: `Removed ${stale.length} unused image${stale.length === 1 ? "" : "s"}.` };
}

