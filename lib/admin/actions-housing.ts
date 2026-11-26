"use server";
import { and, eq, sql } from "drizzle-orm";
import { contentRevisions, db, housingReports, listings } from "@/lib/db";
import type { ActionResult } from "@/lib/types";
import { auditEntry } from "./audit";
import { runBatch } from "./batch";
import { getRow } from "@/lib/cms/revisions";
import { adminGate } from "./guard";
import { fail, isId, revalidate, text } from "./util";

const PATHS = ["/", "/housing", "/admin", "/admin/housing", "/admin/activity"];

/** Verify (refresh the checked date) or dismiss (note required, date unchanged) every open report on a listing. */
export async function reviewListing(listingId: number, outcome: "verified" | "dismissed", note?: string): Promise<ActionResult> {
  const g = await adminGate();
  if (!g.ok) return g.result;
  if (!isId(listingId)) return fail("Invalid listing.");
  if (outcome !== "verified" && outcome !== "dismissed") return fail("Invalid outcome.");
  const clean = note ? text(note, 500, 3) : null;
  if (outcome === "dismissed" && !clean) return fail("Add a short note (3 to 500 characters) explaining why.");
  const [listing] = await db.select({ title: listings.title }).from(listings).where(eq(listings.id, listingId));
  if (!listing) return fail("That listing no longer exists.");
  const open = and(eq(housingReports.listingId, listingId), eq(housingReports.resolved, false));
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(housingReports).where(open);
  if (outcome === "dismissed" && !Number(n)) return fail("There are no open reports to dismiss.");
  const { viewer } = g;
  await runBatch([
    ...(outcome === "verified"
      ? [db.update(listings).set({
        checkedAt: sql`(now() at time zone 'Indian/Mauritius')::date`,
        version: sql`${listings.version} + 1`, updatedAt: new Date(), updatedBy: viewer.userId,
      }).where(eq(listings.id, listingId))]
      : []),
    db.update(housingReports).set({
      resolved: true, outcome, resolutionNote: clean, resolvedBy: viewer.userId, resolvedAt: sql`now()`,
    }).where(open),
    auditEntry({
      actorId: viewer.userId, actorName: viewer.name, entityType: "listing", entityId: listingId,
      action: outcome === "verified" ? "housing.verify" : "housing.dismiss",
      summary: `${outcome === "verified" ? "Verified" : "Dismissed reports on"} listing "${listing.title}"`.slice(0, 200),
      detail: { reports: Number(n) },
    }),
  ]);
  // Revision only (the housing.* audit row above is the activity entry).
  const row = await getRow("listing", listingId);
  if (row) {
    await db.insert(contentRevisions).values({
      entityType: "listing", entityId: String(listingId), version: row.version, action: outcome === "verified" ? "verify" : "dismiss",
      snapshot: JSON.parse(JSON.stringify(row)), changedFields: outcome === "verified" ? ["checkedAt"] : [],
      changedBy: viewer.userId, changedByName: viewer.name,
    }).catch((e) => console.error("housing: revision write failed", e));
  }
  revalidate(...PATHS);
  return {
    ok: true,
    message: outcome === "verified"
      ? "Listing verified. Its date and verification stamp have been refreshed."
      : "Reports dismissed. The checked date was not changed.",
  };
}
