import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AcceptInvite } from "./AcceptInvite";
import { getViewer } from "@/lib/data";

export const metadata = { title: "Admin invite | ISC Connect" };

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<main className="auth-page" aria-busy="true" />}>
      <Invite params={params} />
    </Suspense>
  );
}

async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  return (
    <main className="auth-page">
      <div className="surface" style={{ maxWidth: 440, margin: "10vh auto", padding: 24 }}>
        <h1>ISC Admin invite</h1>
        <p>Signed in as <strong>{viewer.email}</strong>. Accepting gives this account committee access.</p>
        <AcceptInvite token={token} />
      </div>
    </main>
  );
}
