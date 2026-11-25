"use server";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { buddyRequests, db, volunteers } from "@/lib/db";
import type { ActionResult } from "@/lib/types";
import { auditEntry } from "./audit";
import { runBatch } from "./batch";
import { adminGate } from "./guard";
import { fail, isId, revalidate } from "./util";

const PATHS = ["/", "/buddy", "/admin", "/admin/buddies", "/admin/activity"];

const loadOf = async (volunteerId: number, exceptRequest = 0) => {
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(buddyRequests)
    .where(and(eq(buddyRequests.volunteerId, volunteerId), isNull(buddyRequests.closedAt), ne(buddyRequests.id, exceptRequest)));
  return Number(r.n);
};

/** Assign, or reassign when the request already has a different volunteer. */
export async function assignBuddyMatch(requestId: number, volunteerId: number): Promise<ActionResult> {
  const g = await adminGate();
  if (!g.ok) return g.result;
  if (!isId(requestId) || !isId(volunteerId)) return fail("Invalid request or volunteer.");
  const [request] = await db.select().from(buddyRequests).where(eq(buddyRequests.id, requestId));
  if (!request) return fail("That buddy request no longer exists.");
  if (request.closedAt) return fail("That request is closed.");
  if (request.volunteerId === volunteerId) return fail("That volunteer is already matched to this student.");
  const [v] = await db.select().from(volunteers).where(eq(volunteers.id, volunteerId));
  if (!v) return fail("That volunteer no longer exists.");
  if (!v.approvedAt) return fail("Approve this volunteer before matching them.");
  if (v.paused) return fail("That volunteer is paused.");
  if ((await loadOf(volunteerId, requestId)) >= v.capacity) return fail(`${v.name} is already at capacity.`);
  const reassign = request.volunteerId != null;
  const { viewer } = g;
  await runBatch([
    db.update(buddyRequests).set({ volunteerId, assignedAt: sql`now()`, assignedBy: viewer.userId }).where(eq(buddyRequests.id, requestId)),
    auditEntry({
      actorId: viewer.userId, actorName: viewer.name, entityType: "buddy_request", entityId: requestId,
      action: reassign ? "buddy.reassign" : "buddy.assign",
      summary: `${reassign ? "Reassigned" : "Matched"} ${request.name} with ${v.name}`.slice(0, 200),
      detail: { from: request.volunteerId, to: volunteerId },
    }),
  ]);
  revalidate(...PATHS);
  return { ok: true, message: `${request.name} has been matched with ${v.name}.` };
}

export async function unassignBuddy(requestId: number): Promise<ActionResult> {
  const g = await adminGate();
  if (!g.ok) return g.result;
  if (!isId(requestId)) return fail("Invalid request.");
  const [request] = await db.select().from(buddyRequests).where(eq(buddyRequests.id, requestId));
  if (!request) return fail("That buddy request no longer exists.");
  if (request.volunteerId == null || request.closedAt) return fail("That request has no active match.");
  const { viewer } = g;
  await runBatch([
    db.update(buddyRequests).set({ volunteerId: null, assignedAt: null, assignedBy: null }).where(eq(buddyRequests.id, requestId)),
    auditEntry({
      actorId: viewer.userId, actorName: viewer.name, entityType: "buddy_request", entityId: requestId,
      action: "buddy.unassign", summary: `Unmatched ${request.name}`, detail: { from: request.volunteerId },
    }),
  ]);
  revalidate(...PATHS);
  return { ok: true, message: "Match removed. The request is pending again." };
}

export async function closeBuddyRequest(requestId: number): Promise<ActionResult> {
  const g = await adminGate();
  if (!g.ok) return g.result;
  if (!isId(requestId)) return fail("Invalid request.");
  const [request] = await db.select().from(buddyRequests).where(eq(buddyRequests.id, requestId));
  if (!request) return fail("That buddy request no longer exists.");
  if (request.closedAt) return fail("That request is already closed.");
  const { viewer } = g;
  await runBatch([
    db.update(buddyRequests).set({ closedAt: sql`now()` }).where(eq(buddyRequests.id, requestId)),
    auditEntry({
      actorId: viewer.userId, actorName: viewer.name, entityType: "buddy_request", entityId: requestId,
      action: "buddy.close", summary: `Closed the buddy request from ${request.name}`,
    }),
  ]);
  revalidate(...PATHS);
  return { ok: true, message: "Request closed. The volunteer's capacity is free again." };
}

export async function setVolunteerStatus(volunteerId: number, change: "approve" | "pause" | "resume"): Promise<ActionResult> {
  const g = await adminGate();
  if (!g.ok) return g.result;
  if (!isId(volunteerId)) return fail("Invalid volunteer.");
  if (change !== "approve" && change !== "pause" && change !== "resume") return fail("Invalid change.");
  const [v] = await db.select().from(volunteers).where(eq(volunteers.id, volunteerId));
  if (!v) return fail("That volunteer no longer exists.");
  if (change === "approve" && v.approvedAt) return fail("Already approved.");
  if (change !== "approve" && !v.approvedAt) return fail("Approve this volunteer first.");
  if (change === "pause" && v.paused) return fail("Already paused.");
  if (change === "resume" && !v.paused) return fail("Not paused.");
  const { viewer } = g;
  const set = change === "approve"
    ? { approvedAt: sql`now()`, approvedBy: viewer.userId }
    : { paused: change === "pause" };
  await runBatch([
    db.update(volunteers).set(set).where(eq(volunteers.id, volunteerId)),
    auditEntry({
      actorId: viewer.userId, actorName: viewer.name, entityType: "volunteer", entityId: volunteerId,
      action: `volunteer.${change}`, summary: `${change === "approve" ? "Approved" : change === "pause" ? "Paused" : "Resumed"} volunteer ${v.name}`,
    }),
  ]);
  revalidate("/buddy", "/admin", "/admin/buddies", "/admin/activity");
  return { ok: true, message: `${v.name}: ${change === "approve" ? "approved" : change === "pause" ? "paused" : "resumed"}.` };
}

export async function setVolunteerCapacity(volunteerId: number, capacity: number): Promise<ActionResult> {
  const g = await adminGate();
  if (!g.ok) return g.result;
  if (!isId(volunteerId)) return fail("Invalid volunteer.");
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 5) return fail("Capacity must be between 1 and 5.");
  const [v] = await db.select().from(volunteers).where(eq(volunteers.id, volunteerId));
  if (!v) return fail("That volunteer no longer exists.");
  const load = await loadOf(volunteerId);
  if (capacity < load) return fail(`${v.name} already has ${load} active matches.`);
  const { viewer } = g;
  await runBatch([
    db.update(volunteers).set({ capacity }).where(eq(volunteers.id, volunteerId)),
    auditEntry({
      actorId: viewer.userId, actorName: viewer.name, entityType: "volunteer", entityId: volunteerId,
      action: "volunteer.capacity", summary: `Set ${v.name}'s capacity to ${capacity}`, detail: { from: v.capacity, to: capacity },
    }),
  ]);
  revalidate("/buddy", "/admin", "/admin/buddies", "/admin/activity");
  return { ok: true, message: `Capacity set to ${capacity}.` };
}
