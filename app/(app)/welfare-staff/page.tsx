import { notFound } from "next/navigation";
import { getAllEnquiries, getViewer } from "@/lib/data";
import { WelfareQueue } from "./WelfareQueue";

export const metadata = { title: "Welfare Queue" };

export default async function WelfareStaffPage() {
  const viewer = await getViewer();
  if (viewer?.role !== "welfare_staff") notFound();
  return <WelfareQueue enquiries={await getAllEnquiries()} />;
}
