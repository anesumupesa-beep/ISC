import "server-only";
import { cache } from "react";
import { asc, desc, eq, sql } from "drizzle-orm";
import { auth } from "./auth/server";
import {
  arrivalProgress, arrivalTasks, buddyRequests, clubUpdates, db, housingReports, listings,
  memberships, profiles, rsvps, volunteers, welfareEnquiries,
} from "./db";
import type {
  ArrivalTask, BuddyRequest, ClubUpdate, Enquiry, Listing, Viewer, Volunteer,
} from "./types";

// CONTRACT (Agent A implements; UI calls from server components).
// Every function reads the signed-in user itself; role checks live here, never in the UI.

/** "14 Nov 2026" / { day: "14", month: "NOV" } in Mauritius time. */
function dateParts(d: Date | string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "Indian/Mauritius", day: "2-digit", month: "short", year: "numeric" })
      .formatToParts(new Date(d)).map((x) => [x.type, x.value]),
  );
  return { day: p.day, month: p.month, year: p.year, display: `${p.day} ${p.month} ${p.year}` };
}
const formatDate = (d: Date | string) => dateParts(d).display;

/** Signed-in user + role, or null when signed out. Creates a student profile on first visit. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user) return null;
  let [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  if (!profile) {
    const name = user.name?.trim() || user.email.split("@")[0];
    await db.insert(profiles).values({ userId: user.id, name }).onConflictDoNothing();
    [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  }
  return { userId: user.id, name: profile.name, email: user.email, role: profile.role };
});

export async function getArrivalTasks(): Promise<ArrivalTask[]> {
  if (!(await getViewer())) return [];
  return db.select().from(arrivalTasks).orderBy(asc(arrivalTasks.id));
}

/** Task ids the viewer has completed. */
export async function getCompletedTaskIds(): Promise<number[]> {
  const viewer = await getViewer();
  if (!viewer) return [];
  const rows = await db.select({ id: arrivalProgress.taskId }).from(arrivalProgress)
    .where(eq(arrivalProgress.userId, viewer.userId));
  return rows.map((r) => r.id);
}

export async function getListings(): Promise<Listing[]> {
  if (!(await getViewer())) return [];
  const [rows, reports] = await Promise.all([
    db.select({
      id: listings.id, title: listings.title, area: listings.area, type: listings.type,
      price: listings.price, walk: listings.walk, includes: listings.includes, checkedAt: listings.checkedAt,
      stale: sql<boolean>`${listings.checkedAt} < (now() at time zone 'Indian/Mauritius')::date - 30`,
    }).from(listings).orderBy(asc(listings.id)),
    db.select().from(housingReports).where(eq(housingReports.resolved, false)).orderBy(desc(housingReports.createdAt)),
  ]);
  return rows.map(({ checkedAt, stale, ...l }) => {
    const r = reports.find((x) => x.listingId === l.id); // newest first
    return {
      ...l,
      checked: formatDate(checkedAt),
      ...(stale && { stale: true }),
      ...(r && { report: { id: r.id, reason: r.reason, note: r.note } }),
    };
  });
}

/** Newest first, pinned first. */
export async function getUpdates(): Promise<ClubUpdate[]> {
  if (!(await getViewer())) return [];
  const rows = await db.select().from(clubUpdates).orderBy(desc(clubUpdates.pinned), desc(clubUpdates.createdAt));
  return rows.map((u) => {
    const { day, month } = dateParts(u.createdAt);
    return {
      id: u.id, category: u.category, title: u.title, description: u.description, meta: u.meta,
      day, month: month.toUpperCase(), ...(u.pinned && { pinned: true }),
    };
  });
}

export async function getMyRsvps(): Promise<number[]> {
  const viewer = await getViewer();
  if (!viewer) return [];
  const rows = await db.select({ id: rsvps.updateId }).from(rsvps).where(eq(rsvps.userId, viewer.userId));
  return rows.map((r) => r.id);
}

export async function isMember(): Promise<boolean> {
  const viewer = await getViewer();
  if (!viewer) return false;
  const [row] = await db.select({ id: memberships.userId }).from(memberships).where(eq(memberships.userId, viewer.userId));
  return !!row;
}

