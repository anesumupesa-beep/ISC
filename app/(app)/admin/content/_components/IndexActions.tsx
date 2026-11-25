"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CmsResult } from "@/lib/cms/types";
import { archiveAllSamples, sweepMedia } from "../actions";

export function IndexActions({ samples }: { samples: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function go(call: () => Promise<CmsResult>) {
    setBusy(true);
    setAsk(false);
    try {
      const r = await call();
      setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Done.") : r.error });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Could not reach the server." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cms-tools">
      <button type="button" className="cms-btn" disabled={busy} onClick={() => go(sweepMedia)}>Clean up unused images</button>
      {samples > 0 && !ask && <button type="button" className="cms-btn danger" disabled={busy} onClick={() => setAsk(true)}>Archive all sample content</button>}
      {ask && (
        <>
          <span style={{ fontSize: 13 }}>Hide all {samples} sample items from students? They stay in the Archived filter.</span>
          <button type="button" className="cms-btn danger" disabled={busy} onClick={() => go(archiveAllSamples)}>Yes, archive</button>
          <button type="button" className="cms-btn" onClick={() => setAsk(false)}>Cancel</button>
        </>
      )}
      {msg && <p className={`cms-msg ${msg.ok ? "ok" : "err"}`} role={msg.ok ? "status" : "alert"} style={{ flexBasis: "100%", margin: 0 }}>{msg.text}</p>}
    </div>
  );
}
