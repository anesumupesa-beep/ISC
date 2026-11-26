"use client";
import { useOptimistic, useTransition } from "react";
import { toggleRsvp } from "@/app/actions";
import type { ClubUpdate } from "@/lib/types";
import { useShell } from "./AppShell";
import { Icon } from "./icons";
import { Modal } from "./Modal";
import { RichText } from "./RichText";
import { Action, Badge } from "./ui";

/** RSVP ids with instant (optimistic) toggling, like the prototype. */
export function useRsvps(initial: number[]) {
  const { report } = useShell();
  const [rsvps, toggleOptimistic] = useOptimistic(initial, (state, id: number) =>
    state.includes(id) ? state.filter((item) => item !== id) : [...state, id],
  );
  const [, startTransition] = useTransition();
  const toggle = (id: number) =>
    startTransition(async () => {
      toggleOptimistic(id);
      report(await toggleRsvp(id));
    });
  return [rsvps, toggle] as const;
}

export function UpdateRow({
  update,
  full = false,
  going,
  onOpen,
  onToggle,
}: {
  update: ClubUpdate;
  full?: boolean;
  going: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  return (
    <article className={`update-row ${full ? "full" : ""}`}>
      <div className="date-tile">
        <span>{update.month}</span>
        <strong>{update.day}</strong>
      </div>
      <div className="update-copy">
        <p className="category">
          {update.category === "Official Announcements"
            ? "ANNOUNCEMENT"
            : update.category === "Events"
              ? "ON THE CALENDAR"
              : update.category.toUpperCase()}
          {update.pinned && (
            <span className="pinned">
              <Icon name="pin" size={11} /> PINNED
            </span>
          )}
        </p>
        <button className="row-title" onClick={onOpen}>
          {update.title}
        </button>
        {full ? <RichText text={update.description} /> : <p>{update.meta}</p>}
        {full && <p className="update-meta">{update.meta}</p>}
        {full && (update.venue || update.time) && (
          <p className="update-meta">{[update.venue, update.time].filter(Boolean).join(" · ")}</p>
        )}
        {update.approved && (
          <Badge tone="positive">
            <Icon name="shield" size={13} />
            UTM approved
          </Badge>
        )}
      </div>
      {full && update.category === "Events" ? (
        <Action variant={going ? "sage small" : "outline small"} onClick={onToggle}>
          {going && <Icon name="check" size={16} />} {going ? "Going" : "RSVP Going"}
        </Action>
      ) : (
        <button className="icon-button" onClick={onOpen} aria-label={`Read ${update.title}`}>
          <Icon name="arrow" size={20} />
        </button>
      )}
    </article>
  );
}

export function UpdateModal({
  update,
  going,
  onToggle,
  onClose,
}: {
  update: ClubUpdate;
  going: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title="From the campus noticeboard" onClose={onClose}>
      <div className="modal-body">
        <p className="eyebrow">
          {update.category} · {update.day} {update.month} 2026
        </p>
        <h2>{update.title}</h2>
        <RichText text={update.description} />
        <p className="small-text">{update.meta}</p>
        {(update.venue || update.time) && (
          <p className="small-text">{[update.venue, update.time].filter(Boolean).join(" · ")}</p>
        )}
        {update.approved && (
          <Badge tone="positive">
            <Icon name="shield" size={13} />
            UTM approved
          </Badge>
        )}
        {update.link && (
          <a className="text-link" href={update.link.url} target="_blank" rel="noopener noreferrer">
            {update.link.label}
            <Icon name="external" size={15} />
          </a>
        )}
        {update.category === "Events" ? (
          <Action variant={going ? "sage" : "primary"} onClick={onToggle}>
            {going ? (
              <>
                <Icon name="check" size={16} />
                Going — click to cancel
              </>
            ) : (
              "RSVP Going"
            )}
          </Action>
        ) : (
          !update.link && (
          <a
            className="text-link"
            href={
              update.category === "Weather & Holidays"
                ? "https://metservice.intnet.mu/"
                : "https://www.utm.ac.mu/"
            }
            target="_blank"
            rel="noreferrer"
          >
            Check the official source
            <Icon name="external" size={15} />
          </a>
          )
        )}
        {update.sample && (
          <p className="form-footnote">
            Illustrative 2026 notice for this interactive demo, not a live university announcement.
          </p>
        )}
      </div>
    </Modal>
  );
}
