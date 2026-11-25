import Link from "next/link";
import { notFound } from "next/navigation";
import { arrivalSections } from "@/lib/ui";
import { listContent, PAGE_SIZE } from "@/lib/cms/admin-read";
import { SECTION_LABEL, SECTIONS, STATUS_CHIPS, type StatusChip } from "@/lib/cms/types";
import { getViewer } from "@/lib/data";
import { formatDate } from "@/lib/admin/format";
import { RowActions } from "../_components/RowActions";
import { StatusBadge } from "../_components/StatusBadge";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return { title: SECTION_LABEL[section] ?? "Content" };
}

export default async function SectionList({ params, searchParams }: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const [{ section }, sp] = await Promise.all([params, searchParams]);
  const type = SECTIONS[section];
  if (!type || (await getViewer())?.role !== "isc_admin") notFound();
  const chip = (STATUS_CHIPS as readonly string[]).includes(sp.status ?? "") ? (sp.status as StatusChip) : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").slice(0, 100);
  const { rows, total } = await listContent(type, { q, chip, page });
  const isPages = type === "page";
  const size = type === "task" ? 200 : PAGE_SIZE;
  const href = (o: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: q || undefined, status: chip === "all" ? undefined : chip, ...o })) if (v !== undefined && v !== "") p.set(k, String(v));
    return `/admin/content/${section}${p.size ? `?${p}` : ""}`;
  };
  const stages = type === "task" ? arrivalSections.map((name, i) => ({ name, rows: rows.filter((r) => r.section === i) })) : null;

  const card = (r: (typeof rows)[number]) => (
    <article key={r.id} className="surface cms-row">
      <div>
        <div className="cms-row-top">
          <StatusBadge status={r.status} />
          {r.official && <span className="badge badge-neutral">Official{r.approved ? " · UTM approved" : ""}</span>}
          {r.stale && <span className="badge badge-stale">Check overdue</span>}
          {r.sample && <span className="badge badge-neutral">Sample</span>}
        </div>
        <h3>{r.title}</h3>
        <p>{r.sub}</p>
        {r.version > 0 && <p>Edited {formatDate(r.updatedAt)}{r.updatedByName && ` by ${r.updatedByName}`}</p>}
      </div>
      {isPages ? (
        <div className="cms-row-actions">
          <Link className="cms-btn navy" href={`/admin/content/pages/${r.id}`}>Edit</Link>
          {r.version > 0 && <Link className="cms-btn" href={`/admin/content/pages/${r.id}/history`}>History</Link>}
        </div>
      ) : (
        <RowActions type={type} section={section} row={r} />
      )}
    </article>
  );

  return (
    <>
      <div className="cms-head">
        <h1>{SECTION_LABEL[section]}</h1>
        {!isPages && <Link className="cms-btn primary" href={`/admin/content/${section}/new`}>+ New</Link>}
      </div>
      {!isPages && (
        <>
          <form className="cms-search" role="search" action={`/admin/content/${section}`}>
            <input className="cms-input" type="search" name="q" defaultValue={q} placeholder="Search by title" aria-label="Search by title" />
            {chip !== "all" && <input type="hidden" name="status" value={chip} />}
            <button className="cms-btn navy" type="submit">Search</button>
          </form>
          <nav className="cms-chips" aria-label="Filter by status">
            {STATUS_CHIPS.map((c) => (
              <Link key={c} href={href({ status: c === "all" ? undefined : c, page: undefined })} className={chip === c ? "active" : undefined} aria-current={chip === c ? "true" : undefined}>
                {c[0].toUpperCase() + c.slice(1)}
              </Link>
            ))}
          </nav>
        </>
      )}
      <div className="cms-list">
        {rows.length === 0 && <div className="surface empty-state"><p>Nothing here yet.</p></div>}
        {stages
          ? stages.map((s) => s.rows.length > 0 && (
              <section key={s.name}>
                <h2 className="cms-stage">{s.name}</h2>
                <div className="cms-list">{s.rows.map(card)}</div>
              </section>
            ))
          : rows.map(card)}
      </div>
      {total > size && (
        <nav className="cms-pager" aria-label="Pages">
          {page > 1 ? <Link className="cms-btn" href={href({ page: page - 1 })}>Previous</Link> : <span />}
          <span>Page {page} of {Math.ceil(total / size)}</span>
          {page * size < total ? <Link className="cms-btn" href={href({ page: page + 1 })}>Next</Link> : <span />}
        </nav>
      )}
    </>
  );
}
