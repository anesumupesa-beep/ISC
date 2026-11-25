// Shared contract between the data layer (lib/data.ts, app/actions.ts) and the UI.
// Shapes mirror the prototype's src/data.ts so the UI ports over unchanged.

export type Role = "student" | "isc_admin" | "welfare_staff";
export const roleLabel: Record<Role, string> = {
  student: "Student",
  isc_admin: "ISC Admin",
  welfare_staff: "Welfare Staff",
};

export type Viewer = { userId: string; name: string; email: string; role: Role };

export type ArrivalTask = {
  id: number;
  section: number; // index into arrivalSections
  title: string;
  detail: string;
  documents: string;
  link: string;
  url: string;
};

export type Listing = {
  id: number;
  title: string;
  area: string;
  type: string;
  price: number;
  walk: string;
  includes: string;
  checked: string; // display date, e.g. "14 Nov 2026"
  stale?: boolean; // last checked > 30 days ago
  report?: { id: number; reason: string; note: string }; // open (unresolved) report, if any
};

export type UpdateCategory =
  | "Official Announcements"
  | "Events"
  | "Weather & Holidays"
  | "ISC Membership";
export type ClubUpdate = {
  id: number;
  category: UpdateCategory;
  title: string;
  description: string;
  day: string; // "16"
  month: string; // "NOV"
  meta: string;
  pinned?: boolean;
};

export type BuddyRequest = {
  id: number;
  name: string;
  country: string;
  language: string;
  date: string; // arrival date yyyy-mm-dd
  programme: string;
  help: string[];
  assigned?: string; // volunteer name once matched
};

export type Volunteer = {
  id: number;
  name: string;
  course: string;
  languages: string;
  email: string;
};

export type EnquiryStatus = "Submitted" | "Acknowledged" | "Referred to Counsellor";
export type Enquiry = {
  id: string; // "WLF-2026-014"
  date: string; // display date
  category: string;
  urgency: string;
  description: string;
  contact: string;
  status: EnquiryStatus;
};

/** Every server action returns this so the UI can show a toast. */
export type ActionResult = { ok: true; message?: string; id?: string } | { ok: false; error: string };
