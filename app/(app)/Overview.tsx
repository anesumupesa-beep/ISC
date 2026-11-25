"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useShell } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { Badge, TextLink } from "@/components/ui";
import { UpdateModal, UpdateRow, useRsvps } from "@/components/UpdateFeed";
import type { BuddyRequest, ClubUpdate, Volunteer } from "@/lib/types";
import { initials } from "@/lib/ui";

export function Overview({
  name,
  completedCount,
  taskCount,
  pendingRequest,
  buddy,
  listingCount,
  latest,
  weather,
  rsvps: initialRsvps,
}: {
  name: string;
  completedCount: number;
  taskCount: number;
  pendingRequest: BuddyRequest | null;
  buddy: Volunteer | null;
  listingCount: number;
  latest: ClubUpdate[];
  weather: ClubUpdate | null;
  rsvps: number[];
}) {
  const { openModal } = useShell();
  const [rsvps, toggleRsvp] = useRsvps(initialRsvps);
  const [openUpdate, setOpenUpdate] = useState<ClubUpdate | null>(null);
  const firstName = name.split(" ")[0];
  const percent = taskCount ? (completedCount / taskCount) * 100 : 0;

  return (
    <>
      <div className="welcome-heading">
        <div>
          <p className="eyebrow">YOUR CAMPUS. YOUR COMMUNITY.</p>
          <h1>
            Welcome to UTM, {firstName}
            <span className="accent">.</span>
          </h1>
          <p className="page-description">
            Everything verified in one place — no scattered WhatsApp links.
          </p>
        </div>
        <div className="semester-stamp">
          <span>ACADEMIC YEAR</span>
          <strong>2026 — 2027</strong>
          <span>Make yourself at home.</span>
        </div>
      </div>
      <div className="advisory">
        <Icon name="rain" size={21} />
        <p>
          <strong>Weather notice</strong>
          <span className="advisory-divider">/</span> Heavy rain advisory for Port Louis & La Tour
          Koenig — check UTM campus transport updates.
        </p>
        {weather && (
          <button aria-label="Read weather notice" onClick={() => setOpenUpdate(weather)}>
            <Icon name="arrow" size={19} />
          </button>
        )}
      </div>
      <div className="home-layout">
        <div className="home-primary">
          <div className="section-heading">
            <h2>A good place to start</h2>
            <span>The essentials, at a glance</span>
          </div>
          <div className="quick-grid">
            <article className="quick-card arrival-card">
              <div className="card-top">
                <span className="line-icon">
                  <Icon name="arrival" size={23} />
                </span>
                <span className="small-label">YOUR FIRST STEPS</span>
                <span className="step-fraction">
                  {completedCount}
                  <span> / {taskCount}</span>
                </span>
              </div>
              <h3>One step closer to settled.</h3>
              <p>
                {completedCount} of {taskCount} settling-in steps completed
              </p>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Arrival progress"
                aria-valuenow={completedCount}
                aria-valuemin={0}
                aria-valuemax={taskCount}
              >
                <div style={{ width: `${percent}%` }} />
              </div>
              <TextLink href="/arrival?stage=1">Continue checklist</TextLink>
            </article>
            <article className="quick-card">
              <div className="card-top">
                <span className="line-icon">
                  <Icon name="buddy" size={23} />
                </span>
                <span className="small-label">MY BUDDY MATCH</span>
                <span className={`status-dot ${buddy ? "" : "pending"}`} />
              </div>
              <h3>{buddy ? "A familiar face, from day one." : "A friendly face is on the way."}</h3>
              <div className="buddy-inline">
                <span className="avatar">{buddy ? initials(buddy.name) : initials(name)}</span>
                <div>
                  <strong>
                    {buddy ? buddy.name : pendingRequest ? "Request received" : "No buddy yet"}
                  </strong>
                  <p>
                    {buddy
                      ? buddy.course
                      : pendingRequest
                        ? "Pending Match · Committee reviewing"
                        : "Ask the committee for a match"}
                  </p>
                </div>
              </div>
              <TextLink href="/buddy">
                {buddy ? "Meet your buddy" : pendingRequest ? "View buddy request" : "Request a buddy"}
              </TextLink>
            </article>
            <article className="quick-card">
              <div className="card-top">
                <span className="line-icon">
                  <Icon name="housing" size={23} />
                </span>
                <span className="small-label">VERIFIED HOUSING</span>
                <Badge tone="positive">ISC checked</Badge>
              </div>
              <h3>Find your place in Mauritius.</h3>
              <p>
                {listingCount} checked rooms around La Tour Koenig
                <br className="desktop-break" /> and neighbouring areas.
              </p>
              <p className="micro-meta">
                <Icon name="shield" size={13} />
                Latest checks · 16 Nov 2026
              </p>
              <TextLink href="/housing">Explore housing</TextLink>
            </article>
            <article className="quick-card welfare-card">
              <div className="card-top">
                <span className="line-icon">
                  <Icon name="shield" size={23} />
                </span>
                <span className="small-label">CONFIDENTIAL SUPPORT</span>
                <Icon name="lock" size={15} />
              </div>
              <h3>You don’t have to figure it out alone.</h3>
              <p>A direct, private route to authorised UTM welfare staff. We’re here to help.</p>
              <TextLink href="/welfare">Open an enquiry</TextLink>
            </article>
          </div>
          <section className="latest-section">
            <div className="section-heading">
              <h2>From the campus noticeboard</h2>
              <TextLink href="/updates">All updates</TextLink>
            </div>
            <div className="updates-list">
              {latest.map((update) => (
                <UpdateRow
                  key={update.id}
                  update={update}
                  going={rsvps.includes(update.id)}
                  onOpen={() => setOpenUpdate(update)}
                  onToggle={() => toggleRsvp(update.id)}
                />
              ))}
            </div>
          </section>
        </div>
        <aside className="home-aside">
          <article className="island-card">
            <div className="island-photo">
              {/* unoptimized keeps the precached /mauritius-coast.jpg URL for offline use */}
              <Image
                unoptimized
                src="/mauritius-coast.jpg"
                width={1000}
                height={667}
                alt="The green mountains and turquoise coastline of Mauritius"
              />
              <span>
                <Icon name="pin" size={12} /> LE MORNE, MAURITIUS
              </span>
            </div>
            <div className="island-copy">
              <p className="eyebrow">A SMALL ISLAND. A BIG WELCOME.</p>
              <h2>
                A new chapter.
                <br />A place to belong.
              </h2>
              <p>
                Different journeys, one community. Your life at UTM starts with a little support —
                and a lot of possibility.
              </p>
              <div className="community-mark">
                <div className="mini-avatars">
                  <span>{initials(name)}</span>
                  <span>PR</span>
                  <span>LS</span>
                </div>
                <span>
                  Many cultures.
                  <br />
                  <strong>One UTM community.</strong>
                </span>
              </div>
            </div>
          </article>
          <div className="helpful-links">
            <p className="eyebrow">KEEP THESE CLOSE</p>
            <a href="https://www.utm.ac.mu/" target="_blank" rel="noreferrer">
              <Icon name="globe" size={18} />
              <span>UTM official website</span>
              <Icon name="external" size={14} />
            </a>
            <Link href="/arrival?stage=3">
              <Icon name="book" size={18} />
              <span>Campus essentials</span>
              <Icon name="arrow" size={16} />
            </Link>
            <button onClick={() => openModal("contact")}>
              <Icon name="mail" size={18} />
              <span>Contact the ISC committee</span>
              <Icon name="arrow" size={16} />
            </button>
          </div>
          <div className="aside-note">
            <Icon name="shield" size={19} />
            <p>
              Student-led. University-connected.
              <br />
              <strong>Always on your side.</strong>
            </p>
          </div>
        </aside>
      </div>
      {openUpdate && (
        <UpdateModal
          update={openUpdate}
          going={rsvps.includes(openUpdate.id)}
          onToggle={() => toggleRsvp(openUpdate.id)}
          onClose={() => setOpenUpdate(null)}
        />
      )}
    </>
  );
}
