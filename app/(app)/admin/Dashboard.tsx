import Link from "next/link";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/admin/format";
import type { AuditRow, Dashboard as DashboardData } from "@/lib/admin/types";

const RANGES = [["7", "7 days"], ["30", "30 days"], ["all", "All time"]] as const;

export function Dashboard({ data, range, recent }: { data: DashboardData; range: string; recent: AuditRow[] }) {
  const open = data.attention.filter((a) => a.count > 0);
  const max = (k: "students" | "buddyRequests" | "housingReports") => Math.max(1, ...data.weekly.map((w) => w[k]));
  return (
    <>
      <div className="adm-chips" aria-label="Time range">
        {RANGES.map(([k, label]) => (
          <Link key={k} href={k === "30" ? "/admin" : `/admin?range=${k}`} className={range === k ? "active" : undefined} aria-current={range === k ? "true" : undefined}>{label}</Link>
        ))}
      </div>
      <div className="adm-dash">
        <section className="surface adm-card" aria-labelledby="adm-attn-h">
          <h2 id="adm-attn-h">Needs attention</h2>
          {!open.length ? (
            <p className="adm-attn"><Icon name="check" size={18} />All clear.</p>
          ) : (
            open.map((a) => (
              <Link className="adm-attn" href={a.href} key={a.key}>
                <Badge tone="warning">{a.key === "admins" ? "!" : a.count}</Badge>
                <span>{a.label}</span>
                <Icon name="arrow" size={16} />
              </Link>
            ))
          )}
        </section>
        <section aria-labelledby="adm-kpi-h">
          <h2 id="adm-kpi-h" className="adm-h">Pilot KPIs</h2>
          <div className="adm-grid">
            {data.kpis.map((k) => (
              <div className="surface adm-tile" key={k.key}>
                <strong>{k.value}</strong>
                <b>{k.label}</b>
                <span>{k.sub}</span>
                <span className="adm-src">{k.source}</span>
              </div>
            ))}
          </div>
          <p className="small-text">
            Figures are aggregates for the selected range. Support-service measures are not shown to the committee by design.
          </p>
        </section>
      </div>
      <section className="surface adm-card">
        <h2>Weekly trend</h2>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th scope="col">Week of</th><th scope="col">New students</th><th scope="col">Buddy requests</th><th scope="col">Housing reports</th></tr>
            </thead>
            <tbody>
              {data.weekly.map((w) => (
                <tr key={w.week}>
                  <th scope="row">{w.week}</th>
                  {(["students", "buddyRequests", "housingReports"] as const).map((k) => (
                    <td key={k}>
                      {w[k]}
                      <span className="adm-bar"><i style={{ width: `${(w[k] / max(k)) * 100}%` }} /></span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p><a className="text-link" href="/api/admin/export/kpis" download>Download KPI summary (CSV)</a></p>
      </section>
      <section className="surface adm-card">
        <h2>Recent activity</h2>
        {!recent.length && <p className="small-text">Nothing yet.</p>}
        {recent.map((r) => (
          <div className="adm-row adm-activity" key={r.id}>
            <span className="small-text">{formatDateTime(r.createdAt)} · {r.actorName}</span>
            <span>{r.summary}</span>
          </div>
        ))}
        <Link className="text-link" href="/admin/activity">See all activity<Icon name="arrow" size={17} /></Link>
      </section>
    </>
  );
}
