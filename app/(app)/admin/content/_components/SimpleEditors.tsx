"use client";
import { useState } from "react";
import { arrivalSections } from "@/lib/ui";
import { PAGE_KEYS } from "@/lib/cms/types";
import { saveLink, saveSitePage, saveTask } from "../actions";
import { Conflict, DeleteButton, Field, PublishBar, RICH_HINT, useEditor } from "./kit";

type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));

export function TaskEditor({ row, id }: { row: Row; id?: string }) {
  const ed = useEditor({ section: "guide", id, version: Number(row.version ?? 0) });
  const [f, setF] = useState({
    stage: Number(row.section ?? 0), title: str(row.title), detail: str(row.detail),
    documents: str(row.documents), linkLabel: str(row.link), url: str(row.url),
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: k === "stage" ? Number(e.target.value) : e.target.value });
  return (
    <form className="surface cms-form" onSubmit={(e) => e.preventDefault()}>
      <Conflict show={ed.conflict} unsaved={f.detail} />
      <Field label="Stage">
        <select className="cms-input" value={f.stage} onChange={set("stage")}>
          {arrivalSections.map((s, i) => <option key={s} value={i}>{s}</option>)}
        </select>
      </Field>
      <Field label="Title" value={f.title} max={150}><input className="cms-input" value={f.title} onChange={set("title")} maxLength={150} autoComplete="off" /></Field>
      <Field label="Details" value={f.detail} max={2000} hint={RICH_HINT}><textarea className="cms-input" value={f.detail} onChange={set("detail")} maxLength={2000} rows={7} /></Field>
      <Field label="What to bring (optional)" value={f.documents} max={300}><input className="cms-input" value={f.documents} onChange={set("documents")} maxLength={300} /></Field>
      <div className="cms-two">
        <Field label="Link label (optional)" value={f.linkLabel} max={80}><input className="cms-input" value={f.linkLabel} onChange={set("linkLabel")} maxLength={80} /></Field>
        <Field label="Link address (https only)"><input className="cms-input" type="url" inputMode="url" autoCapitalize="off" placeholder="https://" value={f.url} onChange={set("url")} maxLength={500} /></Field>
      </div>
      <PublishBar ed={ed} type="task" id={id} status={str(row.status)} save={(intent) => ed.run((version) => saveTask({ ...f, id: id ? Number(id) : undefined, version: id ? version : undefined, intent }))} />
      {id && <div className="cms-tools"><DeleteButton type="task" id={Number(id)} version={ed.version} section="guide" /></div>}
    </form>
  );
}

export function LinkEditor({ row, id }: { row: Row; id?: string }) {
  const ed = useEditor({ section: "links", id, version: Number(row.version ?? 0) });
  const [f, setF] = useState({ label: str(row.label), url: str(row.url) });
  return (
    <form className="surface cms-form" onSubmit={(e) => e.preventDefault()}>
      <Conflict show={ed.conflict} unsaved={`${f.label}\n${f.url}`} />
      <Field label="Label" value={f.label} max={60}><input className="cms-input" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} maxLength={60} /></Field>
      <Field label="Address (https only)"><input className="cms-input" type="url" inputMode="url" autoCapitalize="off" placeholder="https://" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} maxLength={500} /></Field>
      <PublishBar ed={ed} type="link" id={id} status={str(row.status)} save={(intent) => ed.run((version) => saveLink({ ...f, id: id ? Number(id) : undefined, version: id ? version : undefined, intent }))} />
      {id && <div className="cms-tools"><DeleteButton type="link" id={Number(id)} version={ed.version} section="links" /></div>}
    </form>
  );
}

export function PageEditor({ row, pageKey, fallback }: {
  row: Row; pageKey: (typeof PAGE_KEYS)[number];
  fallback: { title: string; heading: string; body: string; linkLabel?: string; linkUrl?: string };
}) {
  const ed = useEditor({ section: "pages", id: pageKey, version: Number(row.version ?? 0) });
  const exists = Number(row.version ?? 0) > 0;
  const src = exists ? row : { ...fallback }; // start from the current text so edits are small
  const [f, setF] = useState({ title: str(src.title), heading: str(src.heading), body: str(src.body), linkLabel: str(src.linkLabel), linkUrl: str(src.linkUrl) });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="surface cms-form" onSubmit={(e) => e.preventDefault()}>
      <Conflict show={ed.conflict} unsaved={f.body} />
      <p className="cms-banner" style={{ margin: 0 }}>
        Currently showing: <strong>{row.status === "published" ? "your text" : "the built-in text"}</strong>. {!exists && "Saving starts from the built-in text."}
      </p>
      <Field label="Window title" value={f.title} max={80}><input className="cms-input" value={f.title} onChange={set("title")} maxLength={80} /></Field>
      <Field label="Heading" value={f.heading} max={100}><input className="cms-input" value={f.heading} onChange={set("heading")} maxLength={100} /></Field>
      <Field label="Text" value={f.body} max={6000} hint={RICH_HINT}><textarea className="cms-input" value={f.body} onChange={set("body")} maxLength={6000} rows={10} /></Field>
      <div className="cms-two">
        <Field label="Button label (optional)" value={f.linkLabel} max={80}><input className="cms-input" value={f.linkLabel} onChange={set("linkLabel")} maxLength={80} /></Field>
        <Field label="Button address (https only)"><input className="cms-input" type="url" inputMode="url" autoCapitalize="off" placeholder="https://" value={f.linkUrl} onChange={set("linkUrl")} maxLength={500} /></Field>
      </div>
      <PublishBar ed={ed} type="page" id={pageKey} status={str(row.status)} save={(intent) => ed.run((version) => saveSitePage({ ...f, key: pageKey, version: exists ? version : undefined, intent }))} />
    </form>
  );
}
