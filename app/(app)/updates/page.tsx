import { redirect } from "next/navigation";
import { getMyRsvps, getUpdates, getViewer, isMember } from "@/lib/data";
import { Updates } from "./Updates";

export const metadata = { title: "Club Updates" };

export default async function UpdatesPage() {
  const [viewer, updates, rsvps, member] = await Promise.all([
    getViewer(),
    getUpdates(),
    getMyRsvps(),
    isMember(),
  ]);
  if (!viewer) redirect("/sign-in");
  return (
    <Updates
      updates={updates}
      rsvps={rsvps}
      member={member}
      name={viewer.name}
      email={viewer.email}
    />
  );
}
