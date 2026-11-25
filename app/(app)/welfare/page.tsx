import { getMyEnquiries } from "@/lib/data";
import { Welfare } from "./Welfare";

export const metadata = { title: "Welfare Enquiry" };

export default async function WelfarePage() {
  return <Welfare enquiries={await getMyEnquiries()} />;
}
