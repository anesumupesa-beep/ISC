import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentItem, displayStatus } from "@/lib/cms/admin-read";
import { defaultPages } from "@/lib/cms/defaults";
import { PAGE_KEYS, SECTIONS, SECTION_LABEL, TYPE_LABEL } from "@/lib/cms/types";
import { getViewer } from "@/lib/data";
import { ListingEditor } from "./ListingEditor";
import { LinkEditor, PageEditor, TaskEditor } from "./SimpleEditors";
import { StatusBadge } from "./StatusBadge";
import { UpdateEditor } from "./UpdateEditor";

/** Shared server screen for /new and /[id]: loads the row (admin only) and renders the editor for its type. */
export async function EditorScreen({ section, id }: { section: string; id?: string }) {
  const type = SECTIONS[section];
  const viewer = await getViewer();
  if (!type || viewer?.role !== "isc_admin") notFound();
  if (type === "page" && (!id || !PAGE_KEYS.includes(id as never))) notFound();
  const item = id ? await getContentItem(type, id) : { row: {}, photos: [] };
  if (!item) notFound();
  const { row, photos } = item;
  const deleted = Boolean(row.deletedAt);
  const status = id ? displayStatus(row) : "draft";
  const title = type === "page" ? `${id![0].toUpperCase()}${id!.slice(1)} page` : id ? String(row.title ?? row.label ?? "") : `New ${TYPE_LABEL[type].toLowerCase()}`;
  return (
    <>
      <Link className="cms-back" href={`/admin/content/${section}`}>← {SECTION_LABEL[section]}</Link>
      <div className="cms-head">
        <h1>{title}</h1>
        {(id || type === "page") && <StatusBadge status={type === "page" ? (Number(row.version) > 0 ? (row.status === "published" ? "live" : "draft") : "default") : status} />}
      </div>
      {id && (
        <div className="cms-links">
          <Link href={`/admin/content/${section}/${id}/history`}>History</Link>
          <Link href={`/admin/content/${section}/${id}/preview`}>Preview as student</Link>
        </div>
      )}
      {deleted ? (
        <div className="cms-banner">This item is deleted. Restore it from the Deleted filter in the list to edit it.</div>
      ) : type === "task" ? (
        <TaskEditor key={`${section}-${id}`} row={row} id={id} />
      ) : type === "listing" ? (
        <ListingEditor key={`${section}-${id}`} row={row} id={id} initialPhotos={photos} />
      ) : type === "update" ? (
        <UpdateEditor key={`${section}-${id}`} row={row} id={id} authorIsMe={row.publishedBy === viewer.userId} />
      ) : type === "link" ? (
        <LinkEditor key={`${section}-${id}`} row={row} id={id} />
      ) : (
        <PageEditor key={`${section}-${id}`} row={row} pageKey={id as (typeof PAGE_KEYS)[number]} fallback={defaultPages[id as (typeof PAGE_KEYS)[number]]} />
      )}
    </>
  );
}
