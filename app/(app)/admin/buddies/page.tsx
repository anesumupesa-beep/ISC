import Link from "next/link";
import { PageHeading } from "@/components/ui";
import { getBuddyBoard, getVolunteerBoard } from "@/lib/admin/data-buddies";
import { guardPage, one, type SearchParams } from "@/lib/admin/page";
import { BuddyBoard } from "./BuddyBoard";

export const metadata = { title: "Buddies | Committee" };

const STATUSES = ["pending", "matched", "closed"] as const;

export default async function BuddiesPage({ searchParams }: { searchParams: SearchParams }) {
  await guardPage();
  const sp = await searchParams;
  const tab = one(sp.tab) === "volunteers" ? "volunteers" : "requests";
  const status = STATUSES.find((s) => s === one(sp.status)) ?? "pending";
  const [requests, volunteers] = await Promise.all([getBuddyBoard(), getVolunteerBoard()]);
  const count = (s: string) => requests.filter((r) => r.status === s).length;
  const toApprove = volunteers.filter((v) => v.state === "pending").length;
  return (
    <>
      <PageHeading eyebrow="ISC COMMITTEE" title="Buddies" description="Match arriving students with approved volunteers who have room." />
      <div className="adm-chips">
        <Link href="/admin/buddies" className={tab === "requests" ? "active" : undefined}>Requests<span className="tab-count">{count("pending")}</span></Link>
        <Link href="/admin/buddies?tab=volunteers" className={tab === "volunteers" ? "active" : undefined}>Volunteers<span className="tab-count">{toApprove}</span></Link>
      </div>
      {tab === "requests" && (
        <div className="adm-chips">
          {STATUSES.map((s) => (
            <Link key={s} href={`/admin/buddies?status=${s}`} className={status === s ? "active" : undefined}>
              {s[0].toUpperCase() + s.slice(1)} {count(s)}
            </Link>
          ))}
        </div>
      )}
      <BuddyBoard tab={tab} requests={requests.filter((r) => r.status === status)} volunteers={volunteers} />
    </>
  );
}
