import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { buddyRequests, db, volunteers } from "@/lib/db";
import { requireAdmin } from "./guard";
import type { BuddyReq, VolunteerRow } from "./types";

/** All buddy requests (club-sized), soonest arrival first. The page filters by status. */
export async function getBuddyBoard(): Promise<BuddyReq[]> {
  await requireAdmin();
  const rows = await db.select({
    id: buddyRequests.id, name: buddyRequests.name, country: buddyRequests.country, language: buddyRequests.language,
    programme: buddyRequests.programme, help: buddyRequests.help, arrival: buddyRequests.arrival,
    arrivalDays: sql<number>`(${buddyRequests.arrival} - (now() at time zone 'Indian/Mauritius')::date)`,
    volunteerId: buddyRequests.volunteerId, volunteerName: volunteers.name, closedAt: buddyRequests.closedAt,
  }).from(buddyRequests).leftJoin(volunteers, eq(volunteers.id, buddyRequests.volunteerId))
    .orderBy(asc(buddyRequests.arrival), asc(buddyRequests.id));
  return rows.map(({ closedAt, ...r }) => ({
    ...r, arrivalDays: Number(r.arrivalDays),
    status: closedAt ? "closed" : r.volunteerId ? "matched" : "pending",
  }));
}

export async function getVolunteerBoard(): Promise<VolunteerRow[]> {
  await requireAdmin();
  const rows = await db.select({
    id: volunteers.id, name: volunteers.name, course: volunteers.course, languages: volunteers.languages,
    email: volunteers.email, capacity: volunteers.capacity, approvedAt: volunteers.approvedAt, paused: volunteers.paused,
    load: sql<number>`(select count(*) from buddy_requests b where b.volunteer_id = "volunteers"."id" and b.closed_at is null)`,
  }).from(volunteers).orderBy(asc(volunteers.id));
  return rows.map(({ approvedAt, paused, ...v }) => ({
    ...v, load: Number(v.load), state: !approvedAt ? "pending" : paused ? "paused" : "approved",
  }));
}
