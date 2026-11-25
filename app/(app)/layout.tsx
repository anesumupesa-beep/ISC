import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
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
  const buddy = viewer.role === "student" ? await getMyBuddy() : null;
  return (
    <AppShell viewer={viewer} buddyEmail={buddy?.email}>
      {children}
    </AppShell>
  );
}
