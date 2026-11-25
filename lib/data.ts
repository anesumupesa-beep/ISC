import "server-only";
import type {
  ArrivalTask, BuddyRequest, ClubUpdate, Enquiry, Listing, Viewer, Volunteer,
} from "./types";

// CONTRACT (Agent A implements; UI calls from server components).
// Every function reads the signed-in user itself; role checks live here, never in the UI.

/** Signed-in user + role, or null when signed out. */
export async function getViewer(): Promise<Viewer | null> { throw new Error("TODO"); }
export async function getArrivalTasks(): Promise<ArrivalTask[]> { throw new Error("TODO"); }
/** Task ids the viewer has completed. */
export async function getCompletedTaskIds(): Promise<number[]> { throw new Error("TODO"); }
export async function getListings(): Promise<Listing[]> { throw new Error("TODO"); }
/** Newest first, pinned first. */
export async function getUpdates(): Promise<ClubUpdate[]> { throw new Error("TODO"); }
export async function getMyRsvps(): Promise<number[]> { throw new Error("TODO"); }
export async function isMember(): Promise<boolean> { throw new Error("TODO"); }
/** The viewer's latest buddy request (with assigned name if matched), or null. */
export async function getMyBuddyRequest(): Promise<BuddyRequest | null> { throw new Error("TODO"); }
/** Matched volunteer for the viewer, or null. */
export async function getMyBuddy(): Promise<Volunteer | null> { throw new Error("TODO"); }
/** The viewer's own volunteer record, or null. */
export async function getMyVolunteerProfile(): Promise<{ year: string; languages: string; capacity: number } | null> { throw new Error("TODO"); }
/** isc_admin only: all buddy requests. */
export async function getBuddyRequests(): Promise<BuddyRequest[]> { throw new Error("TODO"); }
export async function getVolunteers(): Promise<Volunteer[]> { throw new Error("TODO"); }
/** The viewer's own enquiries (student tracker). */
export async function getMyEnquiries(): Promise<Enquiry[]> { throw new Error("TODO"); }
/** welfare_staff only: all enquiries. Throws for any other role. */
export async function getAllEnquiries(): Promise<Enquiry[]> { throw new Error("TODO"); }
