import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentItem, getRevisions } from "@/lib/cms/admin-read";
import { SECTIONS, SECTION_LABEL } from "@/lib/cms/types";
import { getViewer } from "@/lib/data";
import { formatDateTime } from "@/lib/admin/format";
import { RestoreButton } from "../../../_components/RestoreButton";

export const metadata = { title: "History" };

const ACTION: Record<string, string> = {
  create: "Created", update: "Edited", publish: "Published", unpublish: "Unpublished", archive: "Archived", delete: "Deleted",
  restore: "Restored", approve: "UTM approval recorded", submit: "Submitted for approval", verify: "Verified",
};

export default async function History({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = await params;
  const type = SECTIONS[section];
  if (!type || (await getViewer())?.role !== "isc_admin") notFound();
  const item = await getContentItem(type, id);
  const revisions = await getRevisions(type, id);
  if (!item && revisions.length === 0) notFound();
  const name = String(item?.row.title ?? item?.row.label ?? id);
  return (
    <>
      <Link className="cms-back" href={`/admin/content/${section}/${id}`}>← Back to {SECTION_LABEL[section].toLowerCase()}</Link>
      <div className="cms-head"><h1>History: {name}</h1></div>
      <div className="cms-list">
        {revisions.length === 0 && <div className="surface empty-state"><p>No history yet.</p></div>}
        {revisions.map((r, i) => (
          <article key={r.id} className="surface cms-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div>
              <h3>v{r.version} · {ACTION[r.action] ?? r.action}{i === 0 && " (current)"}</h3>
              <p>{formatDateTime(r.createdAt)} · {r.changedByName}{r.changedFields.length > 0 && r.action !== "create" && ` · ${r.changedFields.join(", ")}`}</p>
            </div>
            {r.diffs.length > 0 && (
              <details>
                <summary style={{ minHeight: 44, display: "flex", alignItems: "center", cursor: "pointer" }}>See what changed</summary>
                <div className="cms-diff">
                  {r.diffs.map((d) => (
                    <div key={d.field}><strong>{d.field}</strong><br /><del>{d.before}</del><br /><ins>{d.after}</ins></div>
                  ))}
                </div>
              </details>
            )}
            {i > 0 && item && r.action !== "delete" && <RestoreButton revisionId={r.id} back={`/admin/content/${section}/${id}`} />}
          </article>
        ))}
      </div>
    </>
  );
}
