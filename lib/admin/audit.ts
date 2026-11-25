import "server-only";
import { auditLog, db } from "@/lib/db";

export type AuditInput = {
  actorId: string;
  actorName: string;
  actorRole?: string; // defaults to "isc_admin"
  action: string; // "<domain>.<verb>", e.g. "housing.verify"
  entityType: string; // must NOT start with "welfare"
  entityId?: string | number;
  summary: string; // 1..200 chars, no free text from students
  detail?: Record<string, string | number | boolean | null>;
};

/**
 * Un-awaited insert for `db.batch([mutation, auditEntry({...})])` so the audit row is atomic with the change.
 * Throws on a violated rule (welfare entity, empty or over-long summary).
 */
export function auditEntry(e: AuditInput) {
  const summary = e.summary.trim();
  if (summary.length < 1 || summary.length > 200) throw new Error("Audit summary must be 1 to 200 characters.");
  if (e.entityType.toLowerCase().startsWith("welfare")) throw new Error("Welfare activity is never audited here.");
  return db.insert(auditLog).values({
    actorId: e.actorId,
    actorName: e.actorName,
    actorRole: e.actorRole ?? "isc_admin",
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId == null ? null : String(e.entityId),
    summary,
    detail: e.detail ?? null,
  });
}

/** Standalone write: exports, and the CMS (its neon-http code has no batch). */
export async function logAudit(e: AuditInput): Promise<void> {
  await auditEntry(e);
}
