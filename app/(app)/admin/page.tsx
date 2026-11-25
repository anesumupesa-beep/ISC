import { notFound } from "next/navigation";
import { getBuddyRequests, getListings, getViewer, getVolunteers } from "@/lib/data";
import { Admin } from "./Admin";

export const metadata = { title: "Committee Workspace" };

export default async function AdminPage() {
  const viewer = await getViewer();
  if (viewer?.role !== "isc_admin") notFound();
  const [listings, requests, volunteers] = await Promise.all([
    getListings(),
    getBuddyRequests(),
    getVolunteers(),
  ]);
  return (
    <Admin
      reported={listings.filter((listing) => listing.report)}
      requests={requests}
      volunteers={volunteers}
    />
  );
}
