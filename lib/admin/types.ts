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

export type HousingReportRow = { id: number; reason: string; note: string; ago: string; photoUrl?: string };
export type HousingCard = {
  id: number; title: string; area: string; price: number; checked: string;
  reports: HousingReportRow[];
};
export type StaleListing = { id: number; title: string; area: string; price: number; checked: string; days: number };
export type ResolvedReport = {
  id: number; listingTitle: string; reason: string; outcome: string | null; note: string | null;
  by: string | null; when: string | null;
};

export type BuddyReq = {
  id: number; name: string; country: string; language: string; programme: string; help: string[];
  arrival: string; arrivalDays: number; volunteerId: number | null; volunteerName: string | null;
  status: "pending" | "matched" | "closed";
};
export type VolunteerRow = {
  id: number; name: string; course: string; languages: string; email: string;
  capacity: number; load: number; state: "pending" | "approved" | "paused";
};

export type PersonRow = {
  userId: string; name: string; email: string; role: string; isOwner: boolean; joined: string; member: boolean; volunteer: boolean;
};

export type Kpi = { key: string; label: string; value: string; sub: string; source: string };
export type Dashboard = {
  attention: { key: string; label: string; count: number; href: string }[];
  kpis: Kpi[];
  weekly: { week: string; students: number; buddyRequests: number; housingReports: number }[];
};
