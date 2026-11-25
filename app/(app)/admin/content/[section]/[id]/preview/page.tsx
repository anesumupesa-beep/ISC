import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui";
import { RichText } from "@/components/RichText";
import { getContentItem } from "@/lib/cms/admin-read";
import { defaultPages } from "@/lib/cms/defaults";
import { PAGE_KEYS, SECTIONS } from "@/lib/cms/types";
import { getViewer } from "@/lib/data";
import { formatDate, formatDateTime } from "@/lib/admin/format";
import { arrivalSections } from "@/lib/ui";

export const metadata = { title: "Preview" };

export default async function Preview({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = await params;
  const type = SECTIONS[section];
  if (!type || (await getViewer())?.role !== "isc_admin") notFound();
  const item = await getContentItem(type, id);
  if (!item) notFound();
  const { row, photos } = item;
  const live = row.status === "published" && !row.deletedAt;
  const liveHref = { task: "/arrival", listing: "/housing", update: "/updates", link: "/", page: "/" }[type];
  const page = type === "page" ? (Number(row.version) > 0 ? row : { ...defaultPages[id as (typeof PAGE_KEYS)[number]] }) : null;
  const link = (label?: unknown, url?: unknown) =>
    label && url ? <a className="text-link" href={String(url)} target="_blank" rel="noopener noreferrer">{String(label)}</a> : null;
  return (
    <>
      <div className="cms-preview-bar" role="status">
        <strong>Preview. Students cannot see this.</strong>
        <Link href={`/admin/content/${section}/${id}`}>Back to edit</Link>
        {live && <Link href={liveHref}>Open live page</Link>}
      </div>
      <article className="surface cms-preview-frame">
        {type === "update" && (
          <>
            <Badge tone="neutral">{String(row.category)}</Badge>
            {row.category === "Official Announcements" && <Badge tone={row.approvedAt ? "positive" : "warning"}>{row.approvedAt ? "UTM approved" : "Not yet approved"}</Badge>}
            <h2>{String(row.title)}</h2>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>{row.eventAt ? `${String(row.venue)} · ${formatDateTime(row.eventAt as Date)}` : String(row.meta)}</p>
            <RichText text={String(row.description)} />
            {link(row.linkLabel, row.linkUrl)}
          </>
        )}
        {type === "task" && (
          <>
            <Badge tone="neutral">{arrivalSections[Number(row.section)]}</Badge>
            <h2>{String(row.title)}</h2>
            <RichText text={String(row.detail)} />
            {row.documents ? <p><strong>What to bring:</strong> {String(row.documents)}</p> : null}
            {link(row.link, row.url)}
          </>
        )}
        {type === "listing" && (
          <>
            <Badge tone="neutral">{String(row.type)}</Badge>
            <h2>{String(row.title)}</h2>
            <p>{String(row.area)} · Rs {Number(row.price).toLocaleString("en-US")}/month · {String(row.walk)}</p>
            <p>Includes: {String(row.includes)}</p>
            {row.contact ? <p>Contact: {String(row.contact)}</p> : null}
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Last checked {formatDate(`${row.checkedAt}T12:00:00+04:00`)}</p>
            {photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.url} alt={p.alt} width={358} height={240} loading="lazy" />
            ))}
          </>
        )}
        {type === "link" && <h2>{link(row.label, row.url) ?? String(row.label)}</h2>}
        {page && (
          <>
            <h2>{String(page.heading)}</h2>
            <RichText text={String(page.body)} />
            {link(page.linkLabel, page.linkUrl)}
          </>
        )}
      </article>
    </>
  );
}
