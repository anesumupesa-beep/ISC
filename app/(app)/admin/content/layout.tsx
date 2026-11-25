import { notFound } from "next/navigation";
import { getViewer } from "@/lib/data";
import { ContentNav } from "./_components/ContentNav";
import "./cms.css";

// First guard layer only (layouts do not re-render on client navigation): every page, read and action guards itself too.
export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (viewer?.role !== "isc_admin") notFound();
  return (
    <>
      <ContentNav />
      {children}
    </>
  );
}
