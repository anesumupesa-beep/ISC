import { redirect } from "next/navigation";
import {
  getArrivalTasks,
  getCompletedTaskIds,
  getListings,
  getMyBuddy,
  getMyBuddyRequest,
  getMyRsvps,
  getUpdates,
  getViewer,
} from "@/lib/data";
import { Overview } from "./Overview";

export const metadata = { title: "Overview" };

export default async function OverviewPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  // Staff land on their own workspace, as the prototype's role views did.
  if (viewer.role === "isc_admin") redirect("/admin");
  if (viewer.role === "welfare_staff") redirect("/welfare-staff");
  const [tasks, completed, request, buddy, listings, updates, rsvps] = await Promise.all([
    getArrivalTasks(),
    getCompletedTaskIds(),
    getMyBuddyRequest(),
    getMyBuddy(),
    getListings(),
    getUpdates(),
    getMyRsvps(),
  ]);
  return (
    <Overview
      name={viewer.name}
      completedCount={completed.length}
      taskCount={tasks.length}
      pendingRequest={request && !request.assigned ? request : null}
      buddy={buddy}
      listingCount={listings.length}
      latest={updates.slice(0, 3)}
      weather={updates.find((u) => u.category === "Weather & Holidays") ?? null}
      rsvps={rsvps}
    />
  );
}
