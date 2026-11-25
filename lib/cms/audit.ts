// Adapter: CMS mutations call logAudit({ actorId, actorName, action: "content.*", entityType, entityId, summary }).
export { auditEntry, logAudit, type AuditInput } from "@/lib/admin/audit";
