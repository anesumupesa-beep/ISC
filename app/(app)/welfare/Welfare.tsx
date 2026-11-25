"use client";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { submitEnquiry } from "@/app/actions";
import { useShell } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { Action, Badge, PageHeading } from "@/components/ui";
import type { Enquiry } from "@/lib/types";
import { enquiryStatuses, welfareCategories } from "@/lib/ui";

export function Welfare({ enquiries }: { enquiries: Enquiry[] }) {
  const { report } = useShell();
  const [selectedEnquiry, setSelectedEnquiry] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitWelfare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await submitEnquiry({
        category: String(data.get("category")),
        urgency: String(data.get("urgency")),
        description: String(data.get("description")),
        contact: String(data.get("contact")),
      });
      const fallback = result.ok
        ? `Enquiry ${result.id ?? ""} submitted. You can follow its status below.`
        : undefined;
      if (report(result, fallback)) form.reset();
    });
  }

  return (
    <>
      <PageHeading
        eyebrow="A PRIVATE SPACE FOR SUPPORT"
        title="Let’s take the next step together."
        description="You don’t need to have the right words. Tell us what’s on your mind, and we’ll help you find the right support."
      />
      <div className="privacy-banner">
        <Icon name="lock" size={24} />
        <div>
          <h3>Your privacy comes first.</h3>
          <p>
            This channel is strictly confidential. Submissions are visible only to you and
            Authorised UTM Welfare Staff in compliance with the Mauritius Data Protection Act 2017.
            We collect only what is needed to support you.
          </p>
          <strong className="small-text">
            Prototype only. Please do not enter real personal or sensitive information.
          </strong>
        </div>
      </div>
      <div className="content-with-aside">
        <form className="surface form-card" onSubmit={submitWelfare}>
          <h2>Open a confidential enquiry</h2>
          <p>This goes to authorised UTM welfare staff, not the ISC committee.</p>
          <div className="form-grid">
            <label>
              Enquiry category
              <select name="category" required>
                <option value="">Choose a category</option>
                {welfareCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Preferred contact
              <select name="contact" required>
                <option>Email</option>
                <option>Phone/WhatsApp</option>
                <option>In-person on campus</option>
              </select>
            </label>
          </div>
          <fieldset>
            <legend>How soon do you need support?</legend>
            <div className="radio-options">
              <label>
                <input type="radio" name="urgency" value="Standard" defaultChecked />
                Standard
              </label>
              <label>
                <input type="radio" name="urgency" value="Urgent — 24h" />
                Urgent — 24h
              </label>
            </div>
          </fieldset>
          <label>
            Brief description
            <textarea
              name="description"
              rows={4}
              required
              minLength={10}
              maxLength={2000}
              placeholder="A short outline is enough. Share only what you feel comfortable sharing. (Demo information only)"
            />
          </label>
          <p className="form-footnote">
            <Icon name="lock" size={15} />
            Your enquiry is not visible to normal ISC Admins.
          </p>
          <Action type="submit" variant="navy" disabled={pending}>
            Submit confidential enquiry
            <Icon name="arrow" size={17} />
          </Action>
        </form>
        <aside className="guidance-card">
          <Icon name="shield" size={27} />
          <h3>You’re in control.</h3>
          <p>
            Share only what’s needed. A member of the welfare team will review your enquiry and help
            you decide what comes next.
          </p>
          <hr />
          <h4>Need immediate help?</h4>
          <p className="small-text">
            This is not an emergency service. If you are in immediate danger in Mauritius, call the
            police on{" "}
            <a href="tel:999">
              <strong>999</strong>
            </a>{" "}
            or medical emergency services on{" "}
            <a href="tel:114">
              <strong>114</strong>
            </a>
            .
          </p>
          <p className="small-text">
            “Urgent — 24h” flags a request for priority review; it does not guarantee a response
            within 24 hours.
          </p>
        </aside>
      </div>
      <section className="tracker-section">
        <div className="section-heading">
          <h2>My enquiries</h2>
          <span>Visible only to you & authorised welfare staff</span>
        </div>
        <div className="surface enquiry-table">
          <div className="table-header">
            <span>REFERENCE / DATE</span>
            <span>CATEGORY</span>
            <span>STATUS</span>
            <span />
          </div>
          {enquiries.map((enquiry) => (
            <div className="enquiry-row" key={enquiry.id}>
              <div>
                <strong className="mono">{enquiry.id}</strong>
                <p>{enquiry.date}</p>
              </div>
              <span>{enquiry.category}</span>
              <Badge tone={enquiry.status === "Submitted" ? "warning" : "positive"}>
                {enquiry.status}
              </Badge>
              <button
                className="icon-button"
                aria-label={`View enquiry ${enquiry.id}`}
                aria-expanded={selectedEnquiry === enquiry.id}
                onClick={() => setSelectedEnquiry(selectedEnquiry === enquiry.id ? null : enquiry.id)}
              >
                <Icon
                  name="chevron"
                  className={selectedEnquiry === enquiry.id ? "rotate" : ""}
                  size={18}
                />
              </button>
              {selectedEnquiry === enquiry.id && (
                <div className="enquiry-detail">
                  <p>{enquiry.description}</p>
                  <p className="small-text">
                    Priority: {enquiry.urgency} · Preferred contact: {enquiry.contact}
                  </p>
                  <div className="status-timeline">
                    {enquiryStatuses.map((status, index) => (
                      <span
                        className={index <= enquiryStatuses.indexOf(enquiry.status) ? "reached" : ""}
                        key={status}
                      >
                        <Icon name="check" size={13} />
                        {status}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
