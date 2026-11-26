"use server";
import { and, eq } from "drizzle-orm";
import { auditEntry } from "@/lib/admin/audit";
import { runBatch } from "@/lib/admin/batch";
import { hashToken, liveInvite } from "@/lib/admin/invite-token";
import { fail, revalidate, SIGNED_OUT } from "@/lib/admin/util";
import { getViewer } from "@/lib/data";
import { adminInvites, db, profiles } from "@/lib/db";
import type { ActionResult } from "@/lib/types";

/** Any signed-in user, but the token must match and the invite must have been issued to their own email. */
export async function acceptAdminInvite(token: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SIGNED_OUT;
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return fail("This invite link isn't valid.");
  const [inv] = await db.select().from(adminInvites).where(and(eq(adminInvites.tokenHash, hashToken(token)), liveInvite()));
  if (!inv) return fail("This invite is invalid, expired or already used.");
  if (inv.email !== viewer.email.toLowerCase()) return fail(`This invite was sent to a different email. Sign in as ${inv.email}.`);
  if (viewer.role !== "student") return fail("Your account already has committee or staff access.");
  await runBatch([
    db.update(profiles).set({ role: "isc_admin" }).where(eq(profiles.userId, viewer.userId)),
    db.update(adminInvites).set({ acceptedAt: new Date() }).where(eq(adminInvites.id, inv.id)),
    auditEntry({
      actorId: viewer.userId, actorName: viewer.name, entityType: "user", entityId: viewer.userId, action: "admin.invite_accept",
      summary: `${viewer.name} accepted the admin invite`, detail: { email: inv.email, invitedBy: inv.invitedByName },
    }),
  ]);
  revalidate("/admin", "/admin/people", "/admin/activity");
  return { ok: true, message: "You're now an ISC Admin." };
}
