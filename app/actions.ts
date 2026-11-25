"use server";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import {
  arrivalProgress, arrivalTasks, buddyRequests, clubUpdates, db, housingReports, listings,
  memberships, profiles, rsvps, volunteers, welfareEnquiries,
} from "@/lib/db";
import { getViewer } from "@/lib/data";
import { uploads } from "@/lib/storage";
import type { ActionResult, EnquiryStatus, UpdateCategory } from "@/lib/types";

// CONTRACT (Agent A implements; UI calls from client components).
// Each action authenticates, checks role, validates input, writes, then revalidatePath()s.

const REPORT_REASONS = ["Contact unreachable", "Rent price changed", "Room already taken", "Inaccurate details"];
const HELP_OPTIONS = ["Airport / transport", "Campus tour", "Settling in"];
const UPDATE_CATEGORIES: UpdateCategory[] = ["Official Announcements", "Events", "Weather & Holidays", "ISC Membership"];
const ENQUIRY_CATEGORIES = ["Accommodation Crisis", "Financial / Tuition", "Health & Wellbeing", "Academic / Visa Support", "Personal / Safety"];
const URGENCIES = ["Standard", "Urgent — 24h"];
const CONTACTS = ["Email", "Phone/WhatsApp", "In-person on campus"];
const STATUSES: EnquiryStatus[] = ["Submitted", "Acknowledged", "Referred to Counsellor"];

const fail = (error: string): ActionResult => ({ ok: false, error });
const SIGNED_OUT = fail("Please sign in to continue.");
const FORBIDDEN = fail("You don't have permission to do that.");

/** Trimmed string within [min, max] chars, else null. */
function text(v: unknown, max: number, min = 1): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length >= min && s.length <= max ? s : null;
}
const isId = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;
const revalidate = (...paths: string[]) => paths.forEach((p) => revalidatePath(p));

export async function toggleArrivalTask(taskId: number, done: boolean): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (!isId(taskId) || typeof done !== "boolean") return fail("Invalid task.");
  const [task] = await db.select({ id: arrivalTasks.id }).from(arrivalTasks).where(eq(arrivalTasks.id, taskId));
  if (!task) return fail("That task no longer exists.");
  if (done) await db.insert(arrivalProgress).values({ userId: viewer.userId, taskId }).onConflictDoNothing();
  else await db.delete(arrivalProgress).where(and(eq(arrivalProgress.userId, viewer.userId), eq(arrivalProgress.taskId, taskId)));
  revalidate("/", "/arrival");
  return { ok: true };
}

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export async function reportListing(listingId: number, reason: string, note: string, photo?: File | null): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (!isId(listingId)) return fail("Invalid listing.");
  if (!REPORT_REASONS.includes(reason)) return fail("Choose what needs checking.");
  const cleanNote = text(note ?? "", 500, 0);
  if (cleanNote === null) return fail("Please keep the note under 500 characters.");
  const [listing] = await db.select({ id: listings.id }).from(listings).where(eq(listings.id, listingId));
  if (!listing) return fail("That listing no longer exists.");
  let photoKey: string | null = null;
  if (photo && photo.size > 0) {
    const ext = PHOTO_TYPES[photo.type];
    if (!ext) return fail("Photos must be JPG, PNG or WebP.");
    if (photo.size > MAX_PHOTO_BYTES) return fail("Please keep the photo under 4 MB.");
    photoKey = `housing-reports/${listingId}/${crypto.randomUUID()}.${ext}`;
    await uploads.upload(photoKey, photo, { contentType: photo.type });
  }
  await db.insert(housingReports).values({ listingId, userId: viewer.userId, reason, note: cleanNote, photoKey });
  revalidate("/housing", "/admin");
  return { ok: true, message: "Report sent to the ISC committee. Thank you for looking out for others." };
}

/** isc_admin: set checked date to today and resolve open reports. */
export async function verifyListing(listingId: number): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (viewer.role !== "isc_admin") return FORBIDDEN;
  if (!isId(listingId)) return fail("Invalid listing.");
  const [updated] = await db.update(listings)
    .set({ checkedAt: sql`(now() at time zone 'Indian/Mauritius')::date` })
    .where(eq(listings.id, listingId)).returning({ id: listings.id });
  if (!updated) return fail("That listing no longer exists.");
  await db.update(housingReports).set({ resolved: true })
    .where(and(eq(housingReports.listingId, listingId), eq(housingReports.resolved, false)));
  revalidate("/", "/housing", "/admin");
  return { ok: true, message: "Listing verified. Its date and verification stamp have been refreshed." };
}

export async function requestBuddy(input: { country: string; language: string; arrival: string; programme: string; help: string[] }): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  const country = text(input?.country, 100);
  const language = text(input?.language, 100);
  const programme = text(input?.programme, 150);
  const arrival = typeof input?.arrival === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.arrival)
    && !Number.isNaN(Date.parse(input.arrival)) ? input.arrival : null;
  const help = Array.isArray(input?.help) ? [...new Set(input.help)] : null;
  if (!country || !language || !programme) return fail("Please fill in your country, language and programme.");
  if (!arrival) return fail("Please choose a valid arrival date.");
  if (!help || !help.every((h) => HELP_OPTIONS.includes(h))) return fail("Please choose from the listed help options.");
  await db.insert(buddyRequests).values({ userId: viewer.userId, name: viewer.name, country, language, arrival, programme, help });
  revalidate("/", "/buddy", "/admin");
  return { ok: true, message: "Buddy request submitted. The committee will help you find a match." };
}

