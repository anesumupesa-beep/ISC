"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { restoreRevision } from "../actions";

export function RestoreButton({ revisionId, back }: { revisionId: number; back: string }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!ask) return <button type="button" className="cms-btn" onClick={() => setAsk(true)}>Restore this version</button>;
  return (
    <div className="cms-row-actions" role="alertdialog" aria-label="Confirm restore">
      <span style={{ fontSize: 13 }}>Apply this version as a new version? Nothing is erased.</span>
      <button type="button" className="cms-btn primary" disabled={busy} onClick={async () => {
        setBusy(true);
        const r = await restoreRevision(revisionId).catch(() => null);
        setBusy(false);
        if (r?.ok) router.push(back);
        else setMsg({ ok: false, text: r?.ok === false ? r.error : "Could not reach the server." });
      }}>Yes, restore</button>
      <button type="button" className="cms-btn" onClick={() => setAsk(false)}>Cancel</button>
      {msg && <span className="cms-msg err" role="alert">{msg.text}</span>}
    </div>
  );
}
