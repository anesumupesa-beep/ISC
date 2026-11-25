import "server-only";
import { asc, sql } from "drizzle-orm";
import { db, memberships, volunteers } from "@/lib/db";
import { requireAdmin } from "./guard";
import { formatDate, todayMu } from "./format";
import { getDashboard } from "./data-dashboard";
import type { PersonRow } from "./types";

export const PEOPLE_PAGE = 25;
export type PeopleFilter = "all" | "committee" | "members" | "volunteers";
export type ExportKind = "members" | "volunteers" | "kpis";

/** profiles joined to Neon Auth's user table (email, created date). */
export async function getPeople(opts: { q?: string; filter?: PeopleFilter; page?: number }): Promise<{ rows: PersonRow[]; total: number }> {
  await requireAdmin();
  const q = (opts.q ?? "").trim().slice(0, 100);
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const f = opts.filter ?? "all";
  const filterSql = f === "committee" ? sql`and p.role = 'isc_admin'`
    : f === "members" ? sql`and m.user_id is not null`
    : f === "volunteers" ? sql`and v.id is not null` : sql``;
  const qSql = q ? sql`and (p.name ilike ${like} or u.email ilike ${like})` : sql``;
  const res = await db.execute(sql`
    select p.user_id as "userId", p.name, coalesce(u.email, '') as email, p.role::text as role,
           coalesce(u."createdAt", p.created_at) as joined, (m.user_id is not null) as member,
           (v.id is not null) as volunteer, count(*) over() as total
    from profiles p
    left join neon_auth."user" u on u.id::text = p.user_id
    left join memberships m on m.user_id = p.user_id
    left join volunteers v on v.user_id = p.user_id
    where true ${qSql} ${filterSql}
    order by p.created_at desc, p.user_id
    limit ${PEOPLE_PAGE} offset ${(page - 1) * PEOPLE_PAGE}`);
  const rows = res.rows as Array<Record<string, unknown>>;
  return {
    total: Number(rows[0]?.total ?? 0),
    rows: rows.map((r) => ({
      userId: String(r.userId), name: String(r.name), email: String(r.email), role: String(r.role),
      joined: formatDate(r.joined as string | Date), member: Boolean(r.member), volunteer: Boolean(r.volunteer),
    })),
  };
}

/** Header + rows as arrays of strings for the CSV route. Minimal columns only. */
export async function getExportRows(kind: ExportKind): Promise<{ header: string[]; rows: string[][] }> {
  await requireAdmin();
  if (kind === "members") {
    const r = await db.select().from(memberships).orderBy(asc(memberships.createdAt));
    return {
      header: ["name", "email", "programme", "registered"],
      rows: r.map((m) => [m.name, m.email, m.programme ?? "", formatDate(m.createdAt)]),
    };
  }
  if (kind === "volunteers") {
    const r = await db.select().from(volunteers).orderBy(asc(volunteers.id));
    return {
      header: ["name", "email", "course", "languages", "capacity", "status"],
      rows: r.map((v) => [v.name, v.email, v.course, v.languages, String(v.capacity), !v.approvedAt ? "pending" : v.paused ? "paused" : "approved"]),
    };
  }
  const d = await getDashboard(30);
  return {
    header: ["metric", "period", "value"],
    rows: [
      ...d.kpis.map((k) => [k.label, "last 30 days", `${k.value} (${k.sub})`]),
      ...d.weekly.map((w) => [`Week of ${w.week}`, "weekly", `students ${w.students}; buddy requests ${w.buddyRequests}; housing reports ${w.housingReports}`]),
      ["Exported on", "", todayMu()],
    ],
  };
}
