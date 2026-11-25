"use client";
import { useState } from "react";
import { UPDATE_CATEGORIES } from "@/lib/cms/types";
import { toMuInput } from "@/lib/cms/validate";
import { approveUpdate, saveUpdate } from "../actions";
import { Conflict, DeleteButton, Field, PublishBar, RICH_HINT, useEditor } from "./kit";

type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));
const OFFICIAL = "Official Announcements";

export function UpdateEditor({ row, id, authorIsMe }: { row: Row; id?: string; authorIsMe?: boolean }) {
  const ed = useEditor({ section: "updates", id, version: Number(row.version ?? 0) });
  const [f, setF] = useState({
    category: str(row.category) || "Events", title: str(row.title), body: str(row.description),
    eventAt: toMuInput(row.eventAt as string), venue: str(row.venue), linkLabel: str(row.linkLabel), linkUrl: str(row.linkUrl),
    pinned: row.pinned === true, publishAt: toMuInput(row.publishAt as string), expiresAt: toMuInput(row.expiresAt as string),
  });
  const [ref, setRef] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const status = str(row.status);
  const official = f.category === OFFICIAL;
  const isEvent = f.category === "Events";
  const approved = Boolean(row.approvedAt);
  return (
    <form className="surface cms-form" onSubmit={(e) => e.preventDefault()}>
      <Conflict show={ed.conflict} unsaved={f.body} />
      {official && status === "published" && (
        <p className="cms-banner" role="note">
          Editing the text of a published Official Announcement sends it back for UTM approval and hides it until it is re-approved.
          {approved && " It currently shows the UTM approved badge."}
        </p>
      )}
      {official && status === "pending_approval" && id && (
        <div className="cms-banner" role="group" aria-label="UTM approval">
          <strong>Waiting for UTM approval.</strong> Not visible to students.{" "}
          {authorIsMe
            ? "You submitted this: another committee member should record the approval (if you are the only admin you may approve it yourself, with a warning)."
            : "Record the approval once UTM has signed this off outside the app."}
          <Field label="UTM approval reference (who, when, reference)" value={ref} max={200}>
            <input className="cms-input" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={200} placeholder="e.g. Student Affairs email, 14 Nov, ref SA/22" />
          </Field>
          <div className="cms-tools">
            <button type="button" className="cms-btn primary" disabled={ed.disabled} onClick={() => ed.run((v) => approveUpdate(Number(id), v, ref))}>Record UTM approval</button>
          </div>
        </div>
      )}
      <Field label="Category">
        <select className="cms-input" value={f.category} onChange={set("category")}>
          {UPDATE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Title" value={f.title} max={150}><input className="cms-input" value={f.title} onChange={set("title")} maxLength={150} autoComplete="off" /></Field>
      <Field label="Details" value={f.body} max={2000} hint={RICH_HINT}><textarea className="cms-input" value={f.body} onChange={set("body")} maxLength={2000} rows={7} /></Field>
      {isEvent && (
        <div className="cms-two">
          <Field label="Date and time (Mauritius)"><input className="cms-input" type="datetime-local" value={f.eventAt} onChange={set("eventAt")} /></Field>
          <Field label="Venue" value={f.venue} max={120}><input className="cms-input" value={f.venue} onChange={set("venue")} maxLength={120} /></Field>
        </div>
      )}
      <div className="cms-two">
        <Field label="Link label (optional)" value={f.linkLabel} max={80}><input className="cms-input" value={f.linkLabel} onChange={set("linkLabel")} maxLength={80} /></Field>
        <Field label="Link address (https only)"><input className="cms-input" type="url" inputMode="url" autoCapitalize="off" placeholder="https://" value={f.linkUrl} onChange={set("linkUrl")} maxLength={500} /></Field>
      </div>
      <label className="cms-field cms-check">
        <input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} /> Pin to the top
      </label>
      <details className="cms-more" open={Boolean(f.publishAt || f.expiresAt)}>
        <summary>More options: schedule</summary>
        <Field label="Publish at (Mauritius time)" hint="Leave empty to show as soon as it is published."><input className="cms-input" type="datetime-local" value={f.publishAt} onChange={set("publishAt")} /></Field>
        <Field label="Hide on (Mauritius time)" hint="Leave empty to keep it up until you unpublish it."><input className="cms-input" type="datetime-local" value={f.expiresAt} onChange={set("expiresAt")} /></Field>
      </details>
      <PublishBar ed={ed} type="update" id={id} status={status} official={official}
        save={(intent) => ed.run((version) => saveUpdate({ ...f, id: id ? Number(id) : undefined, version: id ? version : undefined, intent }))} />
      {id && <div className="cms-tools"><DeleteButton type="update" id={Number(id)} version={ed.version} section="updates" /></div>}
    </form>
  );
}
