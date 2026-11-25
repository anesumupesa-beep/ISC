"use client";
import { useState, useTransition } from "react";
import { updateEnquiryStatus } from "@/app/actions";
import { useShell } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { Badge, PageHeading } from "@/components/ui";
import type { Enquiry, EnquiryStatus } from "@/lib/types";
import { enquiryStatuses } from "@/lib/ui";

export function WelfareQueue({ enquiries }: { enquiries: Enquiry[] }) {
  const { report } = useShell();
  const [selectedEnquiry, setSelectedEnquiry] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function setStatus(enquiry: Enquiry, status: EnquiryStatus) {
    startTransition(async () => {
      report(
        await updateEnquiryStatus(enquiry.id, status),
        `${enquiry.id} updated to ${status.toLowerCase()}.`,
      );
    });
  }

  return (
    <>
      <PageHeading
        eyebrow="RESTRICTED WORKSPACE"
        title="Confidential Welfare Queue"
        description="A clear, careful route from a student’s concern to the support they need."
      >
        <Badge>
          <Icon name="lock" size={14} />
          Authorised Welfare Access Only
        </Badge>
      </PageHeading>
      <div className="privacy-banner">
        <Icon name="lock" size={25} />
        <div>
          <h3>For authorised UTM welfare staff only.</h3>
          <p>
            Normal ISC Admins cannot access this view or its enquiries. Handle the minimum necessary
            information in accordance with the Mauritius Data Protection Act 2017.
          </p>
          <strong className="small-text">Demo platform. Use fictional information only.</strong>
        </div>
      </div>
      <div className="section-heading">
        <h2>
          {enquiries.length} confidential {enquiries.length === 1 ? "enquiry" : "enquiries"}
        </h2>
        <span>
          {enquiries.filter((enquiry) => enquiry.status === "Submitted").length} awaiting
          acknowledgement
        </span>
      </div>
      <div className="queue-list">
        {enquiries.map((enquiry) => (
          <article className="surface queue-card" key={enquiry.id}>
            <div className="section-heading">
              <span className="mono">{enquiry.id}</span>
              <Badge tone={enquiry.status === "Submitted" ? "warning" : "positive"}>
                {enquiry.status}
              </Badge>
            </div>
            <h3>{enquiry.category}</h3>
            <p className="small-text">
              {enquiry.date} · {enquiry.urgency}
            </p>
            <button
              className="text-link"
              aria-expanded={selectedEnquiry === enquiry.id}
              onClick={() => setSelectedEnquiry(selectedEnquiry === enquiry.id ? null : enquiry.id)}
            >
              {selectedEnquiry === enquiry.id ? "Close enquiry details" : "Inspect enquiry"}
              <Icon name="chevron" size={15} />
            </button>
            {selectedEnquiry === enquiry.id && (
              <div className="welfare-inspection">
                <div className="report-summary">
                  <p>{enquiry.description}</p>
                </div>
                <p className="small-text">Preferred contact: {enquiry.contact}</p>
                <div className="staff-status">
                  <label>
                    Update support status
                    {/* Uncontrolled + keyed on the saved status so it resyncs after revalidation. */}
                    <select
                      key={enquiry.status}
                      defaultValue={enquiry.status}
                      onChange={(e) => setStatus(enquiry, e.target.value as EnquiryStatus)}
                    >
                      {enquiryStatuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                  <p className="small-text">Changes are reflected in the student’s enquiry tracker.</p>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
