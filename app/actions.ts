"use server";
import type { ActionResult, EnquiryStatus, UpdateCategory } from "@/lib/types";

// CONTRACT (Agent A implements; UI calls from client components).
// Each action authenticates, checks role, validates input, writes, then revalidatePath()s.

export async function toggleArrivalTask(taskId: number, done: boolean): Promise<ActionResult> { throw new Error("TODO"); }
export async function reportListing(listingId: number, reason: string, note: string): Promise<ActionResult> { throw new Error("TODO"); }
/** isc_admin: set checked date to today and resolve open reports. */
export async function verifyListing(listingId: number): Promise<ActionResult> { throw new Error("TODO"); }
export async function requestBuddy(input: { country: string; language: string; arrival: string; programme: string; help: string[] }): Promise<ActionResult> { throw new Error("TODO"); }
export async function volunteerAsBuddy(input: { year: string; languages: string; capacity: number }): Promise<ActionResult> { throw new Error("TODO"); }
/** isc_admin */
export async function assignBuddy(requestId: number, volunteerId: number): Promise<ActionResult> { throw new Error("TODO"); }
export async function toggleRsvp(updateId: number): Promise<ActionResult> { throw new Error("TODO"); }
export async function registerMembership(input: { name: string; email?: string; programme?: string }): Promise<ActionResult> { throw new Error("TODO"); }
/** isc_admin */
export async function publishUpdate(input: { category: UpdateCategory; title: string; description: string }): Promise<ActionResult> { throw new Error("TODO"); }
/** Returns { ok, id: "WLF-2026-0xx" }. */
export async function submitEnquiry(input: { category: string; urgency: string; description: string; contact: string }): Promise<ActionResult> { throw new Error("TODO"); }
/** welfare_staff only */
export async function updateEnquiryStatus(id: string, status: EnquiryStatus): Promise<ActionResult> { throw new Error("TODO"); }
