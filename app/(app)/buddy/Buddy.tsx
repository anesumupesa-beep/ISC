"use client";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { requestBuddy, volunteerAsBuddy } from "@/app/actions";
import { useShell } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { Action, Badge, PageHeading, TextLink } from "@/components/ui";
import type { BuddyRequest, Volunteer } from "@/lib/types";
import { buddyHelpOptions, buddyLanguages, initials } from "@/lib/ui";

const tabs = ["My buddy", "Request a buddy", "Volunteer as a buddy"];

export function Buddy({
  pendingRequest,
  buddy,
  volunteer,
}: {
  pendingRequest: BuddyRequest | null;
  buddy: Volunteer | null;
  volunteer: { year: string; languages: string; capacity: number } | null;
}) {
  const { report, openModal } = useShell();
  const [buddyTab, setBuddyTab] = useState(tabs[0]);
  const [editingVolunteer, setEditingVolunteer] = useState(false);
  const [pending, startTransition] = useTransition();

  function submitBuddy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await requestBuddy({
        country: String(data.get("country")),
        language: String(data.get("language")),
        arrival: String(data.get("arrival")),
        programme: String(data.get("programme")),
        help: data.getAll("help").map(String),
      });
      if (report(result, "Buddy request submitted. The committee will help you find a match."))
        setBuddyTab("My buddy");
    });
  }
  function submitVolunteer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await volunteerAsBuddy({
        year: String(data.get("year")),
        languages: String(data.get("languages")),
        capacity: Number(data.get("capacity")),
      });
      if (report(result, "Volunteer interest received by the ISC committee."))
        setEditingVolunteer(false);
    });
  }

  return (
    <>
      <PageHeading
        eyebrow="CONNECTION STARTS WITH HELLO"
        title="New here doesn’t mean on your own."
        description="Meet a fellow UTM student who knows the campus, the island, and what it’s like to start fresh."
      />
      <div className="tabs compact">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={buddyTab === tab ? "active" : ""}
            onClick={() => setBuddyTab(tab)}
            aria-pressed={buddyTab === tab}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="content-with-aside">
        <div>
          {buddyTab === "My buddy" ? (
            pendingRequest ? (
              <div className="surface form-card confirmation">
                <span className="square-icon">
                  <Icon name="clock" size={28} />
                </span>
                <Badge tone="warning">Pending Match</Badge>
                <h2>Your people are on the way.</h2>
                <p>
                  Your request is with the ISC committee. We’ll match you with a buddy who can help
                  with {pendingRequest.help.join(", ").toLowerCase() || "settling in"}.
                </p>
                <dl className="detail-list">
                  <div>
                    <dt>Programme</dt>
                    <dd>{pendingRequest.programme}</dd>
                  </div>
                  <div>
                    <dt>Preferred language</dt>
                    <dd>{pendingRequest.language}</dd>
                  </div>
                  <div>
                    <dt>Arrival date</dt>
                    <dd>{pendingRequest.date}</dd>
                  </div>
                </dl>
                <p className="small-text">
                  For this demo, an ISC Admin assigns your match from the committee workspace.
                </p>
              </div>
            ) : buddy ? (
              <article className="surface match-card">
                <div className="section-heading">
                  <p className="eyebrow">YOUR CAMPUS CONNECTION</p>
                  <Badge>
                    <Icon name="check" size={13} />
                    Active match
                  </Badge>
                </div>
                <div className="match-profile">
                  <div className="avatar large">{initials(buddy.name)}</div>
                  <div>
                    <h2>{buddy.name}</h2>
                    <p>{buddy.course}</p>
                    <span className="small-text">Senior student · ISC volunteer buddy</span>
                  </div>
                </div>
                <blockquote>
                  “Welcome to UTM! Starting somewhere new is a big step. I’m happy to help you find
                  your way around.”
                </blockquote>
                <dl className="detail-list">
                  <div>
                    <dt>Languages</dt>
                    <dd>{buddy.languages}</dd>
                  </div>
                  <div>
                    <dt>Preferred contact</dt>
                    <dd>Email · {buddy.email}</dd>
                  </div>
                  <div>
                    <dt>Check-in status</dt>
                    <dd>
                      <Badge>First welcome check-in completed</Badge>
                    </dd>
                  </div>
                </dl>
                <div className="spread-actions">
                  <Action variant="navy" onClick={() => openModal("contact")}>
                    <Icon name="mail" size={17} />
                    Contact your buddy
                  </Action>
                  <button className="subtle-action" onClick={() => setBuddyTab("Request a buddy")}>
                    Need a different match?
                  </button>
                </div>
              </article>
            ) : (
              <div className="surface form-card">
                <Badge tone="neutral">No match yet</Badge>
                <h2>A familiar face, from day one.</h2>
                <p>Tell the committee a little about yourself and we’ll find you a buddy.</p>
                <Action variant="navy" onClick={() => setBuddyTab("Request a buddy")}>
                  Request a buddy
                </Action>
              </div>
            )
          ) : buddyTab === "Request a buddy" ? (
            pendingRequest ? (
              <div className="surface form-card">
                <Badge tone="warning">Request already received</Badge>
                <h2>We’re finding your match.</h2>
                <p>You have one request in the queue. There’s no need to send another.</p>
                <Action variant="navy" onClick={() => setBuddyTab("My buddy")}>
                  View request
                </Action>
              </div>
            ) : (
              <form className="surface form-card" onSubmit={submitBuddy}>
                <h2>Tell us a little about yourself.</h2>
                <p>We’ll use this to find someone who can help you settle in.</p>
                <div className="form-grid">
                  <label>
                    Home country
                    <input required name="country" placeholder="e.g. Zimbabwe" autoComplete="country-name" />
                  </label>
                  <label>
                    Preferred language
                    <select name="language" required>
                      <option value="">Choose a language</option>
                      {buddyLanguages.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Arrival date
                    <input name="arrival" type="date" required defaultValue="2026-11-22" />
                  </label>
                  <label>
                    Faculty / programme
                    <input required name="programme" placeholder="e.g. BSc Software Engineering" />
                  </label>
                </div>
                <fieldset>
                  <legend>
                    What help do you need first? <span>(optional)</span>
                  </legend>
                  <div className="checkbox-options">
                    {buddyHelpOptions.map((help) => (
                      <label key={help}>
                        <input type="checkbox" name="help" value={help} />
                        {help}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <p className="form-footnote">
                  <Icon name="info" size={15} />
                  Only your matching details are shared with the ISC committee.
                </p>
                <Action type="submit" variant="primary" disabled={pending}>
                  Request a buddy
                  <Icon name="arrow" size={17} />
                </Action>
              </form>
            )
          ) : volunteer && !editingVolunteer ? (
            <div className="surface form-card confirmation">
              <Icon name="check" size={32} />
              <Badge>Volunteer interest received</Badge>
              <h2>Thank you for making room for someone new.</h2>
              <p>
                The committee will review your details. You’ve offered to support up to{" "}
                {volunteer.capacity} {volunteer.capacity === 1 ? "student" : "students"}.
              </p>
              <Action variant="outline" onClick={() => setEditingVolunteer(true)}>
                Edit volunteer details
              </Action>
            </div>
          ) : (
            <form className="surface form-card" onSubmit={submitVolunteer}>
              <h2>Be the welcome you once needed.</h2>
              <p>For senior and local UTM students who can offer a little time and local knowledge.</p>
              <div className="form-grid">
                <label>
                  Year of study
                  <select name="year" required defaultValue={volunteer?.year ?? ""}>
                    <option value="">Select your year</option>
                    <option>Year 2</option>
                    <option>Year 3</option>
                    <option>Year 4 / Postgraduate</option>
                  </select>
                </label>
                <label>
                  Maximum students I can support
                  <select name="capacity" defaultValue={volunteer?.capacity ?? 1}>
                    <option value="1">1 student</option>
                    <option value="2">2 students</option>
                    <option value="3">3 students</option>
                  </select>
                </label>
                <label className="full-width">
                  Languages spoken
                  <input
                    name="languages"
                    required
                    defaultValue={volunteer?.languages ?? ""}
                    placeholder="e.g. English, French, Mauritian Creole"
                  />
                </label>
              </div>
              <label className="consent">
                <input type="checkbox" required />
                I’m a current UTM student and agree to the buddy code of care: be respectful,
                dependable, and refer specialist concerns to welfare staff.
              </label>
              <Action type="submit" variant="primary" disabled={pending}>
                Volunteer as a buddy
                <Icon name="arrow" size={17} />
              </Action>
            </form>
          )}
        </div>
        <aside className="guidance-card">
          <Icon name="buddy" size={27} />
          <h3>A buddy, not a bureaucracy.</h3>
          <p>
            Ask about the best bus route. Find the library together. Get a second opinion on your
            first grocery shop.
          </p>
          <hr />
          <h4>Some things need specialist support.</h4>
          <p className="small-text">
            Buddies are fellow students, not counsellors or immigration advisers. For personal or
            sensitive concerns, use the confidential welfare channel.
          </p>
          <TextLink href="/welfare">Welfare support</TextLink>
        </aside>
      </div>
    </>
  );
}
