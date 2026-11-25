import type { IconName } from "@/components/icons";

export type AdminNavItem = { page: string; href: string; short: string; icon: IconName };

/** One audit_log row as shown in the Activity feed (no raw detail JSON for users). */
export type AuditRow = {
  id: number;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: string; // ISO
};
