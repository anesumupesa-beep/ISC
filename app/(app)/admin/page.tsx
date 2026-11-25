import { Icon } from "@/components/icons";
import { PageHeading } from "@/components/ui";
import { getActivity } from "@/lib/admin/data-activity";
import { getDashboard, type Range } from "@/lib/admin/data-dashboard";
import { guardPage, one, type SearchParams } from "@/lib/admin/page";
import { Dashboard } from "./Dashboard";

export const metadata = { title: "Committee Workspace" };

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  await guardPage();
  const r = one((await searchParams).range);
  const range: Range = r === "7" ? 7 : r === "all" ? "all" : 30;
  const [data, recent] = await Promise.all([getDashboard(range), getActivity({ limit: 5 })]);
  return (
    <>
      <PageHeading
        eyebrow="ISC COMMITTEE"
        title="Committee dashboard."
        description="See what needs attention, and how the pilot is going."
      />
      <div className="info-banner">
        <Icon name="shield" size={20} />
        <p><strong>Committee access.</strong> Housing, buddy matching, people and club updates only.</p>
      </div>
      <Dashboard data={data} range={String(range)} recent={recent.rows} />
    </>
  );
}
