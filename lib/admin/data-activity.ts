import "server-only";
import { and, desc, eq, lt } from "drizzle-orm";
import { auditLog, db } from "@/lib/db";
import { requireAdmin } from "./guard";
import type { AuditRow } from "./types";

export const ACTIVITY_PAGE = 30;

/** Newest first; `before` is the id of the last row already shown. */
export async function getActivity(opts: { entityType?: string; before?: number; limit?: number } = {}): Promise<{ rows: AuditRow[]; more: boolean }> {
  await requireAdmin();
  const limit = opts.limit ?? ACTIVITY_PAGE;
  const where = and(
    opts.entityType ? eq(auditLog.entityType, opts.entityType) : undefined,
    opts.before ? lt(auditLog.id, opts.before) : undefined,
  );
  const rows = await db.select({
    id: auditLog.id, actorName: auditLog.actorName, action: auditLog.action, entityType: auditLog.entityType,
    entityId: auditLog.entityId, summary: auditLog.summary, createdAt: auditLog.createdAt,
  }).from(auditLog).where(where).orderBy(desc(auditLog.id)).limit(limit + 1);
  return { more: rows.length > limit, rows: rows.slice(0, limit).map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) };
}