const buddyRequestCols = {
  id: buddyRequests.id, name: buddyRequests.name, country: buddyRequests.country,
  language: buddyRequests.language, date: buddyRequests.arrival, programme: buddyRequests.programme,
  help: buddyRequests.help, assigned: volunteers.name,
};
const toBuddyRequest = ({ assigned, ...r }: { assigned: string | null } & Omit<BuddyRequest, "assigned">): BuddyRequest =>
  assigned ? { ...r, assigned } : r;

/** The viewer's latest buddy request (with assigned name if matched), or null. */
export async function getMyBuddyRequest(): Promise<BuddyRequest | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  const [row] = await db.select(buddyRequestCols).from(buddyRequests)
    .leftJoin(volunteers, eq(volunteers.id, buddyRequests.volunteerId))
    .where(eq(buddyRequests.userId, viewer.userId))
    .orderBy(desc(buddyRequests.createdAt), desc(buddyRequests.id)).limit(1);
  return row ? toBuddyRequest(row) : null;
}

/** Matched volunteer for the viewer, or null. */
export async function getMyBuddy(): Promise<Volunteer | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  const [row] = await db.select({
    id: volunteers.id, name: volunteers.name, course: volunteers.course,
    languages: volunteers.languages, email: volunteers.email,
  }).from(buddyRequests)
    .innerJoin(volunteers, eq(volunteers.id, buddyRequests.volunteerId))
    .where(eq(buddyRequests.userId, viewer.userId))
    .orderBy(desc(buddyRequests.createdAt), desc(buddyRequests.id)).limit(1);
  return row ?? null;
}

/** The viewer's own volunteer record, or null. */
export async function getMyVolunteerProfile(): Promise<{ year: string; languages: string; capacity: number } | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  const [row] = await db.select({ year: volunteers.year, languages: volunteers.languages, capacity: volunteers.capacity })
    .from(volunteers).where(eq(volunteers.userId, viewer.userId));
  return row ?? null;
}

/** isc_admin only: all buddy requests. */
export async function getBuddyRequests(): Promise<BuddyRequest[]> {
  if ((await getViewer())?.role !== "isc_admin") return [];
  const rows = await db.select(buddyRequestCols).from(buddyRequests)
    .leftJoin(volunteers, eq(volunteers.id, buddyRequests.volunteerId))
    .orderBy(asc(buddyRequests.arrival), asc(buddyRequests.id));
  return rows.map(toBuddyRequest);
}

/** isc_admin only (volunteer emails are only needed for matching); students get theirs via getMyBuddy. */
export async function getVolunteers(): Promise<Volunteer[]> {
  if ((await getViewer())?.role !== "isc_admin") return [];
  return db.select({
    id: volunteers.id, name: volunteers.name, course: volunteers.course,
    languages: volunteers.languages, email: volunteers.email,
  }).from(volunteers).orderBy(asc(volunteers.id));
}

const toEnquiry = ({ createdAt, ...e }: typeof welfareEnquiries.$inferSelect): Enquiry => ({
  id: e.id, date: formatDate(createdAt), category: e.category, urgency: e.urgency,
  description: e.description, contact: e.contact, status: e.status,
});

/** The viewer's own enquiries (student tracker). */
export async function getMyEnquiries(): Promise<Enquiry[]> {
  const viewer = await getViewer();
  if (!viewer) return [];
  const rows = await db.select().from(welfareEnquiries)
    .where(eq(welfareEnquiries.userId, viewer.userId)).orderBy(desc(welfareEnquiries.createdAt));
  return rows.map(toEnquiry);
}

/** welfare_staff only: all enquiries. Throws for any other role. */
export async function getAllEnquiries(): Promise<Enquiry[]> {
  const viewer = await getViewer();
  if (!viewer) return [];
  if (viewer.role !== "welfare_staff") throw new Error("Forbidden: welfare staff only");
  const rows = await db.select().from(welfareEnquiries).orderBy(desc(welfareEnquiries.createdAt));
  return rows.map(toEnquiry);
}

