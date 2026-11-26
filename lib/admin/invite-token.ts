import "server-only";
import { createHash } from "node:crypto";
import { and, gt, isNull } from "drizzle-orm";
import { adminInvites } from "@/lib/db";

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
/** An invite that is still usable: not accepted, not revoked, not expired. */
export const liveInvite = () => and(isNull(adminInvites.acceptedAt), isNull(adminInvites.revokedAt), gt(adminInvites.expiresAt, new Date()));
