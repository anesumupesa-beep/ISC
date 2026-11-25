import Link from "next/link";
import { PageHeading } from "@/components/ui";
import { getPeople, PEOPLE_PAGE, type PeopleFilter } from "@/lib/admin/data-people";
import { guardPage, one, type SearchParams } from "@/lib/admin/page";
import { People } from "./People";

export const metadata = { title: "People | Committee" };

const FILTERS: [PeopleFilter, string][] = [["all", "All"], ["committee", "Committee"], ["members", "Members"], ["volunteers", "Volunteers"]];

export default async function PeoplePage({ searchParams }: { searchParams: SearchParams }) {
  const viewer = await guardPage();
  const sp = await searchParams;
  const q = (one(sp.q) ?? "").slice(0, 100);
  const filter = FILTERS.find(([k]) => k === one(sp.filter))?.[0] ?? "all";
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const { rows, total } = await getPeople({ q, filter, page });
  const href = (over: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(filter !== "all" && { filter }), ...over });
    return `/admin/people${p.size ? `?${p}` : ""}`;
  };
  const chip = (k: string) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(k !== "all" && { filter: k }) });
    return `/admin/people${p.size ? `?${p}` : ""}`;
  };
  const pages = Math.max(1, Math.ceil(total / PEOPLE_PAGE));
  return (
    <>
      <PageHeading eyebrow="ISC COMMITTEE" title="People" description="Find members, hand over committee roles and export membership lists." />
      <form className="adm-search" action="/admin/people" role="search">
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <input name="q" defaultValue={q} placeholder="Search by name or email" aria-label="Search by name or email" maxLength={100} />
        <button type="submit" className="button navy">Search</button>
      </form>
      <div className="adm-chips">
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={chip(k)} className={filter === k ? "active" : undefined}>
            {label}
          </Link>
        ))}
      </div>
      <People rows={rows} selfId={viewer.userId} total={total} />
      {pages > 1 && (
        <div className="adm-actions">
          {page > 1 && <Link className="button outline" href={href({ page: String(page - 1) })}>Previous</Link>}
          <span className="small-text">Page {page} of {pages}</span>
          {page < pages && <Link className="button outline" href={href({ page: String(page + 1) })}>Next</Link>}
        </div>
      )}
      <p className="form-footnote">
        Handover: promote the incoming committee, then demote the outgoing one. Keep at least two admins. Other access levels are set by the platform operator.
      </p>
    </>
  );
}
