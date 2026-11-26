import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { getSitePages } from "@/lib/cms/read";
import { getMyBuddy, getViewer } from "@/lib/data";

// The session is request-time data, so the whole signed-in app streams behind this boundary.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="app-shell" aria-busy="true" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  const [buddy, pages] = await Promise.all([
    viewer.role === "student" ? getMyBuddy() : null,
    viewer.role === "isc_admin" ? null : getSitePages(),
  ]);
  return (
    <AppShell viewer={viewer} buddyEmail={buddy?.email} pages={pages ?? undefined}>
      {children}
    </AppShell>
  );
}
