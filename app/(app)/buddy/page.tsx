import { getMyBuddy, getMyBuddyRequest, getMyVolunteerProfile } from "@/lib/data";
import { Buddy } from "./Buddy";

export const metadata = { title: "Buddy Support" };

export default async function BuddyPage() {
  const [request, buddy, volunteer] = await Promise.all([
    getMyBuddyRequest(),
    getMyBuddy(),
    getMyVolunteerProfile(),
  ]);
  return (
    <Buddy
      pendingRequest={request && !request.assigned ? request : null}
      buddy={buddy}
      volunteer={volunteer}
    />
  );
}
