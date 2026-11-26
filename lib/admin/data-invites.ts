import "server-only";
import { and, desc, gt, isNull } from "drizzle-orm";
import { adminInvites, db } from "@/lib/db";
import { requireAdmin } from "./guard";

export type PendingInvite = { id: number; email: string; invitedByName: string; expires: string };

/** Open invites. Owner only: others get an empty list. */
export async function getPendingInvites(): Promise<PendingInvite[]> {
  const viewer = await requireAdmin();
  if (!viewer.isOwner) return [];
  const rows = await db.select().from(adminInvites)
    .where(and(isNull(adminInvites.acceptedAt), isNull(adminInvites.revokedAt), gt(adminInvites.expiresAt, new Date())))
    .orderBy(desc(adminInvites.createdAt));
  return rows.map((r) => ({ id: r.id, email: r.email, invitedByName: r.invitedByName, expires: r.expiresAt.toISOString().slice(0, 10) }));
}
