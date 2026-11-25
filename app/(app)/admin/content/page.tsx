import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui";
import { countSamples, getAttention, getContentCounts } from "@/lib/cms/admin-read";
import { getViewer } from "@/lib/data";
import { IndexActions } from "./_components/IndexActions";

export const metadata = { title: "Content" };

export default async function ContentIndex() {
  if ((await getViewer())?.role !== "isc_admin") notFound();
  const [counts, attention, sl, su, st] = await Promise.all([
    getContentCounts(), getAttention(), countSamples("listing"), countSamples("update"), countSamples("task"),
  ]);
  if (!counts) notFound();
  const sum = (c: { live: number; draft: number; pending: number }) =>
    [`${c.live} live`, c.draft && `${c.draft} draft`, c.pending && `${c.pending} pending`].filter(Boolean).join(" · ");
  const cards = [
    ["guide", "Arrival guide", sum(counts.task)],
    ["housing", "Housing", sum(counts.listing)],
    ["updates", "Club updates", sum(counts.update)],
    ["links", "Quick links", sum(counts.link)],
    ["pages", "Site pages", "about · privacy · contact"],
  ] as const;
  return (
    <>
      <PageHeading eyebrow="ISC COMMITTEE · CONTENT" title="Content" description="Keep the guide, housing and notices current." />
      <div className="cms-layout with-aside">
        <section className="surface cms-attn" aria-label="Needs attention">
          <h2 style={{ fontSize: 15, margin: "12px 0 4px" }}>Needs attention{attention.length ? ` (${attention.length})` : ""}</h2>
          {attention.length === 0 && <p style={{ fontSize: 13, padding: "8px 0 12px", color: "var(--muted)" }}>Nothing needs attention right now.</p>}
          {attention.map((a) => (
            <Link key={a.key} href={a.href}><b>{a.count}</b> {a.label}</Link>
          ))}
        </section>
        <div>
          <div className="cms-grid cols-3">
            {cards.map(([section, title, sub]) => (
              <Link key={section} href={`/admin/content/${section}`} className="surface cms-card">
                <strong>{title}</strong>
                <span>{sub}</span>
              </Link>
            ))}
          </div>
          <IndexActions samples={sl + su + st} />
        </div>
      </div>
    </>
  );
}
