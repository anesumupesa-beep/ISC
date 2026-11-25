"use client";
import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useShell } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/Modal";
import { Action, Badge } from "@/components/ui";
import {
  assignBuddyMatch, closeBuddyRequest, setVolunteerCapacity, setVolunteerStatus, unassignBuddy,
} from "@/lib/admin/actions-buddies";
import type { BuddyReq, VolunteerRow } from "@/lib/admin/types";
import type { ActionResult } from "@/lib/types";

type Dialog = { title: string; body: ReactNode; confirm: string; run?: () => Promise<ActionResult>; reassign?: BuddyReq };

const arrives = (r: BuddyReq) =>
  r.arrivalDays < 0 ? "Arrived" : r.arrivalDays === 0 ? "Arrives today" : `Arrives in ${r.arrivalDays} day${r.arrivalDays === 1 ? "" : "s"}`;

function VolunteerSelect({ request, volunteers, value, onChange }: {
  request: BuddyReq; volunteers: VolunteerRow[]; value: number | ""; onChange: (id: number) => void;
}) {
  const options = volunteers.filter((v) => v.state === "approved" && v.id !== request.volunteerId);
  return (
    <label>
      Available volunteer
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {!options.length && <option value="">No volunteers available</option>}
        {options.map((v) => (
          <option key={v.id} value={v.id} disabled={v.load >= v.capacity}>
            {v.name} · {v.load}/{v.capacity} used · {v.languages}
            {v.languages.toLowerCase().includes(request.language.toLowerCase()) ? ` ✓ speaks ${request.language}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export function BuddyBoard({ tab, requests, volunteers }: { tab: "requests" | "volunteers"; requests: BuddyReq[]; volunteers: VolunteerRow[] }) {
  const { report } = useShell();
  const [pending, startTransition] = useTransition();
  const [choice, setChoice] = useState<Record<number, number>>({});
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const firstFree = (r: BuddyReq) =>
    volunteers.find((v) => v.state === "approved" && v.id !== r.volunteerId && v.load < v.capacity)?.id ?? "";
  const picked = (r: BuddyReq) => choice[r.id] ?? firstFree(r);
  const run = (fn: () => Promise<ActionResult>, ok: string, then?: () => void) =>
    startTransition(async () => {
      if (report(await fn(), ok)) then?.();
    });
  const ask = (d: Dialog) => setDialog(d);

  const assign = (r: BuddyReq) => {
    const id = picked(r);
    if (id) run(() => assignBuddyMatch(r.id, id), `${r.name} has been matched.`, () => setDialog(null));
  };

  return (
    <section>
      {tab === "requests" ? (
        <>
          <div className="section-heading"><h2>Buddy requests</h2><span>{requests.length} shown</span></div>
          {!requests.length && (
            <div className="surface empty-state"><Icon name="check" size={36} /><h2>Nothing here.</h2><p>No requests in this list.</p></div>
          )}
          <div className="queue-list">
            {requests.map((r) => (
              <article className="surface queue-card" key={r.id}>
                <div className="section-heading">
                  <h3>{r.name}</h3>
                  <Badge tone={r.status === "pending" ? "warning" : r.status === "matched" ? "positive" : "neutral"}>
                    {r.status === "pending" ? "Pending Match" : r.status === "matched" ? "Matched" : "Closed"}
                  </Badge>
                </div>
                <p>{r.country} · {r.language} · Arrives {r.arrival}</p>
                {r.status !== "closed" && <Badge tone={r.arrivalDays <= 7 ? "warning" : "neutral"}>{arrives(r)}</Badge>}
                <p className="small-text">{r.programme}</p>
                <div className="help-tags">{r.help.map((h) => <Badge tone="neutral" key={h}>{h}</Badge>)}</div>
                {r.status === "pending" && (
                  <div className="assign-row">
                    <VolunteerSelect request={r} volunteers={volunteers} value={picked(r)} onChange={(id) => setChoice((c) => ({ ...c, [r.id]: id }))} />
                    <Action variant="navy" disabled={pending || !picked(r)} onClick={() => assign(r)}>
                      Assign Match <Icon name="arrow" size={16} />
                    </Action>
                  </div>
                )}
                {r.status === "matched" && (
                  <>
                    <p className="assigned-note"><Icon name="check" size={17} />Matched with {r.volunteerName}</p>
                    <div className="adm-actions">
                      <Action variant="outline" disabled={pending} onClick={() => ask({
                        title: "Reassign request", confirm: "Reassign", reassign: r, body: null,
                      })}>Reassign</Action>
                      <Action variant="outline" disabled={pending} onClick={() => ask({
                        title: "Remove match", confirm: "Unassign", run: () => unassignBuddy(r.id),
                        body: <p>{r.name} goes back to pending and {r.volunteerName} is freed up.</p>,
                      })}>Unassign</Action>
                      <Action variant="outline" disabled={pending} onClick={() => ask({
                        title: "Close request", confirm: "Close request", run: () => closeBuddyRequest(r.id),
                        body: <p>Closing frees {r.volunteerName}&apos;s capacity. The student keeps seeing their match.</p>,
                      })}>Close request</Action>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="section-heading"><h2>Volunteers</h2><span>{volunteers.length} registered</span></div>
          {!volunteers.length && <div className="surface empty-state"><h2>No volunteers yet.</h2></div>}
          <div className="queue-list">
            {volunteers.map((v) => (
              <article className="surface queue-card" key={v.id}>
                <div className="section-heading">
                  <h3>{v.name}</h3>
                  <Badge tone={v.state === "approved" ? "positive" : v.state === "paused" ? "neutral" : "warning"}>
                    {v.state === "approved" ? "Approved" : v.state === "paused" ? "Paused" : "Pending"}
                  </Badge>
                </div>
                <p>{v.course}</p>
                <p className="small-text">{v.languages} · <span className="adm-wrap">{v.email}</span></p>
                <p className="small-text">{v.load} of {v.capacity} places in use</p>
                <div className="adm-actions">
                  {v.state === "pending" && (
                    <Action variant="navy" disabled={pending} onClick={() => run(() => setVolunteerStatus(v.id, "approve"), `${v.name} approved.`)}>Approve</Action>
                  )}
                  {v.state === "approved" && (
                    <Action variant="outline" disabled={pending} onClick={() => run(() => setVolunteerStatus(v.id, "pause"), `${v.name} paused.`)}>Pause</Action>
                  )}
                  {v.state === "paused" && (
                    <Action variant="outline" disabled={pending} onClick={() => run(() => setVolunteerStatus(v.id, "resume"), `${v.name} resumed.`)}>Resume</Action>
                  )}
                  <select
                    aria-label={`Capacity for ${v.name}`}
                    value={v.capacity}
                    disabled={pending}
                    onChange={(e) => run(() => setVolunteerCapacity(v.id, Number(e.target.value)), "Capacity updated.")}
                  >
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} {n === 1 ? "student" : "students"}</option>)}
                  </select>
                </div>
              </article>
            ))}
          </div>
          <p className="form-footnote"><Icon name="info" size={15} />Volunteer emails are shared with the matched student.</p>
        </>
      )}
      {dialog && (
        <Modal title={dialog.title} onClose={() => setDialog(null)}>
          {dialog.body}
          {dialog.reassign && (
            <VolunteerSelect
              request={dialog.reassign} volunteers={volunteers} value={picked(dialog.reassign)}
              onChange={(id) => setChoice((c) => ({ ...c, [dialog.reassign!.id]: id }))}
            />
          )}
          <div className="adm-actions">
            <Action
              variant="navy"
              disabled={pending}
              onClick={() => {
                const r = dialog.reassign;
                const fn = r ? () => assignBuddyMatch(r.id, picked(r) as number) : dialog.run!;
                run(fn, "Done.", () => setDialog(null));
              }}
            >{dialog.confirm}</Action>
            <Action variant="outline" onClick={() => setDialog(null)}>Cancel</Action>
          </div>
        </Modal>
      )}
    </section>
  );
}
