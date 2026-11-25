"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CmsResult, ContentRow, ContentType } from "@/lib/cms/types";
import { deleteContent, moveTask, restoreDeleted, setStatus, submitForApproval, verifyListing } from "../actions";
import { useOnline } from "./kit";

export function RowActions({ type, section, row }: { type: ContentType; section: string; row: ContentRow }) {
  const router = useRouter();
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const id = type === "page" ? row.id : Number(row.id);
  const s = row.status;

  async function go(call: () => Promise<CmsResult>) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await call();
      setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Done.") : r.error });
      if (r.ok) router.refresh();
    } catch {
      setMsg({ ok: false, text: "Could not reach the server." });
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }
  const dis = busy || !online;
  const btn = (label: string, onClick: () => void, cls = "") => (
    <button type="button" className={`cms-btn ${cls}`} disabled={dis} onClick={onClick}>{label}</button>
  );

  return (
    <div className="cms-row-actions">
      {s === "deleted" ? (
        btn("Restore", () => go(() => restoreDeleted(type, id)))
      ) : (
        <>
          <Link className="cms-btn navy" href={`/admin/content/${section}/${row.id}`}>{s === "pending" ? "Review" : "Edit"}</Link>
          {type === "task" && (
            <>
              {btn("Up", () => go(() => moveTask(id, "up")))}
              {btn("Down", () => go(() => moveTask(id, "down")))}
            </>
          )}
          {type === "listing" && btn("Verify", () => go(() => verifyListing(id, row.version)))}
          {(s === "live" || s === "scheduled" || s === "expired") && btn("Unpublish", () => go(() => setStatus(type, id, row.version, "archived")))}
          {(s === "draft" || s === "archived") && (row.official
            ? btn("Submit for approval", () => go(() => submitForApproval(id, row.version)))
            : btn("Publish", () => go(() => setStatus(type, id, row.version, "published")), "primary"))}
          {type !== "page" && (confirm ? (
            <>
              {btn("Yes, delete", () => go(() => deleteContent(type, id, row.version)), "danger")}
              {btn("Cancel", () => setConfirm(false))}
            </>
          ) : btn("Delete", () => setConfirm(true), "danger"))}
          <Link className="cms-btn" href={`/admin/content/${section}/${row.id}/history`}>History</Link>
        </>
      )}
      {!online && <span className="cms-msg err" role="status">Offline</span>}
      {msg && <span className={`cms-msg ${msg.ok ? "ok" : "err"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</span>}
    </div>
  );
}
