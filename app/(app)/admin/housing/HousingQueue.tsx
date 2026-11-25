"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useShell } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/Modal";
import { Action, Badge } from "@/components/ui";
import { reviewListing } from "@/lib/admin/actions-housing";
import type { HousingCard, StaleListing } from "@/lib/admin/types";

type Card = HousingCard | StaleListing;

export function HousingQueue({ mode, cards }: { mode: "reports" | "stale"; cards: Card[] }) {
  const { report } = useShell();
  const [pending, startTransition] = useTransition();
  const [dismissing, setDismissing] = useState<Card | null>(null);
  const [note, setNote] = useState("");

  const verify = (c: Card) =>
    startTransition(async () => {
      report(await reviewListing(c.id, "verified"), "Listing verified.");
    });
  const dismiss = (c: Card) =>
    startTransition(async () => {
      if (report(await reviewListing(c.id, "dismissed", note), "Reports dismissed.")) {
        setDismissing(null);
        setNote("");
      }
    });

  return (
    <section>
      <div className="section-heading">
        <h2>{mode === "stale" ? "Listings past 30 days" : "Housing reports queue"}</h2>
        <span>{cards.length} {mode === "stale" ? "to re-check" : "waiting for review"}</span>
      </div>
      {!cards.length ? (
        <div className="surface empty-state">
          <Icon name="shield" size={36} />
          <h2>All caught up.</h2>
          <p>{mode === "stale" ? "Every listing was checked in the last 30 days." : "New student housing reports will appear here."}</p>
          <Link className="button outline" href="/housing">View student housing</Link>
        </div>
      ) : (
        <div className="queue-list">
          {cards.map((c) => (
            <article className="surface queue-card" key={c.id}>
              <div className="section-heading">
                <span className="mono muted">ISC / {String(c.id).padStart(3, "0")}</span>
                <Badge tone={mode === "stale" ? "stale" : "warning"}>{mode === "stale" ? "Stale" : "Under review"}</Badge>
              </div>
              <h3>{c.title}</h3>
              <p className="location">
                <Icon name="pin" size={14} />
                {c.area} · Rs {c.price.toLocaleString()} / month
              </p>
              {"reports" in c && c.reports.map((r, i) => (
                <div className="report-summary" key={r.id}>
                  <strong>Report {i + 1}: {r.reason}</strong>
                  <p>{r.note || "No additional note provided."} <span className="small-text">({r.ago})</span></p>
                  {r.photoUrl && (
                    <a href={r.photoUrl} target="_blank" rel="noreferrer" className="adm-photo">
                      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned URL, not optimisable */}
                      <img className="adm-thumb" src={r.photoUrl} alt="" loading="lazy" />
                      <span>View attached photo</span>
                    </a>
                  )}
                </div>
              ))}
              {"days" in c && <p className="small-text">Last checked {c.days} days ago.</p>}
              <p className="small-text">Last checked: {c.checked}</p>
              <div className="adm-actions">
                <Action variant="navy" disabled={pending} onClick={() => verify(c)}>
                  <Icon name="shield" size={16} />
                  Verify &amp; Refresh Date
                </Action>
                {mode === "reports" && (
                  <Action variant="outline" disabled={pending} onClick={() => setDismissing(c)}>Dismiss report...</Action>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="form-footnote">
        <Icon name="info" size={15} />
        Only refresh a listing after confirming the contact, price and availability. This button records a completed committee check.
      </p>
      {dismissing && (
        <Modal title="Dismiss report" onClose={() => setDismissing(null)}>
          <form
            className="adm-modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              dismiss(dismissing);
            }}
          >
            <p>Use this when the report is wrong. The listing&apos;s checked date will not change.</p>
            <label>
              Reason for dismissing
              <textarea required minLength={3} maxLength={500} rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <div className="adm-actions">
              <Action type="submit" variant="navy" disabled={pending}>Dismiss reports</Action>
              <Action variant="outline" onClick={() => setDismissing(null)}>Cancel</Action>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
