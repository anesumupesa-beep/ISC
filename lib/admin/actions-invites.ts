"use server";
import { randomBytes } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import { adminInvites, db } from "@/lib/db";
import type { ActionResult } from "@/lib/types";
import { auditEntry } from "./audit";
import { runBatch } from "./batch";
import { adminGate } from "./guard";
import { hashToken, liveInvite as live } from "./invite-token";
import { fail, FORBIDDEN, revalidate } from "./util";

const DAYS = 7;
const MAX_PENDING = 20;

/** Owner only. Returns the one-time token; the UI builds the link. shortcut: no email delivery, the owner shares the link, add a mail provider when the club has one. */
export async function createAdminInvite(email: string): Promise<ActionResult & { token?: string }> {
  const g = await adminGate();
  if (!g.ok) return g.result;
  if (!g.viewer.isOwner) return FORBIDDEN;
  const e = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (e.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return fail("Enter a valid email address.");
  const [{ n }] = await db.select({ n: count() }).from(adminInvites).where(live());
  if (n >= MAX_PENDING) return fail("Too many open invites. Revoke some first.");
  const token = randomBytes(32).toString("base64url");
  const { viewer } = g;
  await runBatch([
    db.insert(adminInvites).values({
      email: e, tokenHash: hashToken(token), invitedBy: viewer.userId, invitedByName: viewer.name,
      expiresAt: new Date(Date.now() + DAYS * 864e5),
    }),
    auditEntry({
      actorId: viewer.userId, actorName: viewer.name, entityType: "user", action: "admin.invite",
      summary: `Invited ${e} to be an ISC Admin`, detail: { email: e },
    }),
  ]);
  revalidate("/admin/people", "/admin/activity");
  return { ok: true, message: `Invite created for ${e}. It lasts ${DAYS} days.`, token };
}

export async function revokeAdminInvite(id: number): Promise<ActionResult> {
  const g = await adminGate();
  if (!g.ok) return g.result;
  if (!g.viewer.isOwner) return FORBIDDEN;
  if (!Number.isInteger(id) || id < 1) return fail("Invalid invite.");
  const { viewer } = g;
  const [inv] = await db.select({ email: adminInvites.email }).from(adminInvites).where(and(eq(adminInvites.id, id), live()));
  if (!inv) return fail("That invite is no longer open.");
  await runBatch([
    db.update(adminInvites).set({ revokedAt: new Date() }).where(eq(adminInvites.id, id)),
    auditEntry({
      actorId: viewer.userId, actorName: viewer.name, entityType: "user", action: "admin.invite_revoke",
      summary: `Revoked the admin invite for ${inv.email}`, detail: { email: inv.email },
    }),
  ]);
  revalidate("/admin/people", "/admin/activity");
  return { ok: true, message: "Invite revoked." };
}
