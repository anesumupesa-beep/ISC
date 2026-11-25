import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import { neon } from "@neondatabase/serverless";
import type { Browser, Page } from "@playwright/test";
import { pageAs } from "./roles";

// Every row a CMS test creates has a title starting with this marker; cleanup deletes by it (production shares this DB).
export const MARK = "E2E-CMS";
export const title = (what: string) => `${MARK} ${Date.now()} ${what}`;

const sql = () => neon(process.env.DATABASE_URL!);

/** Tiny valid 1x1 PNG (magic bytes real, so the server sniff accepts it). */
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export const adminPage = (browser: Browser): Promise<Page> => pageAs(browser, "isc_admin");

/** Delete every E2E-CMS row, its revisions and media (DB rows and S3 objects). Safe to run any time. */
export async function cleanup() {
  const q = sql();
  const like = `${MARK}%`;
  const ids = {
    arrival_task: await q`select id::text from arrival_tasks where title like ${like}`,
    listing: await q`select id::text from listings where title like ${like}`,
    update: await q`select id::text from club_updates where title like ${like}`,
    link: await q`select id::text from resource_links where label like ${like}`,
    page: await q`select key as id from site_pages where title like ${like}`,
  };
  for (const [type, rows] of Object.entries(ids)) {
    const list = rows.map((r) => r.id as string);
    if (!list.length) continue;
    await q.query("delete from content_revisions where entity_type = $1 and entity_id = any($2)", [type, list]);
    if (type === "listing") {
      const media = await q.query("select id, key from content_media where entity_type = 'listing' and entity_id = any($1)", [list]);
      await deleteObjects(media.map((m) => m.key as string));
      await q.query("delete from content_media where entity_type = 'listing' and entity_id = any($1)", [list]);
    }
  }
  // Unattached uploads from tests that failed before saving a listing.
  const orphan = await q`select id, key from content_media where entity_id is null and alt like ${like}`;
  await deleteObjects(orphan.map((m) => m.key as string));
  await q`delete from content_media where entity_id is null and alt like ${like}`;
  await q`delete from arrival_tasks where title like ${like}`;
  await q`delete from listings where title like ${like}`;
  await q`delete from club_updates where title like ${like}`;
  await q`delete from resource_links where label like ${like}`;
  await q`delete from site_pages where title like ${like}`;
}

async function deleteObjects(keys: string[]) {
  if (!keys.length) return;
  const env = process.env;
  const s3 = new S3Client({
    endpoint: env.NEON_STORAGE_ENDPOINT ?? env.AWS_ENDPOINT_URL_S3,
    region: env.NEON_STORAGE_REGION ?? env.AWS_REGION ?? "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: (env.NEON_STORAGE_ACCESS_KEY_ID ?? env.AWS_ACCESS_KEY_ID)!,
      secretAccessKey: (env.NEON_STORAGE_SECRET_ACCESS_KEY ?? env.AWS_SECRET_ACCESS_KEY)!,
    },
  });
  await s3.send(new DeleteObjectsCommand({ Bucket: "content-public", Delete: { Objects: keys.map((Key) => ({ Key })) } })).catch(() => {});
}

export async function adminCount(): Promise<number> {
  const [r] = await sql()`select count(*)::int as n from profiles where role = 'isc_admin'`;
  return r.n as number;
}

/** id of the row with this exact title (newest first). */
export async function idOf(table: "club_updates" | "listings" | "arrival_tasks" | "resource_links", t: string): Promise<number> {
  const col = table === "resource_links" ? "label" : "title";
  const rows = await sql().query(`select id from ${table} where ${col} = $1 order by id desc limit 1`, [t]);
  return rows[0].id as number;
}

export async function statusOf(table: "club_updates" | "listings" | "arrival_tasks" | "resource_links", id: number) {
  const rows = await sql().query(`select status, version, deleted_at from ${table} where id = $1`, [id]);
  return rows[0] as { status: string; version: number; deleted_at: string | null } | undefined;
}
