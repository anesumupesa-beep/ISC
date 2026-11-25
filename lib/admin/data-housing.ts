import "server-only";
import { and, asc, desc, eq, notExists, sql } from "drizzle-orm";
import { db, housingReports, listings, profiles } from "@/lib/db";
import { uploads } from "@/lib/storage";
import { requireAdmin } from "./guard";
import { formatDate, formatDateTime, timeAgo } from "./format";
import type { HousingCard, ResolvedReport, StaleListing } from "./types";

/** Listings with ALL their open reports (newest first) and short-lived photo links. */
export async function getHousingQueue(): Promise<HousingCard[]> {
  await requireAdmin();
  const rows = await db.select({
    lid: listings.id, title: listings.title, area: listings.area, price: listings.price, checkedAt: listings.checkedAt,
    rid: housingReports.id, reason: housingReports.reason, note: housingReports.note,
    photoKey: housingReports.photoKey, createdAt: housingReports.createdAt,
  }).from(housingReports).innerJoin(listings, eq(listings.id, housingReports.listingId))
    .where(eq(housingReports.resolved, false))
    .orderBy(asc(listings.id), desc(housingReports.createdAt));
  const cards = new Map<number, HousingCard>();
  for (const r of rows) {
    const photoUrl = r.photoKey ? await uploads.url(r.photoKey, { expiresIn: 600 }) : undefined;
    const card = cards.get(r.lid) ?? { id: r.lid, title: r.title, area: r.area, price: r.price, checked: formatDate(r.checkedAt), reports: [] };
    card.reports.push({ id: r.rid, reason: r.reason, note: r.note, ago: timeAgo(r.createdAt), ...(photoUrl && { photoUrl }) });
    cards.set(r.lid, card);
  }
  return [...cards.values()];
}

/** Listings past 30 days with no open report, oldest first. */
export async function getStaleListings(): Promise<StaleListing[]> {
  await requireAdmin();
  const today = sql`(now() at time zone 'Indian/Mauritius')::date`;
  const open = db.select({ x: sql`1` }).from(housingReports)
    .where(and(sql`${housingReports.listingId} = "listings"."id"`, eq(housingReports.resolved, false)));
  const rows = await db.select({
    id: listings.id, title: listings.title, area: listings.area, price: listings.price, checkedAt: listings.checkedAt,
    days: sql<number>`(${today} - ${listings.checkedAt})`,
  }).from(listings)
    .where(and(sql`${listings.checkedAt} < ${today} - 30`, notExists(open)))
    .orderBy(asc(listings.checkedAt), asc(listings.id));
  return rows.map(({ checkedAt, ...r }) => ({ ...r, days: Number(r.days), checked: formatDate(checkedAt) }));
}

export async function getResolvedReports(limit = 30): Promise<ResolvedReport[]> {
  await requireAdmin();
  const rows = await db.select({
    id: housingReports.id, title: listings.title, reason: housingReports.reason, outcome: housingReports.outcome,
    note: housingReports.resolutionNote, by: profiles.name, at: housingReports.resolvedAt,
  }).from(housingReports)
    .innerJoin(listings, eq(listings.id, housingReports.listingId))
    .leftJoin(profiles, eq(profiles.userId, housingReports.resolvedBy))
    .where(eq(housingReports.resolved, true))
    .orderBy(desc(sql`coalesce(${housingReports.resolvedAt}, ${housingReports.createdAt})`), desc(housingReports.id))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id, listingTitle: r.title, reason: r.reason, outcome: r.outcome, note: r.note, by: r.by,
    when: r.at ? formatDateTime(r.at) : null,
  }));
}
