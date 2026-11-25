import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireAdmin } from "./guard";
import type { Dashboard } from "./types";

export type Range = 7 | 30 | "all";
type Row = Record<string, unknown>;

const one = async (q: SQL): Promise<Row> => ((await db.execute(q)).rows as Row[])[0] ?? {};
const num = (v: unknown) => Number(v ?? 0);
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "n/a");
const TODAY = sql`(now() at time zone 'Indian/Mauritius')::date`;

/** Needs-attention items, pilot KPIs and an 8-week trend. Aggregates only, no personal data. */
export async function getDashboard(range: Range): Promise<Dashboard> {
  await requireAdmin();
  const since = range === "all" ? sql`'-infinity'::timestamptz` : sql`now() - make_interval(days => ${range})`;
  const [att, arrival, buddy, vol, housing, reasons, uptake, weeks] = await Promise.all([
    one(sql`select
      (select count(*) from housing_reports where not resolved) as open_reports,
      (select count(*) from listings l where l.checked_at < ${TODAY} - 30
         and not exists (select 1 from housing_reports r where r.listing_id = l.id and not r.resolved)) as stale,
      (select count(*) from buddy_requests where volunteer_id is null and closed_at is null) as unmatched,
      (select count(*) from volunteers where approved_at is null) as pending_vols,
      (select count(*) from profiles where role = 'isc_admin') as admins`),
    one(sql`with s as (select user_id from profiles where role = 'student' and created_at >= ${since})
      select (select count(*) from s) as students,
             (select count(distinct p.user_id) from arrival_progress p join s on s.user_id = p.user_id) as users,
             (select count(*) from arrival_progress p join s on s.user_id = p.user_id) as ticks,
             (select count(*) from arrival_tasks) as tasks`),
    one(sql`select count(*) as total, count(volunteer_id) as matched,
      percentile_cont(0.5) within group (order by extract(epoch from assigned_at - created_at) / 3600) as median_h
      from buddy_requests where created_at >= ${since}`),
    one(sql`select count(*) filter (where approved_at is not null) as approved,
      count(*) filter (where approved_at is not null and exists (select 1 from buddy_requests b where b.volunteer_id = v.id and b.closed_at is null)) as active,
      coalesce(sum(capacity - (select count(*) from buddy_requests b where b.volunteer_id = v.id and b.closed_at is null))
        filter (where approved_at is not null and not paused), 0) as open_cap
      from volunteers v`),
    one(sql`select count(*) as total, count(*) filter (where resolved) as resolved,
      percentile_cont(0.5) within group (order by extract(epoch from resolved_at - created_at) / 86400) as median_d,
      (select max(${TODAY} - (created_at at time zone 'Indian/Mauritius')::date) from housing_reports where not resolved) as oldest,
      (select count(*) filter (where checked_at >= ${TODAY} - 30) from listings) as fresh,
      (select count(*) from listings) as listings
      from housing_reports where created_at >= ${since}`),
    db.execute(sql`select reason, count(*) as n from housing_reports where created_at >= ${since} group by reason order by n desc`),
    one(sql`select count(*) filter (where created_at >= ${since}) as new_students, count(*) as students,
      count(*) filter (where exists (select 1 from memberships m where m.user_id = profiles.user_id)) as members
      from profiles where role = 'student'`),
    db.execute(sql`select to_char(w, 'DD Mon') as week,
      (select count(*) from profiles where role = 'student' and (created_at at time zone 'Indian/Mauritius')::date >= w and (created_at at time zone 'Indian/Mauritius')::date < w + 7) as students,
      (select count(*) from buddy_requests where (created_at at time zone 'Indian/Mauritius')::date >= w and (created_at at time zone 'Indian/Mauritius')::date < w + 7) as buddy,
      (select count(*) from housing_reports where (created_at at time zone 'Indian/Mauritius')::date >= w and (created_at at time zone 'Indian/Mauritius')::date < w + 7) as housing
      from (select (date_trunc('week', now() at time zone 'Indian/Mauritius')::date - 49 + i * 7) as w from generate_series(0, 7) as i) as weeks`),
  ]);

  const hrs = num(buddy.median_h);
  const reasonList = (reasons.rows as Row[]).map((r) => `${r.reason} ${r.n}`).join(", ");
  return {
    attention: [
      { key: "reports", label: "Open housing reports", count: num(att.open_reports), href: "/admin/housing" },
      { key: "stale", label: "Stale listings (over 30 days)", count: num(att.stale), href: "/admin/housing?tab=stale" },
      { key: "unmatched", label: "Unmatched buddy requests", count: num(att.unmatched), href: "/admin/buddies?status=pending" },
      { key: "vols", label: "Volunteers awaiting approval", count: num(att.pending_vols), href: "/admin/buddies?tab=volunteers" },
      { key: "admins", label: "Add a second ISC admin (fewer than 2)", count: num(att.admins) < 2 ? 1 : 0, href: "/admin/people" },
    ],
    kpis: [
      { key: "arrival", label: "Arrival guide use", value: pct(num(arrival.users), num(arrival.students)), sub: `${num(arrival.users)} of ${num(arrival.students)} students`, source: "SDG 4" },
      { key: "tasks", label: "Task completion", value: pct(num(arrival.ticks), num(arrival.students) * num(arrival.tasks)), sub: `${num(arrival.ticks)} steps ticked`, source: "Pilot measure" },
      { key: "matched", label: "Buddy requests matched", value: pct(num(buddy.matched), num(buddy.total)), sub: `${num(buddy.matched)} of ${num(buddy.total)}${buddy.median_h != null ? `, median ${hrs < 48 ? `${Math.round(hrs)} h` : `${Math.round(hrs / 24)} days`}` : ""}`, source: "SDG 10" },
      { key: "participation", label: "Buddy participation", value: String(num(vol.approved)), sub: `approved volunteers, ${num(vol.active)} active, ${num(vol.open_cap)} places free`, source: "Pilot measure" },
      { key: "housing", label: "Housing reports resolved", value: pct(num(housing.resolved), num(housing.total)), sub: `${num(housing.resolved)} of ${num(housing.total)}${housing.median_d != null ? `, median ${Math.max(0, Math.round(num(housing.median_d) * 10) / 10)} days` : ""}${housing.oldest != null ? `, oldest open ${num(housing.oldest)} days` : ""}`, source: "SDG 16" },
      { key: "feedback", label: "Housing Hub feedback", value: pct(num(housing.fresh), num(housing.listings)), sub: `listings checked in 30 days. Reports: ${reasonList || "none"}`, source: "Pilot measure" },
      { key: "uptake", label: "Student uptake", value: String(num(uptake.students)), sub: `${num(uptake.new_students)} new, ${pct(num(uptake.members), num(uptake.students))} are ISC members`, source: "Pilot measure" },
    ],
    weekly: (weeks.rows as Row[]).map((w) => ({
      week: String(w.week), students: num(w.students), buddyRequests: num(w.buddy), housingReports: num(w.housing),
    })),
  };
}
