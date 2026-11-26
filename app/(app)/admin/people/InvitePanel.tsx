"use client";
import { useState, useTransition } from "react";
import { useShell } from "@/components/AppShell";
import { Action } from "@/components/ui";
import { createAdminInvite, revokeAdminInvite } from "@/lib/admin/actions-invites";
import type { PendingInvite } from "@/lib/admin/data-invites";

export function InvitePanel({ invites }: { invites: PendingInvite[] }) {
  const { report } = useShell();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");

  const create = () =>
    startTransition(async () => {
      const r = await createAdminInvite(email);
      if (report(r, "Invite created.") && r.token) {
        setLink(`${location.origin}/invite/${r.token}`);
        setEmail("");
      }
    });

  return (
    <section>
      <div className="section-heading"><h2>Invite an admin</h2><span>Owner only</span></div>
      <div className="surface">
        <p className="small-text">
          Enter their email, then send them the link. They must sign in (or sign up) with that same email to accept. Links last 7 days and work once.
        </p>
        <form className="adm-search" onSubmit={(e) => { e.preventDefault(); create(); }}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@umail.utm.ac.mu" aria-label="Email to invite" maxLength={200} required />
          <button type="submit" className="button navy" disabled={pending}>Create invite</button>
        </form>
        {link && (
          <p className="small-text">
            Invite link (shown once): <code style={{ overflowWrap: "anywhere" }}>{link}</code>{" "}
            <Action variant="outline" onClick={() => navigator.clipboard.writeText(link)}>Copy link</Action>
          </p>
        )}
        {invites.map((i) => (
          <div className="adm-row" key={i.id}>
            <strong>{i.email}</strong>
            <span className="small-text">Expires {i.expires}</span>
            <Action variant="outline" disabled={pending} onClick={() => startTransition(async () => { report(await revokeAdminInvite(i.id), "Invite revoked."); })}>Revoke</Action>
          </div>
        ))}
      </div>
    </section>
  );
}
