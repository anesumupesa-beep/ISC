"use client";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { setStatus, deleteContent } from "../actions";
import type { CmsResult, ContentType } from "@/lib/cms/types";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); };
};
export const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

/** Label + counter + hint around one control. */
export function Field({ label, value, max, hint, children }: { label: string; value?: string; max?: number; hint?: string; children: ReactNode }) {
  return (
    <label className="cms-field">
      <span className="cms-label">
        {label}
        {max !== undefined && value !== undefined && <span className={`cms-counter${value.length > max ? " over" : ""}`}>{value.length}/{max}</span>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export const RICH_HINT = 'Blank line = new paragraph. Start a line with "- " for a bullet. **bold**. [label](https://link). No HTML.';

/** Runs actions and tracks busy / message / conflict state. Keeps the latest row version for repeated saves. */
export function useEditor(opts: { section: string; id?: string; version: number }) {
  const router = useRouter();
  const online = useOnline();
  const [version, setVersion] = useState(opts.version);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [conflict, setConflict] = useState(false);

  async function run(call: (version: number) => Promise<CmsResult>, after?: (r: CmsResult) => void) {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await call(version);
      if (r.ok) {
        if (r.version) setVersion(r.version);
        setConflict(false);
        setMsg({ ok: true, text: r.message ?? "Saved." });
        if (!opts.id && r.id) router.replace(`/admin/content/${opts.section}/${r.id}`);
        else router.refresh();
        after?.(r);
      } else {
        if (r.error.startsWith("Someone else")) setConflict(true);
        setMsg({ ok: false, text: r.error });
      }
    } catch {
      setMsg({ ok: false, text: "Could not reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }
  return { version, busy, msg, conflict, online, run, disabled: busy || !online };
}

export function Conflict({ show, unsaved }: { show: boolean; unsaved: string }) {
  if (!show) return null;
  return (
    <div className="cms-banner err" role="alert">
      Someone else changed this while you were editing. Reload to see their version before saving again.
      <details>
        <summary>Your unsaved text</summary>
        <textarea readOnly value={unsaved} aria-label="Your unsaved text" />
      </details>
      <div className="cms-tools"><button type="button" className="cms-btn navy" onClick={() => window.location.reload()}>Reload</button></div>
    </div>
  );
}

export function Bar({ msg, online, children }: { msg: { ok: boolean; text: string } | null; online: boolean; children: ReactNode }) {
  return (
    <div className="cms-bar">
      {!online && <p className="cms-msg err" role="status">You&apos;re offline. Saving is paused until you reconnect.</p>}
      {msg && <p className={`cms-msg ${msg.ok ? "ok" : "err"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
      {children}
    </div>
  );
}

type Ed = ReturnType<typeof useEditor>;

/** Sticky bar buttons shared by every editor: Save draft / Publish, or Save changes / Unpublish. */
export function PublishBar({ ed, type, id, status, save, official }: {
  ed: Ed; type: ContentType; id?: string; status?: string; save: (intent: "save" | "publish" | "submit") => void; official?: boolean;
}) {
  const live = status === "published";
  const pending = status === "pending_approval";
  const key = type === "page" ? id : id ? Number(id) : undefined;
  return (
    <Bar msg={ed.msg} online={ed.online}>
      {live || pending ? (
        <>
          <button type="button" className="cms-btn navy" disabled={ed.disabled} onClick={() => save("save")}>Save changes</button>
          {live && key !== undefined && (
            <button type="button" className="cms-btn" disabled={ed.disabled} onClick={() => ed.run((v) => setStatus(type, key, v, type === "page" ? "draft" : "archived"))}>
              {type === "page" ? "Reset to default" : "Unpublish"}
            </button>
          )}
        </>
      ) : (
        <>
          <button type="button" className="cms-btn" disabled={ed.disabled} onClick={() => save("save")}>Save draft</button>
          {official ? (
            <button type="button" className="cms-btn primary" disabled={ed.disabled} onClick={() => save("submit")}>Submit for UTM approval</button>
          ) : (
            <button type="button" className="cms-btn primary" disabled={ed.disabled} onClick={() => save("publish")}>Publish</button>
          )}
        </>
      )}
    </Bar>
  );
}

/** Soft delete with a confirm step. */
export function DeleteButton({ type, id, version, section }: { type: ContentType; id: number; version: number; section: string }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState("");
  if (!ask) return <button type="button" className="cms-btn danger" onClick={() => setAsk(true)}>Delete</button>;
  return (
    <span role="alertdialog" aria-label="Confirm delete" className="cms-row-actions">
      <span style={{ fontSize: 13 }}>Delete this item? You can restore it from the Deleted filter.</span>
      <button type="button" className="cms-btn danger" onClick={async () => {
        const r = await deleteContent(type, id, version);
        if (r.ok) router.push(`/admin/content/${section}`); else setErr(r.error);
      }}>Yes, delete</button>
      <button type="button" className="cms-btn" onClick={() => setAsk(false)}>Cancel</button>
      {err && <span className="cms-msg err" role="alert">{err}</span>}
    </span>
  );
}
