"use client";
import { useState, useTransition } from "react";
import { useShell } from "@/components/AppShell";
import { Modal } from "@/components/Modal";
import { Action, Badge } from "@/components/ui";
import { setUserRole } from "@/lib/admin/actions-people";
import type { PersonRow } from "@/lib/admin/types";
import { roleLabel, type Role } from "@/lib/types";

const exportKinds = [["members", "Members CSV"], ["volunteers", "Volunteers CSV"]] as const;
const GRANTABLE = ["student", "isc_admin"];

export function People({ rows, selfId, total }: { rows: PersonRow[]; selfId: string; total: number }) {
  const { report } = useShell();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<PersonRow | null>(null);
  const [exporting, setExporting] = useState<(typeof exportKinds)[number] | null>(null);

  const next = target?.role === "isc_admin" ? "student" : "isc_admin";
  const change = () =>
    startTransition(async () => {
      if (target && report(await setUserRole(target.userId, next), "Role updated.")) setTarget(null);
    });

  return (
    <section>
      <div className="adm-actions">
        {exportKinds.map((e) => (
          <Action key={e[0]} variant="outline" onClick={() => setExporting(e)}>Export {e[1]}</Action>
        ))}
      </div>
      <div className="section-heading"><h2>People</h2><span>{total} found</span></div>
      {!rows.length ? (
        <div className="surface empty-state"><h2>No one matches.</h2><p>Try another name or email.</p></div>
      ) : (
        <div className="surface">
          {rows.map((p) => (
            <div className="adm-row adm-person" key={p.userId}>
              <strong>{p.name}</strong>
              <span className="small-text">{p.email}</span>
              <span><Badge tone={p.role === "isc_admin" ? "positive" : "neutral"}>{roleLabel[p.role as Role] ?? p.role}</Badge></span>
              <span className="small-text">Joined {p.joined}</span>
              <span className="small-text">{[p.member && "Member", p.volunteer && "Volunteer"].filter(Boolean).join(" · ")}</span>
              <span>
                {p.userId === selfId ? (
                  <span className="small-text">You</span>
                ) : GRANTABLE.includes(p.role) ? (
                  <Action variant="outline" onClick={() => setTarget(p)}>Change role</Action>
                ) : (
                  <span className="small-text">Managed by operator</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
      {target && (
        <Modal title="Change role" onClose={() => setTarget(null)}>
          <p>
            Make <strong>{target.name}</strong> {next === "isc_admin" ? "an ISC Admin" : "a Student"}?
          </p>
          <p className="small-text">
            {next === "isc_admin"
              ? "ISC Admin can see all member names and emails, housing reports and buddy matching, and can publish updates."
              : "They will lose committee access straight away."}
          </p>
          <div className="adm-actions">
            <Action variant="navy" disabled={pending} onClick={change}>Confirm change</Action>
            <Action variant="outline" onClick={() => setTarget(null)}>Cancel</Action>
          </div>
        </Modal>
      )}
      {exporting && (
        <Modal title={`Export ${exporting[1]}`} onClose={() => setExporting(null)}>
          <p>This file contains personal data. Use it only for ISC membership business, keep it in the club-owned drive, delete it when finished.</p>
          <div className="adm-actions">
            <a className="button navy" href={`/api/admin/export/${exporting[0]}`} download onClick={() => setExporting(null)}>Download CSV</a>
            <Action variant="outline" onClick={() => setExporting(null)}>Cancel</Action>
          </div>
        </Modal>
      )}
    </section>
  );
}
