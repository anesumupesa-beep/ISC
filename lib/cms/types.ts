import type { ActionResult, UpdateCategory } from "@/lib/types";

export type ContentType = "task" | "listing" | "update" | "link" | "page";
export type ContentStatus = "draft" | "pending_approval" | "published" | "archived";

/** ActionResult plus the new row version, so editors can keep saving without a reload. */
export type CmsResult = ActionResult & { version?: number };

/** Route segment (/admin/content/<section>) per content type. */
export const SECTIONS: Record<string, ContentType> = {
  guide: "task", housing: "listing", updates: "update", links: "link", pages: "page",
};
export const SECTION_OF: Record<ContentType, string> = {
  task: "guide", listing: "housing", update: "updates", link: "links", page: "pages",
};
export const TYPE_LABEL: Record<ContentType, string> = {
  task: "Arrival task", listing: "Housing listing", update: "Club update", link: "Quick link", page: "Site page",
};
export const SECTION_LABEL: Record<string, string> = {
  guide: "Arrival guide", housing: "Housing", updates: "Club updates", links: "Quick links", pages: "Site pages",
};

export const ROOM_TYPES = ["Private Room", "Shared Apartment", "Studio"] as const;
export const PAGE_KEYS = ["about", "privacy", "contact"] as const;
export type PageKey = (typeof PAGE_KEYS)[number];
export const UPDATE_CATEGORIES: UpdateCategory[] = ["Official Announcements", "Events", "Weather & Holidays", "ISC Membership"];

// ---- Student-facing (published-only) shapes returned by lib/cms/read.ts ----

export type StudentTask = { id: number; section: number; title: string; detail: string; documents: string; link: string; url: string };

export type StudentListing = {
  id: number; title: string; area: string; type: string; price: number; walk: string; includes: string;
  checked: string; // "14 Nov 2026"
  stale?: boolean;
  contact?: string; // signed-in viewers only
  photos: { url: string; alt: string }[];
  sample?: boolean;
};

export type StudentUpdate = {
  id: number; category: UpdateCategory; title: string; description: string; meta: string;
  day: string; month: string; // event date if Events, else publish date; "16" / "NOV"
  pinned?: boolean;
  venue?: string;
  time?: string; // "14:30" Mauritius, events only
  link?: { label: string; url: string };
  approved?: boolean; // Official Announcement with UTM approval recorded
  sample?: boolean;
};

export type QuickLink = { id: number; label: string; url: string };
export type SitePage = { key: PageKey; title: string; heading: string; body: string; linkLabel?: string; linkUrl?: string; isDefault: boolean };

/** Listing identity for the admin report queue, whatever its publish status. */
export type ListingBasics = { id: number; title: string; area: string; status: ContentStatus; deleted: boolean };

// ---- Admin list shapes ----

export type DisplayStatus = "draft" | "scheduled" | "live" | "expired" | "pending" | "archived" | "deleted" | "default";
export type ContentRow = {
  id: string; // number as string, or the page key
  title: string;
  sub: string; // one-line summary
  status: DisplayStatus;
  version: number;
  updatedAt: string; // ISO
  updatedByName: string;
  sample: boolean;
  stale?: boolean; // listings checked > 30 days ago
  official?: boolean;
  approved?: boolean;
  section?: number; // tasks: stage index
  position?: number;
};
export const STATUS_CHIPS = ["all", "live", "draft", "scheduled", "pending", "archived", "deleted"] as const;
export type StatusChip = (typeof STATUS_CHIPS)[number];
export type Attention = { key: string; label: string; href: string; count: number };
