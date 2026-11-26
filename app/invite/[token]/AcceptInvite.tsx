"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptAdminInvite } from "./actions";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <>
      <button className="button navy" disabled={pending} onClick={() => start(async () => {
        const r = await acceptAdminInvite(token);
        setMsg({ ok: r.ok, text: r.ok ? r.message ?? "Done." : r.error });
        if (r.ok) router.push("/admin");
      })}>Accept invite</button>
      {msg && <p role="status" className="small-text">{msg.text}</p>}
    </>
  );
}
