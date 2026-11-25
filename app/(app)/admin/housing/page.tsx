import Link from "next/link";
import { getHousingQueue, getResolvedReports, getStaleListings } from "@/lib/admin/data-housing";
import { guardPage, one, type SearchParams } from "@/lib/admin/page";
import { PageHeading, Badge } from "@/components/ui";
import { HousingQueue } from "./HousingQueue";

export const metadata = { title: "Housing | Committee" };

export default async function HousingPage({ searchParams }: { searchParams: SearchParams }) {
  await guardPage();
  const tab = one((await searchParams).tab);
  const [queue, stale, resolved] = await Promise.all([getHousingQueue(), getStaleListings(), getResolvedReports()]);
  const active = tab === "stale" ? "stale" : tab === "resolved" ? "resolved" : "reports";
  const chip = (key: string, label: string, count?: number) => (
    <Link href={key === "reports" ? "/admin/housing" : `/admin/housing?tab=${key}`} className={active === key ? "active" : undefined} aria-current={active === key ? "page" : undefined}>
      {label}{count != null && <span className="tab-count">{count}</span>}
    </Link>
  );
  return (
    <>
      <PageHeading eyebrow="ISC COMMITTEE" title="Housing" description="Review reports, refresh dates only after checking, and keep older listings current." />
      <div className="adm-chips">
        {chip("reports", "Reports", queue.length)}
        {chip("stale", "Stale", stale.length)}
        {chip("resolved", "Resolved")}
      </div>
      {active === "resolved" ? (
        <section>
          <div className="section-heading"><h2>Recently resolved</h2><span>Last {resolved.length}</span></div>
          {!resolved.length ? (
            <div className="surface empty-state"><h2>Nothing resolved yet.</h2><p>Reviewed reports will be listed here.</p></div>
          ) : (
            <div className="surface">
              {resolved.map((r) => (
                <div className="adm-row adm-resolved" key={r.id}>
                  <strong>{r.listingTitle}</strong>
                  <span>{r.reason}</span>
                  <span>
                    <Badge tone={r.outcome === "dismissed" ? "neutral" : "positive"}>
                      {r.outcome === "verified" ? "Verified" : r.outcome === "dismissed" ? "Dismissed" : "Resolved (before audit)"}
                    </Badge>
                  </span>
                  {r.note && <span className="small-text">Note: {r.note}</span>}
                  <span className="small-text">{r.by ? `${r.by}, ` : ""}{r.when ?? ""}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <HousingQueue mode={active} cards={active === "stale" ? stale : queue} />
      )}
    </>
  );
}
