"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { assignBuddy, publishUpdate, verifyListing } from "@/app/actions";
import { useShell } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { Action, Badge, PageHeading } from "@/components/ui";
import type { BuddyRequest, Listing, UpdateCategory, Volunteer } from "@/lib/types";

const tabs = ["Housing reports", "Buddy matching", "Publish club update"];

export function Admin({
  reported,
  requests,
  volunteers,
}: {
  reported: Listing[];
  requests: BuddyRequest[];
  volunteers: Volunteer[];
}) {
  const { report } = useShell();
  const [adminTab, setAdminTab] = useState(tabs[0]);
  const [assignments, setAssignments] = useState<Record<number, number>>({});
  const [pending, startTransition] = useTransition();
  const waiting = requests.filter((request) => !request.assigned).length;

  function verify(listing: Listing) {
    startTransition(async () => {
      report(
        await verifyListing(listing.id),
        "Listing verified. Its date and verification stamp have been refreshed.",
      );
    });
  }
  function assign(request: BuddyRequest) {
    const volunteer = volunteers.find((v) => v.id === (assignments[request.id] ?? volunteers[0]?.id));
    if (!volunteer) return;
    startTransition(async () => {
      report(
        await assignBuddy(request.id, volunteer.id),
        `${request.name} has been matched with ${volunteer.name}.`,
      );
    });
  }
  function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await publishUpdate({
        category: String(data.get("category")) as UpdateCategory,
        title: String(data.get("title")),
        description: String(data.get("description")),
      });
      if (report(result, "Update published. It is now visible in the student Club Updates feed."))
        form.reset();
    });
  }

  return (
    <>
      <PageHeading
        eyebrow="ISC COMMITTEE · DEMO WORKSPACE"
        title="Committee triage workspace."
        description="Keep housing current, make meaningful matches, and share what matters."
      />
      <div className="info-banner">
        <Icon name="shield" size={20} />
        <p>
          <strong>Committee access.</strong> Housing, buddy matching and club updates only.
          Confidential welfare enquiries are never available to ISC Admins.
        </p>
      </div>
      <div className="tabs compact">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            onClick={() => setAdminTab(tab)}
            className={adminTab === tab ? "active" : ""}
            aria-pressed={adminTab === tab}
          >
            {tab}
            {index < 2 && <span className="tab-count">{index === 0 ? reported.length : waiting}</span>}
          </button>
        ))}
      </div>
      {adminTab === "Housing reports" ? (
        <section>
          <div className="section-heading">
            <h2>Housing reports queue</h2>
            <span>{reported.length} waiting for review</span>
          </div>
          {!reported.length ? (
            <div className="surface empty-state">
              <Icon name="shield" size={36} />
              <h2>All caught up.</h2>
              <p>New student housing reports will appear here.</p>
              <Link className="button outline" href="/housing">
                View student housing
              </Link>
            </div>
          ) : (
            <div className="queue-list">
              {reported.map((listing) => (
                <article className="surface queue-card" key={listing.id}>
                  <div className="section-heading">
                    <span className="mono muted">ISC / {String(listing.id).padStart(3, "0")}</span>
                    <Badge tone="warning">Under review</Badge>
                  </div>
                  <h3>{listing.title}</h3>
                  <p className="location">
                    <Icon name="pin" size={14} />
                    {listing.area} · Rs {listing.price.toLocaleString()} / month
                  </p>
                  <div className="report-summary">
                    <strong>{listing.report?.reason}</strong>
                    <p>{listing.report?.note || "No additional note provided."}</p>
                  </div>
                  <div className="spread-actions">
                    <span className="small-text">Last checked: {listing.checked}</span>
                    <Action variant="navy" disabled={pending} onClick={() => verify(listing)}>
                      <Icon name="shield" size={16} />
                      Verify & Refresh Date
                    </Action>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="form-footnote">
            <Icon name="info" size={15} />
            Only refresh a listing after confirming the contact, price and availability. This
            button records a completed committee check.
          </p>
        </section>
      ) : adminTab === "Buddy matching" ? (
        <section>
          <div className="section-heading">
            <h2>Buddy matching queue</h2>
            <span>{waiting} students awaiting a welcome</span>
          </div>
          <div className="queue-list">
            {requests.map((request) => (
              <article className="surface queue-card" key={request.id}>
                <div className="section-heading">
                  <h3>{request.name}</h3>
                  <Badge tone={request.assigned ? "positive" : "warning"}>
                    {request.assigned ? "Matched" : "Pending Match"}
                  </Badge>
                </div>
                <p>
                  {request.country} · {request.language} · Arrives {request.date}
                </p>
                <p className="small-text">{request.programme}</p>
                <div className="help-tags">
                  {request.help.map((help) => (
                    <Badge tone="neutral" key={help}>
                      {help}
                    </Badge>
                  ))}
                </div>
                {request.assigned ? (
                  <p className="assigned-note">
                    <Icon name="check" size={17} />
                    Matched with {request.assigned}
                  </p>
                ) : (
                  <div className="assign-row">
                    <label>
                      Available volunteer
                      <select
                        value={assignments[request.id] ?? volunteers[0]?.id ?? ""}
                        onChange={(e) =>
                          setAssignments((items) => ({
                            ...items,
                            [request.id]: Number(e.target.value),
                          }))
                        }
                      >
                        {volunteers.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Action
                      variant="navy"
                      disabled={pending || !volunteers.length}
                      onClick={() => assign(request)}
                    >
                      Assign Match
                      <Icon name="arrow" size={16} />
                    </Action>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : (
        <form className="surface form-card publish-form" onSubmit={publish}>
          <h2>A useful update, clearly shared.</h2>
          <p>Published updates appear immediately on the student noticeboard.</p>
          <label>
            Update category
            <select name="category">
              <option>Official Announcements</option>
              <option>Weather & Holidays</option>
              <option>Events</option>
            </select>
          </label>
          <label>
            Title
            <input name="title" required maxLength={120} placeholder="A short, clear headline" />
          </label>
          <label>
            Update details
            <textarea
              name="description"
              required
              rows={5}
              maxLength={2000}
              placeholder="What do students need to know? Include dates, places and clear next steps."
            />
          </label>
          <label className="consent">
            <input type="checkbox" required />I have checked that this information is accurate and
            appropriate to publish.
          </label>
          <Action type="submit" variant="primary" disabled={pending}>
            Publish club update
            <Icon name="arrow" size={17} />
          </Action>
        </form>
      )}
    </>
  );
}
