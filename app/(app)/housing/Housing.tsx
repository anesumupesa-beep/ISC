"use client";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { reportListing } from "@/app/actions";
import { useShell } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/Modal";
import { Action, Badge, PageHeading } from "@/components/ui";
import type { Listing } from "@/lib/types";
import { housingBudgets, reportReasons, roomTypes } from "@/lib/ui";

function Verification({ listing }: { listing: Listing }) {
  return listing.report ? (
    <Badge tone="warning">
      <Icon name="flag" size={13} />
      Reported — Under Review
    </Badge>
  ) : (
    <Badge tone={listing.stale ? "stale" : "positive"}>
      <Icon name={listing.stale ? "clock" : "shield"} size={13} />
      Last checked: {listing.checked}
      {listing.stale ? " — Needs re-check" : ""}
    </Badge>
  );
}

const DEMO_CONTACT = "Demo landlord · +230 5XXX XXXX";

export function Housing({ listings }: { listings: Listing[] }) {
  const { report } = useShell();
  // Filter options come from the data, so a new area or a pricier room never disappears behind a fixed list.
  const areas = ["All Areas", ...[...new Set(listings.map((l) => l.area))].sort()];
  const top = Math.max(...listings.map((l) => l.price), 0);
  const budgets = top > housingBudgets.at(-1)! ? [...housingBudgets, Math.ceil(top / 1000) * 1000] : housingBudgets;
  const anySample = listings.some((l) => l.sample);
  const [area, setArea] = useState(areas[0]);
  const [budget, setBudget] = useState(budgets.at(-1)!);
  const [roomType, setRoomType] = useState(roomTypes[0]);
  const [recentOnly, setRecentOnly] = useState(false);
  const [modal, setModal] = useState<{ type: "report" | "listing"; listingId: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const selected = modal ? listings.find((item) => item.id === modal.listingId) : undefined;

  const filtered = listings.filter(
    (listing) =>
      (area === "All Areas" || listing.area === area) &&
      listing.price <= budget &&
      (roomType === "All Room Types" || listing.type === roomType) &&
      (!recentOnly || (!listing.stale && !listing.report)),
  );

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await reportListing(
        selected.id,
        String(data.get("reason")),
        String(data.get("note") ?? ""),
        data.get("photo") as File | null,
      );
      if (
        report(result, "Report sent to the ISC committee. Thank you for looking out for others.")
      )
        setModal(null);
    });
  }

  return (
    <>
      <PageHeading
        eyebrow="FIND YOUR FEET. FIND YOUR PLACE."
        title="A place to call your own."
        description="Student-friendly housing, checked by your ISC committee. Clear details. No guesswork."
      >
        <Badge>
          <Icon name="shield" size={14} />
          Committee checked
        </Badge>
      </PageHeading>
      <div className="info-banner">
        <Icon name="info" size={19} />
        <p>
          A check is a starting point, not a guarantee. Visit the property, confirm the terms, and
          never send a deposit before viewing.
          {anySample && " Some listings and contacts in this prototype are demonstration data."}
        </p>
      </div>
      <div className="filter-bar surface">
        <label>
          Area
          <select aria-label="Area" value={area} onChange={(e) => setArea(e.target.value)}>
            {areas.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Maximum monthly budget
          <select value={budget} onChange={(e) => setBudget(Number(e.target.value))}>
            {budgets.map((value) => (
              <option value={value} key={value}>
                Rs {value.toLocaleString()} / month
              </option>
            ))}
          </select>
        </label>
        <label>
          Room type
          <select aria-label="Room type" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
            {roomTypes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="toggle-label">
          <input
            className="switch"
            type="checkbox"
            checked={recentOnly}
            onChange={(e) => setRecentOnly(e.target.checked)}
          />
          <span>Only recently verified</span>
        </label>
      </div>
      <div className="section-heading">
        <h2>
          {filtered.length} {filtered.length === 1 ? "place" : "places"} to start your next chapter
        </h2>
        <span>Amounts in Mauritian rupees (MUR)</span>
      </div>
      <div className="housing-grid">
        {filtered.map((listing) => (
          <article className="listing-card surface" key={listing.id}>
            <div className={`listing-illustration art-${listing.id % 3}`}>
              {listing.photos?.length ? (
                <div className="listing-photos">
                  {listing.photos.map((photo) => (
                    // eslint-disable-next-line @next/next/no-img-element -- already downscaled by the CMS upload
                    <img key={photo.url} src={photo.url} alt={photo.alt} width={640} height={420} loading="lazy" />
                  ))}
                </div>
              ) : (
                <div className="building">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              )}
              <span className="property-type">{listing.type}</span>
              <span className="listing-reference">ISC / {String(listing.id).padStart(3, "0")}</span>
            </div>
            <div className="listing-content">
              <Verification listing={listing} />
              <p className="location">
                <Icon name="pin" size={14} />
                {listing.area} · {listing.walk}
              </p>
              <h3>{listing.title}</h3>
              <p className="listing-price">
                Rs {listing.price.toLocaleString()}
                <span> / month</span>
              </p>
              <p>{listing.includes}</p>
              <p className="micro-meta">
                <Icon name="shield" size={13} />
                Verified by ISC Committee
              </p>
              <div className="listing-actions">
                <Action
                  variant="outline"
                  onClick={() => setModal({ type: "listing", listingId: listing.id })}
                >
                  View Contact & Details
                  <Icon name="arrow" size={16} />
                </Action>
                <button
                  className="subtle-action"
                  disabled={!!listing.report}
                  onClick={() => setModal({ type: "report", listingId: listing.id })}
                >
                  {listing.report ? "Report under review" : "Report outdated info"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state surface">
          <Icon name="housing" size={36} />
          <h2>No rooms match those filters.</h2>
          <p>Try a neighbouring area or a slightly higher budget.</p>
          <Action
            variant="outline"
            onClick={() => {
              setArea(areas[0]);
              setBudget(budgets.at(-1)!);
              setRoomType(roomTypes[0]);
              setRecentOnly(false);
            }}
          >
            Reset filters
          </Action>
        </div>
      )}
      {modal?.type === "report" && selected && (
        <Modal title="Help keep housing information current." onClose={() => setModal(null)}>
          <form className="modal-body" onSubmit={submitReport}>
            <p className="modal-intro">
              Reporting <strong>{selected.title}</strong>. Your report helps the next student make
              an informed decision.
            </p>
            <fieldset className="report-reasons">
              <legend>What needs checking?</legend>
              {reportReasons.map((reason, i) => (
                <label key={reason}>
                  <input type="radio" name="reason" value={reason} required defaultChecked={i === 0} />
                  {reason}
                </label>
              ))}
            </fieldset>
            <label>
              Anything else? <span className="muted">(optional)</span>
              <textarea
                name="note"
                rows={3}
                maxLength={500}
                placeholder="A short note for the committee. No personal information, please."
              />
            </label>
            <label>
              Photo <span className="muted">(optional · JPG, PNG or WebP, up to 4 MB)</span>
              <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" />
            </label>
            <div className="modal-actions">
              <Action variant="outline" onClick={() => setModal(null)}>
                Cancel
              </Action>
              <Action type="submit" variant="primary" disabled={pending}>
                Send report
                <Icon name="arrow" size={16} />
              </Action>
            </div>
          </form>
        </Modal>
      )}
      {modal?.type === "listing" && selected && (
        <Modal title="A closer look at your next place." onClose={() => setModal(null)}>
          <div className="modal-body">
            <Verification listing={selected} />
            <h2 className="modal-property-title">{selected.title}</h2>
            <p className="location">
              <Icon name="pin" size={15} />
              {selected.area} · {selected.walk}
            </p>
            <p className="listing-price">
              Rs {selected.price.toLocaleString()}
              <span> / month</span>
            </p>
            <dl className="detail-list">
              <div>
                <dt>Room type</dt>
                <dd>{selected.type}</dd>
              </div>
              <div>
                <dt>Included</dt>
                <dd>{selected.includes}</dd>
              </div>
              <div>
                <dt>Deposit</dt>
                <dd>Confirm terms directly before agreeing</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>
                  {selected.contact ?? (selected.sample ? DEMO_CONTACT : "Ask the ISC committee for this listing’s contact")}
                </dd>
              </div>
            </dl>
            {selected.sample && (
              <div className="info-banner">
                <Icon name="info" size={18} />
                <p>
                  Illustrative listing only — no real room is being advertised. For actual housing
                  guidance, contact UTM Student Affairs through the official university website.
                </p>
              </div>
            )}
            <a className="text-link" href="https://www.utm.ac.mu/" target="_blank" rel="noreferrer">
              UTM official website
              <Icon name="external" size={14} />
            </a>
            {!selected.report && (
              <button
                className="subtle-action"
                onClick={() => setModal({ type: "report", listingId: selected.id })}
              >
                Something changed? Report outdated info
              </button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
