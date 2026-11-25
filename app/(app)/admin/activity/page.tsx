import Link from "next/link";
import { Badge, PageHeading } from "@/components/ui";
import { getActivity } from "@/lib/admin/data-activity";
import { formatDateTime } from "@/lib/admin/format";
import { guardPage, one, type SearchParams } from "@/lib/admin/page";

export const metadata = { title: "Activity | Committee" };

const TYPES: [string, string][] = [
  ["", "All"], ["listing", "Housing"], ["buddy_request", "Buddy requests"], ["volunteer", "Volunteers"],
  ["user", "Roles"], ["update", "Updates"], ["export", "Exports"],
];

export default async function ActivityPage({ searchParams }: { searchParams: SearchParams }) {
  await guardPage();
  const sp = await searchParams;
  const type = TYPES.some(([k]) => k === one(sp.type)) ? (one(sp.type) ?? "") : "";
  const before = Number(one(sp.before)) || undefined;
  const { rows, more } = await getActivity({ entityType: type || undefined, before });
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ ...(type && { type }), ...extra });
    return `/admin/activity${p.size ? `?${p}` : ""}`;
  };
  return (
    <>
      <PageHeading eyebrow="ISC COMMITTEE" title="Activity" description="Who changed what, newest first. Kept for committee handover." />
      <div className="adm-chips">
        {TYPES.map(([k, label]) => (
          <Link key={k} href={k ? `/admin/activity?type=${k}` : "/admin/activity"} className={type === k ? "active" : undefined} aria-current={type === k ? "page" : undefined}>{label}</Link>
        ))}
      </div>
      {!rows.length ? (
        <div className="surface empty-state"><h2>No activity yet.</h2><p>Committee actions will be listed here.</p></div>
      ) : (
        <div className="surface">
          {rows.map((r) => (
            <div className="adm-row adm-activity" key={r.id}>
              <span className="small-text">{formatDateTime(r.createdAt)} · {r.actorName}</span>
              <span>{r.summary}</span>
              <span><Badge tone="neutral">{r.entityType.replace("_", " ")}</Badge></span>
            </div>
          ))}
        </div>
      )}
      {more && <p><Link className="button outline" href={qs({ before: String(rows[rows.length - 1].id) })}>Load older</Link></p>}
    </>
  );
}