export async function volunteerAsBuddy(input: { year: string; languages: string; capacity: number }): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  const year = text(input?.year, 50);
  const languages = text(input?.languages, 200);
  const capacity = input?.capacity;
  if (!year || !languages) return fail("Please add your year of study and languages.");
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 5) return fail("You can support between 1 and 5 students.");
  const [profile] = await db.select({ programme: profiles.programme }).from(profiles).where(eq(profiles.userId, viewer.userId));
  const course = [profile?.programme, year].filter(Boolean).join(", ");
  const values = { name: viewer.name, email: viewer.email, course, year, languages, capacity };
  await db.insert(volunteers).values({ userId: viewer.userId, ...values })
    .onConflictDoUpdate({ target: volunteers.userId, set: values });
  revalidate("/buddy", "/admin");
  return { ok: true, message: "Volunteer interest received by the ISC committee." };
}

/** isc_admin */
export async function assignBuddy(requestId: number, volunteerId: number): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (viewer.role !== "isc_admin") return FORBIDDEN;
  if (!isId(requestId) || !isId(volunteerId)) return fail("Invalid request or volunteer.");
  const [volunteer] = await db.select({ name: volunteers.name }).from(volunteers).where(eq(volunteers.id, volunteerId));
  if (!volunteer) return fail("That volunteer no longer exists.");
  const [request] = await db.update(buddyRequests).set({ volunteerId })
    .where(eq(buddyRequests.id, requestId)).returning({ name: buddyRequests.name });
  if (!request) return fail("That buddy request no longer exists.");
  revalidate("/", "/buddy", "/admin");
  return { ok: true, message: `${request.name} has been matched with ${volunteer.name}.` };
}

export async function toggleRsvp(updateId: number): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (!isId(updateId)) return fail("Invalid update.");
  const where = and(eq(rsvps.userId, viewer.userId), eq(rsvps.updateId, updateId));
  const removed = await db.delete(rsvps).where(where).returning({ id: rsvps.updateId });
  if (!removed.length) {
    const [update] = await db.select({ id: clubUpdates.id }).from(clubUpdates).where(eq(clubUpdates.id, updateId));
    if (!update) return fail("That update no longer exists.");
    await db.insert(rsvps).values({ userId: viewer.userId, updateId }).onConflictDoNothing();
  }
  revalidate("/", "/updates");
  return { ok: true, message: removed.length ? "RSVP removed." : "You're going. See you there!" };
}

export async function registerMembership(input: { name: string; email?: string; programme?: string }): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  const name = text(input?.name, 100);
  if (!name) return fail("Please enter your name.");
  const email = input?.email ? text(input.email, 254) : viewer.email;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Please enter a valid email address.");
  const programme = input?.programme ? text(input.programme, 150) : null;
  if (input?.programme && !programme) return fail("Please keep your programme under 150 characters.");
  const values = { name, email, programme };
  await db.insert(memberships).values({ userId: viewer.userId, ...values })
    .onConflictDoUpdate({ target: memberships.userId, set: values });
  revalidate("/", "/updates");
  return { ok: true, message: "Your 2026–2027 ISC membership registration has been received." };
}

/** isc_admin */
export async function publishUpdate(input: { category: UpdateCategory; title: string; description: string }): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (viewer.role !== "isc_admin") return FORBIDDEN;
  const category = input?.category;
  const title = text(input?.title, 150);
  const description = text(input?.description, 2000);
  if (!UPDATE_CATEGORIES.includes(category)) return fail("Choose a category.");
  if (!title || !description) return fail("Please add a title and a description.");
  await db.insert(clubUpdates).values({
    category, title, description, meta: "ISC Committee · Just published",
    pinned: category === "Weather & Holidays", publishedBy: viewer.userId,
  });
  revalidate("/", "/updates", "/admin");
  return { ok: true, message: "Update published. It is now visible in the student Club Updates feed." };
}

/** Returns { ok, id: "WLF-2026-0xx" }. */
export async function submitEnquiry(input: { category: string; urgency: string; description: string; contact: string }): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (viewer.role === "isc_admin") return fail("Welfare enquiries are for students; please use the welfare staff contact.");
  if (!ENQUIRY_CATEGORIES.includes(input?.category)) return fail("Choose an enquiry category.");
  if (!URGENCIES.includes(input?.urgency)) return fail("Choose how soon you need support.");
  if (!CONTACTS.includes(input?.contact)) return fail("Choose a preferred contact method.");
  const description = text(input?.description, 2000, 10);
  if (!description) return fail("Please describe your enquiry in 10 to 2000 characters.");
  const [row] = await db.insert(welfareEnquiries).values({
    userId: viewer.userId, category: input.category, urgency: input.urgency, contact: input.contact, description,
  }).returning({ id: welfareEnquiries.id });
  revalidate("/welfare", "/welfare-staff");
  return { ok: true, id: row.id, message: `Enquiry ${row.id} submitted. You can follow its status below.` };
}

/** welfare_staff only */
export async function updateEnquiryStatus(id: string, status: EnquiryStatus): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (viewer.role !== "welfare_staff") return FORBIDDEN;
  if (typeof id !== "string" || !/^WLF-\d{4}-\d{3,}$/.test(id)) return fail("Invalid enquiry reference.");
  if (!STATUSES.includes(status)) return fail("Invalid status.");
  const [row] = await db.update(welfareEnquiries).set({ status })
    .where(eq(welfareEnquiries.id, id)).returning({ id: welfareEnquiries.id });
  if (!row) return fail("That enquiry no longer exists.");
  revalidate("/welfare", "/welfare-staff");
  return { ok: true, message: `${id} updated to ${status.toLowerCase()}.` };
}
