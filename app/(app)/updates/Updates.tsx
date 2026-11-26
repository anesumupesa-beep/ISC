"use client";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { registerMembership } from "@/app/actions";
import { useShell } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/Modal";
import { Action, Badge, PageHeading } from "@/components/ui";
import { UpdateModal, UpdateRow, useRsvps } from "@/components/UpdateFeed";
import type { ClubUpdate } from "@/lib/types";
import { updateFilters } from "@/lib/ui";

export function Updates({
  updates,
  rsvps: initialRsvps,
  member,
  name,
  email,
}: {
  updates: ClubUpdate[];
  rsvps: number[];
  member: boolean;
  name: string;
  email: string;
}) {
  const { report } = useShell();
  const [rsvps, toggleRsvp] = useRsvps(initialRsvps);
  const [updateFilter, setUpdateFilter] = useState("All");
  const [openUpdate, setOpenUpdate] = useState<ClubUpdate | null>(null);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const filtered = updates.filter(
    (update) => updateFilter === "All" || update.category === updateFilter,
  );
  // The aside's diary date is the first event on the noticeboard.
  const featuredEvent = updates.find((update) => update.category === "Events");

  function submitMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await registerMembership({
        name: String(data.get("name")),
        email: String(data.get("email")),
        programme: String(data.get("programme")),
      });
      if (report(result, "Your 2026–2027 ISC membership registration has been received."))
        setMembershipOpen(false);
    });
  }

  return (
    <>
      <PageHeading
        eyebrow="THE CAMPUS NOTICEBOARD"
        title="In the know. Part of the community."
        description="Official news, shared moments, and the dates worth keeping."
      />
      <div className="filter-chips">
        {updateFilters.map((filter) => (
          <button
            key={filter}
            className={updateFilter === filter ? "active" : ""}
            onClick={() => setUpdateFilter(filter)}
            aria-pressed={updateFilter === filter}
          >
            {filter}
          </button>
        ))}
      </div>
      {(updateFilter === "All" || updateFilter === "Weather & Holidays") && (
        <div className="advisory extended">
          <Icon name="rain" size={25} />
          <div>
            <p className="eyebrow">STAY INFORMED. STAY SAFE.</p>
            <h3>Cyclone season: know where to check.</h3>
            <p>
              Follow official weather bulletins, keep essential supplies ready, and confirm campus
              opening before travelling.
            </p>
            <a className="text-link" href="https://metservice.intnet.mu/" target="_blank" rel="noreferrer">
              Mauritius Meteorological Services
              <Icon name="external" size={14} />
            </a>
          </div>
        </div>
      )}
      <div className="content-with-aside">
        <section>
          <div className="updates-list surface editorial-feed">
            {filtered.map((update) => (
              <UpdateRow
                key={update.id}
                update={update}
                full
                going={rsvps.includes(update.id)}
                onOpen={() => setOpenUpdate(update)}
                onToggle={() => toggleRsvp(update.id)}
              />
            ))}
            {!filtered.length && updateFilter !== "ISC Membership" && (
              <div className="empty-state">
                <h3>No updates in this category yet.</h3>
                <p>Check back for the next committee notice.</p>
              </div>
            )}
          </div>
          {(updateFilter === "All" || updateFilter === "ISC Membership") && (
            <article className="membership-card">
              <div className="membership-mark">
                <Icon name="globe" size={32} />
                <span>
                  ISC
                  <br />
                  2026/27
                </span>
              </div>
              <div>
                <p className="eyebrow">YOUR CLUB. YOUR COMMUNITY.</p>
                <h2>{member ? "You’re part of the club." : "Make it official. Join the ISC."}</h2>
                <p>
                  Connect with international students, take part in cultural events, and have a
                  voice in your campus community.
                </p>
                <ul>
                  <li>Member event invitations</li>
                  <li>Volunteer & leadership opportunities</li>
                  <li>A stronger international student voice</li>
                </ul>
                {member ? (
                  <Badge>
                    <Icon name="check" size={14} />
                    2026–2027 registration received
                  </Badge>
                ) : (
                  <Action variant="primary" onClick={() => setMembershipOpen(true)}>
                    Renew / Register 2026–2027 Membership
                    <Icon name="arrow" size={17} />
                  </Action>
                )}
              </div>
            </article>
          )}
        </section>
        {featuredEvent && (
          <aside className="guidance-card">
            <Icon name="calendar" size={26} />
            <h3>A date for your diary.</h3>
            <div className="event-date">
              {featuredEvent.day}
              <span>{featuredEvent.month}</span>
            </div>
            <h4>{featuredEvent.title}</h4>
            <p>{[featuredEvent.venue, featuredEvent.time].filter(Boolean).join(" · ") || featuredEvent.meta}</p>
            <Action
              variant={rsvps.includes(featuredEvent.id) ? "sage" : "outline"}
              onClick={() => toggleRsvp(featuredEvent.id)}
            >
              {rsvps.includes(featuredEvent.id) ? (
                <>
                  <Icon name="check" size={16} />
                  You’re going
                </>
              ) : (
                "RSVP Going"
              )}
            </Action>
          </aside>
        )}
      </div>
      {openUpdate && (
        <UpdateModal
          update={openUpdate}
          going={rsvps.includes(openUpdate.id)}
          onToggle={() => toggleRsvp(openUpdate.id)}
          onClose={() => setOpenUpdate(null)}
        />
      )}
      {membershipOpen && (
        <Modal title="A place in your student community." onClose={() => setMembershipOpen(false)}>
          <form className="modal-body" onSubmit={submitMembership}>
            <p>
              Join a community of international and local students. No payment is collected in this
              demonstration.
            </p>
            <label>
              Full name
              <input required name="name" defaultValue={name} />
            </label>
            <label>
              Student email
              <input
                type="email"
                required
                name="email"
                defaultValue={email}
                placeholder="Use a fictional email for this demo"
              />
            </label>
            <label>
              Programme
              <input name="programme" required placeholder="e.g. BSc Software Engineering" />
            </label>
            <label className="consent">
              <input required type="checkbox" />I agree to be contacted about ISC membership and
              club activities.
            </label>
            <Action type="submit" variant="primary" disabled={pending}>
              Register membership
              <Icon name="arrow" size={17} />
            </Action>
          </form>
        </Modal>
      )}
    </>
  );
}
