import { notFound } from "next/navigation";
import { getViewer } from "@/lib/data";
import { AdminSubNav } from "./AdminSubNav";
import "./admin.css";

// First guard layer only: layouts are not re-rendered on every client navigation (partial rendering),
// so every page, data function and action under /admin must guard itself too.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (viewer?.role !== "isc_admin") notFound();
  return (
    <>
      <AdminSubNav />
      {children}
    </>
  );
}
